from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Ciclo, Prediccion, Pareja, ConfiguracionUsuaria
from app.schemas.schemas import PrediccionOut
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/predicciones", tags=["Predicciones"])

# Pesos: el dato más reciente tiene mayor influencia
_WEIGHTS = [4, 3, 2, 1, 1]


def _weighted_avg(values: list[int]) -> int:
    total_w, weighted_sum = 0, 0.0
    for i, v in enumerate(values):
        w = _WEIGHTS[i] if i < len(_WEIGHTS) else 1
        weighted_sum += v * w
        total_w += w
    return round(weighted_sum / total_w)


@router.post("/calcular", response_model=PrediccionOut, status_code=201)
def calcular_prediccion(db: Session = Depends(get_db),
                        current_user: Usuaria = Depends(get_current_user)):
    """
    Calcula la predicción del próximo ciclo usando media ponderada de los últimos 6 ciclos.
    Los ciclos más recientes tienen más peso. Analiza tanto la duración total del ciclo
    como la duración real del período (cuando fecha_fin está disponible).
    """
    ciclos = db.query(Ciclo).filter(
        Ciclo.id_usuaria == current_user.id_usuaria,
        Ciclo.fecha_inicio != None
    ).order_by(Ciclo.fecha_inicio.desc()).limit(6).all()

    if len(ciclos) < 2:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 2 ciclos para generar predicciones"
        )

    cfg = db.query(ConfiguracionUsuaria).filter(
        ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria
    ).first()
    cfg_ciclo   = cfg.duracion_ciclo   if cfg and cfg.duracion_ciclo   else 28
    cfg_periodo = cfg.duracion_periodo if cfg and cfg.duracion_periodo else 5
    metodo      = (cfg.metodo_anticonceptivo or "ninguno") if cfg else "ninguno"

    # Métodos que hacen el ciclo artificialmente regular (la config tiene más peso)
    METODOS_REGULAR   = {"pildora_combinada", "parche", "anillo"}
    # Métodos que hacen el ciclo impredecible (sangrado irregular → usar solo config)
    METODOS_IRREGULAR = {"minipildora", "implante", "inyeccion"}
    # DIU hormonal: periodo muy corto o ausente
    METODO_DIU_H      = "diu_hormonal"

    # — Duración del ciclo: gaps entre inicios consecutivos, del más reciente al más antiguo —
    ciclos_asc = sorted(ciclos, key=lambda c: c.fecha_inicio)
    gaps = []
    for i in range(len(ciclos_asc) - 1, 0, -1):
        diff = (ciclos_asc[i].fecha_inicio - ciclos_asc[i - 1].fecha_inicio).days
        if 21 <= diff <= 45:
            gaps.append(diff)

    # — Duración real del período —
    periodos = []
    for c in ciclos:
        if c.fecha_fin:
            dur_p = (c.fecha_fin - c.fecha_inicio).days + 1
            if 1 <= dur_p <= 15:
                periodos.append(dur_p)

    # — Aplicar ajuste según método anticonceptivo —
    if metodo in METODOS_IRREGULAR:
        # Sangrado impredecible → confiar solo en la configuración manual
        duracion_ciclo_predicha  = cfg_ciclo
        duracion_periodo_predicha = cfg_periodo
    elif metodo in METODOS_REGULAR:
        # Ciclos artificialmente regulares → anclar al valor configurado (añadir 2 copias como peso)
        gaps_anclados    = gaps + [cfg_ciclo, cfg_ciclo] if gaps else [cfg_ciclo]
        periodos_anclados = periodos + [cfg_periodo] if periodos else [cfg_periodo]
        duracion_ciclo_predicha   = _weighted_avg(gaps_anclados)
        duracion_periodo_predicha = _weighted_avg(periodos_anclados)
    elif metodo == METODO_DIU_H:
        # El ciclo puede mantenerse pero el período es muy corto/ausente
        duracion_ciclo_predicha   = _weighted_avg(gaps) if gaps else cfg_ciclo
        # Limitar la duración predicha del periodo a max 3 días (DIU hormonal lo acorta)
        raw_periodo = _weighted_avg(periodos) if periodos else cfg_periodo
        duracion_periodo_predicha = min(raw_periodo, 3)
    else:
        # Algoritmo estándar (ninguno / DIU de cobre)
        duracion_ciclo_predicha   = _weighted_avg(gaps) if gaps else cfg_ciclo
        duracion_periodo_predicha = _weighted_avg(periodos) if periodos else cfg_periodo

    # — Derivar todas las fechas del próximo ciclo desde un único conjunto de valores —
    ultimo = ciclos[0]
    proxima_menstruacion  = ultimo.fecha_inicio + timedelta(days=duracion_ciclo_predicha)
    prediccion_ovulacion  = proxima_menstruacion - timedelta(days=14)
    ventana_fertil_inicio = prediccion_ovulacion - timedelta(days=3)
    ventana_fertil_fin    = prediccion_ovulacion + timedelta(days=1)

    # — Guardar o actualizar predicción —
    prediccion = db.query(Prediccion)\
                   .filter(Prediccion.id_usuaria == current_user.id_usuaria)\
                   .first()

    if prediccion:
        prediccion.proxima_menstruacion   = proxima_menstruacion
        prediccion.prediccion_ovulacion   = prediccion_ovulacion
        prediccion.ventana_fertil_inicio  = ventana_fertil_inicio
        prediccion.ventana_fertil_fin     = ventana_fertil_fin
        prediccion.duracion_ciclo_predicha   = duracion_ciclo_predicha
        prediccion.duracion_periodo_predicha = duracion_periodo_predicha
    else:
        prediccion = Prediccion(
            id_usuaria               = current_user.id_usuaria,
            proxima_menstruacion     = proxima_menstruacion,
            prediccion_ovulacion     = prediccion_ovulacion,
            ventana_fertil_inicio    = ventana_fertil_inicio,
            ventana_fertil_fin       = ventana_fertil_fin,
            duracion_ciclo_predicha  = duracion_ciclo_predicha,
            duracion_periodo_predicha= duracion_periodo_predicha,
        )
        db.add(prediccion)

    db.commit()
    db.refresh(prediccion)
    return prediccion


@router.get("/", response_model=PrediccionOut)
def obtener_prediccion(id_usuaria: UUID = None, db: Session = Depends(get_db),
                       current_user: Usuaria = Depends(get_current_user)):
    """Devuelve la última predicción calculada para la usuaria o vinculada."""
    target_id = current_user.id_usuaria
    if id_usuaria:
        if current_user.rol == "admin":
            target_id = id_usuaria
        else:
            link = db.query(Pareja).filter(
                Pareja.id_usuaria == id_usuaria,
                Pareja.id_pareja == current_user.id_usuaria
            ).first()
            if not link:
                raise HTTPException(status_code=403, detail="No tienes acceso a los datos de esta usuaria")
            target_id = id_usuaria

    prediccion = db.query(Prediccion)\
                   .filter(Prediccion.id_usuaria == target_id)\
                   .first()
    if not prediccion:
        raise HTTPException(status_code=404, detail="No hay predicciones generadas todavía")
    return prediccion

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import timedelta
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Ciclo, Prediccion, Pareja, ConfiguracionUsuaria
from app.schemas.schemas import PrediccionOut
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/predicciones", tags=["Predicciones"])


@router.post("/calcular", response_model=PrediccionOut, status_code=201)
def calcular_prediccion(db: Session = Depends(get_db),
                        current_user: Usuaria = Depends(get_current_user)):
    """
    Calcula la próxima menstruación, ventana fértil y ovulación
    basándose en los ciclos históricos de la usuaria.
    Necesita al menos 2 ciclos completos.
    """
    # Cogemos los últimos 6 ciclos por fecha_inicio (no exigimos fecha_fin: para la
    # duración del ciclo solo nos interesa el inicio de cada uno).
    ciclos = db.query(Ciclo).filter(
        Ciclo.id_usuaria == current_user.id_usuaria,
        Ciclo.fecha_inicio != None
    ).order_by(Ciclo.fecha_inicio.desc()).limit(6).all()

    if len(ciclos) < 2:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 2 ciclos para generar predicciones"
        )

    # Duración del ciclo = días entre inicios consecutivos (no la duración del
    # sangrado). Solo contamos gaps fisiológicos (21-45 días) para que ciclos
    # atípicos no rompan la media.
    ciclos_asc = sorted(ciclos, key=lambda c: c.fecha_inicio)
    gaps_validos = []
    for i in range(1, len(ciclos_asc)):
        diff = (ciclos_asc[i].fecha_inicio - ciclos_asc[i - 1].fecha_inicio).days
        if 21 <= diff <= 45:
            gaps_validos.append(diff)

    if gaps_validos:
        duracion_media = round(sum(gaps_validos) / len(gaps_validos))
    else:
        # Sin gaps fisiológicos → usar la duración configurada de la usuaria (default 28)
        cfg = db.query(ConfiguracionUsuaria).filter(
            ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria
        ).first()
        duracion_media = (cfg.duracion_ciclo if cfg and cfg.duracion_ciclo else 28)

    # Último ciclo conocido (el más reciente)
    ultimo = ciclos[0]
    proxima_menstruacion  = ultimo.fecha_inicio + timedelta(days=duracion_media)
    prediccion_ovulacion  = proxima_menstruacion - timedelta(days=14)
    ventana_fertil_inicio = prediccion_ovulacion - timedelta(days=5)
    ventana_fertil_fin    = prediccion_ovulacion + timedelta(days=1)

    # Guardar o actualizar predicción
    prediccion = db.query(Prediccion)\
                   .filter(Prediccion.id_usuaria == current_user.id_usuaria)\
                   .first()

    if prediccion:
        prediccion.proxima_menstruacion  = proxima_menstruacion
        prediccion.prediccion_ovulacion  = prediccion_ovulacion
        prediccion.ventana_fertil_inicio = ventana_fertil_inicio
        prediccion.ventana_fertil_fin    = ventana_fertil_fin
    else:
        prediccion = Prediccion(
            id_usuaria           = current_user.id_usuaria,
            proxima_menstruacion = proxima_menstruacion,
            prediccion_ovulacion = prediccion_ovulacion,
            ventana_fertil_inicio= ventana_fertil_inicio,
            ventana_fertil_fin   = ventana_fertil_fin,
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
            # Verificar vínculo
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

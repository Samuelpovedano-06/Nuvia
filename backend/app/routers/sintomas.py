from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Sintoma, RegistroSintoma, RegistroDiario
from app.schemas.schemas import SintomaOut, RegistroSintomaCreate, RegistroSintomaOut, RegistroDiarioCreate, RegistroDiarioOut
from app.routers.auth_utils import get_current_user
from datetime import date

router = APIRouter(tags=["Síntomas"])


# ── Catálogo de síntomas (público) ──────────────────────────────────────────

@router.get("/sintomas", response_model=List[SintomaOut])
def listar_sintomas(db: Session = Depends(get_db)):
    """Devuelve el catálogo completo de síntomas disponibles."""
    return db.query(Sintoma).all()


# ── Registro de síntomas de la usuaria ──────────────────────────────────────

@router.post("/registros-sintomas", response_model=RegistroSintomaOut, status_code=201)
def registrar_sintoma(datos: RegistroSintomaCreate, db: Session = Depends(get_db),
                      current_user: Usuaria = Depends(get_current_user)):
    """Registra un síntoma para la usuaria en una fecha concreta."""
    sintoma = db.query(Sintoma).filter(Sintoma.id_sintoma == datos.id_sintoma).first()
    if not sintoma:
        raise HTTPException(status_code=404, detail="Síntoma no encontrado en el catálogo")

    registro = RegistroSintoma(id_usuaria=current_user.id_usuaria, **datos.model_dump())
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro


@router.get("/registros-sintomas", response_model=List[RegistroSintomaOut])
def listar_registros_sintomas(db: Session = Depends(get_db),
                              current_user: Usuaria = Depends(get_current_user)):
    """Lista todos los registros de síntomas de la usuaria."""
    return db.query(RegistroSintoma)\
             .filter(RegistroSintoma.id_usuaria == current_user.id_usuaria)\
             .order_by(RegistroSintoma.fecha.desc()).all()


# ── Registro Diario (Notas, Flujo, Relaciones) ──────────────────────────────────

@router.post("/registros-diarios", response_model=RegistroDiarioOut)
def registrar_dato_diario(datos: RegistroDiarioCreate, db: Session = Depends(get_db),
                          current_user: Usuaria = Depends(get_current_user)):
    """Guarda o actualiza las notas, flujo y relaciones para un día."""
    registro = db.query(RegistroDiario).filter(
        RegistroDiario.id_usuaria == current_user.id_usuaria,
        RegistroDiario.fecha == datos.fecha
    ).first()

    if registro:
        registro.notas = datos.notas
        registro.flujo = datos.flujo
        registro.relaciones = datos.relaciones
    else:
        registro = RegistroDiario(id_usuaria=current_user.id_usuaria, **datos.model_dump())
        db.add(registro)
    
    db.commit()
    db.refresh(registro)
    return registro


@router.get("/registros-diarios/{fecha}", response_model=RegistroDiarioOut)
def obtener_registro_diario(fecha: date, db: Session = Depends(get_db),
                           current_user: Usuaria = Depends(get_current_user)):
    """Obtiene las notas, flujo y relaciones de una fecha específica."""
    registro = db.query(RegistroDiario).filter(
        RegistroDiario.id_usuaria == current_user.id_usuaria,
        RegistroDiario.fecha == fecha
    ).first()
    if not registro:
        return {
            "id": "00000000-0000-0000-0000-000000000000",
            "id_usuaria": current_user.id_usuaria,
            "fecha": fecha,
            "notas": "",
            "flujo": "",
            "relaciones": 0
        }
    return registro


@router.delete("/registros-sintomas/{id_registro}", status_code=204)
def eliminar_registro_sintoma(id_registro: UUID, db: Session = Depends(get_db),
                               current_user: Usuaria = Depends(get_current_user)):
    registro = db.query(RegistroSintoma).filter(
        RegistroSintoma.id_registro == id_registro,
        RegistroSintoma.id_usuaria == current_user.id_usuaria
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(registro)
    db.commit()

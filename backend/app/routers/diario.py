from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import List
from app.database.connection import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth_utils import get_current_user

# Usar prefijo para evitar colisiones y ambigüedades
router = APIRouter(prefix="/registros-diarios", tags=["Diario"])

@router.get("/", response_model=List[schemas.RegistroDiarioOut])
def listar_registros_diarios(db: Session = Depends(get_db),
                              current_user: models.Usuaria = Depends(get_current_user)):
    """Obtiene todo el historial de registros diarios (notas, flujo, etc)."""
    return db.query(models.RegistroDiario)\
             .filter(models.RegistroDiario.id_usuaria == current_user.id_usuaria)\
             .order_by(models.RegistroDiario.fecha.desc()).all()

@router.get("/{fecha}", response_model=schemas.RegistroDiarioOut)
def obtener_registro_diario(fecha: date, db: Session = Depends(get_db),
                           current_user: models.Usuaria = Depends(get_current_user)):
    """Obtiene el registro de una fecha específica."""
    registro = db.query(models.RegistroDiario).filter(
        models.RegistroDiario.id_usuaria == current_user.id_usuaria,
        models.RegistroDiario.fecha == fecha
    ).first()

    if not registro:
        # Devolver objeto vacío con la fecha solicitada si no existe
        return {
            "id": "00000000-0000-0000-0000-000000000000",
            "id_usuaria": current_user.id_usuaria,
            "fecha": fecha,
            "notas": "",
            "flujo": "",
            "relaciones": 0
        }
    return registro

@router.post("/", response_model=schemas.RegistroDiarioOut)
def registrar_dato_diario(datos: schemas.RegistroDiarioCreate, db: Session = Depends(get_db),
                          current_user: models.Usuaria = Depends(get_current_user)):
    """Crea o actualiza el registro diario."""
    registro = db.query(models.RegistroDiario).filter(
        models.RegistroDiario.id_usuaria == current_user.id_usuaria,
        models.RegistroDiario.fecha == datos.fecha
    ).first()

    if registro:
        registro.notas = datos.notas
        registro.flujo = datos.flujo
        registro.relaciones = datos.relaciones
    else:
        registro = models.RegistroDiario(id_usuaria=current_user.id_usuaria, **datos.model_dump())
        db.add(registro)

    db.commit()
    db.refresh(registro)
    return registro

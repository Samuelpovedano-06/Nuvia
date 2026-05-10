from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from app.database.connection import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth_utils import get_current_user

router = APIRouter(tags=["Diario"])

@router.get("/registros-diarios/{fecha}", response_model=schemas.RegistroDiarioOut)
def obtener_registro_diario(fecha: date, db: Session = Depends(get_db),
                           current_user: models.Usuaria = Depends(get_current_user)):
    registro = db.query(models.RegistroDiario).filter(
        models.RegistroDiario.id_usuaria == current_user.id_usuaria,
        models.RegistroDiario.fecha == fecha
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

@router.post("/registros-diarios", response_model=schemas.RegistroDiarioOut)
def registrar_dato_diario(datos: schemas.RegistroDiarioCreate, db: Session = Depends(get_db),
                          current_user: models.Usuaria = Depends(get_current_user)):
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

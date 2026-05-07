from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Usuaria, RegistroDiario
from app.schemas.schemas import RegistroDiarioCreate, RegistroDiarioOut
from app.routers.auth_utils import get_current_user
from datetime import date

router = APIRouter(tags=["Diario"])

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

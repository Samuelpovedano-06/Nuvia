from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import List, Optional
from uuid import UUID
from app.database.connection import get_db
from app.models import models
from app.schemas import schemas
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/registros-diarios", tags=["Diario"])

@router.get("", response_model=List[schemas.RegistroDiarioOut])
def listar_registros_diarios(fecha: Optional[date] = None,
                              id_usuaria: Optional[UUID] = None,
                              db: Session = Depends(get_db),
                              current_user: models.Usuaria = Depends(get_current_user)):
    """Lista los registros diarios para la usuaria o vinculada."""
    target_id = current_user.id_usuaria
    if id_usuaria:
        if current_user.rol == "admin":
            target_id = id_usuaria
        else:
            # Verificar vínculo
            link = db.query(models.Pareja).filter(
                models.Pareja.id_usuaria == id_usuaria,
                models.Pareja.id_pareja == current_user.id_usuaria
            ).first()
            if not link:
                raise HTTPException(status_code=403, detail="No tienes acceso a los datos de esta usuaria")
            target_id = id_usuaria

    query = db.query(models.RegistroDiario)\
              .filter(models.RegistroDiario.id_usuaria == target_id)

    if fecha:
        registro = query.filter(models.RegistroDiario.fecha == fecha).first()
        if not registro:
            return [{
                "id": "00000000-0000-0000-0000-000000000000",
                "id_usuaria": target_id,
                "fecha": fecha,
                "notas": "",
                "flujo": "",
                "relaciones": 0
            }]
        return [registro]

    return query.order_by(models.RegistroDiario.fecha.desc()).all()

@router.post("", response_model=schemas.RegistroDiarioOut)
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

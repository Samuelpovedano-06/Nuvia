from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, HistorialEstado
from app.schemas.schemas import HistorialEstadoCreate, HistorialEstadoOut
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/historial-estados", tags=["Historial de estados"])


@router.post("/", response_model=HistorialEstadoOut, status_code=201)
def registrar_estado(datos: HistorialEstadoCreate, db: Session = Depends(get_db),
                     current_user: Usuaria = Depends(get_current_user)):
    """Registra el estado de ánimo de hoy."""
    estado = HistorialEstado(id_usuaria=current_user.id_usuaria, **datos.model_dump())
    db.add(estado)
    db.commit()
    db.refresh(estado)
    return estado


@router.get("/", response_model=List[HistorialEstadoOut])
def listar_estados(db: Session = Depends(get_db),
                   current_user: Usuaria = Depends(get_current_user)):
    """Lista el historial de estados de ánimo de la usuaria."""
    return db.query(HistorialEstado)\
             .filter(HistorialEstado.id_usuaria == current_user.id_usuaria)\
             .order_by(HistorialEstado.fecha.desc()).all()


@router.delete("/{id_historial}", status_code=204)
def eliminar_estado(id_historial: UUID, db: Session = Depends(get_db),
                    current_user: Usuaria = Depends(get_current_user)):
    estado = db.query(HistorialEstado).filter(
        HistorialEstado.id_historial == id_historial,
        HistorialEstado.id_usuaria   == current_user.id_usuaria
    ).first()
    if not estado:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(estado)
    db.commit()

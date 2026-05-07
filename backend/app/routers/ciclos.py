from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Ciclo
from app.schemas.schemas import CicloCreate, CicloUpdate, CicloOut
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/ciclos", tags=["Ciclos"])


@router.post("/", response_model=CicloOut, status_code=201)
def crear_ciclo(datos: CicloCreate, db: Session = Depends(get_db),
                current_user: Usuaria = Depends(get_current_user)):
    """Crea un nuevo ciclo para la usuaria autenticada."""
    ciclo = Ciclo(id_usuaria=current_user.id_usuaria, **datos.model_dump())
    db.add(ciclo)
    db.commit()
    db.refresh(ciclo)
    return ciclo


@router.get("/", response_model=List[CicloOut])
def listar_ciclos(db: Session = Depends(get_db),
                  current_user: Usuaria = Depends(get_current_user)):
    """Lista todos los ciclos de la usuaria autenticada."""
    return db.query(Ciclo).filter(Ciclo.id_usuaria == current_user.id_usuaria)\
             .order_by(Ciclo.fecha_inicio.desc()).all()


@router.get("/{id_ciclo}", response_model=CicloOut)
def obtener_ciclo(id_ciclo: UUID, db: Session = Depends(get_db),
                  current_user: Usuaria = Depends(get_current_user)):
    ciclo = db.query(Ciclo).filter(
        Ciclo.id_ciclo == id_ciclo,
        Ciclo.id_usuaria == current_user.id_usuaria
    ).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    return ciclo


@router.put("/{id_ciclo}", response_model=CicloOut)
def actualizar_ciclo(id_ciclo: UUID, datos: CicloUpdate,
                     db: Session = Depends(get_db),
                     current_user: Usuaria = Depends(get_current_user)):
    """Actualiza fecha de fin y duración de un ciclo."""
    ciclo = db.query(Ciclo).filter(
        Ciclo.id_ciclo == id_ciclo,
        Ciclo.id_usuaria == current_user.id_usuaria
    ).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        setattr(ciclo, campo, valor)
    db.commit()
    db.refresh(ciclo)
    return ciclo


@router.delete("/{id_ciclo}", status_code=204)
def eliminar_ciclo(id_ciclo: UUID, db: Session = Depends(get_db),
                   current_user: Usuaria = Depends(get_current_user)):
    ciclo = db.query(Ciclo).filter(
        Ciclo.id_ciclo == id_ciclo,
        Ciclo.id_usuaria == current_user.id_usuaria
    ).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    db.delete(ciclo)
    db.commit()

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Ciclo, Pareja
from app.schemas.schemas import CicloCreate, CicloUpdate, CicloOut
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/ciclos", tags=["Ciclos"])


@router.post("/", response_model=CicloOut, status_code=201)
def crear_ciclo(datos: CicloCreate, id_usuaria: UUID = None, db: Session = Depends(get_db),
                current_user: Usuaria = Depends(get_current_user)):
    """Crea un nuevo ciclo para la usuaria autenticada o vinculada."""
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
                raise HTTPException(status_code=403, detail="No tienes acceso para crear ciclos a esta usuaria")
            target_id = id_usuaria

    ciclo = Ciclo(id_usuaria=target_id, **datos.model_dump())
    db.add(ciclo)
    db.commit()
    db.refresh(ciclo)
    return ciclo


@router.get("/", response_model=List[CicloOut])
def listar_ciclos(id_usuaria: UUID = None, db: Session = Depends(get_db),
                  current_user: Usuaria = Depends(get_current_user)):
    """Lista todos los ciclos de la usuaria autenticada o de la vinculada si es pareja."""
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
            
    return db.query(Ciclo).filter(Ciclo.id_usuaria == target_id)\
             .order_by(Ciclo.fecha_inicio.desc()).all()


@router.get("/{id_ciclo}", response_model=CicloOut)
def obtener_ciclo(id_ciclo: UUID, db: Session = Depends(get_db),
                  current_user: Usuaria = Depends(get_current_user)):
    # Nota: Aquí también se podría añadir lógica de pareja si fuera necesario
    ciclo = db.query(Ciclo).filter(
        Ciclo.id_ciclo == id_ciclo
    ).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")
    # Verificar propiedad o vínculo
    if ciclo.id_usuaria != current_user.id_usuaria:
         link = db.query(Pareja).filter(
                Pareja.id_usuaria == ciclo.id_usuaria,
                Pareja.id_pareja == current_user.id_usuaria
            ).first()
         if not link and current_user.rol != "admin":
             raise HTTPException(status_code=403, detail="No tienes acceso a este ciclo")

    return ciclo


@router.put("/{id_ciclo}", response_model=CicloOut)
def actualizar_ciclo(id_ciclo: UUID, datos: CicloUpdate,
                     db: Session = Depends(get_db),
                     current_user: Usuaria = Depends(get_current_user)):
    """Actualiza fecha de fin y duración de un ciclo."""
    ciclo = db.query(Ciclo).filter(
        Ciclo.id_ciclo == id_ciclo
    ).first()
    if not ciclo:
        raise HTTPException(status_code=404, detail="Ciclo no encontrado")

    # Verificar propiedad o vínculo
    if ciclo.id_usuaria != current_user.id_usuaria:
         link = db.query(Pareja).filter(
                Pareja.id_usuaria == ciclo.id_usuaria,
                Pareja.id_pareja == current_user.id_usuaria
            ).first()
         if not link and current_user.rol != "admin":
             raise HTTPException(status_code=403, detail="No tienes permiso para actualizar este ciclo")

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

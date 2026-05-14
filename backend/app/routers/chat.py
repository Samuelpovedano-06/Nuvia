from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Mensaje, Pareja
from app.schemas.schemas import MensajeCreate, MensajeOut
from app.routers.auth_utils import get_current_user
from sqlalchemy import or_, and_

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("/", response_model=MensajeOut)
def enviar_mensaje(mensaje: MensajeCreate, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    # Verificar si son pareja
    vinculo = db.query(Pareja).filter(
        or_(
            and_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == mensaje.id_receptor),
            and_(Pareja.id_pareja == current_user.id_usuaria, Pareja.id_usuaria == mensaje.id_receptor)
        )
    ).first()

    if not vinculo:
        raise HTTPException(status_code=403, detail="No puedes enviar mensajes a alguien que no es tu pareja vinculada.")

    nuevo_mensaje = Mensaje(
        id_remitente=current_user.id_usuaria,
        id_receptor=mensaje.id_receptor,
        contenido=mensaje.contenido
    )
    db.add(nuevo_mensaje)
    db.commit()
    db.refresh(nuevo_mensaje)
    return nuevo_mensaje

@router.get("/{id_pareja}", response_model=List[MensajeOut])
def obtener_mensajes(id_pareja: UUID, limit: int = 50, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    # Verificar si son pareja
    vinculo = db.query(Pareja).filter(
        or_(
            and_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == id_pareja),
            and_(Pareja.id_pareja == current_user.id_usuaria, Pareja.id_usuaria == id_pareja)
        )
    ).first()

    if not vinculo:
        raise HTTPException(status_code=403, detail="No puedes ver mensajes con alguien que no es tu pareja vinculada.")

    mensajes = db.query(Mensaje).filter(
        or_(
            and_(Mensaje.id_remitente == current_user.id_usuaria, Mensaje.id_receptor == id_pareja),
            and_(Mensaje.id_remitente == id_pareja, Mensaje.id_receptor == current_user.id_usuaria)
        )
    ).order_by(Mensaje.fecha.asc()).limit(limit).all()

    # Marcar como leídos los mensajes recibidos
    db.query(Mensaje).filter(
        Mensaje.id_remitente == id_pareja,
        Mensaje.id_receptor == current_user.id_usuaria,
        Mensaje.leido == False
    ).update({"leido": True})
    db.commit()

    return mensajes

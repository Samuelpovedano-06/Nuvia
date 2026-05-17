"""Router para registrar dispositivos de push y enviar notificaciones de prueba."""
import os
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.models.models import Usuaria, NotificationDevice
from app.routers.auth_utils import get_current_user
from app.utils.push import enviar_a_usuaria

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class RegisterDeviceBody(BaseModel):
    plataforma: str    # 'web' | 'android'
    token: str         # FCM token o JSON subscription


@router.get("/vapid-public-key")
def vapid_public_key():
    """El frontend necesita la clave pública para crear la suscripción Web Push."""
    return {"key": os.getenv("VAPID_PUBLIC_KEY", "").strip()}


@router.post("/register-device")
def register_device(
    body: RegisterDeviceBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    if body.plataforma not in ("web", "android"):
        raise HTTPException(status_code=400, detail="plataforma debe ser 'web' o 'android'")
    if not body.token.strip():
        raise HTTPException(status_code=400, detail="token vacío")

    # Si ya existe (mismo token+plataforma), reactivar y reasignar a esta usuaria
    existing = db.query(NotificationDevice).filter(
        NotificationDevice.plataforma == body.plataforma,
        NotificationDevice.token == body.token,
    ).first()
    if existing:
        existing.id_usuaria = current_user.id_usuaria
        existing.activo = True
    else:
        db.add(NotificationDevice(
            id_usuaria=current_user.id_usuaria,
            plataforma=body.plataforma,
            token=body.token,
        ))
    db.commit()
    return {"ok": True}


@router.delete("/unregister-device")
def unregister_device(
    body: RegisterDeviceBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    db.query(NotificationDevice).filter(
        NotificationDevice.id_usuaria == current_user.id_usuaria,
        NotificationDevice.plataforma == body.plataforma,
        NotificationDevice.token == body.token,
    ).update({"activo": False})
    db.commit()
    return {"ok": True}


@router.post("/test")
def test_notification(
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Envía una notificación de prueba a la usuaria actual."""
    enviar_a_usuaria(db, current_user.id_usuaria,
                     title="Nuvia 🌸",
                     body="Las notificaciones funcionan correctamente.",
                     data={"tipo": "test"})
    return {"ok": True}

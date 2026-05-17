import base64
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Mensaje, Pareja, PublicacionForo
from app.schemas.schemas import MensajeCreate, MensajeOut
from app.routers.auth_utils import get_current_user
from sqlalchemy import or_, and_


class CompartirPublicacionBody(BaseModel):
    id_receptor: UUID
    id_publicacion: UUID

router = APIRouter(prefix="/chat", tags=["Chat"])

MIMES_VALIDOS = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5MB


def _decode_data_url(data_url: str):
    """Convierte 'data:image/png;base64,xxx' en (mime, bytes)."""
    try:
        header, b64 = data_url.split(",", 1)
        mime = header.split(";")[0].replace("data:", "").strip().lower()
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen mal formada")
    if mime not in MIMES_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo de imagen no permitido")
    try:
        data = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen no decodificable")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 5MB)")
    return mime, data


def _mensaje_out(m: Mensaje) -> dict:
    return {
        "id": m.id,
        "id_remitente": m.id_remitente,
        "id_receptor": m.id_receptor,
        "contenido": m.contenido or "",
        "tiene_imagen": m.imagen is not None,
        "es_compartido": bool(getattr(m, "es_compartido", False)),
        "leido": bool(m.leido),
        "fecha": m.fecha,
    }


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

    contenido = (mensaje.contenido or "").strip()
    imagen_bytes = None
    imagen_mime = None
    if mensaje.imagen_data:
        imagen_mime, imagen_bytes = _decode_data_url(mensaje.imagen_data)

    if not contenido and not imagen_bytes:
        raise HTTPException(status_code=400, detail="El mensaje debe tener texto o imagen")

    nuevo_mensaje = Mensaje(
        id_remitente=current_user.id_usuaria,
        id_receptor=mensaje.id_receptor,
        contenido=contenido,
        imagen=imagen_bytes,
        imagen_mime=imagen_mime,
    )
    db.add(nuevo_mensaje)
    db.commit()
    db.refresh(nuevo_mensaje)

    # Notificar al receptor
    try:
        from app.utils.push import enviar_a_usuaria
        nombre = current_user.nombre or "Tu pareja"
        body_txt = contenido[:80] if contenido else "📷 Foto"
        enviar_a_usuaria(db, mensaje.id_receptor,
                         title=f"{nombre} te ha enviado un mensaje",
                         body=body_txt,
                         data={"tipo": "chat", "id_remitente": str(current_user.id_usuaria)})
    except Exception as e:
        print(f"[Push] chat error: {e}")
    return _mensaje_out(nuevo_mensaje)


@router.get("/imagen/{id}")
def obtener_imagen_mensaje(id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    m = db.query(Mensaje).filter(Mensaje.id == id).first()
    if not m or not m.imagen:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    # Solo remitente o receptor pueden verla
    if current_user.id_usuaria not in (m.id_remitente, m.id_receptor):
        raise HTTPException(status_code=403, detail="No autorizado")
    return Response(content=bytes(m.imagen), media_type=m.imagen_mime or "image/jpeg")

@router.get("/{id_pareja}")
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

    return [_mensaje_out(m) for m in mensajes]


@router.post("/compartir-publicacion", response_model=MensajeOut)
def compartir_publicacion(
    body: CompartirPublicacionBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    # Verificar vínculo de pareja
    vinculo = db.query(Pareja).filter(
        or_(
            and_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == body.id_receptor),
            and_(Pareja.id_pareja == current_user.id_usuaria, Pareja.id_usuaria == body.id_receptor)
        )
    ).first()
    if not vinculo:
        raise HTTPException(status_code=403, detail="No es tu pareja vinculada")

    pub = db.query(PublicacionForo).filter(PublicacionForo.id == body.id_publicacion).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")

    nuevo = Mensaje(
        id_remitente=current_user.id_usuaria,
        id_receptor=body.id_receptor,
        contenido=(pub.contenido or "").strip() or None,
        imagen=pub.imagen,
        imagen_mime=pub.imagen_mime,
        es_compartido=True,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _mensaje_out(nuevo)

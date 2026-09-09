"""Logros de minijuegos desbloqueados por usuaria (para siempre, una vez).

Las definiciones de qué es cada logro (nombre, descripción, condición) viven
en el frontend (frontend/src/utils/logros.js) — aquí solo se guarda qué
logro_id ha desbloqueado cada usuaria, sin validar la condición en servidor
(igual de "cliente decide, servidor guarda" que juego_records).

Tabla: logros_desbloqueados (id_usuaria, logro_id, desbloqueado_at)
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text

from app.database.connection import get_db
from app.models.models import Usuaria
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/logros", tags=["Logros"])


class DesbloquearLogroBody(BaseModel):
    logro_id: str


@router.get("")
def listar_logros(
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Devuelve la lista de logro_id que ya ha desbloqueado la usuaria."""
    rows = db.execute(
        sql_text("SELECT logro_id FROM logros_desbloqueados WHERE id_usuaria = :uid"),
        {"uid": str(current_user.id_usuaria)},
    ).fetchall()
    return [r[0] for r in rows]


@router.post("/desbloquear")
def desbloquear_logro(
    body: DesbloquearLogroBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Marca un logro como desbloqueado. Idempotente: si ya estaba, no hace
    nada y avisa con nuevo=False para que el cliente no repita la notificación."""
    if not body.logro_id.strip():
        return {"nuevo": False}

    ya_existe = db.execute(
        sql_text("SELECT 1 FROM logros_desbloqueados WHERE id_usuaria = :uid AND logro_id = :lid"),
        {"uid": str(current_user.id_usuaria), "lid": body.logro_id},
    ).scalar()

    if ya_existe:
        return {"nuevo": False}

    db.execute(
        sql_text("""
            INSERT INTO logros_desbloqueados (id_usuaria, logro_id)
            VALUES (:uid, :lid) ON CONFLICT DO NOTHING
        """),
        {"uid": str(current_user.id_usuaria), "lid": body.logro_id},
    )
    db.commit()
    return {"nuevo": True}

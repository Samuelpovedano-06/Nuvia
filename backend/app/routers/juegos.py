"""Récords de minijuegos por usuaria.

Tabla: juego_records (id_usuaria, juego, record, updated_at)
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text as sql_text

from app.database.connection import get_db
from app.models.models import Usuaria
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/juegos", tags=["Juegos"])


class GuardarRecordBody(BaseModel):
    juego: str
    puntos: int


@router.get("/records")
def listar_records(
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Devuelve los récords de la usuaria como {juego: puntos}."""
    rows = db.execute(
        sql_text("SELECT juego, record FROM juego_records WHERE id_usuaria = :uid"),
        {"uid": str(current_user.id_usuaria)},
    ).fetchall()
    return {r[0]: r[1] for r in rows}


@router.post("/record")
def guardar_record(
    body: GuardarRecordBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Solo actualiza si los puntos enviados son mayores que el récord guardado.
    Devuelve el récord vigente (el nuevo si superó, o el anterior si no)."""
    if body.puntos < 0:
        raise HTTPException(status_code=400, detail="puntos inválidos")
    if not body.juego.strip():
        raise HTTPException(status_code=400, detail="juego vacío")

    actual = db.execute(
        sql_text("SELECT record FROM juego_records WHERE id_usuaria = :uid AND juego = :j"),
        {"uid": str(current_user.id_usuaria), "j": body.juego},
    ).scalar()

    if actual is None:
        db.execute(
            sql_text("""
                INSERT INTO juego_records (id_usuaria, juego, record, updated_at)
                VALUES (:uid, :j, :p, NOW())
            """),
            {"uid": str(current_user.id_usuaria), "j": body.juego, "p": body.puntos},
        )
        db.commit()
        return {"record": body.puntos, "mejorado": True}

    if body.puntos > actual:
        db.execute(
            sql_text("""
                UPDATE juego_records SET record = :p, updated_at = NOW()
                WHERE id_usuaria = :uid AND juego = :j
            """),
            {"uid": str(current_user.id_usuaria), "j": body.juego, "p": body.puntos},
        )
        db.commit()
        return {"record": body.puntos, "mejorado": True}

    return {"record": actual, "mejorado": False}

"""Monedas y accesorios de la mascota (Nuvia) — compartidos por la pareja.

La mascota es una sola por vínculo (usuaria + pareja), así que las dos
cuentas deben leer y escribir siempre la misma fila. Como la tabla
`parejas` no tiene un id de "pareja" canónico, se resuelve en cada request
al id de usuaria menor (orden lexicográfico de UUID) entre los dos
vinculados — así ambas cuentas convergen siempre a la misma fila sin
necesitar una tabla/columna nueva ni duplicar escrituras.

Tablas: usuarias.monedas / usuarias.accesorio_equipado / usuarias.accesorio_lado
        accesorios_comprados (id_usuaria, accesorio_id, comprado_at)
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, text as sql_text

from app.database.connection import get_db
from app.models.models import Usuaria, Pareja
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/tienda", tags=["Tienda"])


def _uid_compartido(db: Session, current_user: Usuaria) -> str:
    """Id de usuaria bajo el que vive el estado compartido de la mascota:
    si hay pareja vinculada, el menor de los dos UUID; si no, el propio."""
    mi_id = str(current_user.id_usuaria)
    vinculo = db.query(Pareja).filter(
        or_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == current_user.id_usuaria)
    ).first()
    if not vinculo:
        return mi_id
    otro_id = str(vinculo.id_pareja if vinculo.id_usuaria == current_user.id_usuaria else vinculo.id_usuaria)
    return min(mi_id, otro_id)

# Precios del catálogo (reflejan ACCESORIOS en frontend/src/components/DormitorioSection.jsx).
# Se validan en servidor para no confiar en el precio que mande el cliente.
PRECIOS_ACCESORIOS = {
    'ninguno': 0,
    'gorro_noche': 30,
    'antifaz': 45,
    'lazo_rosa': 50,
    'zapatillas_conejo': 60,
    'corona_flores': 80,
}
LADOS_VALIDOS = {'izquierda', 'derecha'}


class SumarMonedasBody(BaseModel):
    cantidad: int


class ComprarBody(BaseModel):
    accesorio_id: str


class EquiparBody(BaseModel):
    accesorio_id: str
    lado: Optional[str] = None


def _estado(db: Session, uid: str):
    row = db.execute(
        sql_text("SELECT monedas, accesorio_equipado, accesorio_lado FROM usuarias WHERE id_usuaria = :uid"),
        {"uid": uid},
    ).fetchone()
    comprados = db.execute(
        sql_text("SELECT accesorio_id FROM accesorios_comprados WHERE id_usuaria = :uid"),
        {"uid": uid},
    ).fetchall()
    return {
        "monedas": row[0],
        "equipado": row[1],
        "lado": row[2],
        "comprados": ["ninguno"] + [r[0] for r in comprados],
    }


@router.get("/estado")
def obtener_estado(
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    return _estado(db, _uid_compartido(db, current_user))


@router.post("/monedas")
def sumar_monedas(
    body: SumarMonedasBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Suma (o resta) monedas ganadas en los minijuegos. Nunca queda por debajo de 0."""
    uid = _uid_compartido(db, current_user)
    db.execute(
        sql_text("UPDATE usuarias SET monedas = GREATEST(0, monedas + :c) WHERE id_usuaria = :uid"),
        {"c": body.cantidad, "uid": uid},
    )
    db.commit()
    monedas = db.execute(
        sql_text("SELECT monedas FROM usuarias WHERE id_usuaria = :uid"), {"uid": uid}
    ).scalar()
    return {"monedas": monedas}


@router.post("/comprar")
def comprar_accesorio(
    body: ComprarBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Compra (si no la tiene ya) y equipa un accesorio. El precio se valida en servidor."""
    uid = _uid_compartido(db, current_user)
    if body.accesorio_id not in PRECIOS_ACCESORIOS:
        raise HTTPException(status_code=400, detail="accesorio desconocido")

    ya_comprado = body.accesorio_id == 'ninguno' or db.execute(
        sql_text("SELECT 1 FROM accesorios_comprados WHERE id_usuaria = :uid AND accesorio_id = :a"),
        {"uid": uid, "a": body.accesorio_id},
    ).scalar()

    if not ya_comprado:
        precio = PRECIOS_ACCESORIOS[body.accesorio_id]
        monedas = db.execute(
            sql_text("SELECT monedas FROM usuarias WHERE id_usuaria = :uid"), {"uid": uid}
        ).scalar()
        if monedas < precio:
            raise HTTPException(status_code=400, detail="monedas insuficientes")
        db.execute(
            sql_text("UPDATE usuarias SET monedas = monedas - :p WHERE id_usuaria = :uid"),
            {"p": precio, "uid": uid},
        )
        db.execute(
            sql_text("""
                INSERT INTO accesorios_comprados (id_usuaria, accesorio_id)
                VALUES (:uid, :a) ON CONFLICT DO NOTHING
            """),
            {"uid": uid, "a": body.accesorio_id},
        )

    db.execute(
        sql_text("UPDATE usuarias SET accesorio_equipado = :a WHERE id_usuaria = :uid"),
        {"a": body.accesorio_id, "uid": uid},
    )
    db.commit()
    return _estado(db, uid)


@router.post("/equipar")
def equipar_accesorio(
    body: EquiparBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Cambia el accesorio equipado (debe estar ya comprado) y/o el lado del lazo."""
    uid = _uid_compartido(db, current_user)
    if body.accesorio_id != 'ninguno':
        poseido = db.execute(
            sql_text("SELECT 1 FROM accesorios_comprados WHERE id_usuaria = :uid AND accesorio_id = :a"),
            {"uid": uid, "a": body.accesorio_id},
        ).scalar()
        if not poseido:
            raise HTTPException(status_code=400, detail="accesorio no comprado")

    if body.lado and body.lado in LADOS_VALIDOS:
        db.execute(
            sql_text("UPDATE usuarias SET accesorio_equipado = :a, accesorio_lado = :l WHERE id_usuaria = :uid"),
            {"a": body.accesorio_id, "l": body.lado, "uid": uid},
        )
    else:
        db.execute(
            sql_text("UPDATE usuarias SET accesorio_equipado = :a WHERE id_usuaria = :uid"),
            {"a": body.accesorio_id, "uid": uid},
        )
    db.commit()
    return _estado(db, uid)

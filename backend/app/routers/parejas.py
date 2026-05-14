from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional
from app.database.connection import get_db
from app.models.models import Usuaria, Pareja
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/parejas", tags=["Parejas"])


@router.get("/")
def listar_vinculos(
    vista: Optional[str] = Query(None),  # "pareja" o "usuaria"
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    """
    vista=pareja  → soy id_pareja, veo a las usuarias a las que estoy vinculada.
    vista=usuaria → soy id_usuaria, veo a las parejas vinculadas a mí.
    Sin vista      → se decide por rol.
    """
    como_pareja = vista == "pareja" or (vista is None and current_user.rol == "pareja")

    if como_pareja:
        rows = db.query(Pareja).filter(Pareja.id_pareja == current_user.id_usuaria).all()
        return [
            {"id": str(r.id), "id_usuaria": str(r.id_usuaria), "nombre": r.usuaria.nombre}
            for r in rows
        ]
    else:
        rows = db.query(Pareja).filter(Pareja.id_usuaria == current_user.id_usuaria).all()
        return [
            {"id": str(r.id), "id_pareja": str(r.id_pareja), "nombre": r.pareja.nombre}
            for r in rows
        ]


@router.delete("/{vinculo_id}", status_code=204)
def desvincular(vinculo_id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    row = db.query(Pareja).filter(Pareja.id == vinculo_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Vínculo no encontrado")
    if row.id_usuaria != current_user.id_usuaria and row.id_pareja != current_user.id_usuaria:
        raise HTTPException(status_code=403, detail="Sin permiso")
    db.delete(row)
    db.commit()

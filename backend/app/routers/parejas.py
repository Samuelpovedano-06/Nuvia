from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Pareja
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/parejas", tags=["Parejas"])


@router.get("/")
def listar_vinculos(db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    """
    Usuaria  → devuelve todas las parejas vinculadas a ella.
    Pareja   → devuelve todas las usuarias a las que está vinculada.
    """
    if current_user.rol in ("usuaria", "admin"):
        rows = db.query(Pareja).filter(Pareja.id_usuaria == current_user.id_usuaria).all()
        return [
            {"id": str(r.id), "id_pareja": str(r.id_pareja), "nombre": r.pareja.nombre}
            for r in rows
        ]
    else:
        rows = db.query(Pareja).filter(Pareja.id_pareja == current_user.id_usuaria).all()
        return [
            {"id": str(r.id), "id_usuaria": str(r.id_usuaria), "nombre": r.usuaria.nombre}
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

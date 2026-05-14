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
    Si se especifica vista, se filtra por esa posición.
    Si no se especifica y el usuario es usuaria/admin, se devuelven TODOS los vínculos
    donde participe (como usuaria o como pareja).
    """
    if vista == "pareja":
        rows = db.query(Pareja).filter(Pareja.id_pareja == current_user.id_usuaria).all()
        return [
            {"id": str(r.id), "id_usuaria": str(r.id_usuaria), "id_pareja": str(r.id_pareja), "nombre": r.usuaria.nombre}
            for r in rows
        ]
    elif vista == "usuaria":
        rows = db.query(Pareja).filter(Pareja.id_usuaria == current_user.id_usuaria).all()
        return [
            {"id": str(r.id), "id_usuaria": str(r.id_usuaria), "id_pareja": str(r.id_pareja), "nombre": r.pareja.nombre}
            for r in rows
        ]
    
    # Comportamiento por defecto (sin vista)
    if current_user.rol in ["usuaria", "admin"]:
        # Devolver todos donde participe
        from sqlalchemy import or_
        rows = db.query(Pareja).filter(or_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == current_user.id_usuaria)).all()
        result = []
        for r in rows:
            # Determinar quién es el "otro"
            if r.id_usuaria == current_user.id_usuaria:
                other_id = r.id_pareja
                other_name = r.pareja.nombre
            else:
                other_id = r.id_usuaria
                other_name = r.usuaria.nombre
            
            result.append({
                "id": str(r.id),
                "id_usuaria": str(r.id_usuaria),
                "id_pareja": str(r.id_pareja),
                "other_id": str(other_id),
                "nombre": other_name
            })
        return result
    else:
        # Rol pareja por defecto
        rows = db.query(Pareja).filter(Pareja.id_pareja == current_user.id_usuaria).all()
        return [
            {"id": str(r.id), "id_usuaria": str(r.id_usuaria), "id_pareja": str(r.id_pareja), "nombre": r.usuaria.nombre}
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

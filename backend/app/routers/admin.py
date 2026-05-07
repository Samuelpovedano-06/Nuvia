from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria
from app.schemas.schemas import UsuariaOut, UsuariaCreate
from app.routers.auth_utils import get_current_user, hash_password

router = APIRouter(prefix="/admin", tags=["Administración"])

# Función para verificar si el usuario es administrador
def require_admin(current_user: Usuaria = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren privilegios de administrador"
        )
    return current_user

@router.get("/users", response_model=List[UsuariaOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Lista todas las usuarias del sistema."""
    return db.query(Usuaria).all()

@router.post("/users", response_model=UsuariaOut, status_code=201)
def create_user_admin(datos: UsuariaCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Crea una nueva usuaria desde el panel de admin."""
    existente = db.query(Usuaria).filter(Usuaria.email == datos.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    nueva = Usuaria(
        nombre=datos.nombre,
        email=datos.email,
        password_hash=hash_password(datos.password),
        rol=datos.rol or "usuaria"
    )
    db.add(nueva)
    db.flush()
    
    config = ConfiguracionUsuaria(id_usuaria=nueva.id_usuaria)
    db.add(config)
    db.commit()
    db.refresh(nueva)
    return nueva

@router.put("/users/{id_usuaria}", response_model=UsuariaOut)
def update_user_admin(id_usuaria: UUID, datos: UsuariaCreate, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Actualiza los datos de una usuaria."""
    usuaria = db.query(Usuaria).filter(Usuaria.id_usuaria == id_usuaria).first()
    if not usuaria:
        raise HTTPException(status_code=404, detail="Usuaria no encontrada")

    usuaria.nombre = datos.nombre
    usuaria.email = datos.email
    if datos.password:
        usuaria.password_hash = hash_password(datos.password)
    usuaria.rol = datos.rol or "usuaria"
    
    db.commit()
    db.refresh(usuaria)
    return usuaria

@router.delete("/users/{id_usuaria}", status_code=204)
def delete_user_admin(id_usuaria: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(require_admin)):
    """Elimina una usuaria y todos sus datos asociados (cascada)."""
    if id_usuaria == current_user.id_usuaria:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")

    usuaria = db.query(Usuaria).filter(Usuaria.id_usuaria == id_usuaria).first()
    if not usuaria:
        raise HTTPException(status_code=404, detail="Usuaria no encontrada")

    db.delete(usuaria)
    db.commit()
    return None

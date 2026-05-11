from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID
from datetime import date, timedelta
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria, Ciclo, RegistroSintoma
from app.schemas.schemas import UsuariaOut, UsuariaCreate, AdminStatsOut
from app.routers.auth_utils import get_current_user, hash_password

router = APIRouter(prefix="/admin", tags=["Administración"])

def require_admin(current_user: Usuaria = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren privilegios de administrador"
        )
    return current_user

@router.get("/stats", response_model=AdminStatsOut)
def get_admin_stats(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Obtiene estadísticas reales del sistema."""
    hoy = date.today()
    hace_una_semana = hoy - timedelta(days=7)
    hace_dos_semanas = hoy - timedelta(days=14)

    # 1. Totales
    total_users = db.query(Usuaria).count()
    total_ciclos = db.query(Ciclo).count()
    
    # 2. Registros de hoy (síntomas)
    registros_hoy = db.query(RegistroSintoma).filter(RegistroSintoma.fecha == hoy).count()
    
    # 3. Crecimiento Semanal (Usuarias nuevas esta semana vs semana pasada)
    users_esta_semana = db.query(Usuaria).filter(Usuaria.fecha_registro >= hace_una_semana).count()
    users_semana_pasada = db.query(Usuaria).filter(
        Usuaria.fecha_registro >= hace_dos_semanas,
        Usuaria.fecha_registro < hace_una_semana
    ).count()
    
    # Cálculo de porcentaje
    if users_semana_pasada == 0:
        crecimiento = 100.0 if users_esta_semana > 0 else 0.0
    else:
        crecimiento = ((users_esta_semana - users_semana_pasada) / users_semana_pasada) * 100
        
    return {
        "total_users": total_users,
        "total_ciclos": total_ciclos,
        "registros_hoy": registros_hoy,
        "crecimiento_semanal": round(crecimiento, 2)
    }

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

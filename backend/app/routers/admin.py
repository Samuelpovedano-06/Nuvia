from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from uuid import UUID
from datetime import date, datetime, timedelta
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria, Ciclo, RegistroSintoma, RegistroDiario, ConfiguracionSistema
from app.schemas.schemas import UsuariaOut, UsuariaCreate, AdminStatsOut, AdminConfigOut, AdminConfigUpdate
from app.routers.auth_utils import get_current_user, hash_password

from app.utils.logs import get_logs

router = APIRouter(prefix="/admin", tags=["Administración"])

def require_admin(current_user: Usuaria = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acceso denegado: Se requieren privilegios de administrador"
        )
    return current_user

@router.get("/logs")
def list_system_logs(_=Depends(require_admin)):
    """Obtiene los últimos logs del servidor."""
    return get_logs()

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

@router.get("/export")
def export_data(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Exporta todos los datos críticos de usuarias para backup o análisis."""
    users = db.query(Usuaria).all()
    export_list = []
    
    for u in users:
        ciclos_count = db.query(Ciclo).filter(Ciclo.id_usuaria == u.id_usuaria).count()
        export_list.append({
            "id": str(u.id_usuaria),
            "nombre": u.nombre,
            "email": u.email,
            "rol": u.rol,
            "fecha_registro": u.fecha_registro.isoformat() if u.fecha_registro else None,
            "ultimo_acceso": u.ultimo_acceso.isoformat() if u.ultimo_acceso else None,
            "total_ciclos": ciclos_count
        })
    
    import json
    content = json.dumps(export_list, indent=4, ensure_ascii=False)
    
    from fastapi import Response
    return Response(
        content=content,
        media_type="application/json",
        headers={
            "Content-Disposition": f"attachment; filename=nuvia_export_{datetime.now().strftime('%Y-%m-%d')}.json"
        }
    )

@router.get("/users", response_model=List[UsuariaOut])
def list_users(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Lista todas las usuarias del sistema con estadísticas detalladas."""
    users = db.query(Usuaria).all()
    hoy = datetime.now()
    
    for user in users:
        # Conteos básicos
        user.total_ciclos = db.query(Ciclo).filter(Ciclo.id_usuaria == user.id_usuaria).count()
        user.total_sintomas = db.query(RegistroSintoma).filter(RegistroSintoma.id_usuaria == user.id_usuaria).count()
        
        # Conteo de notas (Registros diarios con texto)
        user.total_notas = db.query(RegistroDiario).filter(
            RegistroDiario.id_usuaria == user.id_usuaria,
            RegistroDiario.notas != None,
            RegistroDiario.notas != ""
        ).count()
        
        # Última fecha de periodo
        ultimo_ciclo = db.query(Ciclo).filter(Ciclo.id_usuaria == user.id_usuaria).order_by(Ciclo.fecha_inicio.desc()).first()
        user.ultima_fecha_periodo = ultimo_ciclo.fecha_inicio if ultimo_ciclo else None
        
        # Estado de actividad
        if user.ultimo_acceso:
            diff = (hoy - user.ultimo_acceso).days
            user.estado = "Inactiva" if diff > 30 else "Activa"
        else:
            user.estado = "Pendiente"
            
    return users

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
    
    config = ConfiguracionUsuaria(
        id_usuaria=nueva.id_usuaria,
        fecha_nacimiento=datos.fecha_nacimiento
    )
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

@router.get("/config", response_model=AdminConfigOut)
def get_system_config(db: Session = Depends(get_db), _=Depends(require_admin)):
    """Obtiene la configuración global del sistema."""
    config = db.query(ConfiguracionSistema).first()
    if not config:
        # Crear configuración inicial si no existe
        config = ConfiguracionSistema()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/config", response_model=AdminConfigOut)
def update_system_config(datos: AdminConfigUpdate, db: Session = Depends(get_db), _=Depends(require_admin)):
    """Actualiza la configuración global del sistema."""
    config = db.query(ConfiguracionSistema).first()
    if not config:
        config = ConfiguracionSistema()
        db.add(config)
    
    # Actualizar campos
    for key, value in datos.dict(exclude_unset=True).items():
        setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    return config

@router.get("/status/public")
def get_public_status(response: Response, db: Session = Depends(get_db)):
    """Endpoint público para verificar el estado del sistema (mantenimiento y rangos)."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    config = db.query(ConfiguracionSistema).first()
    if not config:
        return {
            "modo_mantenimiento": False,
            "min_dias_ciclo": 21,
            "max_dias_ciclo": 45,
            "min_dias_periodo": 3,
            "max_dias_periodo": 10
        }
    return {
        "modo_mantenimiento": config.modo_mantenimiento,
        "min_dias_ciclo": config.min_dias_ciclo if config.min_dias_ciclo is not None else 21,
        "max_dias_ciclo": config.max_dias_ciclo if config.max_dias_ciclo is not None else 45,
        "min_dias_periodo": config.min_dias_periodo if config.min_dias_periodo is not None else 3,
        "max_dias_periodo": config.max_dias_periodo if config.max_dias_periodo is not None else 10
    }

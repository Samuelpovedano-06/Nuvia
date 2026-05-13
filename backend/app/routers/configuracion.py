from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria
from app.schemas.schemas import ConfiguracionUpdate, ConfiguracionOut
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/configuracion", tags=["Configuración"])


@router.get("/", response_model=ConfiguracionOut)
def obtener_configuracion(db: Session = Depends(get_db),
                          current_user: Usuaria = Depends(get_current_user)):
    config = db.query(ConfiguracionUsuaria)\
               .filter(ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria)\
               .first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return config


@router.put("/")
def actualizar_configuracion(datos: ConfiguracionUpdate,
                              db: Session = Depends(get_db),
                              current_user: Usuaria = Depends(get_current_user)):
    config = db.query(ConfiguracionUsuaria)\
               .filter(ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria)\
               .first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if campo == "codigo_pareja":
            if valor:
                # Validar que el código existe y no es el propio
                if valor == current_user.mi_codigo:
                    return {"error": "No puedes vincularte a tu propio código."}
                
                objetivo = db.query(Usuaria).filter(Usuaria.mi_codigo == valor).first()
                if not objetivo:
                    return {"error": "El código de pareja no es válido o no existe."}
                
                # Si es un usuario con rol 'pareja', creamos una solicitud en el objetivo
                if current_user.rol == "pareja":
                    objetivo.solicitud_id = current_user.id_usuaria
                    objetivo.solicitud_estado = "pendiente"
                    # No vinculamos todavía, solo guardamos el estado en el solicitante si fuera necesario
                    # Pero el requerimiento dice que al de la pareja le salga en "pendiente"
                    current_user.solicitud_estado = "enviada"
                else:
                    # Si es admin o usuaria normal, vinculación directa (o según lógica)
                    current_user.codigo_pareja = valor
        else:
            setattr(config, campo, valor)
    db.commit()
    db.refresh(config)
    return config

@router.post("/aceptar-pareja")
def aceptar_pareja(db: Session = Depends(get_db),
                   current_user: Usuaria = Depends(get_current_user)):
    if not current_user.solicitud_id or current_user.solicitud_estado != "pendiente":
        return {"error": "No tienes ninguna solicitud pendiente."}
    
    solicitante = db.query(Usuaria).filter(Usuaria.id_usuaria == current_user.solicitud_id).first()
    if not solicitante:
        return {"error": "El usuario solicitante ya no existe."}
    
    # Vincular ambos
    current_user.codigo_pareja = solicitante.mi_codigo
    solicitante.codigo_pareja = current_user.mi_codigo
    
    # Limpiar estados de solicitud
    current_user.solicitud_id = None
    current_user.solicitud_estado = None
    solicitante.solicitud_estado = None
    
    db.commit()
    return {"message": "Pareja vinculada con éxito."}

@router.post("/rechazar-pareja")
def rechazar_pareja(db: Session = Depends(get_db),
                    current_user: Usuaria = Depends(get_current_user)):
    if not current_user.solicitud_id or current_user.solicitud_estado != "pendiente":
        return {"error": "No tienes ninguna solicitud pendiente."}
    
    solicitante = db.query(Usuaria).filter(Usuaria.id_usuaria == current_user.solicitud_id).first()
    if solicitante:
        # Marcar como rechazada para que el solicitante vea el popup
        solicitante.solicitud_estado = "rechazada"
        solicitante.codigo_pareja = None # Limpiar cualquier intento
    
    # Limpiar en el que rechaza
    current_user.solicitud_id = None
    current_user.solicitud_estado = None
    
    db.commit()
    return {"message": "Solicitud rechazada."}

@router.post("/limpiar-rechazo")
def limpiar_rechazo(db: Session = Depends(get_db),
                    current_user: Usuaria = Depends(get_current_user)):
    """Limpia el estado de rechazada para quitar el popup."""
    current_user.solicitud_estado = None
    db.commit()
    return {"message": "Estado limpiado."}

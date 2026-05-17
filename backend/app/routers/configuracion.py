from uuid import UUID
from datetime import time as dtime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria, Pareja
from app.schemas.schemas import ConfiguracionUpdate, ConfiguracionOut
from app.routers.auth_utils import get_current_user
from app.utils.push import enviar_a_usuaria

router = APIRouter(prefix="/configuracion", tags=["Configuración"])


def _serialize_config(c: ConfiguracionUsuaria) -> dict:
    return {
        "id_usuaria": str(c.id_usuaria),
        "notificaciones": c.notificaciones or 0,
        "recordatorio_ciclo": c.recordatorio_ciclo or 0,
        "privacidad_estricta": c.privacidad_estricta or 0,
        "duracion_ciclo": c.duracion_ciclo or 28,
        "duracion_periodo": c.duracion_periodo or 5,
        "fecha_nacimiento": c.fecha_nacimiento,
        "modo_oscuro": c.modo_oscuro or 0,
        "hora_pastilla": c.hora_pastilla.strftime("%H:%M") if c.hora_pastilla else None,
        "recordatorio_pastilla": c.recordatorio_pastilla or 0,
    }


@router.get("/", response_model=ConfiguracionOut)
def obtener_configuracion(id_usuaria: UUID = None, db: Session = Depends(get_db),
                          current_user: Usuaria = Depends(get_current_user)):
    """Obtiene la configuración de la usuaria o vinculada."""
    target_id = current_user.id_usuaria
    if id_usuaria:
        if current_user.rol == "admin":
            target_id = id_usuaria
        else:
            # Verificar vínculo
            link = db.query(Pareja).filter(
                Pareja.id_usuaria == id_usuaria,
                Pareja.id_pareja == current_user.id_usuaria
            ).first()
            if not link:
                raise HTTPException(status_code=403, detail="No tienes acceso a los datos de esta usuaria")
            target_id = id_usuaria

    config = db.query(ConfiguracionUsuaria)\
               .filter(ConfiguracionUsuaria.id_usuaria == target_id)\
               .first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return _serialize_config(config)


@router.put("/")
def actualizar_configuracion(datos: ConfiguracionUpdate,
                              db: Session = Depends(get_db),
                              current_user: Usuaria = Depends(get_current_user)):
    config = db.query(ConfiguracionUsuaria)\
               .filter(ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria)\
               .first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    objetivo_push = None
    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if campo == "codigo_pareja":
            if valor:
                if valor == current_user.mi_codigo:
                    return {"error": "No puedes vincularte a tu propio código."}
                objetivo = db.query(Usuaria).filter(Usuaria.mi_codigo == valor).first()
                if not objetivo:
                    return {"error": "El código no es válido o no existe."}
                objetivo.solicitud_id = current_user.id_usuaria
                objetivo.solicitud_estado = "pendiente"
                current_user.solicitud_estado = "enviada"
                objetivo_push = objetivo
        elif campo == "hora_pastilla":
            if not valor:
                config.hora_pastilla = None
            else:
                try:
                    hh, mm = valor.split(":")
                    config.hora_pastilla = dtime(int(hh), int(mm))
                except Exception:
                    raise HTTPException(status_code=400, detail="hora_pastilla debe tener formato HH:MM")
        else:
            setattr(config, campo, valor)
    db.commit()
    db.refresh(config)

    if objetivo_push is not None:
        try:
            enviar_a_usuaria(
                db, objetivo_push.id_usuaria,
                title="💞 Solicitud de pareja",
                body=f"{current_user.nombre} quiere vincularse contigo en Nuvia",
                data={"tipo": "pareja_solicitud"},
            )
        except Exception as e:
            print(f"[push pareja_solicitud] {e}")

    return _serialize_config(config)

@router.post("/aceptar-pareja")
def aceptar_pareja(db: Session = Depends(get_db),
                   current_user: Usuaria = Depends(get_current_user)):
    if not current_user.solicitud_id or current_user.solicitud_estado != "pendiente":
        return {"error": "No tienes ninguna solicitud pendiente."}
    
    solicitante = db.query(Usuaria).filter(Usuaria.id_usuaria == current_user.solicitud_id).first()
    if not solicitante:
        return {"error": "El usuario solicitante ya no existe."}
    
    # Crear vínculo en tabla parejas (usuaria acepta → ella es id_usuaria, solicitante es id_pareja)
    vinculo = Pareja(id_usuaria=current_user.id_usuaria, id_pareja=solicitante.id_usuaria)
    db.add(vinculo)

    # Limpiar estados de solicitud
    id_solicitante = solicitante.id_usuaria
    nombre_solicitante = solicitante.nombre
    current_user.solicitud_id = None
    current_user.solicitud_estado = None
    solicitante.solicitud_estado = None

    db.commit()

    try:
        enviar_a_usuaria(
            db, id_solicitante,
            title="💞 Solicitud aceptada",
            body=f"{current_user.nombre} ha aceptado tu solicitud de pareja",
            data={"tipo": "pareja_aceptada"},
        )
    except Exception as e:
        print(f"[push pareja_aceptada] {e}")

    return {"message": "Pareja vinculada con éxito.", "nombre": nombre_solicitante}

@router.post("/rechazar-pareja")
def rechazar_pareja(db: Session = Depends(get_db),
                    current_user: Usuaria = Depends(get_current_user)):
    if not current_user.solicitud_id or current_user.solicitud_estado != "pendiente":
        return {"error": "No tienes ninguna solicitud pendiente."}
    
    solicitante = db.query(Usuaria).filter(Usuaria.id_usuaria == current_user.solicitud_id).first()
    if solicitante:
        # Marcar como rechazada para que el solicitante vea el popup
        solicitante.solicitud_estado = "rechazada"
    
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

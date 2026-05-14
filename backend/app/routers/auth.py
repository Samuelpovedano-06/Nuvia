from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random
import string
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria, Pareja
from sqlalchemy import or_
from app.schemas.schemas import UsuariaCreate, UsuariaLogin, UsuariaOut, Token, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from app.routers.auth_utils import hash_password, verify_password, create_access_token, get_current_user
from app.utils.email import enviar_otp_email

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/registro", response_model=UsuariaOut, status_code=201)
def registrar_usuaria(datos: UsuariaCreate, db: Session = Depends(get_db)):
    """Registra una nueva usuaria y crea su configuración por defecto."""

    # Comprobar si el email ya existe
    existente = db.query(Usuaria).filter(Usuaria.email == datos.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    # Solo usuaria/admin generan mi_codigo para compartir con parejas
    mi_codigo = None
    if (datos.rol or "usuaria") in ["usuaria", "admin"]:
        while True:
            mi_codigo = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            if not db.query(Usuaria).filter(Usuaria.mi_codigo == mi_codigo).first():
                break

    nueva = Usuaria(
        nombre        = datos.nombre,
        email         = datos.email,
        password_hash = hash_password(datos.password),
        rol           = datos.rol or "usuaria",
        mi_codigo     = mi_codigo,
    )
    db.add(nueva)
    db.flush()  # obtener id_usuaria antes del commit

    config_kwargs = {"id_usuaria": nueva.id_usuaria}
    if datos.fecha_nacimiento is not None:
        config_kwargs["fecha_nacimiento"] = datos.fecha_nacimiento
    config = ConfiguracionUsuaria(**config_kwargs)
    db.add(config)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.post("/login")
def login(datos: UsuariaLogin, db: Session = Depends(get_db)):
    """Devuelve un JWT si las credenciales son correctas."""

    usuaria = db.query(Usuaria).filter(Usuaria.email == datos.email).first()
    if not usuaria or not verify_password(datos.password, usuaria.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    # Validaciones de plataforma
    plataforma = datos.plataforma or "usuaria"

    if plataforma == "pareja" and usuaria.rol != "admin":
        # Puede entrar como pareja si tiene al menos un vínculo donde es id_pareja
        es_pareja = db.query(Pareja).filter(Pareja.id_pareja == usuaria.id_usuaria).first()
        if not es_pareja:
            return {"error": "No tienes ninguna pareja vinculada para acceder a esta vista."}

    if plataforma == "usuaria" and usuaria.rol == "pareja":
        # Pareja pura no tiene vista de usuaria
        return {"error": "Como pareja, accede desde el panel de Pareja."}
    
    token = create_access_token(data={"sub": str(usuaria.id_usuaria)})
    
    # Actualizar último acceso
    usuaria.ultimo_acceso = datetime.now()
    db.commit()

    return {"access_token": token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(datos: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Genera un OTP y lo envía por email."""
    try:
        usuaria = db.query(Usuaria).filter(Usuaria.email == datos.email).first()
        if not usuaria:
            raise HTTPException(status_code=404, detail="El email no corresponde a ninguna cuenta registrada")

        # Generar OTP de 6 dígitos
        otp = ''.join(random.choices(string.digits, k=6))
        usuaria.otp = otp
        usuaria.otp_expiry = datetime.now() + timedelta(minutes=10)
        db.commit()

        # Enviar email (ahora devuelve tupla exito, detalle)
        exito, detalle = enviar_otp_email(usuaria.email, usuaria.nombre, otp)
        if not exito:
            raise HTTPException(status_code=500, detail=detalle)

        return {"message": "Código enviado correctamente a tu email"}
    except HTTPException as he:
        raise he
    except Exception as e:
        # Aquí capturamos errores de base de datos u otros
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")


@router.post("/verify-otp")
def verify_otp_endpoint(datos: VerifyOTPRequest, db: Session = Depends(get_db)):
    """Verifica si el OTP es válido y no ha caducado."""
    usuaria = db.query(Usuaria).filter(Usuaria.email == datos.email, Usuaria.otp == datos.otp).first()
    
    if not usuaria:
        raise HTTPException(status_code=400, detail="Código inválido")
    
    if usuaria.otp_expiry < datetime.now():
        raise HTTPException(status_code=400, detail="El código ha caducado")

    return {"message": "Código verificado correctamente"}


@router.post("/reset-password")
def reset_password(datos: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Cambia la contraseña usando el OTP verificado."""
    usuaria = db.query(Usuaria).filter(
        Usuaria.email == datos.email, 
        Usuaria.otp == datos.otp
    ).first()

    if not usuaria or usuaria.otp_expiry < datetime.now():
        raise HTTPException(status_code=400, detail="Solicitud inválida o caducada")

    # Actualizar password
    usuaria.password_hash = hash_password(datos.nueva_password)
    # Limpiar OTP tras uso
    usuaria.otp = None
    usuaria.otp_expiry = None
    db.commit()

    return {"message": "Contraseña actualizada con éxito"}


@router.get("/me", response_model=UsuariaOut)
def get_me(db: Session = Depends(get_db),
           current_user: Usuaria = Depends(get_current_user)):
    """Devuelve los datos de la usuaria autenticada."""
    if current_user.solicitud_id:
        solicitante = db.query(Usuaria).filter(Usuaria.id_usuaria == current_user.solicitud_id).first()
        if solicitante:
            current_user.nombre_solicitante = solicitante.nombre

    tiene_vinculos = db.query(Pareja).filter(
        or_(Pareja.id_usuaria == current_user.id_usuaria,
            Pareja.id_pareja  == current_user.id_usuaria)
    ).first() is not None
    current_user.tiene_vinculos = tiene_vinculos

    return current_user

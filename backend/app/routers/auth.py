from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import Response
from uuid import UUID
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import random
import string
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria, Pareja
from sqlalchemy import or_
from app.schemas.schemas import UsuariaCreate, UsuariaLogin, UsuariaOut, Token, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from app.routers.auth_utils import hash_password, verify_password, create_access_token, create_refresh_token, verify_refresh_token, get_current_user
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

    if usuaria.activo is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta cuenta ha sido desactivada. Contacta con el soporte.",
        )

    # Validaciones de plataforma
    plataforma = datos.plataforma or "usuaria"

    # Antes se bloqueaba el login de pareja sin vínculos. Ahora dejamos entrar igualmente
    # (verá las vistas relevantes desactivadas) para que pueda navegar a "Mi pareja" y
    # enviar una solicitud, o esperar a recibir una.

    if plataforma == "usuaria" and usuaria.rol == "pareja":
        # Pareja pura no tiene vista de usuaria
        return {"error": "Como pareja, accede desde el panel de Pareja."}
    
    token         = create_access_token(data={"sub": str(usuaria.id_usuaria)})
    refresh_token = create_refresh_token(data={"sub": str(usuaria.id_usuaria)})

    # Actualizar último acceso
    usuaria.ultimo_acceso = datetime.now()
    db.commit()

    return {"access_token": token, "refresh_token": refresh_token, "token_type": "bearer"}


class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh")
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)):
    """Renueva el access token usando un refresh token válido."""
    refresh = payload.refresh_token
    if not refresh:
        raise HTTPException(status_code=400, detail="refresh_token requerido")
    user_id = verify_refresh_token(refresh)
    if not user_id:
        raise HTTPException(status_code=401, detail="Refresh token inválido o expirado")
    import uuid
    user = db.query(Usuaria).filter(Usuaria.id_usuaria == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    new_token = create_access_token(data={"sub": user_id})
    return {"access_token": new_token, "token_type": "bearer"}


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


@router.put("/me/foto", status_code=200)
async def subir_foto_perfil(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    """Sube o reemplaza la foto de perfil de la usuaria autenticada."""
    contenido = await file.read()
    if len(contenido) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="La foto no puede superar 5 MB")
    current_user.foto_perfil = contenido
    current_user.foto_perfil_mime = file.content_type or "image/jpeg"
    db.commit()
    return {"ok": True}


@router.get("/foto/{id_usuaria}")
def get_foto_perfil(
    id_usuaria: UUID,
    db: Session = Depends(get_db),
    _: Usuaria = Depends(get_current_user)
):
    """Devuelve la foto de perfil de cualquier usuaria (requiere auth)."""
    usuaria = db.query(Usuaria).filter(Usuaria.id_usuaria == id_usuaria).first()
    if not usuaria or not usuaria.foto_perfil:
        raise HTTPException(status_code=404, detail="Sin foto de perfil")
    return Response(content=usuaria.foto_perfil, media_type=usuaria.foto_perfil_mime or "image/jpeg")

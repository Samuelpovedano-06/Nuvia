from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime


# ─────────────────────── AUTH ───────────────────────

class UsuariaCreate(BaseModel):
    nombre: str
    email: EmailStr
    password: str
    rol: Optional[str] = "usuaria"

class UsuariaLogin(BaseModel):
    email: EmailStr
    password: str

class UsuariaOut(BaseModel):
    id_usuaria: int
    nombre: str
    email: str
    rol: str
    fecha_registro: Optional[datetime]

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    nueva_password: str


# ─────────────────────── CICLOS ───────────────────────

class CicloCreate(BaseModel):
    fecha_inicio: date
    fecha_fin: Optional[date] = None
    duracion: Optional[int] = None
    regularidad_estimado: Optional[str] = None

class CicloUpdate(BaseModel):
    fecha_fin: Optional[date] = None
    duracion: Optional[int] = None
    regularidad_estimado: Optional[str] = None

class CicloOut(BaseModel):
    id_ciclo: int
    id_usuaria: int
    fecha_inicio: date
    fecha_fin: Optional[date]
    duracion: Optional[int]
    regularidad_estimado: Optional[str]

    class Config:
        from_attributes = True


# ─────────────────────── SÍNTOMAS ───────────────────────

class SintomaOut(BaseModel):
    id_sintoma: int
    nombre_sintoma: str
    categoria: Optional[str]

    class Config:
        from_attributes = True

class RegistroSintomaCreate(BaseModel):
    id_sintoma: int
    fecha: date
    intensidad: Optional[int] = None

class RegistroSintomaOut(BaseModel):
    id_registro: int
    id_usuaria: int
    id_sintoma: int
    fecha: date
    intensidad: Optional[int]

    class Config:
        from_attributes = True


# ─────────────────────── HISTORIAL ESTADO ───────────────────────

class HistorialEstadoCreate(BaseModel):
    estado_animo: str
    fecha: date

class HistorialEstadoOut(BaseModel):
    id_historial: int
    id_usuaria: int
    estado_animo: Optional[str]
    fecha: date

    class Config:
        from_attributes = True


# ─────────────────────── PREDICCIONES ───────────────────────

class PrediccionOut(BaseModel):
    id_prediccion: int
    id_usuaria: int
    proxima_menstruacion: Optional[date]
    ventana_fertil_inicio: Optional[date]
    ventana_fertil_fin: Optional[date]
    prediccion_ovulacion: Optional[date]

    class Config:
        from_attributes = True


# ─────────────────────── CONFIGURACIÓN ───────────────────────

class ConfiguracionUpdate(BaseModel):
    notificaciones_activadas: Optional[int] = None
    recordatorios_personalizados: Optional[str] = None
    tema_visual: Optional[str] = None

class ConfiguracionOut(BaseModel):
    id_config: int
    id_usuaria: int
    notificaciones_activadas: int
    recordatorios_personalizados: Optional[str]
    tema_visual: Optional[str]

    class Config:
        from_attributes = True

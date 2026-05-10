from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from uuid import UUID


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
    id_usuaria: UUID
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
    id_ciclo: UUID
    id_usuaria: UUID
    fecha_inicio: date
    fecha_fin: Optional[date]
    duracion: Optional[int]
    regularidad_estimado: Optional[str]

    class Config:
        from_attributes = True


# ─────────────────────── SÍNTOMAS ───────────────────────

class SintomaOut(BaseModel):
    id_sintoma: UUID
    nombre_sintoma: str
    categoria: Optional[str]

    class Config:
        from_attributes = True

class RegistroSintomaCreate(BaseModel):
    id_sintoma: UUID
    fecha: date
    intensidad: Optional[int] = None

class RegistroSintomaOut(BaseModel):
    id_registro: UUID
    id_usuaria: UUID
    id_sintoma: UUID
    fecha: date
    intensidad: Optional[int]

    class Config:
        from_attributes = True


# ─────────────────────── HISTORIAL ESTADO ───────────────────────

class HistorialEstadoCreate(BaseModel):
    estado_animo: str
    fecha: date

class HistorialEstadoOut(BaseModel):
    id_historial: UUID
    id_usuaria: UUID
    estado_animo: Optional[str]
    fecha: date

    class Config:
        from_attributes = True


# ─────────────────────── PREDICCIONES ───────────────────────

class PrediccionOut(BaseModel):
    id_prediccion: UUID
    id_usuaria: UUID
    proxima_menstruacion: Optional[date]
    ventana_fertil_inicio: Optional[date]
    ventana_fertil_fin: Optional[date]
    prediccion_ovulacion: Optional[date]

    class Config:
        from_attributes = True


# ─────────────────────── CONFIGURACIÓN ───────────────────────

class ConfiguracionUpdate(BaseModel):
    notificaciones: Optional[int] = None
    recordatorio_ciclo: Optional[int] = None
    privacidad_estricta: Optional[int] = None
    duracion_ciclo: Optional[int] = None
    edad: Optional[int] = None

class ConfiguracionOut(BaseModel):
    id_usuaria: UUID
    notificaciones: int
    recordatorio_ciclo: int
    privacidad_estricta: int
    duracion_ciclo: int
    edad: Optional[int] = None

    class Config:
        from_attributes = True


# ─────────────────────── REGISTROS DIARIOS (NOTAS, FLUJO, RELACIONES) ──────────

class RegistroDiarioCreate(BaseModel):
    fecha: date
    notas: Optional[str] = None
    flujo: Optional[str] = None
    relaciones: Optional[int] = 0

class RegistroDiarioOut(BaseModel):
    id: UUID
    id_usuaria: UUID
    fecha: date
    notas: Optional[str]
    flujo: Optional[str]
    relaciones: Optional[int] = 0

    class Config:
        from_attributes = True

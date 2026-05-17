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
    fecha_nacimiento: Optional[date] = None

class UsuariaLogin(BaseModel):
    email: EmailStr
    password: str
    plataforma: Optional[str] = "usuaria"

class UsuariaOut(BaseModel):
    id_usuaria: UUID
    nombre: str
    email: str
    rol: str
    mi_codigo: Optional[str] = None
    codigo_pareja: Optional[str] = None
    fecha_registro: Optional[datetime]
    ultimo_acceso: Optional[datetime]
    total_ciclos: Optional[int] = 0
    total_sintomas: Optional[int] = 0
    total_notas: Optional[int] = 0
    ultima_fecha_periodo: Optional[date] = None
    estado: Optional[str] = "Activa"
    solicitud_id: Optional[UUID] = None
    solicitud_estado: Optional[str] = None
    nombre_solicitante: Optional[str] = None
    tiene_vinculos: Optional[bool] = False

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
    privacidad_estricta: Optional[int] = None
    duracion_ciclo: Optional[int] = None
    duracion_periodo: Optional[int] = None
    fecha_nacimiento: Optional[date] = None
    modo_oscuro: Optional[int] = None
    codigo_pareja: Optional[str] = None  # usado solo para enviar solicitud de vinculación

class ConfiguracionOut(BaseModel):
    id_usuaria: UUID
    privacidad_estricta: int
    duracion_ciclo: int
    duracion_periodo: int
    fecha_nacimiento: Optional[date] = None
    modo_oscuro: int

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

# ─────────────────────── ADMIN STATS ───────────────────────

class AdminStatsOut(BaseModel):
    total_users: int
    total_ciclos: int
    registros_hoy: int
    crecimiento_semanal: float

# ─────────────────────── ADMIN CONFIG ───────────────────────

class AdminConfigUpdate(BaseModel):
    modo_mantenimiento: Optional[bool] = None
    max_dias_ciclo: Optional[int] = None
    min_dias_ciclo: Optional[int] = None
    max_dias_periodo: Optional[int] = None
    min_dias_periodo: Optional[int] = None

class AdminConfigOut(BaseModel):
    id: int
    modo_mantenimiento: bool
    max_dias_ciclo: int
    min_dias_ciclo: int
    max_dias_periodo: int
    min_dias_periodo: int
    ultima_actualizacion: datetime

    class Config:
        from_attributes = True

# ─────────────────────── CHAT ───────────────────────

class MensajeCreate(BaseModel):
    id_receptor: UUID
    contenido: Optional[str] = ""
    imagen_data: Optional[str] = None  # data URL base64 (data:image/png;base64,...)

class MensajeOut(BaseModel):
    id: UUID
    id_remitente: UUID
    id_receptor: UUID
    contenido: Optional[str] = ""
    tiene_imagen: bool = False
    es_compartido: bool = False
    leido: bool
    fecha: datetime

    class Config:
        from_attributes = True

# ─────────────────────── FORO ───────────────────────

class PublicacionForoCreate(BaseModel):
    contenido: Optional[str] = ""
    categoria: str = "general"
    imagen_data: Optional[str] = None

class RespuestaForoCreate(BaseModel):
    contenido: Optional[str] = ""
    imagen_data: Optional[str] = None


# ─────────────────────── CONSEJOS ───────────────────────

class ConsejoClasificacionCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = ""
    orden: Optional[int] = 0

class ConsejoClasificacionUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    orden: Optional[int] = None
    activa: Optional[bool] = None

class ConsejoEtiquetaCreate(BaseModel):
    nombre: str

class ConsejoEtiquetaUpdate(BaseModel):
    nombre: Optional[str] = None
    activa: Optional[bool] = None

class ConsejoArticuloCreate(BaseModel):
    id_clasificacion: UUID
    titulo: str
    resumen: Optional[str] = ""
    cuerpo: Optional[str] = ""
    etiquetas: Optional[list] = []         # lista de UUIDs (string) de etiquetas
    imagen_data: Optional[str] = None      # data URL si el admin sube manualmente
    generar_imagen: Optional[bool] = False # si True → llama a Gemini al crear
    prompt_imagen: Optional[str] = None    # prompt opcional para forzar generación

class ConsejoArticuloUpdate(BaseModel):
    id_clasificacion: Optional[UUID] = None
    titulo: Optional[str] = None
    resumen: Optional[str] = None
    cuerpo: Optional[str] = None
    activo: Optional[bool] = None
    orden: Optional[int] = None
    etiquetas: Optional[list] = None
    imagen_data: Optional[str] = None

class ReaccionForoCreate(BaseModel):
    emoji: str

class RespuestaForoOut(BaseModel):
    id: str
    avatar_seed: str
    contenido: str
    created_at: str
    likes_count: int
    is_liked: bool
    es_mia: bool

class PublicacionForoOut(BaseModel):
    id: str
    avatar_seed: str
    contenido: str
    categoria: str
    created_at: str
    likes_count: int
    comments_count: int
    is_liked: bool
    is_guardado: bool
    reacciones: dict
    mi_reaccion: Optional[str] = None
    es_mia: bool
    es_seguido: bool

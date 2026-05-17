from sqlalchemy import Column, Integer, String, Date, DateTime, Text, SmallInteger, ForeignKey, func, UUID, text, Boolean, LargeBinary
from sqlalchemy.orm import relationship
from app.database.connection import Base
import uuid

class Usuaria(Base):
    __tablename__ = "usuarias"

    id_usuaria     = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    nombre         = Column(String(100), nullable=False)
    email          = Column(String(150), nullable=False, unique=True)
    password_hash  = Column(String(255), nullable=False)
    rol            = Column(String(20), nullable=False, server_default="usuaria")
    mi_codigo      = Column(String(10), unique=True, nullable=True)
    solicitud_id   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=True)
    solicitud_estado = Column(String(20), nullable=True) # 'pendiente', 'rechazada'
    otp            = Column(String(10), nullable=True)
    
    # Campo temporal para el nombre de quien solicita (no persistente)
    nombre_solicitante = None
    otp_expiry     = Column(DateTime, nullable=True)
    fecha_registro = Column(DateTime, server_default=func.now())
    ultimo_acceso  = Column(DateTime, nullable=True)

    # Relaciones
    ciclos            = relationship("Ciclo",                back_populates="usuaria", cascade="all, delete")
    registros         = relationship("RegistroSintoma",      back_populates="usuaria", cascade="all, delete")
    registros_diarios = relationship("RegistroDiario",       back_populates="usuaria", cascade="all, delete")
    historial         = relationship("HistorialEstado",      back_populates="usuaria", cascade="all, delete")
    predicciones      = relationship("Prediccion",           back_populates="usuaria", cascade="all, delete")
    configuracion     = relationship("ConfiguracionUsuaria", back_populates="usuaria", uselist=False, cascade="all, delete")
    parejas_como_usuaria = relationship("Pareja", foreign_keys="Pareja.id_usuaria", back_populates="usuaria", cascade="all, delete")
    parejas_como_pareja  = relationship("Pareja", foreign_keys="Pareja.id_pareja",  back_populates="pareja",  cascade="all, delete")

class Ciclo(Base):
    __tablename__ = "ciclos"

    id_ciclo             = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria           = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    fecha_inicio         = Column(Date, nullable=False)
    fecha_fin            = Column(Date)
    duracion             = Column(Integer)
    regularidad_estimado = Column(String(50))

    usuaria = relationship("Usuaria", back_populates="ciclos")

class Sintoma(Base):
    __tablename__ = "sintomas"

    id_sintoma     = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    nombre_sintoma = Column(String(100), nullable=False)
    categoria      = Column(String(100))

    registros = relationship("RegistroSintoma", back_populates="sintoma")

class RegistroSintoma(Base):
    __tablename__ = "registro_sintomas"

    id_registro = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria  = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    id_sintoma  = Column(UUID(as_uuid=True), ForeignKey("sintomas.id_sintoma"), nullable=False)
    fecha       = Column(Date, nullable=False)
    intensidad  = Column(SmallInteger)

    usuaria = relationship("Usuaria", back_populates="registros")
    sintoma = relationship("Sintoma", back_populates="registros")

class RegistroDiario(Base):
    __tablename__ = "registros_diarios"

    id         = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    fecha      = Column(Date, nullable=False)
    notas      = Column(Text)
    flujo      = Column(String(50))
    relaciones = Column(SmallInteger) # 0: No, 1: Con proteccion, 2: Sin proteccion

    usuaria = relationship("Usuaria", back_populates="registros_diarios")

class HistorialEstado(Base):
    __tablename__ = "historial_estados"

    id_historial   = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria     = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    fecha          = Column(Date, nullable=False)

    usuaria = relationship("Usuaria", back_populates="historial")

class Prediccion(Base):
    __tablename__ = "predicciones"

    id_prediccion         = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria            = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    proxima_menstruacion  = Column(Date)
    prediccion_ovulacion  = Column(Date)
    ventana_fertil_inicio = Column(Date)
    ventana_fertil_fin    = Column(Date)

    usuaria = relationship("Usuaria", back_populates="predicciones")

class ConfiguracionUsuaria(Base):
    __tablename__ = "configuracion_usuaria"

    id_usuaria         = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), primary_key=True)
    privacidad_estricta = Column(SmallInteger, server_default="0")
    duracion_ciclo     = Column(SmallInteger, server_default="28")
    duracion_periodo   = Column(SmallInteger, server_default="5")
    fecha_nacimiento   = Column(Date, nullable=True)
    modo_oscuro        = Column(SmallInteger, server_default="0")
    google_token       = Column(Text, nullable=True)
    google_refresh_token = Column(Text, nullable=True)
    google_token_expiry = Column(DateTime, nullable=True)

    usuaria = relationship("Usuaria", back_populates="configuracion")

class ConfiguracionSistema(Base):
    __tablename__ = "configuracion_sistema"
    id = Column(Integer, primary_key=True, index=True)
    modo_mantenimiento = Column(Boolean, default=False)
    version_algoritmo = Column(String(50), default="1.0.0-nuvia")
    max_dias_ciclo = Column(Integer, default=45)
    min_dias_ciclo = Column(Integer, default=21)
    max_dias_periodo = Column(Integer, default=10)
    min_dias_periodo = Column(Integer, default=3)
    ultima_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())

class Pareja(Base):
    __tablename__ = "parejas"

    id         = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), nullable=False)
    id_pareja  = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), nullable=False)

    usuaria = relationship("Usuaria", foreign_keys=[id_usuaria], back_populates="parejas_como_usuaria")
    pareja  = relationship("Usuaria", foreign_keys=[id_pareja],  back_populates="parejas_como_pareja")

class PublicacionForo(Base):
    __tablename__ = "foro_publicaciones"
    id           = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), nullable=False)
    contenido    = Column(Text, nullable=True)
    categoria    = Column(String(50), nullable=False, server_default="general")
    imagen       = Column(LargeBinary, nullable=True)
    imagen_mime  = Column(String(50), nullable=True)
    created_at   = Column(DateTime, server_default=func.now())

class RespuestaForo(Base):
    __tablename__ = "foro_respuestas"
    id             = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_publicacion = Column(UUID(as_uuid=True), ForeignKey("foro_publicaciones.id", ondelete="CASCADE"), nullable=False)
    id_usuaria     = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), nullable=False)
    contenido      = Column(Text, nullable=True)
    imagen         = Column(LargeBinary, nullable=True)
    imagen_mime    = Column(String(50), nullable=True)
    created_at     = Column(DateTime, server_default=func.now())

class LikeForo(Base):
    __tablename__ = "foro_likes"
    id_publicacion = Column(UUID(as_uuid=True), ForeignKey("foro_publicaciones.id", ondelete="CASCADE"), primary_key=True)
    id_usuaria     = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)

class FavoritoForo(Base):
    __tablename__ = "foro_favoritos"
    id_publicacion = Column(UUID(as_uuid=True), ForeignKey("foro_publicaciones.id", ondelete="CASCADE"), primary_key=True)
    id_usuaria     = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)

class ReaccionForo(Base):
    __tablename__ = "foro_reacciones"
    id_publicacion = Column(UUID(as_uuid=True), ForeignKey("foro_publicaciones.id", ondelete="CASCADE"), primary_key=True)
    id_usuaria     = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)
    emoji          = Column(String(10), nullable=False)

class SeguimientoForo(Base):
    __tablename__ = "foro_seguimientos"
    id_seguidor = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)
    id_seguido  = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)

class BloqueoForo(Base):
    __tablename__ = "foro_bloqueos"
    id_bloqueador = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)
    id_bloqueado  = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)
    created_at    = Column(DateTime, server_default=func.now())

class ReporteForo(Base):
    __tablename__ = "foro_reportes"
    id              = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_publicacion  = Column(UUID(as_uuid=True), ForeignKey("foro_publicaciones.id", ondelete="SET NULL"), nullable=True)
    id_reportador   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), nullable=False)
    motivo_reporte  = Column(Text, nullable=True)
    estado          = Column(String(30), nullable=False, server_default="pendiente")  # pendiente | eliminado | anulado
    id_admin        = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="SET NULL"), nullable=True)
    resolved_at     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime, server_default=func.now())

class BaneForo(Base):
    __tablename__ = "foro_baneos"
    id                    = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria            = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), nullable=False)
    motivos               = Column(Text, nullable=True)   # JSON con array de claves de motivos
    motivo_personalizado  = Column(Text, nullable=True)
    fecha_inicio          = Column(DateTime, server_default=func.now())
    fecha_fin             = Column(DateTime, nullable=True)  # NULL = permanente
    activo                = Column(Boolean, server_default=text("true"))
    id_admin              = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="SET NULL"), nullable=True)
    visto_por_usuaria     = Column(Boolean, server_default=text("false"))
    created_at            = Column(DateTime, server_default=func.now())

class EliminacionAvisoForo(Base):
    __tablename__ = "foro_eliminaciones_aviso"
    id                    = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_autor              = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), nullable=False)
    contenido_original    = Column(Text, nullable=True)
    tenia_imagen          = Column(Boolean, server_default=text("false"))
    motivos               = Column(Text, nullable=True)   # JSON array
    motivo_personalizado  = Column(Text, nullable=True)
    visto                 = Column(Boolean, server_default=text("false"))
    created_at            = Column(DateTime, server_default=func.now())

class Mensaje(Base):
    __tablename__ = "mensajes"

    id           = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_remitente   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    id_receptor    = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    contenido      = Column(Text, nullable=True)
    imagen         = Column(LargeBinary, nullable=True)
    imagen_mime    = Column(String(50), nullable=True)
    es_compartido  = Column(Boolean, server_default=text("false"))
    leido          = Column(Boolean, server_default=text("false"))
    fecha          = Column(DateTime, server_default=func.now())

    remitente = relationship("Usuaria", foreign_keys=[id_remitente])
    receptor  = relationship("Usuaria", foreign_keys=[id_receptor])


# ─────────────────────── CONSEJOS ───────────────────────

class ConsejoClasificacion(Base):
    __tablename__ = "consejos_clasificaciones"
    id          = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    nombre      = Column(String(100), nullable=False)
    descripcion = Column(Text, nullable=True)
    activa      = Column(Boolean, server_default=text("true"))
    orden       = Column(Integer, server_default=text("0"))
    created_at  = Column(DateTime, server_default=func.now())


class ConsejoEtiqueta(Base):
    __tablename__ = "consejos_etiquetas"
    id         = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    nombre     = Column(String(60), nullable=False, unique=True)
    activa     = Column(Boolean, server_default=text("true"))
    created_at = Column(DateTime, server_default=func.now())


class ConsejoArticulo(Base):
    __tablename__ = "consejos_articulos"
    id                = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_clasificacion  = Column(UUID(as_uuid=True), ForeignKey("consejos_clasificaciones.id", ondelete="CASCADE"), nullable=False)
    titulo            = Column(String(200), nullable=False)
    resumen           = Column(Text, nullable=True)
    cuerpo            = Column(Text, nullable=True)  # markdown / texto plano
    imagen            = Column(LargeBinary, nullable=True)
    imagen_mime       = Column(String(50), nullable=True)
    imagen_prompt     = Column(Text, nullable=True)  # último prompt usado para generar
    activo            = Column(Boolean, server_default=text("true"))
    orden             = Column(Integer, server_default=text("0"))
    created_at        = Column(DateTime, server_default=func.now())

    clasificacion = relationship("ConsejoClasificacion")


class ConsejoArticuloEtiqueta(Base):
    __tablename__ = "consejos_articulo_etiquetas"
    id_articulo  = Column(UUID(as_uuid=True), ForeignKey("consejos_articulos.id", ondelete="CASCADE"), primary_key=True)
    id_etiqueta  = Column(UUID(as_uuid=True), ForeignKey("consejos_etiquetas.id", ondelete="CASCADE"), primary_key=True)


class ConsejoFavorito(Base):
    __tablename__ = "consejos_favoritos"
    id_articulo  = Column(UUID(as_uuid=True), ForeignKey("consejos_articulos.id", ondelete="CASCADE"), primary_key=True)
    id_usuaria   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria", ondelete="CASCADE"), primary_key=True)
    created_at   = Column(DateTime, server_default=func.now())

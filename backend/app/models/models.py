from sqlalchemy import Column, Integer, String, Date, DateTime, Text, SmallInteger, ForeignKey, func, UUID, text, Boolean
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
    codigo_pareja  = Column(String(10), ForeignKey("usuarias.mi_codigo"), nullable=True)
    otp            = Column(String(10), nullable=True)
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
    notificaciones     = Column(SmallInteger, server_default="1")
    recordatorio_ciclo = Column(SmallInteger, server_default="1")
    privacidad_estricta = Column(SmallInteger, server_default="0")
    duracion_ciclo     = Column(SmallInteger, server_default="28")
    duracion_periodo   = Column(SmallInteger, server_default="5")
    fecha_nacimiento   = Column(Date, nullable=True)
    modo_oscuro        = Column(SmallInteger, server_default="0")

    usuaria = relationship("Usuaria", back_populates="configuracion")

class ConfiguracionSistema(Base):
    __tablename__ = "configuracion_sistema"
    id = Column(Integer, primary_key=True, index=True)
    modo_mantenimiento = Column(Boolean, default=False)
    version_algoritmo = Column(String(50), default="1.0.0-nuvia")
    notificaciones_globales = Column(Boolean, default=True)
    max_dias_ciclo = Column(Integer, default=45)
    min_dias_ciclo = Column(Integer, default=21)
    max_dias_periodo = Column(Integer, default=10)
    min_dias_periodo = Column(Integer, default=3)
    ultima_actualizacion = Column(DateTime, default=func.now(), onupdate=func.now())

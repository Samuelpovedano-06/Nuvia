from sqlalchemy import Column, Integer, String, Date, DateTime, Text, SmallInteger, ForeignKey, func, UUID, text
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
    otp            = Column(String(10), nullable=True)
    otp_expiry     = Column(DateTime, nullable=True)
    fecha_registro = Column(DateTime, server_default=func.now())

    # Relaciones
    ciclos            = relationship("Ciclo",               back_populates="usuaria", cascade="all, delete")
    registros         = relationship("RegistroSintoma",     back_populates="usuaria", cascade="all, delete")
    registros_diarios = relationship("RegistroDiario",      back_populates="usuaria", cascade="all, delete")
    historial         = relationship("HistorialEstado",     back_populates="usuaria", cascade="all, delete")
    predicciones      = relationship("Prediccion",          back_populates="usuaria", cascade="all, delete")
    configuracion     = relationship("ConfiguracionUsuaria",back_populates="usuaria", uselist=False, cascade="all, delete")


class Ciclo(Base):
    __tablename__ = "ciclos"

    id_ciclo             = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria           = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    fecha_inicio         = Column(Date, nullable=False)
    fecha_fin            = Date
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

    id           = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    fecha        = Column(Date, nullable=False)
    notas        = Column(Text)
    flujo        = Column(String(50))
    relaciones   = Column(SmallInteger, default=0)

    usuaria = relationship("Usuaria", back_populates="registros_diarios")


class HistorialEstado(Base):
    __tablename__ = "historial_estados"

    id_historial = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    estado_animo = Column(String(100))
    fecha        = Column(Date, nullable=False)

    usuaria = relationship("Usuaria", back_populates="historial")


class Prediccion(Base):
    __tablename__ = "predicciones"

    id_prediccion        = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria           = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False)
    proxima_menstruacion = Column(Date)
    ventana_fertil_inicio= Column(Date)
    ventana_fertil_fin   = Column(Date)
    prediccion_ovulacion = Column(Date)

    usuaria = relationship("Usuaria", back_populates="predicciones")


class ConfiguracionUsuaria(Base):
    __tablename__ = "configuracion_usuaria"

    id_config                    = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    id_usuaria                   = Column(UUID(as_uuid=True), ForeignKey("usuarias.id_usuaria"), nullable=False, unique=True)
    notificaciones_activadas     = Column(SmallInteger, default=1)
    recordatorios_personalizados = Column(Text)
    tema_visual                  = Column(String(50), default="claro")

    usuaria = relationship("Usuaria", back_populates="configuracion")

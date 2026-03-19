from sqlalchemy import Column, Integer, String, Date, DateTime, Text, SmallInteger, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database.connection import Base


class Usuaria(Base):
    __tablename__ = "usuarias"

    id_usuaria     = Column(Integer, primary_key=True, autoincrement=True)
    nombre         = Column(String(100), nullable=False)
    email          = Column(String(150), nullable=False, unique=True)
    password_hash  = Column(String(255), nullable=False)
    fecha_registro = Column(DateTime, server_default=func.now())

    # Relaciones
    ciclos         = relationship("Ciclo",               back_populates="usuaria", cascade="all, delete")
    registros      = relationship("RegistroSintoma",     back_populates="usuaria", cascade="all, delete")
    historial      = relationship("HistorialEstado",     back_populates="usuaria", cascade="all, delete")
    predicciones   = relationship("Prediccion",          back_populates="usuaria", cascade="all, delete")
    configuracion  = relationship("ConfiguracionUsuaria",back_populates="usuaria", uselist=False, cascade="all, delete")


class Ciclo(Base):
    __tablename__ = "ciclos"

    id_ciclo             = Column(Integer, primary_key=True, autoincrement=True)
    id_usuaria           = Column(Integer, ForeignKey("usuarias.id_usuaria"), nullable=False)
    fecha_inicio         = Column(Date, nullable=False)
    fecha_fin            = Column(Date)
    duracion             = Column(Integer)
    regularidad_estimado = Column(String(50))

    usuaria = relationship("Usuaria", back_populates="ciclos")


class Sintoma(Base):
    __tablename__ = "sintomas"

    id_sintoma     = Column(Integer, primary_key=True, autoincrement=True)
    nombre_sintoma = Column(String(100), nullable=False)
    categoria      = Column(String(100))

    registros = relationship("RegistroSintoma", back_populates="sintoma")


class RegistroSintoma(Base):
    __tablename__ = "registro_sintomas"

    id_registro = Column(Integer, primary_key=True, autoincrement=True)
    id_usuaria  = Column(Integer, ForeignKey("usuarias.id_usuaria"), nullable=False)
    id_sintoma  = Column(Integer, ForeignKey("sintomas.id_sintoma"), nullable=False)
    fecha       = Column(Date, nullable=False)
    intensidad  = Column(SmallInteger)

    usuaria = relationship("Usuaria", back_populates="registros")
    sintoma = relationship("Sintoma", back_populates="registros")


class HistorialEstado(Base):
    __tablename__ = "historial_estados"

    id_historial = Column(Integer, primary_key=True, autoincrement=True)
    id_usuaria   = Column(Integer, ForeignKey("usuarias.id_usuaria"), nullable=False)
    estado_animo = Column(String(100))
    fecha        = Column(Date, nullable=False)

    usuaria = relationship("Usuaria", back_populates="historial")


class Prediccion(Base):
    __tablename__ = "predicciones"

    id_prediccion        = Column(Integer, primary_key=True, autoincrement=True)
    id_usuaria           = Column(Integer, ForeignKey("usuarias.id_usuaria"), nullable=False)
    proxima_menstruacion = Column(Date)
    ventana_fertil_inicio= Column(Date)
    ventana_fertil_fin   = Column(Date)
    prediccion_ovulacion = Column(Date)

    usuaria = relationship("Usuaria", back_populates="predicciones")


class ConfiguracionUsuaria(Base):
    __tablename__ = "configuracion_usuaria"

    id_config                    = Column(Integer, primary_key=True, autoincrement=True)
    id_usuaria                   = Column(Integer, ForeignKey("usuarias.id_usuaria"), nullable=False, unique=True)
    notificaciones_activadas     = Column(SmallInteger, default=1)
    recordatorios_personalizados = Column(Text)
    tema_visual                  = Column(String(50), default="claro")

    usuaria = relationship("Usuaria", back_populates="configuracion")

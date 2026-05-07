from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Cargar variables de entorno al inicio
load_dotenv()

from sqlalchemy import text
from app.database.connection import engine, Base
from app.routers import auth, admin, ciclos, sintomas, historial, predicciones, configuracion

# Crear tablas automaticamente si no existen
Base.metadata.create_all(bind=engine)

# Ejecutar alter table por si las columnas nuevas no existen en la BD de produccion
with engine.connect() as conn:
    try:
        conn.execute(text("ALTER TABLE usuarias ADD COLUMN otp VARCHAR(10) NULL"))
    except:
        pass
    try:
        conn.execute(text("ALTER TABLE usuarias ADD COLUMN otp_expiry DATETIME NULL"))
    except:
        pass
    try:
        conn.execute(text("ALTER TABLE usuarias ADD COLUMN otp_expiry TIMESTAMP NULL"))
    except:
        pass
    try:
        conn.commit()
    except:
        pass

app = FastAPI(
    title="Nuvia API",
    description="Backend de la aplicacion Nuvia - Seguimiento del ciclo menstrual",
    version="1.0.0",
)

# CORS - permite todas las conexiones en desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar todos los routers modulares
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(ciclos.router)
app.include_router(sintomas.router)
app.include_router(historial.router)
app.include_router(predicciones.router)
app.include_router(configuracion.router)


@app.get("/", tags=["Root"])
def root():
    return {"mensaje": "Nuvia API funcionando correctamente", "version": "1.0.0"}

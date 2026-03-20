from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Cargar variables de entorno al inicio
load_dotenv()

from app.database.connection import engine, Base
from app.routers import auth, ciclos, sintomas, historial, predicciones, configuracion

# Crear tablas automáticamente si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nuvia API",
    description="Backend de la aplicación Nuvia - Seguimiento del ciclo menstrual",
    version="1.0.0",
)

# CORS - permite conexiones desde la app Flutter en desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # En producción poner la URL específica
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar todos los routers modulares
app.include_router(auth.router)
app.include_router(ciclos.router)
app.include_router(sintomas.router)
app.include_router(historial.router)
app.include_router(predicciones.router)
app.include_router(configuracion.router)


@app.get("/", tags=["Root"])
def root():
    return {"mensaje": "Nuvia API funcionando correctamente", "version": "1.0.0"}

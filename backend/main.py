from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Cargar variables de entorno
load_dotenv()

from app.database.connection import engine, Base
from app.routers import auth, admin, ciclos, sintomas, historial, predicciones, configuracion, diario

# Crear tablas automaticamente si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Nuvia API",
    description="Backend de la aplicacion Nuvia - Seguimiento del ciclo menstrual",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # En produccion esto deberia ser mas restrictivo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers modulares
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(ciclos.router)
app.include_router(sintomas.router)
app.include_router(diario.router)
app.include_router(historial.router)
app.include_router(predicciones.router)
app.include_router(configuracion.router)

@app.get("/", tags=["Root"])
def root():
    return {"mensaje": "Nuvia API funcionando correctamente", "version": "1.0.0"}

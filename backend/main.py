from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database.connection import engine
from app.models import models
from app.routers import auth, sintomas, diario, ciclos, configuracion, historial, predicciones, admin

# Sincronizar Base de Datos
models.Base.metadata.create_all(bind=engine)

# Migraciones incrementales para columnas añadidas después de la creación inicial
def run_migrations():
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS min_dias_periodo INTEGER DEFAULT 3"))
        conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS max_dias_periodo INTEGER DEFAULT 10"))
        conn.commit()

try:
    run_migrations()
except Exception:
    pass

app = FastAPI(title="Nuvia API", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de routers modulares
app.include_router(auth.router)
app.include_router(sintomas.router)
app.include_router(diario.router)
app.include_router(ciclos.router)
app.include_router(configuracion.router)
app.include_router(historial.router)
app.include_router(predicciones.router)
app.include_router(admin.router)

@app.get("/")
def read_root():
    return {"message": "Nuvia API v1.2.0 Ready", "port": 8000}

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database.connection import engine
from app.models import models
from app.routers import auth, sintomas, diario, ciclos, configuracion, historial, predicciones, admin, parejas, chat

# Sincronizar Base de Datos
models.Base.metadata.create_all(bind=engine)

# Migraciones incrementales — cada sentencia es independiente
def run_migrations():
    migrations = [
        "ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS min_dias_periodo INTEGER DEFAULT 3",
        "ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS max_dias_periodo INTEGER DEFAULT 10",
        "ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS mi_codigo VARCHAR(10) UNIQUE",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS solicitud_id UUID",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS solicitud_estado VARCHAR(20)",
        # Tabla de vínculos pareja ↔ usuaria (muchos a muchos)
        """CREATE TABLE IF NOT EXISTS parejas (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_pareja  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            UNIQUE(id_usuaria, id_pareja)
        )""",
        # Eliminar columna codigo_pareja si existe (ya no se usa)
        "ALTER TABLE usuarias DROP COLUMN IF EXISTS codigo_pareja",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"[migration skip] {e}")
        try:
            conn.execute(text("ALTER TABLE usuarias ADD CONSTRAINT fk_solicitud_id FOREIGN KEY (solicitud_id) REFERENCES usuarias(id_usuaria)"))
            conn.commit()
        except Exception:
            conn.rollback()

run_migrations()

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
app.include_router(parejas.router)
app.include_router(chat.router)

@app.get("/")
def read_root():
    return {"message": "Nuvia API v1.2.0 Ready", "port": 8000}

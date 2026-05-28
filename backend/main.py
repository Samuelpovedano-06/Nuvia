from fastapi import FastAPI, Request
import time
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database.connection import engine
from app.models import models
from app.routers import auth, sintomas, diario, ciclos, configuracion, historial, predicciones, admin, parejas, chat, foro, consejos, juegos

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
        # Foro comunitario
        """CREATE TABLE IF NOT EXISTS foro_publicaciones (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            contenido TEXT NOT NULL,
            categoria VARCHAR(50) NOT NULL DEFAULT 'general',
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_respuestas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            contenido TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_likes (
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            PRIMARY KEY (id_publicacion, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_favoritos (
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            PRIMARY KEY (id_publicacion, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_reacciones (
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            emoji VARCHAR(10) NOT NULL,
            PRIMARY KEY (id_publicacion, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_seguimientos (
            id_seguidor UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_seguido UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            PRIMARY KEY (id_seguidor, id_seguido)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_bloqueos (
            id_bloqueador UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_bloqueado  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            created_at    TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (id_bloqueador, id_bloqueado)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_reportes (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_publicacion  UUID REFERENCES foro_publicaciones(id) ON DELETE SET NULL,
            id_reportador   UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            motivo_reporte  TEXT,
            estado          VARCHAR(30) NOT NULL DEFAULT 'pendiente',
            id_admin        UUID REFERENCES usuarias(id_usuaria) ON DELETE SET NULL,
            resolved_at     TIMESTAMP,
            created_at      TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_baneos (
            id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_usuaria            UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            motivos               TEXT,
            motivo_personalizado  TEXT,
            fecha_inicio          TIMESTAMP DEFAULT NOW(),
            fecha_fin             TIMESTAMP,
            activo                BOOLEAN DEFAULT TRUE,
            id_admin              UUID REFERENCES usuarias(id_usuaria) ON DELETE SET NULL,
            visto_por_usuaria     BOOLEAN DEFAULT FALSE,
            created_at            TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS desvinculaciones_pareja (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_afectada   UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_otra       UUID REFERENCES usuarias(id_usuaria) ON DELETE SET NULL,
            nombre_otra   VARCHAR(100) NOT NULL,
            rol_afectada  VARCHAR(20) NOT NULL,
            visto         BOOLEAN DEFAULT FALSE,
            created_at    TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_eliminaciones_aviso (
            id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_autor              UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            contenido_original    TEXT,
            tenia_imagen          BOOLEAN DEFAULT FALSE,
            motivos               TEXT,
            motivo_personalizado  TEXT,
            visto                 BOOLEAN DEFAULT FALSE,
            created_at            TIMESTAMP DEFAULT NOW()
        )""",
        # Adjuntos de imagen (foro y chat)
        "ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS imagen BYTEA",
        "ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(50)",
        "ALTER TABLE foro_publicaciones ALTER COLUMN contenido DROP NOT NULL",
        "ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS imagen BYTEA",
        "ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(50)",
        "ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS es_compartido BOOLEAN DEFAULT FALSE",
        "ALTER TABLE mensajes ALTER COLUMN contenido DROP NOT NULL",
        "ALTER TABLE foro_respuestas ADD COLUMN IF NOT EXISTS imagen BYTEA",
        "ALTER TABLE foro_respuestas ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(50)",
        "ALTER TABLE foro_respuestas ALTER COLUMN contenido DROP NOT NULL",
        # Consejos
        """CREATE TABLE IF NOT EXISTS consejos_clasificaciones (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre      VARCHAR(100) NOT NULL,
            descripcion TEXT,
            activa      BOOLEAN DEFAULT TRUE,
            orden       INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_etiquetas (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre     VARCHAR(60) NOT NULL UNIQUE,
            activa     BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_articulos (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_clasificacion UUID NOT NULL REFERENCES consejos_clasificaciones(id) ON DELETE CASCADE,
            titulo           VARCHAR(200) NOT NULL,
            resumen          TEXT,
            cuerpo           TEXT,
            imagen           BYTEA,
            imagen_mime      VARCHAR(50),
            imagen_prompt    TEXT,
            activo           BOOLEAN DEFAULT TRUE,
            orden            INTEGER DEFAULT 0,
            created_at       TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_articulo_etiquetas (
            id_articulo UUID NOT NULL REFERENCES consejos_articulos(id) ON DELETE CASCADE,
            id_etiqueta UUID NOT NULL REFERENCES consejos_etiquetas(id) ON DELETE CASCADE,
            PRIMARY KEY (id_articulo, id_etiqueta)
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_favoritos (
            id_articulo UUID NOT NULL REFERENCES consejos_articulos(id) ON DELETE CASCADE,
            id_usuaria  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            created_at  TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (id_articulo, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS avisos_mascota_descartados (
            id_usuaria     UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            tipo           VARCHAR(40) NOT NULL,
            descartado_at  TIMESTAMP DEFAULT NOW(),
            clave          VARCHAR(40),
            PRIMARY KEY (id_usuaria, tipo)
        )""",
        "ALTER TABLE avisos_mascota_descartados ADD COLUMN IF NOT EXISTS clave VARCHAR(40)",
        """CREATE TABLE IF NOT EXISTS juego_records (
            id_usuaria  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            juego       VARCHAR(40) NOT NULL,
            record      INTEGER NOT NULL DEFAULT 0,
            updated_at  TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (id_usuaria, juego)
        )""",
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

from app.utils.logs import add_log

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    # Formatear log estilo Uvicorn
    client_host = request.client.host if request.client else "127.0.0.1"
    client_port = request.client.port if request.client else "0"
    
    log_entry = f"INFO:     {client_host}:{client_port} - \"{request.method} {request.url.path} HTTP/1.1\" {response.status_code} OK"
    
    # Guardar en la lista global (máximo 100)
    add_log({
        "id": time.time(),
        "content": log_entry,
        "type": "INFO",
        "color": "#64748b" if response.status_code == 200 else "#facc15"
    })
        
    return response

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
app.include_router(foro.router)
app.include_router(consejos.router)
app.include_router(juegos.router)


@app.get("/")
def read_root():
    return {"message": "Nuvia API v1.2.0 Ready", "port": 8000}

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

load_dotenv()

# Limpiar variables de entorno conflictivas en Windows
os.environ.pop('USERNAME', None)
os.environ.pop('USER', None)

db_url = os.getenv("DATABASE_URL")
engine = create_engine(db_url)

try:
    with engine.connect() as conn:
        print(f"Conectando a {db_url}...")
        conn.execute(text("ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS google_token TEXT"))
        conn.execute(text("ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS google_refresh_token TEXT"))
        conn.execute(text("ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS google_token_expiry TIMESTAMP WITHOUT TIME ZONE"))
        conn.commit()
        print("¡Éxito! Columnas de Google añadidas a la Raspberry Pi.")
except Exception as e:
    print(f"Error al migrar: {e}")

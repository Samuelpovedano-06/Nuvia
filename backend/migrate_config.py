from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def migrate():
    print(f"Conectando a {DATABASE_URL}...")
    with engine.connect() as conn:
        print("Añadiendo columnas a configuracion_sistema...")
        try:
            conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS min_dias_periodo INTEGER DEFAULT 3"))
            conn.execute(text("ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS max_dias_periodo INTEGER DEFAULT 10"))
            conn.commit()
            print("Migración completada con éxito.")
        except Exception as e:
            print(f"Error durante la migración: {e}")

if __name__ == "__main__":
    migrate()

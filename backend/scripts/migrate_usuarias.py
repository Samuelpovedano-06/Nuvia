import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import engine
from sqlalchemy import text

COLUMNS = [
    ("ultimo_acceso", "TIMESTAMP"),
]

def migrate():
    with engine.connect() as conn:
        for col, definition in COLUMNS:
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name='usuarias' AND column_name=:col
            """), {"col": col})
            if not result.fetchone():
                print(f"Añadiendo columna '{col}' a usuarias...")
                conn.execute(text(f"ALTER TABLE usuarias ADD COLUMN {col} {definition};"))
                print(f"  OK")
            else:
                print(f"Columna '{col}' ya existe, saltando.")
        conn.commit()
    print("Migración completada.")

if __name__ == "__main__":
    migrate()

import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import engine
from sqlalchemy import text

COLUMNS = [
    ("notificaciones",      "SMALLINT DEFAULT 1"),
    ("recordatorio_ciclo",  "SMALLINT DEFAULT 1"),
    ("privacidad_estricta", "SMALLINT DEFAULT 0"),
    ("duracion_ciclo",      "SMALLINT DEFAULT 28"),
    ("duracion_periodo",    "SMALLINT DEFAULT 5"),
    ("modo_oscuro",         "SMALLINT DEFAULT 0"),
    ("edad",                "SMALLINT"),
]

def migrate():
    with engine.connect() as conn:
        for col, definition in COLUMNS:
            result = conn.execute(text("""
                SELECT column_name FROM information_schema.columns
                WHERE table_name='configuracion_usuaria' AND column_name=:col
            """), {"col": col})
            if not result.fetchone():
                print(f"Añadiendo columna '{col}'...")
                conn.execute(text(f"ALTER TABLE configuracion_usuaria ADD COLUMN {col} {definition};"))
                print(f"  OK")
            else:
                print(f"Columna '{col}' ya existe, saltando.")
        conn.commit()
    print("Migración completada.")

if __name__ == "__main__":
    migrate()

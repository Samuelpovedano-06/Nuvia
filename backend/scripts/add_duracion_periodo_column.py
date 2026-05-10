import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from app.database.connection import engine
from sqlalchemy import text

def add_column():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS duracion_periodo SMALLINT DEFAULT 5"))
            conn.commit()
            print("Columna 'duracion_periodo' añadida con éxito (o ya existía).")
    except Exception as e:
        print(f"Error al añadir la columna: {e}")

if __name__ == "__main__":
    add_column()

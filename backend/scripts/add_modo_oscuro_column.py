import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.database.connection import engine
from sqlalchemy import text

def add_column():
    print("Connecting to database to add 'modo_oscuro' column...")
    try:
        with engine.connect() as conn:
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='configuracion_usuaria' AND column_name='modo_oscuro';
            """))
            if not result.fetchone():
                print("Adding column 'modo_oscuro' to 'configuracion_usuaria' table...")
                conn.execute(text("ALTER TABLE configuracion_usuaria ADD COLUMN modo_oscuro SMALLINT DEFAULT 0;"))
                conn.commit()
                print("Column added successfully!")
            else:
                print("Column 'modo_oscuro' already exists.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_column()

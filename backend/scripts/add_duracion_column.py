import sys
import os

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import engine
from sqlalchemy import text

def add_column():
    print("Connecting to database to add 'duracion_ciclo' column...")
    try:
        with engine.connect() as conn:
            # Check if column exists first (PostgreSQL specific)
            result = conn.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='configuracion_usuaria' AND column_name='duracion_ciclo';
            """))
            
            if not result.fetchone():
                print("Adding column 'duracion_ciclo' to 'configuracion_usuaria' table...")
                conn.execute(text("ALTER TABLE configuracion_usuaria ADD COLUMN duracion_ciclo SMALLINT DEFAULT 28;"))
                conn.commit()
                print("Column added successfully!")
            else:
                print("Column 'duracion_ciclo' already exists.")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_column()

import sys
import os

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database.connection import engine, Base
from app.models.models import Usuaria, Ciclo, Sintoma, RegistroSintoma, HistorialEstado, Prediccion, ConfiguracionUsuaria

def init_db():
    print("Creating tables in Neon PostgreSQL...")
    try:
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully!")
    except Exception as e:
        print(f"Error creating tables: {e}")

if __name__ == "__main__":
    init_db()

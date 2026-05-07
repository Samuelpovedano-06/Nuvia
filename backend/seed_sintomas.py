import sys
import os

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database.connection import SessionLocal
from app.models.models import Sintoma

SINTOMAS_TO_SEED = [
    {"nombre_sintoma": "Dolor Abdominal", "categoria": "Físico"},
    {"nombre_sintoma": "Pecho Sensible", "categoria": "Físico"},
    {"nombre_sintoma": "Cansancio", "categoria": "Físico"},
    {"nombre_sintoma": "Humor Variable", "categoria": "Emocional"},
    {"nombre_sintoma": "Acné", "categoria": "Físico"},
    {"nombre_sintoma": "Dolor de Cabeza", "categoria": "Físico"},
    {"nombre_sintoma": "Hinchazón", "categoria": "Físico"},
    {"nombre_sintoma": "Temperatura Alta", "categoria": "Físico"},
]

def seed_sintomas():
    print("Seeding symptoms catalog...")
    db = SessionLocal()
    try:
        for s in SINTOMAS_TO_SEED:
            existing = db.query(Sintoma).filter(Sintoma.nombre_sintoma == s["nombre_sintoma"]).first()
            if not existing:
                new_s = Sintoma(**s)
                db.add(new_s)
                print(f"Added symptom: {s['nombre_sintoma']}")
            else:
                print(f"Symptom already exists: {s['nombre_sintoma']}")
        db.commit()
        print("Seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_sintomas()

import sys
import os

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__))))

from app.database.connection import SessionLocal
from app.models.models import Sintoma

SINTOMAS_TO_SEED = [
    {"id_sintoma": 1, "nombre_sintoma": "Dolor Abdominal", "categoria": "Físico"},
    {"id_sintoma": 2, "nombre_sintoma": "Pecho Sensible", "categoria": "Físico"},
    {"id_sintoma": 3, "nombre_sintoma": "Cansancio", "categoria": "Físico"},
    {"id_sintoma": 4, "nombre_sintoma": "Humor Variable", "categoria": "Emocional"},
    {"id_sintoma": 5, "nombre_sintoma": "Acné", "categoria": "Físico"},
    {"id_sintoma": 6, "nombre_sintoma": "Dolor de Cabeza", "categoria": "Físico"},
    {"id_sintoma": 7, "nombre_sintoma": "Hinchazón", "categoria": "Físico"},
    {"id_sintoma": 8, "nombre_sintoma": "Temperatura Alta", "categoria": "Físico"},
]

def seed_sintomas():
    print("Seeding symptoms catalog...")
    db = SessionLocal()
    try:
        for s in SINTOMAS_TO_SEED:
            existing = db.query(Sintoma).filter(Sintoma.id_sintoma == s["id_sintoma"]).first()
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

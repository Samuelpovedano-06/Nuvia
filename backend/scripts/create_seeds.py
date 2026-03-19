import sys
import os
import bcrypt

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import SessionLocal
from app.models.models import Usuaria, ConfiguracionUsuaria

def hash_password_direct(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def create_test_user():
    db = SessionLocal()
    try:
        # Check if user already exists
        user_email = "test@nuvia.com"
        existing_user = db.query(Usuaria).filter(Usuaria.email == user_email).first()
        
        if existing_user:
            print(f"User with email {user_email} already exists.")
            return

        print("Inserting test user...")
        new_user = Usuaria(
            nombre="Usuario Test",
            email=user_email,
            password_hash=hash_password_direct("password123")
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        # Also create default config for them
        new_config = ConfiguracionUsuaria(
            id_usuaria=new_user.id_usuaria,
            notificaciones_activadas=1,
            tema_visual="claro"
        )
        db.add(new_config)
        db.commit()

        print(f"Test user created successfully! ID: {new_user.id_usuaria}")
        print(f"Login details:\n  Email: {user_email}\n  Password: password123")
        
    except Exception as e:
        print(f"Error inserting user: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_user()

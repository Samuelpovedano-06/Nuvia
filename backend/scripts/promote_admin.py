import sys
import os
from sqlalchemy import text

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import engine

def promote_admin():
    email = "test@nuvia.com"
    print(f"Promoting {email} to admin...")
    with engine.connect() as conn:
        try:
            conn.execute(text(f"UPDATE usuarias SET rol = 'admin' WHERE email = '{email}'"))
            conn.commit()
            print("Successfully promoted user to admin!")
        except Exception as e:
            print(f"Error: {e}")
            conn.rollback()

if __name__ == "__main__":
    promote_admin()

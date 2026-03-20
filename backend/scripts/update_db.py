import sys
import os
from sqlalchemy import text

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import engine

def update_db():
    print("Updating database schema...")
    with engine.connect() as conn:
        try:
            # PostgreSQL commands
            conn.execute(text("ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS rol VARCHAR(20) NOT NULL DEFAULT 'usuaria'"))
            conn.execute(text("ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS otp VARCHAR(10)"))
            conn.execute(text("ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS otp_expiry TIMESTAMP"))
            conn.commit()
            print("Successfully updated 'usuarias' table with role and OTP columns!")
        except Exception as e:
            print(f"Error updating table: {e}")
            conn.rollback()

if __name__ == "__main__":
    update_db()

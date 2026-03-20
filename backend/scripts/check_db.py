import sys
import os
from sqlalchemy import text

# Set Python path to include backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.database.connection import engine

def check_db_schema():
    print("Checking 'usuarias' table columns...")
    with engine.connect() as conn:
        try:
            # Query columns from information_schema
            result = conn.execute(text("""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'usuarias'
            """))
            columns = result.fetchall()
            print("\nColumns in 'usuarias':")
            for col in columns:
                print(f" - {col[0]} ({col[1]})")
            
            # Specifically check for otp and otp_expiry
            col_names = [c[0] for c in columns]
            missing = []
            if 'otp' not in col_names: missing.append('otp')
            if 'otp_expiry' not in col_names: missing.append('otp_expiry')
            
            if not missing:
                print("\n✅ All recovery columns are PRESENT.")
            else:
                print(f"\n❌ MISSING columns: {missing}")
                
        except Exception as e:
            print(f"Error checking schema: {e}")

if __name__ == "__main__":
    check_db_schema()

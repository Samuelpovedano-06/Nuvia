import psycopg2
try:
    conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/nuvia")
    print("Conexión exitosa")
    conn.close()
except Exception as e:
    print(f"Error: {e}")

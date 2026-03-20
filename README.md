# Nuvia 💜 - Aplicación de seguimiento del ciclo menstrual

## Tecnologías
- **Frontend**: React (Web)
- **Backend**: FastAPI (Python)
- **Base de datos**: PostgreSQL

---

## Estructura del proyecto

```
nuvia/
├── backend/              ← API REST con FastAPI
│   ├── main.py           ← Punto de entrada
│   ├── requirements.txt
│   ├── .env              ← Variables de entorno (configurar)
│   └── app/
│       ├── database/     ← Conexión BD + SQL de creación
│       ├── models/       ← Modelos SQLAlchemy
│       ├── schemas/      ← Schemas Pydantic
│       └── routers/      ← Endpoints modulares
│           ├── auth.py
│           ├── ciclos.py
│           ├── sintomas.py
│           ├── historial.py
│           ├── predicciones.py
│           └── configuracion.py
│
└── flutter_app/          ← App Android con Flutter
    └── lib/
        ├── main.dart
        ├── services/     ← ApiService + AuthProvider
        ├── screens/      ← Pantallas de la app
        └── widgets/      ← Tema visual
```

---

## 1. Configurar la base de datos

```bash
mysql -u root -p < backend/app/database/create_db.sql
```

## 2. Arrancar el backend

```bash
cd backend
pip install -r requirements.txt

# Editar .env con tus credenciales de MySQL
# DB_PASSWORD=tu_password

uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Endpoints principales

| Método | Ruta                        | Descripción                        |
|--------|-----------------------------|------------------------------------|
| POST   | /auth/registro              | Registrar nueva usuaria            |
| POST   | /auth/login                 | Login → devuelve JWT               |
| GET    | /auth/me                    | Datos de la usuaria autenticada    |
| GET    | /ciclos/                    | Listar ciclos                      |
| POST   | /ciclos/                    | Crear ciclo                        |
| PUT    | /ciclos/{id}                | Actualizar ciclo (añadir fecha fin)|
| DELETE | /ciclos/{id}                | Eliminar ciclo                     |
| GET    | /sintomas                   | Catálogo de síntomas               |
| POST   | /registros-sintomas         | Registrar síntoma del día          |
| GET    | /registros-sintomas         | Ver mis síntomas registrados       |
| POST   | /historial-estados/         | Registrar estado de ánimo          |
| GET    | /historial-estados/         | Ver historial de estados           |
| POST   | /predicciones/calcular      | Calcular predicción (≥2 ciclos)    |
| GET    | /predicciones/              | Ver última predicción              |
| GET    | /configuracion/             | Ver configuración                  |
| PUT    | /configuracion/             | Actualizar configuración           |

---

## Autor
Samuel Donato Muñoz Povedano - IES Fuengirola Nº1

# Nuvia 💜 - Aplicación de seguimiento del ciclo menstrual

## Tecnologías
- **Frontend**: Flutter (Android)
- **Backend**: FastAPI (Python)
- **Base de datos**: MySQL

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

La documentación interactiva estará disponible en:
- Swagger UI: http://localhost:8000/docs
- ReDoc:      http://localhost:8000/redoc

## 3. Ejecutar la app Flutter

```bash
cd flutter_app
flutter pub get
flutter run
```

> La app usa `10.0.2.2:8000` como URL del backend, que es `localhost`
> desde el emulador de Android. Si usas dispositivo físico, cambia
> la constante `baseUrl` en `lib/services/api_service.dart` por la
> IP de tu ordenador en la red local (ej: `192.168.1.X:8000`).

---

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

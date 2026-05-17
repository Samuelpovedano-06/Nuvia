# Nuvia 💜

Aplicación de bienestar femenino: seguimiento del ciclo menstrual, predicciones, comunidad, consejos, vinculación con pareja y panel de administración.

Disponible como **PWA web** y **APK Android** (mismo bundle empaquetado con Capacitor).

---

## Tecnologías

- **Frontend**: React 18 + Vite + React Router. Empaquetado a Android con **Capacitor**.
- **Backend**: FastAPI (Python 3) + SQLAlchemy + Pydantic.
- **Base de datos**: PostgreSQL.
- **Auth**: JWT (`python-jose`).
- **Servicios externos**: Gemini (consejos + imágenes), Unsplash (imágenes de banco), Brevo / SendInBlue (emails de OTP), Google Calendar opcional.
- **Despliegue backend**: Railway (`railway.json` + `Procfile`, gunicorn + uvicorn workers).
- **Despliegue web**: Vercel (`frontend/vercel.json`).

---

## Estructura del proyecto

```
nuvia/
├── backend/                ← API REST con FastAPI
│   ├── main.py             ← Entry point + migraciones incrementales
│   ├── requirements.txt
│   ├── .env                ← Variables de entorno
│   └── app/
│       ├── database/       ← Conexión a PostgreSQL
│       ├── models/         ← Modelos SQLAlchemy
│       ├── schemas/        ← Schemas Pydantic
│       ├── utils/          ← email, gemini, unsplash, logs
│       └── routers/        ← Endpoints modulares (ver tabla abajo)
│
├── frontend/               ← App React + Capacitor
│   ├── public/             ← logo, mascota (sprites)
│   ├── src/
│   │   ├── App.jsx         ← Routing + modales globales + mascota
│   │   ├── api.js          ← ApiService cliente
│   │   ├── context/        ← AuthContext (JWT, getMe, login/logout)
│   │   ├── components/     ← MascotaNuvia (animación + bocadillo)
│   │   └── screens/        ← Pantallas (ver lista abajo)
│   ├── android/            ← Proyecto Android (Capacitor)
│   ├── capacitor.config.json
│   └── vite.config.js
│
├── Procfile                ← Despliegue Railway (backend)
├── railway.json
└── Nuvia.apk               ← APK debug compilada (output)
```

---

## Roles

- **usuaria** — usuaria estándar; registra ciclos, síntomas, notas; participa en foro y consejos; chatea con pareja vinculada y con soporte.
- **pareja** — sólo accede a los datos de las usuarias que la han vinculado mediante código (`mi_codigo`). Sin vínculos sólo puede entrar al perfil y a "Mi pareja".
- **admin** — panel completo: gestión de usuarias (ver, editar, banear, desbanear, eliminar), configuración del sistema (rangos de ciclo, modo mantenimiento), consejos (CRUD), reportes del foro, atención al cliente entrante y saliente, monitor de logs.

---

## Funcionalidad principal

- **Ciclo**: alta/edición de ciclos, predicción de próxima menstruación, ventana fértil y ovulación, calendario visual.
- **Síntomas y diario**: registro diario con intensidad, notas, flujo, relaciones.
- **Bienestar**: consejos según fase actual y resumen de últimos registros.
- **Comunidad (Foro)**: publicaciones con imagen, respuestas, likes, favoritos, reacciones emoji, seguidores, bloqueos, reportes, baneos por motivos, eliminación moderada.
- **Consejos**: artículos clasificados por categoría y etiqueta, favoritos, generación de imágenes por IA (Gemini).
- **Vinculación pareja**: código `mi_codigo` para enviar/aceptar/rechazar solicitudes. Modal automático cuando la otra parte corta el vínculo.
- **Chat secreto**: 1-a-1 con pareja vinculada (texto + imagen + compartir publicaciones del foro).
- **Atención al cliente**: chat usuaria ↔ admin. El admin tiene bandeja con todas las conversaciones, badge de no leídos y puede iniciar conversación con cualquier usuaria sin esperar a que escriba.
- **Mascota Nuvia**: personaje animado con walk-cycle de sprites. Camina por la parte inferior de la pantalla, se sienta en pausas y flota al centro cuando llega un aviso (mensaje no leído, respuesta de soporte, reporte pendiente).
- **Panel admin**: gestión completa, ban con motivos del foro reutilizados, historial de baneos por usuaria.

---

## Endpoints principales

### Auth
| Método | Ruta                              | Descripción                       |
|--------|-----------------------------------|-----------------------------------|
| POST   | /auth/registro                    | Registrar nueva usuaria           |
| POST   | /auth/login                       | Login → JWT (param `plataforma`)  |
| GET    | /auth/me                          | Datos de la usuaria autenticada   |
| POST   | /auth/forgot-password             | Solicitar OTP por email           |
| POST   | /auth/verify-otp                  | Verificar OTP                     |
| POST   | /auth/reset-password              | Cambiar contraseña                |

### Ciclos, síntomas, diario, predicciones
| Método | Ruta                              | Descripción                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | /ciclos/                          | Listar ciclos (opcional `id_usuaria` si eres pareja vinculada o admin) |
| POST   | /ciclos/                          | Crear ciclo                       |
| PUT    | /ciclos/{id}                      | Cerrar / editar ciclo             |
| DELETE | /ciclos/{id}                      | Eliminar ciclo                    |
| GET    | /sintomas                         | Catálogo de síntomas              |
| POST   | /registros-sintomas               | Registrar síntomas del día        |
| GET    | /registros-sintomas/{fecha}       | Ver síntomas de una fecha         |
| POST/GET | /registros-diarios              | Notas + flujo + relaciones        |
| POST   | /predicciones/calcular            | Recalcular predicción             |
| GET    | /predicciones/                    | Última predicción                 |
| GET    | /historial-estados/               | Historial de estados              |

### Configuración
| Método | Ruta                              | Descripción                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | /configuracion/                   | Configuración de la usuaria       |
| PUT    | /configuracion/                   | Actualizar configuración          |
| POST   | /configuracion/aceptar-pareja     | Aceptar solicitud entrante        |
| POST   | /configuracion/rechazar-pareja    | Rechazar solicitud                |

### Parejas
| Método | Ruta                                          | Descripción                  |
|--------|-----------------------------------------------|------------------------------|
| GET    | /parejas/?vista=usuaria\|pareja               | Listar vínculos              |
| DELETE | /parejas/{vinculo_id}                         | Cortar vínculo               |
| GET    | /parejas/desvinculaciones                     | Avisos pendientes para mí    |
| POST   | /parejas/desvinculaciones/{id}/visto          | Marcar aviso como leído      |

### Chat
| Método | Ruta                                          | Descripción                  |
|--------|-----------------------------------------------|------------------------------|
| POST   | /chat/                                        | Enviar mensaje               |
| GET    | /chat/{id_otro}                               | Histórico de mensajes        |
| GET    | /chat/imagen/{id}                             | Descargar imagen del mensaje |
| POST   | /chat/compartir-publicacion                   | Compartir post del foro      |
| GET    | /chat/soporte/admin                           | Admin de soporte para chat   |
| GET    | /chat/soporte/conversaciones                  | (admin) lista conversaciones |
| GET    | /chat/mascota/avisos                          | Eventos para la mascota      |

### Foro
| Método | Ruta                                          | Descripción                  |
|--------|-----------------------------------------------|------------------------------|
| GET/POST/DELETE | /foro/publicaciones                  | CRUD posts                   |
| POST   | /foro/{id}/like, /favorito, /reaccion         | Interacciones                |
| POST   | /foro/seguir/{id}, /bloquear/{id}             | Seguir / bloquear            |
| POST   | /foro/reportar                                | Reportar publicación         |
| GET/POST | /foro/admin/reportes…                       | Resolver / anular reportes   |
| POST   | /foro/admin/banear/{id}, /desbanear/{id}      | Ban / unban                  |
| GET    | /foro/admin/banes/{id}                        | Historial de banes           |
| GET    | /foro/admin/motivos                           | Catálogo de motivos          |

### Consejos
| Método | Ruta                                          | Descripción                  |
|--------|-----------------------------------------------|------------------------------|
| GET    | /consejos/articulos                           | Lista (público autenticado)  |
| GET    | /consejos/articulos/{id}                      | Detalle                      |
| POST/PUT/DELETE | /consejos/articulos…                 | (admin) CRUD                 |
| POST   | /consejos/articulos/{id}/regenerar-imagen     | (admin) imagen con Gemini    |
| POST   | /consejos/{id}/favorito                       | Marcar favorito              |

### Admin
| Método | Ruta                                          | Descripción                  |
|--------|-----------------------------------------------|------------------------------|
| GET    | /admin/stats                                  | KPIs del sistema             |
| GET    | /admin/users                                  | Lista de usuarias + estado + flag `baneado` |
| POST/PUT/DELETE | /admin/users…                        | CRUD                         |
| GET    | /admin/config                                 | Configuración global         |
| PUT    | /admin/config                                 | Editar config global         |
| GET    | /admin/logs                                   | Últimos logs                 |
| GET    | /admin/export                                 | Export JSON de la base       |
| GET    | /admin/status/public                          | Estado público (no auth)     |

---

## Pantallas (frontend)

```
LoginScreen      RegisterScreen    HomeScreen        ProfileScreen
SymptomsScreen   CalendarScreen    PredictionsScreen WellnessScreen
PartnerScreen    SupportChatScreen CommunityScreen   ConsejosScreen
ConsejoDetailScreen

AdminPanelScreen   AdminUsersScreen      AdminConfigScreen
AdminConsejosScreen AdminReportesScreen  AdminSupportScreen
```

Componentes globales: `BottomNav`, `MascotaNuvia`, modales de solicitud entrante, solicitud rechazada y "Ya no sois pareja".

---

## Puesta en marcha en local

### 1. Base de datos PostgreSQL

Crea una BD vacía. El backend levanta las tablas con `Base.metadata.create_all` + migraciones incrementales en cada arranque (ver `backend/main.py`).

```bash
psql -U postgres -c "CREATE DATABASE nuvia;"
```

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
```

Crea `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/nuvia
SECRET_KEY=cambia_esto_por_algo_largo_y_aleatorio
GEMINI_API_KEY=...               # opcional, para consejos generados
UNSPLASH_ACCESS_KEY=...          # opcional
SIB_API_KEY=...                  # opcional, emails OTP
```

Arranca:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend

```bash
cd frontend
npm install
```

Crea `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

Arranca dev server:

```bash
npm run dev    # http://localhost:3000
```

### 4. Compilar APK Android

Requisitos: Android SDK + JDK 17+ instalados.

```bash
cd frontend
npm run build                             # genera dist/
npx cap sync android                      # copia dist/ al proyecto Android
cd android
./gradlew.bat assembleDebug               # Windows
# ./gradlew assembleDebug                 # Linux/Mac
```

APK queda en `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.

---

## Despliegue

- **Backend**: `railway.json` + `Procfile` listos. Push a Railway con la variable `DATABASE_URL` apuntando a tu Postgres.
- **Frontend web**: `frontend/vercel.json` con rewrite SPA. Conecta el repo a Vercel; build command `npm run build`, output `dist/`.
- **APK**: distribuir directamente el `Nuvia.apk` (build debug firmado con la clave de debug de Android). Para release firmado configurar `signingConfigs` en `android/app/build.gradle`.

---

## Autor

Samuel Donato Muñoz Povedano · IES Fuengirola Nº1

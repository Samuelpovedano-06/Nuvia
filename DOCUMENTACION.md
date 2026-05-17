# I.E.S Fuengirola Nº1
## DESARROLLO DE APLICACIONES MULTIPLATAFORMA
## PROYECTO INTEGRADO

# NUVIA

**Autor:** Samuel Donato Muñoz Povedano

---

## ÍNDICE DE CONTENIDOS

1. Sobre este proyecto
   1.1. Objetivos iniciales
   1.2. Motivación
   1.3. Estrategias
   1.4. Planificación
       1.4.1. Fases del proyecto
       1.4.2. Cronograma
   1.5. Control de versiones
   1.6. Licencia de uso
2. Análisis del problema
   2.1. Introducción al problema
   2.2. Antecedentes
   2.3. Objetivos
   2.4. Requisitos
       2.4.1. Funcionales
       2.4.2. No funcionales
   2.5. Recursos
       2.5.1. Software
       2.5.2. Hardware
3. Diseño de la solución software
   3.1. Modelados
       3.1.1. Casos de uso
       3.1.2. Interacción
       3.1.3. Estado
       3.1.4. Actividad
   3.2. Base de datos
       3.2.1. Diseño conceptual (ER)
       3.2.2. Diseño lógico (tablas normalizadas)
   3.3. Prototipo gráfico
4. Implementación
   4.1. Codificación
       4.1.1. Backend
       4.1.2. Frontend
   4.2. Pruebas
5. Documentación
   5.1. Empaquetado / Distribución
   5.2. Instalación
   5.3. Manual de usuario / Referencia
   5.4. Actualizaciones futuras
6. Conclusiones
7. Bibliografía

---

# 1. Sobre este proyecto

## 1.1. Objetivos iniciales

Los objetivos propuestos en el desarrollo del presente proyecto se centran principalmente en la implementación de una **aplicación web y móvil multiplataforma** destinada al seguimiento del ciclo menstrual, la ovulación y los síntomas asociados de manera visual, clara y personalizada para cada usuaria.

Como objetivos específicos posteriores se establecen los siguientes:

- Conseguir que las usuarias utilicen la aplicación, ofreciendo una experiencia intuitiva, estética y de valor añadido mediante registro del ciclo, predicciones, consejos personalizados, foro comunitario y vinculación con la pareja.
- Garantizar la seguridad y privacidad de los datos personales relacionados con el ciclo menstrual, síntomas y preferencias de cada usuaria, empleando un sistema de autenticación con JWT y contraseñas hasheadas (bcrypt).
- Solo tras iniciar sesión se podrá acceder a la información vinculada al perfil de la usuaria y a los servicios internos de la app, incluyendo los tokens necesarios para interactuar de forma segura con la API y con los sistemas de almacenamiento.
- Ofrecer una **mascota interactiva (Nuvia)** que acompaña a la usuaria por la interfaz, alertando de mensajes nuevos, respuestas de soporte o cambios relevantes con bocadillos animados.

## 1.2. Motivación

Aunque existen muchas aplicaciones para el seguimiento menstrual, pocas ofrecen una experiencia realmente personalizada y visual, combinando registro del ciclo, predicciones, comunidad y elementos interactivos como una mascota animada.

Además, no todas garantizan que solo la usuaria pueda acceder a su información mediante credenciales seguras, lo que convierte a **Nuvia** en una opción más privada y confiable. Tampoco ofrecen un canal directo de **atención al cliente** ni la posibilidad de **vincular a la pareja** para que pueda acompañar el proceso desde su propio dispositivo.

Esto permite que cada persona conozca en todo momento el estado de su ciclo, mantenga un registro seguro y accesible, y mejore su bienestar y autocontrol, todo dentro de una plataforma con identidad propia.

## 1.3. Estrategias

Dadas las motivaciones expuestas, se decidió concretar la política y estrategia a seguir. Se optó por desarrollar una aplicación con una premisa clara: **simplicidad y empatía**.

Las usuarias que se registren podrán acceder a todas las funcionalidades de forma directa, intuitiva y adaptada a su rol. El sistema dispone de **tres roles diferenciados**:

- **Usuaria** — rol principal; registra ciclos, síntomas, notas, participa en el foro y consejos, chatea con su pareja vinculada y con soporte.
- **Pareja** — accede únicamente a los datos de las usuarias que la han vinculado mediante código personal; puede ver el ciclo, enviar mensajes y consultar predicciones. Sin vínculos solo puede acceder a su perfil y a la pantalla "Mi pareja" para enviar/recibir solicitudes.
- **Administrador** — dispone del panel completo:
  - Gestión de usuarias (ver, editar, banear, desbanear, eliminar) con historial de baneos.
  - Configuración del sistema (rangos de duración de ciclo y periodo, modo mantenimiento).
  - Gestión del foro y los reportes de la comunidad.
  - Bandeja de atención al cliente entrante y saliente.
  - Monitor de logs en tiempo real.
  - CRUD de consejos y categorías con generación de imágenes mediante IA.

## 1.4. Planificación

### 1.4.1. Fases del proyecto

**Fase 1 — Plan de trabajo.**
En esta fase se realizaron las siguientes actividades:
- Análisis e instalación del software necesario para la documentación y desarrollo.
- Instalación y configuración del IDE **Visual Studio Code** con **Node.js**, **Vite** y el **SDK de Capacitor** para generar el APK Android.
- Despliegue de la base de datos **PostgreSQL** en un servidor (Railway).
- Uso de **LibreOffice / Microsoft Office** para la documentación.

**Fase 2 — Análisis y diseño.**
- Profundización en las tecnologías seleccionadas (React, FastAPI, PostgreSQL, Capacitor).
- Definición detallada de la estructura y funcionalidades de la app.
- Selección y validación del nombre del proyecto (Nuvia).
- Elaboración de un boceto inicial del diseño con las pantallas previstas.

**Fase 3 — Implementación.**
- Creación y configuración del sistema de base de datos PostgreSQL con migraciones incrementales automáticas.
- Desarrollo del backend con **FastAPI** + SQLAlchemy + Pydantic.
- Desarrollo del frontend con **React + Vite** y empaquetado a Android con **Capacitor**.
- Integración con **Gemini** (consejos generados por IA), **Unsplash** (banco de imágenes) y **Brevo** (envío de OTP por email).
- Diseño y animación de la **mascota Nuvia** con sprite-sheet 6×2 y crossfade de capas para los estados (caminando, sentada, flotando).
- Ejecución de pruebas funcionales y corrección de errores durante el proceso.
- Elaboración de la documentación técnica y descriptiva del proyecto.
- Preparación de la presentación final.

### 1.4.2. Cronograma

| Tarea                          | Nov | Dic | Ene | Feb | Mar | Abr | May | Jun |
|--------------------------------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Redacción del plan de proyecto |  ✅ |     |     |     |     |     |     |     |
| Estudio del proyecto           |  ✅ |     |     |     |     |     |     |     |
| Documentación del proyecto     |     |  ✅ |     |     |     |     |     |     |
| Análisis de la aplicación      |     |  ✅ |     |     |     |     |     |     |
| Desarrollo de la interfaz      |     |     |  ✅ |  ✅ |  ✅ |     |     |     |
| Implementación del código      |     |     |     |  ✅ |  ✅ |  ✅ |     |     |
| Memoria                        |     |     |     |     |     |     |  ✅ |  ✅ |

## 1.5. Control de versiones

Nuvia cuenta con un control de versiones llamado **Git**, con un repositorio remoto alojado en **GitHub**. El despliegue del backend se realiza de forma continua a través de **Railway** (conectado al repositorio) y el del frontend web a través de **Vercel**.

## 1.6. Licencia de uso

Nuvia es una aplicación gratuita, pero posee una licencia restrictiva de Creative Commons:

**Reconocimiento-NoComercial-SinObraDerivada (CC BY-NC-ND)**

Según los proveedores:
> "Esta licencia es la más restrictiva de las seis licencias principales. Solo permite que otros puedan descargar las obras y compartirlas con otras personas, siempre que se reconozca su autoría, pero no se pueden cambiar de ninguna manera ni se pueden utilizar comercialmente."

---

# 2. Análisis del problema

## 2.1. Introducción al problema

El objetivo que se pretende alcanzar con la realización de este proyecto es ofrecer a las usuarias una mayor seguridad y control sobre su ciclo menstrual mediante una aplicación accesible y sencilla. Nuvia permite registrar y consultar el ciclo, síntomas y estados de ánimo, así como recibir información personalizada en tiempo real.

A diferencia de otras aplicaciones del mercado, Nuvia añade dos pilares diferenciales:

1. **Acompañamiento social**: la usuaria puede vincular a su pareja para que esta acompañe el proceso desde su propio dispositivo. Existe también un **foro comunitario** moderado donde compartir experiencias.
2. **Atención humana**: el rol administrador puede chatear directamente con la usuaria desde un panel de soporte, y la mascota Nuvia avisa visualmente cuando hay respuestas nuevas.

Con esto se busca mejorar el bienestar, la organización personal y el seguimiento de la salud menstrual de una manera clara, privada y confiable.

## 2.2. Antecedentes

Este apartado se centra en comparar los objetivos de la aplicación con otras del mercado e intentar suplir sus deficiencias dando mayores funcionalidades a las usuarias:

- Sugerencia aproximada de cuándo será el próximo periodo, ventana fértil y ovulación.
- **Foro comunitario** con publicaciones, reacciones, likes, favoritos, seguimientos, bloqueos, reportes y baneos moderados por el administrador.
- **Consejos personalizados** según la fase del ciclo, con imágenes generadas por IA (Gemini) o de banco (Unsplash).
- Posibilidad de añadir el estado mediante emoticonos y mantener un diario personal con notas, flujo y relaciones.
- **Sincronización en la nube** (PostgreSQL en Railway).
- Acceso desde cualquier lugar disponiendo de acceso a internet (PWA web + APK Android).
- **Sistema de vinculación con pareja** mediante código único (`mi_codigo`).
- **Chat secreto** 1-a-1 (texto + imagen + compartir publicaciones del foro).
- **Atención al cliente** con bandeja para el administrador y bocadillos de aviso para la usuaria.
- **Mascota Nuvia** animada que camina por la pantalla, se sienta y flota al recibir avisos.
- Visualización de estadísticas y panel admin (solo accesible mediante usuario y contraseña con rol "admin").

## 2.3. Objetivos

En este apartado se definen los objetivos personales para este proyecto:

- Registro y visualización de la evolución del ciclo menstrual, permitiendo consultar datos históricos como los últimos ciclos, síntomas recurrentes o patrones detectados.
- Consulta de información introducida por la usuaria, incluyendo estados de ánimo, síntomas, notas personales y predicciones del ciclo.
- Inserción, modificación o eliminación de registros asociados a la salud menstrual en la base de datos (ciclos, síntomas, métricas personales).
- Implementación de un **sistema de comunidad** que permita interacción segura y moderada entre usuarias.
- Implementación de un **sistema de comunicación pareja ↔ usuaria** mediante código de vinculación y chat seguro.
- Diseño e integración de una **mascota interactiva animada** mediante sprite-sheet CSS.
- Creación de un **panel de administración completo** para la gestión integral de la plataforma.
- Empaquetado final como **APK Android** y despliegue como **PWA web**.

## 2.4. Requisitos

### 2.4.1. Funcionales

**Usuaria:**
- Registro y autenticación segura mediante email + contraseña con JWT.
- Recuperación de contraseña mediante OTP por email.
- Registro del ciclo menstrual indicando fecha de inicio, fin y duración aproximada.
- Registro de síntomas y estado de ánimo, con selección entre diferentes categorías.
- Visualización de predicciones del ciclo, incluyendo próxima menstruación, periodo fértil y ovulación.
- Acceso al historial completo con calendario visual.
- Generación y exportación de un **informe de salud en PDF** con calendarios, gráfica de evolución y registros detallados.
- Sección de **bienestar** con consejos según la fase del ciclo.
- Sección de **consejos** con artículos clasificados y favoritos.
- Participación en el **foro comunitario** (publicaciones con imagen, respuestas, likes, reacciones emoji, favoritos, seguimientos, bloqueos, reportes).
- **Vinculación con pareja** mediante código personal `mi_codigo`.
- **Chat secreto** con la pareja vinculada (texto + imagen + compartir publicaciones).
- **Atención al cliente** mediante chat con un administrador.
- Configuración de privacidad estricta, duración personalizada del ciclo y periodo, modo oscuro.

**Pareja:**
- Login con la plataforma "pareja". Si no tiene vínculos, solo accede a su perfil y a la pantalla "Mi pareja".
- Tras vincularse, acceso de **solo lectura** al ciclo, síntomas y predicciones de la usuaria a la que acompaña.
- Chat secreto bidireccional.
- Aviso modal automático si la otra parte corta el vínculo.

**Administrador:**
- Consulta y exportación de datos generales con políticas de privacidad.
- Estadísticas: total de usuarias, ciclos registrados, registros del día, crecimiento semanal.
- CRUD completo sobre las usuarias (crear, ver con ficha + historial de baneos, editar, eliminar).
- **Baneo de usuarias** con motivos catalogados, motivo personalizado opcional y duración configurable (1d, 7d, 30d, 90d, permanente).
- **Desbaneo** con confirmación modal.
- Configuración global del sistema: rangos de duración válida del ciclo y del periodo, modo mantenimiento.
- Gestión completa de los **consejos** (categorías, etiquetas, artículos con generación de imágenes mediante Gemini).
- Gestión de los **reportes del foro** con resolución (eliminar publicación / anular reporte).
- **Bandeja de atención al cliente** con lista de conversaciones, contador de no leídos y opción de iniciar conversación con cualquier usuaria aunque no haya escrito antes.
- **Monitor de logs** del servidor en tiempo real.

### 2.4.2. No funcionales

- La aplicación es **multiplataforma**: PWA web (cualquier navegador moderno) y APK Android (mismo bundle empaquetado con Capacitor).
- Requisitos Android: Android 7.0 (Nougat) o superior, ~10 MB de espacio para la APK.
- Requiere conexión a Internet para sincronizar con el backend.
- Backend optimizado para correr en un solo proceso con `gunicorn -k uvicorn.workers.UvicornWorker -w 4`.
- Base de datos PostgreSQL con migraciones incrementales que se ejecutan automáticamente al arrancar el backend.
- Comunicación cliente-servidor 100 % por **HTTPS** en producción.
- Autenticación con **JWT firmado** (algoritmo HS256, expiración configurable).
- Contraseñas hasheadas con **bcrypt** mediante `passlib`.
- Diseño responsive (mobile-first) con `safe-area-inset` para móviles con notch.
- Soporte de **modo oscuro** global.

## 2.5. Recursos

### 2.5.1. Software

| Herramienta             | Descripción                                                                                  |
|-------------------------|----------------------------------------------------------------------------------------------|
| Visual Studio Code      | IDE principal para programar backend (Python) y frontend (React).                            |
| Node.js + Vite          | Runtime y bundler del frontend React.                                                        |
| Capacitor               | Empaquetado de la app React como APK Android nativo.                                         |
| Android Studio + SDK    | Compilación y firma del APK debug.                                                           |
| Python 3 + FastAPI      | Lenguaje y framework del backend.                                                            |
| PostgreSQL              | Base de datos relacional (con extensión `pgcrypto` para `gen_random_uuid()`).                |
| Railway                 | Plataforma de despliegue del backend y la base de datos.                                     |
| Vercel                  | Plataforma de despliegue de la PWA frontend.                                                 |
| Gemini API              | Generación de consejos e imágenes mediante IA (opcional).                                    |
| Unsplash API            | Banco de imágenes para los consejos (opcional).                                              |
| Brevo (Sendinblue)      | Envío de emails para el OTP de recuperación de contraseña.                                   |
| Pillow                  | Procesado de los sprites de la mascota.                                                      |
| LibreOffice / Office    | Elaboración de la documentación y la presentación.                                           |
| Adobe Acrobat Reader    | Lector de documentos PDF para revisar la documentación generada.                             |
| Google Chrome / Edge    | Navegador web para desarrollo, pruebas del backend y depuración del WebView de la APK.       |
| Postman                 | Pruebas manuales de los endpoints de la API.                                                 |
| GitMind / Excalidraw    | Diagramas (casos de uso, flujos, ER).                                                        |
| GitHub                  | Control de versiones y repositorio remoto del proyecto.                                      |

### 2.5.2. Hardware

| Componente            | Características técnicas                                                                                                                                       | Tareas                                                                  |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| Ordenador portátil    | HP Laptop · AMD Ryzen 5 5500U · 16 GB RAM · AMD Radeon Graphics · Windows 11 Home                                                                              | Desarrollo, redacción de la documentación, diseño de la presentación.   |
| Smartphone principal  | POCO X3 NFC · Octa-core Máx 2.30 GHz · 6 GB RAM · 64 GB · Batería 5160 mAh (carga rápida 27 W) · Pantalla IPS LCD 6.67" 1080×2400                              | Testeo del APK en dispositivo real, depuración con Chrome DevTools.     |

---

# 3. Diseño de la solución software

## 3.1. Modelados

### 3.1.1. Casos de uso

**3.1.1.1. Caso de uso — Usuaria sin identificar**

```
        ┌──────────────────────────┐
        │          NUVIA           │
        │                          │
[Anónima] ──────► (Iniciar sesión) │
        │                          │
        │      (Registrarse)       │
        │                          │
        │ (Recuperar contraseña)   │
        └──────────────────────────┘
```

**3.1.1.2. Casos de uso — Usuaria autenticada**

```
                          NUVIA
                ┌────────────────────────────────────┐
                │                                    │
                │  (Registrar ciclo menstrual)       │
                │                                    │
                │  (Registrar síntomas)              │
                │                                    │
                │  (Registrar estado de ánimo /      │
                │   notas / flujo / relaciones)      │
                │                                    │
[Usuaria]  ────►│  (Consultar predicciones)          │
                │                                    │
                │  (Ver historial y calendario)      │
                │                                    │
                │  (Exportar informe PDF)            │
                │                                    │
                │  (Participar en el foro)           │
                │     ├ publicar / responder         │
                │     ├ like / favorito / reacción   │
                │     ├ seguir / bloquear            │
                │     └ reportar                     │
                │                                    │
                │  (Leer consejos / marcar fav.)     │
                │                                    │
                │  (Vincularse con pareja)           │
                │                                    │
                │  (Chatear con pareja)              │
                │                                    │
                │  (Chatear con atención al cliente) │
                │                                    │
                │  (Configurar preferencias)         │
                │                                    │
                │  (Cerrar sesión)                   │
                └────────────────────────────────────┘
```

**3.1.1.3. Casos de uso — Pareja vinculada**

```
                          NUVIA
                ┌────────────────────────────────────┐
                │                                    │
                │  (Ver ciclo / predicciones         │
                │   de la usuaria vinculada)         │
                │                                    │
[Pareja]   ────►│  (Chatear con la usuaria)          │
                │                                    │
                │  (Compartir publicaciones del      │
                │   foro en el chat)                 │
                │                                    │
                │  (Recibir aviso si la usuaria      │
                │   corta el vínculo)                │
                └────────────────────────────────────┘
```

**3.1.1.4. Casos de uso — Administrador**

```
                          NUVIA
                ┌────────────────────────────────────┐
                │                                    │
                │  (Gestionar usuarias)              │
                │     ├ ver ficha + historial banes  │
                │     ├ editar / crear / eliminar    │
                │     └ banear / desbanear           │
                │                                    │
                │  (Configurar el sistema)           │
                │     ├ rangos válidos de ciclo      │
                │     └ modo mantenimiento           │
                │                                    │
[Admin]    ────►│  (Gestionar consejos)              │
                │     ├ categorías y etiquetas       │
                │     └ artículos + imágenes IA      │
                │                                    │
                │  (Gestionar reportes del foro)     │
                │     ├ eliminar publicación         │
                │     └ anular reporte               │
                │                                    │
                │  (Atención al cliente)             │
                │     ├ bandeja de conversaciones    │
                │     └ iniciar chat con cualquier   │
                │       usuaria                      │
                │                                    │
                │  (Monitor de logs en vivo)         │
                │                                    │
                │  (Exportar JSON de la base)        │
                └────────────────────────────────────┘
```

### 3.1.2. Interacción

**3.1.2.1. Login**

```
Usuaria → App Nuvia: introduce email + contraseña + plataforma
App Nuvia → Backend (/auth/login): credenciales
Backend → BD: SELECT usuaria por email
BD → Backend: hash de contraseña almacenado
Backend: verify_password(bcrypt)
   alt [credenciales válidas]
     Backend → Backend: create_access_token(JWT)
     Backend → App: { access_token, token_type }
     App → Usuaria: acceso concedido (pantalla principal)
   else [credenciales inválidas]
     Backend → App: 401 Unauthorized
     App → Usuaria: mensaje de error
```

**3.1.2.2. Uso normal (registro diario + predicción)**

```
Usuaria → App: registra ciclo / síntoma / nota
App → Backend (/ciclos · /registros-sintomas · /registros-diarios)
Backend → BD: INSERT
BD → Backend: confirmación

App → Backend (/predicciones/calcular)
Backend → BD: SELECT últimos ciclos
Backend: ejecuta algoritmo (media móvil de duración + 14 días para ovulación)
Backend → BD: UPSERT predicciones
Backend → App: { proxima_menstruacion, ventana_fertil, prediccion_ovulacion }
App → Usuaria: muestra cards de Próximo periodo / Ventana fértil / Ovulación
```

**3.1.2.3. Aviso de mascota**

```
App (cada 15 s) → Backend (/chat/mascota/avisos)
Backend → BD: cuenta mensajes no leídos + reportes pendientes (si admin)
Backend → App: [{ tipo, texto, count }, ...]
App → MascotaNuvia: si hay aviso → pausa walk, centra la mascota,
                                   eleva con la pose "flotando",
                                   muestra bocadillo con el texto
Usuaria → MascotaNuvia: click
App → router: navega al destino (/pareja, /soporte, /admin/soporte, /admin/reportes)
App → setAvisos([]): limpia local
MascotaNuvia: baja suavemente y reanuda walking
```

### 3.1.3. Estado (ciclo de una predicción)

```
       ●
       │
   ┌───▼────┐
   │SinDatos│
   └───┬────┘
       │ Usuaria registra fecha de inicio
   ┌───▼────────┐
   │CicloIniciado│
   └───┬────────┘
       │ Registro de síntomas / notas / flujo
   ┌───▼────────┐
   │CicloEnCurso│
   └───┬────────┘
       │ Usuaria registra fecha de fin
   ┌───▼─────────┐
   │CicloFinalizado│
   └───┬─────────┘
       │ Algoritmo calcula próximo ciclo
   ┌───▼──────────────┐
   │PrediccionGenerada│
   └───┬──────────────┘
       │
       ◉
```

### 3.1.4. Actividad

```
[Inicio: Usuaria inicia sesión]
            │
            ▼
   ┌──────────────────────┐
   │ Ingresar información │
   │ diaria               │
   └──────────┬───────────┘
              │
              ▼
     ◇ ¿Qué desea registrar? ◇
       │       │       │
       ▼       ▼       ▼
   Síntoma  Ciclo   Diario
       │       │       │
       ▼       ▼       ▼
   INSERT  INSERT  INSERT
   registro_ ciclos registros_
   sintomas         diarios
       │       │       │
       └───────┼───────┘
               ▼
       ◇ ¿Suficientes datos
          históricos? ◇
        │           │
        sí          no
        ▼           │
   Ejecutar         ▼
   algoritmo  (Se omite recalcular)
   de predicción     │
        │            │
        ▼            │
   UPSERT en         │
   tabla `predicciones`
        │            │
        └─────┬──────┘
              ▼
   Mostrar a la usuaria:
   próximo periodo,
   ventana fértil
   y ovulación estimada
              │
              ▼
            [Fin]
```

## 3.2. Base de datos

### 3.2.1. Diseño conceptual (ER)

El modelo se ha ampliado significativamente respecto al diseño inicial. Bloques principales:

```
                    ┌──────────┐
                    │ usuarias │ (rol, mi_codigo, solicitud_*)
                    └─────┬────┘
       1               1  │  1                       1
   ┌───┴────┐    ┌────────┴──────────┐        ┌──────┴───────┐
   │ ciclos │    │ configuracion_    │        │ predicciones │
   └────────┘    │ usuaria           │        └──────────────┘
                 └───────────────────┘
        1              1                  1                1
   ┌────┴──────┐  ┌────┴────────────┐  ┌───┴───────────┐  ┌┴────────────┐
   │ registro_ │  │ registros_      │  │ historial_    │  │ desvinculac.│
   │ sintomas  │  │ diarios         │  │ estados       │  │ _pareja     │
   └─────┬─────┘  └─────────────────┘  └───────────────┘  └─────────────┘
         │
      ┌──┴────┐
      │sintomas│
      └───────┘

       ┌───────────────────────────┐
       │       parejas (M:N)       │  ← vínculos entre usuarias
       └───────────────────────────┘

       ┌──── foro ──────────────────────────────────────────┐
       │ foro_publicaciones, foro_respuestas, foro_likes,   │
       │ foro_favoritos, foro_reacciones, foro_seguimientos,│
       │ foro_bloqueos, foro_reportes, foro_baneos,         │
       │ foro_eliminaciones_aviso                           │
       └────────────────────────────────────────────────────┘

       ┌──── consejos ──────────────────────────────────────┐
       │ consejos_clasificaciones, consejos_etiquetas,      │
       │ consejos_articulos, consejos_articulo_etiquetas,   │
       │ consejos_favoritos                                 │
       └────────────────────────────────────────────────────┘

       ┌──── chat ─────────────┐
       │ mensajes              │  ← pareja↔pareja y usuaria↔admin
       └───────────────────────┘

       ┌──── sistema ──────────┐
       │ configuracion_sistema │
       └───────────────────────┘
```

### 3.2.2. Diseño lógico (tablas normalizadas)

Tablas reales presentes en la base de datos PostgreSQL:

```
usuarias                       configuracion_usuaria
ciclos                         historial_estados
sintomas                       predicciones
registro_sintomas              registros_diarios
parejas                        desvinculaciones_pareja
mensajes                       configuracion_sistema

foro_publicaciones             foro_respuestas
foro_likes                     foro_favoritos
foro_reacciones                foro_seguimientos
foro_bloqueos                  foro_reportes
foro_baneos                    foro_eliminaciones_aviso

consejos_clasificaciones       consejos_etiquetas
consejos_articulos             consejos_articulo_etiquetas
consejos_favoritos
```

**Tabla `usuarias`** — identidad y rol
```
id_usuaria      UUID PK (gen_random_uuid)
nombre          VARCHAR(100) NOT NULL
email           VARCHAR(150) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL (bcrypt)
rol             VARCHAR(20)  NOT NULL  ('usuaria' | 'pareja' | 'admin')
mi_codigo       VARCHAR(10)  UNIQUE          ← código para vincular pareja
solicitud_id    UUID FK → usuarias            ← solicitud de pareja entrante
solicitud_estado VARCHAR(20)                  ← 'pendiente' | 'rechazada' | 'enviada'
otp             VARCHAR(10)
otp_expiry      TIMESTAMP
fecha_registro  TIMESTAMP DEFAULT NOW()
ultimo_acceso   TIMESTAMP
```

**Tabla `ciclos`**
```
id_ciclo             UUID PK
id_usuaria           UUID FK → usuarias
fecha_inicio         DATE NOT NULL
fecha_fin            DATE
duracion             INT
regularidad_estimado VARCHAR(50)
```

**Tabla `sintomas`** — catálogo
```
id_sintoma     UUID PK
nombre_sintoma VARCHAR(100) NOT NULL
categoria      VARCHAR(100)
```

**Tabla `registro_sintomas`** — N:M usuaria-sintoma con intensidad
```
id_registro UUID PK
id_usuaria  UUID FK
id_sintoma  UUID FK
fecha       DATE NOT NULL
intensidad  SMALLINT
```

**Tabla `registros_diarios`** — notas, flujo y relaciones
```
id          UUID PK
id_usuaria  UUID FK
fecha       DATE NOT NULL
notas       TEXT
flujo       VARCHAR(50)
relaciones  SMALLINT   ← 0=No · 1=Con protección · 2=Sin protección
```

**Tabla `historial_estados`**
```
id_historial UUID PK
id_usuaria   UUID FK
fecha        DATE NOT NULL
```

**Tabla `predicciones`**
```
id_prediccion          UUID PK
id_usuaria             UUID FK
proxima_menstruacion   DATE
prediccion_ovulacion   DATE
ventana_fertil_inicio  DATE
ventana_fertil_fin     DATE
```

**Tabla `configuracion_usuaria`**
```
id_usuaria           UUID PK FK
privacidad_estricta  SMALLINT DEFAULT 0
duracion_ciclo       SMALLINT DEFAULT 28
duracion_periodo     SMALLINT DEFAULT 5
fecha_nacimiento     DATE
modo_oscuro          SMALLINT DEFAULT 0
google_token         TEXT
google_refresh_token TEXT
google_token_expiry  TIMESTAMP
```

**Tabla `configuracion_sistema`**
```
id                    SERIAL PK
modo_mantenimiento    BOOLEAN
version_algoritmo     VARCHAR(50)
max_dias_ciclo / min_dias_ciclo
max_dias_periodo / min_dias_periodo
ultima_actualizacion  TIMESTAMP
```

**Tabla `parejas`** — vínculo M:N entre usuarias
```
id          UUID PK
id_usuaria  UUID FK   ← la propietaria de los datos
id_pareja   UUID FK   ← la que acompaña (rol 'pareja')
UNIQUE (id_usuaria, id_pareja)
```

**Tabla `desvinculaciones_pareja`** — aviso cuando alguien corta
```
id             UUID PK
id_afectada    UUID FK   ← la que verá el modal
id_otra        UUID FK   ← la que cortó
nombre_otra    VARCHAR(100)
rol_afectada   VARCHAR(20)  ← 'usuaria' | 'pareja'
visto          BOOLEAN
created_at     TIMESTAMP
```

**Tabla `mensajes`** — chat (pareja y soporte)
```
id            UUID PK
id_remitente  UUID FK
id_receptor   UUID FK
contenido     TEXT
imagen        BYTEA
imagen_mime   VARCHAR(50)
es_compartido BOOLEAN
leido         BOOLEAN
fecha         TIMESTAMP DEFAULT NOW()
```

**Tablas del foro** — comunidad
```
foro_publicaciones (id, id_usuaria, contenido, categoria, imagen, created_at)
foro_respuestas    (id, id_publicacion, id_usuaria, contenido, imagen, created_at)
foro_likes         (id_publicacion, id_usuaria) PK compuesta
foro_favoritos     (id_publicacion, id_usuaria) PK compuesta
foro_reacciones    (id_publicacion, id_usuaria, emoji) PK compuesta
foro_seguimientos  (id_seguidor, id_seguido) PK compuesta
foro_bloqueos      (id_bloqueador, id_bloqueado, created_at) PK compuesta
foro_reportes      (id, id_publicacion, id_reportador, motivo_reporte, estado, id_admin, resolved_at)
foro_baneos        (id, id_usuaria, motivos JSON, motivo_personalizado, fecha_inicio, fecha_fin, activo, id_admin, visto_por_usuaria)
foro_eliminaciones_aviso (id, id_autor, contenido_original, motivos, visto)
```

**Tablas de consejos** — artículos
```
consejos_clasificaciones    (id, nombre, descripcion, activa, orden)
consejos_etiquetas          (id, nombre, activa)
consejos_articulos          (id, id_clasificacion, titulo, resumen, cuerpo, imagen, imagen_mime, imagen_prompt, activo, orden)
consejos_articulo_etiquetas (id_articulo, id_etiqueta) PK compuesta
consejos_favoritos          (id_articulo, id_usuaria, created_at) PK compuesta
```

## 3.3. Prototipo gráfico

La interfaz se ha desarrollado con identidad visual propia: gradientes morado-rosa (#b05bb5 → #F472B6), tipografía Outfit, esquinas redondeadas grandes y safe-area-inset para móviles con notch.

Pantallas clave del prototipo final:

- **Login** y **Registro** con burbujas decorativas, selector de rol Usuaria/Pareja y modal de "olvidé contraseña" (OTP por email).
- **Home** con tarjeta de fase actual del ciclo (color según fase), tarjeta de eventos próximos (fértil/periodo/ovulación), botón "Marcar inicio del periodo" y cuatro accesos rápidos: Chats Secretos, Mi pareja, Mi Bienestar, Consejos.
- **Calendario** con marcado por fases (menstruación, fértil, ovulación), detalle del día seleccionado y métricas de duración promedio.
- **Síntomas / Registra tu día** con grid de emoticonos personalizados (SVG hechos a mano), estado de ánimo, flujo y notas.
- **Predicciones** con gráfica de evolución y cards de próximo periodo / ventana fértil / ovulación.
- **Wellness (Mi Bienestar)** con guía según la fase y filtros por categoría.
- **Comunidad (Foro)** con tabs (Todas / Categorías), publicaciones con imagen, reacciones, seguir/bloquear.
- **Consejos** con catálogo de artículos clasificados.
- **Mi Pareja** con código personal grande, formulario para vincular, lista de vínculos, chat secreto en pantalla completa.
- **Atención al cliente** (chat con el admin).
- **Perfil** con avatar, datos personales, sliders de duración del ciclo, modo oscuro, botones a Atención al cliente y Panel de Administrador (solo si rol admin).
- **Panel admin** con tarjetas KPI, accesos a Configuración del sistema, Gestión de usuarias, Atención al cliente, Monitor de logs.
- **Gestión de usuarias** con tarjeta por usuaria (avatar + nombre + email + badges Admin/Pareja/Baneada) y fila de botones debajo: Ver, Editar, Banear/Desbanear, Eliminar.
- **Mascota Nuvia** flotando encima de la barra inferior con sprite-sheet de 6 cuadros (right/left) más imágenes individuales para "sentado" y "flotando".

---

# 4. Implementación

## 4.1. Codificación

### 4.1.1. Backend

Estructura del backend (FastAPI + SQLAlchemy):

```
backend/
├── main.py                       ← Entry point, CORS, middleware, migraciones
├── requirements.txt
├── Procfile / railway.json       ← Despliegue Railway
└── app/
    ├── database/connection.py    ← Engine PostgreSQL + SessionLocal
    ├── models/models.py          ← Todos los modelos SQLAlchemy
    ├── schemas/schemas.py        ← Schemas Pydantic (Out / Create / Update)
    ├── utils/
    │   ├── email.py              ← Envío OTP por Brevo
    │   ├── gemini.py             ← Generación de imágenes
    │   ├── unsplash.py           ← Banco de imágenes
    │   └── logs.py               ← Buffer en memoria de logs
    └── routers/
        ├── auth.py               ← /auth/registro · login · me · forgot-password · verify-otp
        ├── auth_utils.py         ← JWT, hash, get_current_user
        ├── ciclos.py             ← CRUD ciclos
        ├── sintomas.py           ← Catálogo + registros
        ├── diario.py             ← Notas, flujo, relaciones
        ├── historial.py
        ├── predicciones.py       ← Algoritmo de predicción
        ├── configuracion.py      ← Config de la usuaria + alta de solicitud de pareja
        ├── parejas.py            ← Listar vínculos · desvincular · avisos
        ├── chat.py               ← Mensajes + mascota/avisos + soporte/*
        ├── foro.py               ← Comunidad completa + reportes + banes
        ├── consejos.py           ← Clasificaciones, etiquetas, artículos
        ├── admin.py              ← /admin/users · stats · config · logs · export
        └── calendar.py           ← Eventos derivados para el calendario
```

**Patrones clave del backend:**

- **Migraciones incrementales en `main.py`**: cada arranque ejecuta una lista de `ALTER TABLE / CREATE TABLE IF NOT EXISTS` por separado, capturando excepciones para evitar fallar si una migración ya estaba aplicada.
- **JWT**: token firmado con `python-jose` (HS256), validado en `get_current_user` y leído desde `Authorization: Bearer ...`.
- **Permisos**: cada router que necesita rol especial usa `Depends(require_admin)` o comprueba `current_user.rol`.
- **Chat con permisos relajados**: el helper `_puede_chatear` permite chat si son pareja vinculada O si una de las dos partes es admin (para el soporte).
- **Algoritmo de predicción**: media de duración de los ciclos cerrados; predicción de ovulación = `proxima_menstruacion − 14`; ventana fértil = ovulación ± 3 días.

### 4.1.2. Frontend

Estructura del frontend (React + Vite + Capacitor):

```
frontend/
├── public/                        ← Assets estáticos
│   ├── logo.png
│   ├── mascota-walk.png           ← Sprite-sheet 6×2 (right + left)
│   ├── mascota-sentado.png
│   ├── mascota-flotando.png
│   └── manifest.json
├── src/
│   ├── main.jsx                   ← Entry, monta App + BrowserRouter
│   ├── App.jsx                    ← Routes, guard de rol pareja, modales globales
│   ├── api.js                     ← ApiService (fetch wrapper)
│   ├── index.css                  ← Variables, modo oscuro, safe-area
│   ├── context/AuthContext.jsx    ← getMe + login + logout + JWT
│   ├── components/
│   │   ├── AuthImage.jsx          ← <img> con bearer token
│   │   └── MascotaNuvia.jsx       ← Animación + bocadillo + polling
│   └── screens/                   ← 19 pantallas (ver índice abajo)
├── android/                       ← Proyecto Android generado por Capacitor
├── capacitor.config.json
├── vercel.json                    ← Rewrite SPA para Vercel
└── vite.config.js
```

**Pantallas (`screens/`):**

```
Auth:    LoginScreen, RegisterScreen
Main:    HomeScreen, SymptomsScreen, CalendarScreen, PredictionsScreen,
         WellnessScreen, ProfileScreen
Social:  PartnerScreen, CommunityScreen, ConsejosScreen, ConsejoDetailScreen,
         SupportChatScreen
Admin:   AdminPanelScreen, AdminUsersScreen, AdminConfigScreen,
         AdminConsejosScreen, AdminReportesScreen, AdminSupportScreen
```

**Componentes globales:** `BottomNav`, `MascotaNuvia`, modal de solicitud de pareja entrante, modal de solicitud rechazada, modal de "Ya no sois pareja".

**Mascota Nuvia — implementación técnica:**

- Posición fija sobre la barra inferior (`bottom: 75px + safe-area`).
- Tres capas apiladas dentro de un mismo wrap:
  - `nuvia-capa-andando`: sprite-sheet con `background-image: url('/mascota-walk.png')`. Tres animaciones simultáneas: `mascota-frames` (avance de cuadros con `steps(6)`), `mascota-direccion` (cambia la fila según el sentido de marcha) y `capa-andando-ciclo` (controla la opacidad para que se "siente" durante las pausas).
  - `nuvia-capa-sentado`: `mascota-sentado.png` con animación `capa-sentado-ciclo`.
  - `nuvia-capa-flotando`: `mascota-flotando.png`, visible solo cuando hay `aviso`.
- Polling cada 15 s al endpoint `/chat/mascota/avisos`. Si hay avisos:
  - Se pausa el walk (`animation-play-state: paused`) y todas las animaciones internas.
  - Se calcula con `getBoundingClientRect()` el offset hasta el centro de la pantalla y se aplica `translateX` con `transition` para deslizarla suavemente.
  - El lift (`translateY: -32px`) eleva la mascota.
  - Se muestra un bocadillo blanco con sombra y el texto del aviso.
- Al pulsar la mascota o el bocadillo: navega al destino (`/pareja`, `/soporte`, `/admin/soporte`, `/admin/reportes`) y limpia los avisos locales para que baje suavemente y reanude la caminata exactamente donde la dejó (la pausa del animation mantiene la posición congelada).

## 4.2. Pruebas

Las pruebas se han realizado de forma manual en tres entornos:

- **Local web (Vite + Chrome DevTools)** — durante el desarrollo, con HMR para iterar rápido.
- **Local Android (APK debug instalada en POCO X3 NFC)** — para validar comportamiento real en dispositivo: safe-area-inset, touch events, WebView, sprites.
- **Producción (Vercel + Railway)** — para verificar HTTPS, latencias reales y persistencia.

Casos de prueba representativos:

| Caso                                                        | Resultado |
|-------------------------------------------------------------|:---------:|
| Registro + login de una usuaria nueva                       | OK        |
| Recuperación de contraseña por OTP                          | OK        |
| Registro de ciclo, síntomas y notas → predicción correcta   | OK        |
| Exportación a PDF del informe                               | OK        |
| Vinculación pareja mediante código + aceptación / rechazo   | OK        |
| Acceso de la pareja a los datos de la usuaria               | OK (solo lectura) |
| Login de pareja sin vínculos → vistas restringidas          | OK        |
| Corte de vínculo → modal "Ya no sois pareja" en la otra app | OK        |
| Chat secreto pareja ↔ usuaria + envío de imagen             | OK        |
| Foro: publicar, like, reportar → admin elimina              | OK        |
| Ban + desbaneo con motivos catalogados                      | OK        |
| Atención al cliente: usuaria escribe → admin recibe en su bandeja → admin responde → mascota notifica a la usuaria | OK |
| Mascota: animación walk-cycle correcta, sit en pausas, float al recibir aviso, descenso al hacer click | OK |
| Modo oscuro                                                 | OK        |

---

# 5. Documentación

## 5.1. Empaquetado / Distribución

**APK Android:**
- Pipeline:
  1. `npm run build` (Vite) → genera `frontend/dist/`.
  2. `npx cap sync android` → copia `dist/` a `frontend/android/app/src/main/assets/public/`.
  3. `./gradlew.bat assembleDebug` → produce `frontend/android/app/build/outputs/apk/debug/app-debug.apk`.
  4. Copia automatizada a la raíz del repo como `Nuvia.apk`.
- Tamaño aproximado: ~5,7 MB.
- Firmado con la clave de debug de Android (suficiente para distribución directa fuera de Play Store).

**Web PWA:**
- `frontend/dist/` se sirve estáticamente desde Vercel.
- Rewrite SPA configurado en `frontend/vercel.json`.

**Backend:**
- Railway con `Procfile`: `gunicorn --chdir backend -w 4 -k uvicorn.workers.UvicornWorker main:app`.
- Variables de entorno necesarias: `DATABASE_URL`, `SECRET_KEY`, opcionales `GEMINI_API_KEY`, `UNSPLASH_ACCESS_KEY`, `SIB_API_KEY`.

## 5.2. Instalación

### Backend en local

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
# Crear backend/.env con DATABASE_URL=postgresql://... y SECRET_KEY=...
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend en local

```bash
cd frontend
npm install
# Crear frontend/.env con VITE_API_URL=http://localhost:8000
npm run dev          # http://localhost:3000
```

### Compilar APK

Requiere Android SDK + JDK 17 + variable `ANDROID_HOME`.

```bash
cd frontend
npm run build
npx cap sync android
cd android
./gradlew.bat assembleDebug      # Windows
```

### Instalación en móvil

1. Descargar `Nuvia.apk`.
2. En el móvil: Ajustes → Seguridad → "Permitir instalar de orígenes desconocidos" para el navegador / gestor de archivos.
3. Abrir el APK e instalar.
4. Tras la primera ejecución: registrar cuenta o iniciar sesión.

## 5.3. Manual de usuario / Referencia

### Registro y primer uso

1. Pulsar **"Crear Cuenta"** en la pantalla de login.
2. Rellenar nombre, email, fecha de nacimiento (opcional), contraseña y rol (Usuaria o Pareja).
3. Tras el alta, el sistema redirige a la pantalla principal.

### Registro de un ciclo

1. En la pantalla **Home**, pulsar **"Marcar inicio del periodo"** o usar el selector de fecha para uno previo.
2. Para cerrar un ciclo, pulsar de nuevo el botón cuando termine el periodo.

### Registro de síntomas

1. Pulsar **"Registra tu día"** en Home o navegar a la pestaña **Síntomas**.
2. Seleccionar los emoticonos (síntomas), estado de ánimo y flujo.
3. Añadir notas opcionales y guardar.

### Vincular pareja

1. La **usuaria** comparte su `mi_codigo` (visible en su panel "Mi pareja").
2. La **pareja**, desde su cuenta con rol "pareja", introduce el código en la pantalla "Mi pareja" → "Vincular con mi pareja" → **Enviar**.
3. La usuaria recibe un modal entrante y pulsa **Aceptar** o **Rechazar**.
4. Tras aceptar, ambas pueden chatear y la pareja accede a los datos en modo lectura.

### Atención al cliente

- **Usuaria**: Perfil → "Atención al cliente" → escribe a soporte. La mascota Nuvia avisará cuando llegue respuesta.
- **Admin**: Panel Admin → "Atención al cliente" → bandeja con todas las conversaciones, badge de no leídos, botón **"Nueva"** para iniciar conversación con cualquier usuaria.

### Panel admin (solo rol admin)

Accesible desde Perfil → Panel de Administrador. Permite:
- Ver KPIs.
- Gestionar usuarias (ver ficha con historial de baneos, editar, banear, desbanear, eliminar).
- Configurar el sistema (rangos de ciclo, modo mantenimiento).
- Gestionar consejos y reportes del foro.
- Atender al cliente.
- Ver logs en vivo.

## 5.4. Actualizaciones futuras

- Migración a notificaciones push reales (eliminadas temporalmente del proyecto a falta de configurar VAPID / FCM).
- Recordatorio configurable de toma de pastilla anticonceptiva.
- Integración con Google Calendar para volcar los eventos del ciclo.
- Modo "embarazo" / "menopausia" con cálculos alternativos.
- Exportación del informe en formato Excel además de PDF.
- Internacionalización (inglés, francés).
- Firmar el APK release para publicar en Play Store.

---

# 6. Conclusiones

Nuvia ha cumplido los objetivos planteados al inicio del proyecto y los ha superado con creces. Lo que comenzó como una simple aplicación de seguimiento del ciclo menstrual ha evolucionado a una plataforma social completa con foro, consejos generados por IA, chat con pareja vinculada, atención al cliente integrada, panel de administración avanzado con baneos catalogados, mascota interactiva animada y empaquetado real como APK Android distribuible.

A nivel técnico, ha sido un reto integrar tantos subsistemas en un único backend coherente (FastAPI + PostgreSQL con migraciones incrementales en arranque) y mantener un frontend único (React + Vite) que sirve tanto a la web PWA como a la APK nativa vía Capacitor, asegurando la misma experiencia en ambas plataformas.

El uso de **JWT + bcrypt** para la autenticación, **UUIDs** como claves primarias y la separación clara de roles (usuaria / pareja / admin) refuerzan la seguridad y la privacidad de los datos, dos de los pilares iniciales del proyecto.

El componente más singular del proyecto — la **mascota Nuvia** — combina sprite-sheets, múltiples animaciones CSS sincronizadas y polling al backend para crear una experiencia de notificación amable, lejos de las típicas alertas modales agresivas.

# 7. Bibliografía

- Documentación oficial de FastAPI — <https://fastapi.tiangolo.com/>
- Documentación oficial de SQLAlchemy 2.x — <https://docs.sqlalchemy.org/>
- Documentación oficial de React 18 — <https://react.dev/>
- Documentación oficial de Vite — <https://vitejs.dev/>
- Documentación oficial de Capacitor — <https://capacitorjs.com/>
- PostgreSQL Docs — <https://www.postgresql.org/docs/>
- Lucide Icons — <https://lucide.dev/>
- Google Gemini API — <https://ai.google.dev/>
- Unsplash API — <https://unsplash.com/developers>
- Brevo (Sendinblue) API — <https://developers.brevo.com/>
- MDN Web Docs (CSS animations, sprites) — <https://developer.mozilla.org/>
- Stack Overflow (resolución de problemas concretos).
- Creative Commons CC BY-NC-ND 4.0 — <https://creativecommons.org/licenses/by-nc-nd/4.0/deed.es>

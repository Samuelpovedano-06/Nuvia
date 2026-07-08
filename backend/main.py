from fastapi import FastAPI, Request
import time
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database.connection import engine
from app.models import models
from app.routers import auth, sintomas, diario, ciclos, configuracion, historial, predicciones, admin, parejas, chat, foro, consejos, juegos

# Sincronizar Base de Datos
models.Base.metadata.create_all(bind=engine)

# Migraciones incrementales — cada sentencia es independiente
def run_migrations():
    migrations = [
        "ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS min_dias_periodo INTEGER DEFAULT 3",
        "ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS max_dias_periodo INTEGER DEFAULT 10",
        "ALTER TABLE configuracion_sistema ADD COLUMN IF NOT EXISTS mostrar_colisiones BOOLEAN DEFAULT FALSE",
        "ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS mi_codigo VARCHAR(10) UNIQUE",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS solicitud_id UUID",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS solicitud_estado VARCHAR(20)",
        # Tabla de vínculos pareja ↔ usuaria (muchos a muchos)
        """CREATE TABLE IF NOT EXISTS parejas (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_pareja  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            UNIQUE(id_usuaria, id_pareja)
        )""",
        # Eliminar columna codigo_pareja si existe (ya no se usa)
        "ALTER TABLE usuarias DROP COLUMN IF EXISTS codigo_pareja",
        # Foro comunitario
        """CREATE TABLE IF NOT EXISTS foro_publicaciones (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            contenido TEXT NOT NULL,
            categoria VARCHAR(50) NOT NULL DEFAULT 'general',
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_respuestas (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            contenido TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_likes (
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            PRIMARY KEY (id_publicacion, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_favoritos (
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            PRIMARY KEY (id_publicacion, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_reacciones (
            id_publicacion UUID NOT NULL REFERENCES foro_publicaciones(id) ON DELETE CASCADE,
            id_usuaria UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            emoji VARCHAR(10) NOT NULL,
            PRIMARY KEY (id_publicacion, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_seguimientos (
            id_seguidor UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_seguido UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            PRIMARY KEY (id_seguidor, id_seguido)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_bloqueos (
            id_bloqueador UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_bloqueado  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            created_at    TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (id_bloqueador, id_bloqueado)
        )""",
        """CREATE TABLE IF NOT EXISTS foro_reportes (
            id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_publicacion  UUID REFERENCES foro_publicaciones(id) ON DELETE SET NULL,
            id_reportador   UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            motivo_reporte  TEXT,
            estado          VARCHAR(30) NOT NULL DEFAULT 'pendiente',
            id_admin        UUID REFERENCES usuarias(id_usuaria) ON DELETE SET NULL,
            resolved_at     TIMESTAMP,
            created_at      TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_baneos (
            id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_usuaria            UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            motivos               TEXT,
            motivo_personalizado  TEXT,
            fecha_inicio          TIMESTAMP DEFAULT NOW(),
            fecha_fin             TIMESTAMP,
            activo                BOOLEAN DEFAULT TRUE,
            id_admin              UUID REFERENCES usuarias(id_usuaria) ON DELETE SET NULL,
            visto_por_usuaria     BOOLEAN DEFAULT FALSE,
            created_at            TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS desvinculaciones_pareja (
            id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_afectada   UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            id_otra       UUID REFERENCES usuarias(id_usuaria) ON DELETE SET NULL,
            nombre_otra   VARCHAR(100) NOT NULL,
            rol_afectada  VARCHAR(20) NOT NULL,
            visto         BOOLEAN DEFAULT FALSE,
            created_at    TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS foro_eliminaciones_aviso (
            id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_autor              UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            contenido_original    TEXT,
            tenia_imagen          BOOLEAN DEFAULT FALSE,
            motivos               TEXT,
            motivo_personalizado  TEXT,
            visto                 BOOLEAN DEFAULT FALSE,
            created_at            TIMESTAMP DEFAULT NOW()
        )""",
        # Adjuntos de imagen (foro y chat)
        "ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS imagen BYTEA",
        "ALTER TABLE foro_publicaciones ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(50)",
        "ALTER TABLE foro_publicaciones ALTER COLUMN contenido DROP NOT NULL",
        "ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS imagen BYTEA",
        "ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(50)",
        "ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS es_compartido BOOLEAN DEFAULT FALSE",
        "ALTER TABLE mensajes ALTER COLUMN contenido DROP NOT NULL",
        "ALTER TABLE foro_respuestas ADD COLUMN IF NOT EXISTS imagen BYTEA",
        "ALTER TABLE foro_respuestas ADD COLUMN IF NOT EXISTS imagen_mime VARCHAR(50)",
        "ALTER TABLE foro_respuestas ALTER COLUMN contenido DROP NOT NULL",
        # Consejos
        """CREATE TABLE IF NOT EXISTS consejos_clasificaciones (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre      VARCHAR(100) NOT NULL,
            descripcion TEXT,
            activa      BOOLEAN DEFAULT TRUE,
            orden       INTEGER DEFAULT 0,
            created_at  TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_etiquetas (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            nombre     VARCHAR(60) NOT NULL UNIQUE,
            activa     BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_articulos (
            id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            id_clasificacion UUID NOT NULL REFERENCES consejos_clasificaciones(id) ON DELETE CASCADE,
            titulo           VARCHAR(200) NOT NULL,
            resumen          TEXT,
            cuerpo           TEXT,
            imagen           BYTEA,
            imagen_mime      VARCHAR(50),
            imagen_prompt    TEXT,
            activo           BOOLEAN DEFAULT TRUE,
            orden            INTEGER DEFAULT 0,
            created_at       TIMESTAMP DEFAULT NOW()
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_articulo_etiquetas (
            id_articulo UUID NOT NULL REFERENCES consejos_articulos(id) ON DELETE CASCADE,
            id_etiqueta UUID NOT NULL REFERENCES consejos_etiquetas(id) ON DELETE CASCADE,
            PRIMARY KEY (id_articulo, id_etiqueta)
        )""",
        """CREATE TABLE IF NOT EXISTS consejos_favoritos (
            id_articulo UUID NOT NULL REFERENCES consejos_articulos(id) ON DELETE CASCADE,
            id_usuaria  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            created_at  TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (id_articulo, id_usuaria)
        )""",
        """CREATE TABLE IF NOT EXISTS avisos_mascota_descartados (
            id_usuaria     UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            tipo           VARCHAR(40) NOT NULL,
            descartado_at  TIMESTAMP DEFAULT NOW(),
            clave          VARCHAR(40),
            PRIMARY KEY (id_usuaria, tipo)
        )""",
        "ALTER TABLE avisos_mascota_descartados ADD COLUMN IF NOT EXISTS clave VARCHAR(40)",
        """CREATE TABLE IF NOT EXISTS juego_records (
            id_usuaria  UUID NOT NULL REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
            juego       VARCHAR(40) NOT NULL,
            record      INTEGER NOT NULL DEFAULT 0,
            updated_at  TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (id_usuaria, juego)
        )""",
        """CREATE TABLE IF NOT EXISTS comunicados_generales (
            id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            titulo     VARCHAR(200) NOT NULL,
            contenido  TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        )""",
        # Foto de perfil de usuario
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS foto_perfil BYTEA",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS foto_perfil_mime VARCHAR(50)",
        # Duración de periodo predicha al crear un ciclo
        "ALTER TABLE ciclos ADD COLUMN IF NOT EXISTS duracion_periodo_predicha INTEGER",
        # Nuevos síntomas físicos (categoría sin tilde para coincidir con el filtro del frontend)
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Dolor Ovario Derecho', 'Fisico' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Dolor Ovario Derecho')",
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Dolor Ovario Izquierdo', 'Fisico' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Dolor Ovario Izquierdo')",
        # Corregir categoría si se insertaron con tilde por error
        "UPDATE sintomas SET categoria = 'Fisico' WHERE nombre_sintoma IN ('Dolor Ovario Derecho', 'Dolor Ovario Izquierdo') AND categoria = 'Físico'",
        # Calambres y espasmos
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Calambres', 'Fisico' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Calambres')",
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Espasmos', 'Fisico' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Espasmos')",
        # Duraciones predichas en tabla predicciones (para que el calendario las use)
        "ALTER TABLE predicciones ADD COLUMN IF NOT EXISTS duracion_ciclo_predicha INTEGER",
        "ALTER TABLE predicciones ADD COLUMN IF NOT EXISTS duracion_periodo_predicha INTEGER",
        # Activación/desactivación de cuentas
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS activo BOOLEAN DEFAULT TRUE",
        "UPDATE usuarias SET activo = TRUE WHERE activo IS NULL",
        # Peso y altura en configuración de usuario
        "ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS peso NUMERIC(5,1)",
        "ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS altura INTEGER",

        # Notas de chat (estilo Instagram, 24h)
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS nota_chat VARCHAR(60)",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS nota_chat_expires_at TIMESTAMP",

        # Música en notas estilo Instagram
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS nota_musica_titulo VARCHAR(100)",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS nota_musica_artista VARCHAR(100)",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS nota_musica_preview VARCHAR(500)",
        "ALTER TABLE usuarias ADD COLUMN IF NOT EXISTS nota_musica_artwork VARCHAR(500)",

        # Método anticonceptivo en configuración
        "ALTER TABLE configuracion_usuaria ADD COLUMN IF NOT EXISTS metodo_anticonceptivo VARCHAR(50)",

        # Dolor irradiado
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Dolor Irradiado', 'Fisico' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Dolor Irradiado')",

        # Categoría Olor — olores vaginales/menstruales más comunes
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Olor Metálico', 'Olor' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Olor Metálico')",
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Olor Ácido', 'Olor' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Olor Ácido')",
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Olor Intenso', 'Olor' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Olor Intenso')",
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Olor a Pescado', 'Olor' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Olor a Pescado')",
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Olor Dulce', 'Olor' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Olor Dulce')",
        "INSERT INTO sintomas (id_sintoma, nombre_sintoma, categoria) SELECT gen_random_uuid(), 'Sin Olor Inusual', 'Olor' WHERE NOT EXISTS (SELECT 1 FROM sintomas WHERE nombre_sintoma = 'Sin Olor Inusual')",

        # ── Clasificaciones de Consejos ──────────────────────────────────────────
        "INSERT INTO consejos_clasificaciones (nombre, descripcion, activa, orden) SELECT 'Remedios', 'Remedios naturales para aliviar los sintomas del ciclo menstrual', TRUE, 10 WHERE NOT EXISTS (SELECT 1 FROM consejos_clasificaciones WHERE nombre = 'Remedios')",
        "INSERT INTO consejos_clasificaciones (nombre, descripcion, activa, orden) SELECT 'Tratamientos', 'Medicamentos recomendables para el manejo del ciclo y sus sintomas', TRUE, 11 WHERE NOT EXISTS (SELECT 1 FROM consejos_clasificaciones WHERE nombre = 'Tratamientos')",

        # ── Artículos de Remedios ────────────────────────────────────────────────
        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Calor local para los colicos',
          'Aplica calor en el abdomen para relajar los espasmos y reducir el dolor',
          'Coloca una bolsa de agua caliente o almohadilla termica sobre el abdomen inferior durante 15-20 minutos. El calor relaja la musculatura uterina, mejora la circulacion local y reduce significativamente la intensidad de los colicos. Puedes repetirlo varias veces al dia. Es uno de los remedios mas eficaces y sin efectos secundarios.',
          TRUE, 1
        FROM consejos_clasificaciones c WHERE c.nombre = 'Remedios'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Calor local para los colicos')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Te de jengibre para nauseas y colicos',
          'El jengibre tiene propiedades antiinflamatorias naturales que alivian las molestias menstruales',
          'Hierve 2 cm de jengibre fresco rallado en 250 ml de agua durante 10 minutos. Cuela, anade miel al gusto y bebe tibio. El jengibre bloquea las prostaglandinas, las mismas moleculas que provocan los colicos. Beber 2-3 tazas al dia durante el periodo ayuda con las nauseas, los calambres y la inflamacion general.',
          TRUE, 2
        FROM consejos_clasificaciones c WHERE c.nombre = 'Remedios'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Te de jengibre para nauseas y colicos')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Magnesio para calambres y tension',
          'El magnesio relaja la musculatura y reduce los calambres menstruales de forma natural',
          'El magnesio es clave para la relajacion muscular. Puedes obtenerlo de alimentos como espinacas, almendras, semillas de calabaza y chocolate negro (mas del 70%). Como suplemento, 300-400 mg de magnesio al dia en la semana previa y durante el periodo puede reducir los calambres, la retencion de liquidos y la irritabilidad.',
          TRUE, 3
        FROM consejos_clasificaciones c WHERE c.nombre = 'Remedios'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Magnesio para calambres y tension')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Infusion de manzanilla',
          'La manzanilla tiene efecto antiespasmódico y calmante sobre el utero',
          'Prepara una infusion con 2 bolsitas o una cucharada de flores secas de manzanilla en agua recien hervida. Deja reposar 5 minutos y bebe caliente. La manzanilla contiene flavonoides que relajan el musculo uterino y reducen la inflamacion. Tomar 2-3 tazas al dia durante el periodo es un remedio clasico y seguro.',
          TRUE, 4
        FROM consejos_clasificaciones c WHERE c.nombre = 'Remedios'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Infusion de manzanilla')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Ejercicio suave: yoga y caminar',
          'El movimiento libera endorfinas que actuan como analgesicos naturales',
          'Aunque pueda parecer contradictorio, el ejercicio moderado durante el periodo reduce el dolor. El yoga menstrual, caminar 20-30 minutos o nadar suavemente liberan endorfinas que actuan como calmantes naturales y mejoran la circulacion pelvica. Evita ejercicios de alta intensidad los primeros dias si el dolor es fuerte.',
          TRUE, 5
        FROM consejos_clasificaciones c WHERE c.nombre = 'Remedios'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Ejercicio suave: yoga y caminar')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Bano tibio con sales de Epsom',
          'Un bano caliente con sales relaja la musculatura pelvica y alivia la tension',
          'Llena la banera con agua tibia (no demasiado caliente) y anade 2 tazas de sales de Epsom (sulfato de magnesio). Sumerge durante 15-20 minutos. El magnesio se absorbe por la piel y relaja los musculos. El calor del agua mejora la circulacion en la zona pelvica y reduce los espasmos. Ideal antes de dormir.',
          TRUE, 6
        FROM consejos_clasificaciones c WHERE c.nombre = 'Remedios'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Bano tibio con sales de Epsom')""",

        # ── Artículos de Tratamientos ────────────────────────────────────────────
        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Ibuprofeno (antiinflamatorio)',
          'Uno de los analgesicos mas eficaces para los colicos menstruales',
          'El ibuprofeno es un antiinflamatorio no esteroideo (AINE) que bloquea la produccion de prostaglandinas, las responsables principales de los colicos. Dosis habitual: 400-600 mg cada 6-8 horas con comida. No superar 2400 mg al dia. Especialmente eficaz si se empieza a tomar 1-2 dias antes del inicio del periodo. No recomendado si tienes problemas gastricos, renales o alergias a los AINEs. Consulta siempre a tu medico.',
          TRUE, 1
        FROM consejos_clasificaciones c WHERE c.nombre = 'Tratamientos'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Ibuprofeno (antiinflamatorio)')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Paracetamol (analgesico)',
          'Alternativa al ibuprofeno para el dolor menstrual, especialmente si hay problemas gastricos',
          'El paracetamol es un analgesico y antipiretico recomendado cuando el ibuprofeno produce molestias gastricas o no esta contraindicado. Dosis habitual: 500-1000 mg cada 4-6 horas, sin superar 4 gramos al dia ni combinarlo con alcohol. Aunque es menos potente que los AINEs para los colicos, es una opcion segura para la mayoria de personas. Consulta a tu medico ante cualquier duda.',
          TRUE, 2
        FROM consejos_clasificaciones c WHERE c.nombre = 'Tratamientos'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Paracetamol (analgesico)')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Acido mefenamico (antiespasmódico)',
          'AINE especialmente indicado para la dismenorrea (dolor menstrual intenso)',
          'El acido mefenamico es un antiinflamatorio con efecto antiespasmódico especialmente eficaz para la dismenorrea primaria. Reduce tanto el dolor como el flujo excesivo. Requiere prescripcion medica en muchos paises. La dosis habitual es de 500 mg cada 8 horas con alimentos. Como otros AINEs, no es adecuado si hay problemas gastricos, renales o renales. Consulta siempre con tu ginecólogo.',
          TRUE, 3
        FROM consejos_clasificaciones c WHERE c.nombre = 'Tratamientos'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Acido mefenamico (antiespasmódico)')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Anticonceptivos hormonales',
          'Regulan el ciclo, reducen el dolor y alivian el sindrome premenstrual',
          'Los anticonceptivos orales combinados (pastillas), el parche, el anillo vaginal o el DIU hormonal pueden reducir significativamente los colicos, el flujo abundante y los sintomas del sindrome premenstrual al regular los niveles hormonales. Son especialmente utiles en casos de endometriosis o sindrome de ovario poliquistico. Requieren prescripcion y seguimiento medico. Habla con tu ginecologo para valorar la mejor opcion segun tu situacion.',
          TRUE, 4
        FROM consejos_clasificaciones c WHERE c.nombre = 'Tratamientos'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Anticonceptivos hormonales')""",

        """INSERT INTO consejos_articulos (id_clasificacion, titulo, resumen, cuerpo, activo, orden)
        SELECT c.id,
          'Suplementos de hierro',
          'Esenciales si tienes reglas abundantes para prevenir la anemia ferropenica',
          'Las reglas abundantes pueden provocar perdida significativa de hierro y derivar en anemia ferropenica (cansancio extremo, palidez, mareos). Los suplementos de hierro como el sulfato ferroso (100-200 mg al dia) ayudan a reponer las reservas. Tomalo con vitamina C (zumo de naranja) para mejorar la absorcion y evita tomarlo con lacteos o cafe. Confirma con un analisis de sangre si tienes deficit antes de empezar la suplementacion.',
          TRUE, 5
        FROM consejos_clasificaciones c WHERE c.nombre = 'Tratamientos'
        AND NOT EXISTS (SELECT 1 FROM consejos_articulos WHERE titulo = 'Suplementos de hierro')""",
    ]
    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                conn.rollback()
                print(f"[migration skip] {e}")
        try:
            conn.execute(text("ALTER TABLE usuarias ADD CONSTRAINT fk_solicitud_id FOREIGN KEY (solicitud_id) REFERENCES usuarias(id_usuaria)"))
            conn.commit()
        except Exception:
            conn.rollback()

run_migrations()

app = FastAPI(title="Nuvia API", version="1.2.0")

from app.utils.logs import add_log

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    
    # Formatear log estilo Uvicorn
    client_host = request.client.host if request.client else "127.0.0.1"
    client_port = request.client.port if request.client else "0"
    
    log_entry = f"INFO:     {client_host}:{client_port} - \"{request.method} {request.url.path} HTTP/1.1\" {response.status_code} OK"
    
    # Guardar en la lista global (máximo 100)
    add_log({
        "id": time.time(),
        "content": log_entry,
        "type": "INFO",
        "color": "#64748b" if response.status_code == 200 else "#facc15"
    })
        
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inclusión de routers modulares
app.include_router(auth.router)
app.include_router(sintomas.router)
app.include_router(diario.router)
app.include_router(ciclos.router)
app.include_router(configuracion.router)
app.include_router(historial.router)
app.include_router(predicciones.router)
app.include_router(admin.router)
app.include_router(parejas.router)
app.include_router(chat.router)
app.include_router(foro.router)
app.include_router(consejos.router)
app.include_router(juegos.router)


@app.get("/")
def read_root():
    return {"message": "Nuvia API v1.2.0 Ready", "port": 8000}

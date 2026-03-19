-- ============================================================
--  NUVIA - Script de creación de base de datos
--  Ejecutar con: mysql -u root -p < create_db.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS NuviaDB
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE NuviaDB;

-- -------------------------------------------------------
-- USUARIAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarias (
    id_usuaria      INT           NOT NULL AUTO_INCREMENT,
    nombre          VARCHAR(100)  NOT NULL,
    email           VARCHAR(150)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255)  NOT NULL,
    fecha_registro  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuaria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- CICLOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS ciclos (
    id_ciclo              INT          NOT NULL AUTO_INCREMENT,
    id_usuaria            INT          NOT NULL,
    fecha_inicio          DATE         NOT NULL,
    fecha_fin             DATE,
    duracion              INT,
    regularidad_estimado  VARCHAR(50),
    PRIMARY KEY (id_ciclo),
    FOREIGN KEY (id_usuaria) REFERENCES usuarias(id_usuaria) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- SINTOMAS (catálogo)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS sintomas (
    id_sintoma      INT           NOT NULL AUTO_INCREMENT,
    nombre_sintoma  VARCHAR(100)  NOT NULL,
    categoria       VARCHAR(100),
    PRIMARY KEY (id_sintoma)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- REGISTRO_SINTOMAS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS registro_sintomas (
    id_registro  INT      NOT NULL AUTO_INCREMENT,
    id_usuaria   INT      NOT NULL,
    id_sintoma   INT      NOT NULL,
    fecha        DATE     NOT NULL,
    intensidad   TINYINT,
    PRIMARY KEY (id_registro),
    FOREIGN KEY (id_usuaria) REFERENCES usuarias(id_usuaria) ON DELETE CASCADE,
    FOREIGN KEY (id_sintoma) REFERENCES sintomas(id_sintoma) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- HISTORIAL_ESTADOS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS historial_estados (
    id_historial  INT           NOT NULL AUTO_INCREMENT,
    id_usuaria    INT           NOT NULL,
    estado_animo  VARCHAR(100),
    fecha         DATE          NOT NULL,
    PRIMARY KEY (id_historial),
    FOREIGN KEY (id_usuaria) REFERENCES usuarias(id_usuaria) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- PREDICCIONES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS predicciones (
    id_prediccion         INT   NOT NULL AUTO_INCREMENT,
    id_usuaria            INT   NOT NULL,
    proxima_menstruacion  DATE,
    ventana_fertil_inicio DATE,
    ventana_fertil_fin    DATE,
    prediccion_ovulacion  DATE,
    PRIMARY KEY (id_prediccion),
    FOREIGN KEY (id_usuaria) REFERENCES usuarias(id_usuaria) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- CONFIGURACION_USUARIA
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion_usuaria (
    id_config                     INT          NOT NULL AUTO_INCREMENT,
    id_usuaria                    INT          NOT NULL UNIQUE,
    notificaciones_activadas      TINYINT(1)   NOT NULL DEFAULT 1,
    recordatorios_personalizados  TEXT,
    tema_visual                   VARCHAR(50)  DEFAULT 'claro',
    PRIMARY KEY (id_config),
    FOREIGN KEY (id_usuaria) REFERENCES usuarias(id_usuaria) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------------------
-- Datos de ejemplo: síntomas del catálogo
-- -------------------------------------------------------
INSERT INTO sintomas (nombre_sintoma, categoria) VALUES
  ('Dolor de cabeza',   'Físico'),
  ('Cólicos',           'Físico'),
  ('Hinchazón',         'Físico'),
  ('Fatiga',            'Físico'),
  ('Acné',              'Físico'),
  ('Dolor de espalda',  'Físico'),
  ('Náuseas',           'Físico'),
  ('Sensibilidad',      'Físico');

-- -------------------------------------------------------
-- Usuario admin de prueba  (password: admin1234)
-- -------------------------------------------------------
INSERT INTO usuarias (nombre, email, password_hash) VALUES
  ('Administrador', 'admin@nuvia.app',
   '$2b$12$KIX/0HdOY8.K7QpJv5sHvuCVpNVhg9GwQqCuvS3w3Fq7yBqGh9Axi');

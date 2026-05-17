"""Scheduler en thread para notificaciones recurrentes.

Eventos manejados:
- regla_proxima       → 1 día antes de proxima_menstruacion (08:30 local)
- ovulacion           → el día de prediccion_ovulacion (08:30 local)
- pastilla            → cuando la hora actual coincide con hora_pastilla
- cumpleanos_pareja   → cuando hoy es el cumpleaños de cualquier pareja vinculada (09:00 local)

Para evitar duplicados se usa la tabla notificaciones_enviadas con clave única por (id_usuaria, tipo, clave).
"""
import threading
import time
import traceback
from datetime import datetime, date, timedelta
from sqlalchemy import or_

from app.database.connection import SessionLocal
from app.models.models import (
    Usuaria,
    ConfiguracionUsuaria,
    Prediccion,
    Pareja,
    NotificacionEnviada,
)
from app.utils.push import enviar_a_usuaria


# Hora a la que se mandan los recordatorios de regla / ovulación / cumple
HORA_AVISO_DIARIO = 8   # 08:00
INTERVALO_SEGUNDOS = 60


def _ya_enviada(db, id_usuaria, tipo: str, clave: str) -> bool:
    return db.query(NotificacionEnviada).filter(
        NotificacionEnviada.id_usuaria == id_usuaria,
        NotificacionEnviada.tipo == tipo,
        NotificacionEnviada.clave == clave,
    ).first() is not None


def _marcar_enviada(db, id_usuaria, tipo: str, clave: str):
    db.add(NotificacionEnviada(id_usuaria=id_usuaria, tipo=tipo, clave=clave))
    db.commit()


def _push(db, id_usuaria, tipo: str, clave: str, title: str, body: str, data_tipo: str):
    if _ya_enviada(db, id_usuaria, tipo, clave):
        return
    try:
        enviar_a_usuaria(db, id_usuaria, title=title, body=body, data={"tipo": data_tipo})
        _marcar_enviada(db, id_usuaria, tipo, clave)
    except Exception as e:
        print(f"[scheduler push {tipo}] {e}")


def _check_regla_y_ovulacion(db, hoy: date):
    """Lee predicciones; envía aviso 1 día antes de la regla y el día de la ovulación."""
    manana = hoy + timedelta(days=1)
    rows = db.query(Prediccion, Usuaria).join(Usuaria, Usuaria.id_usuaria == Prediccion.id_usuaria).all()
    for pred, user in rows:
        # ¿Tiene recordatorio activado?
        cfg = db.query(ConfiguracionUsuaria).filter(
            ConfiguracionUsuaria.id_usuaria == user.id_usuaria
        ).first()
        if not cfg or not (cfg.notificaciones or 0) or not (cfg.recordatorio_ciclo or 0):
            continue

        # Regla 1 día antes
        if pred.proxima_menstruacion and pred.proxima_menstruacion == manana:
            clave = f"regla_{pred.proxima_menstruacion.isoformat()}"
            _push(
                db, user.id_usuaria, "regla_proxima", clave,
                title="🌸 Tu regla llega mañana",
                body="Prepárate: según tu ciclo, tu menstruación empieza mañana.",
                data_tipo="recordatorio_regla",
            )

        # Ovulación
        if pred.prediccion_ovulacion and pred.prediccion_ovulacion == hoy:
            clave = f"ovulacion_{pred.prediccion_ovulacion.isoformat()}"
            _push(
                db, user.id_usuaria, "ovulacion", clave,
                title="🥚 Hoy es tu día fértil estimado",
                body="Estás en tu pico de ovulación según tus ciclos.",
                data_tipo="recordatorio_ovulacion",
            )


def _check_pastilla(db, ahora: datetime):
    """Para cada usuaria con hora_pastilla y recordatorio_pastilla activado, manda push si coincide."""
    cfgs = db.query(ConfiguracionUsuaria).filter(
        ConfiguracionUsuaria.hora_pastilla.isnot(None),
        ConfiguracionUsuaria.recordatorio_pastilla == 1,
    ).all()
    for cfg in cfgs:
        if not (cfg.notificaciones or 0):
            continue
        h = cfg.hora_pastilla
        # Coincide si está en la misma hora y minutos (tolerancia 0)
        if h.hour != ahora.hour or h.minute != ahora.minute:
            continue
        clave = ahora.strftime("%Y-%m-%d")
        _push(
            db, cfg.id_usuaria, "pastilla", clave,
            title="💊 Hora de la pastilla",
            body="Es la hora de tomar tu anticonceptivo.",
            data_tipo="recordatorio_pastilla",
        )


def _check_cumple_pareja(db, hoy: date):
    """Si hoy es el cumpleaños de alguna pareja vinculada, notifica a ambas (cada cual sobre el cumple del otro)."""
    # Trae todos los vínculos junto con la fecha de nacimiento de cada lado
    vinculos = db.query(Pareja).all()
    for v in vinculos:
        for (yo, otra) in [(v.id_usuaria, v.id_pareja), (v.id_pareja, v.id_usuaria)]:
            cfg_yo = db.query(ConfiguracionUsuaria).filter(ConfiguracionUsuaria.id_usuaria == yo).first()
            cfg_otra = db.query(ConfiguracionUsuaria).filter(ConfiguracionUsuaria.id_usuaria == otra).first()
            if not cfg_yo or not cfg_otra or not cfg_otra.fecha_nacimiento:
                continue
            if not (cfg_yo.notificaciones or 0):
                continue
            fn = cfg_otra.fecha_nacimiento
            if fn.month == hoy.month and fn.day == hoy.day:
                otra_user = db.query(Usuaria).filter(Usuaria.id_usuaria == otra).first()
                nombre = otra_user.nombre if otra_user else "tu pareja"
                clave = f"cumple_{otra}_{hoy.year}"
                _push(
                    db, yo, "cumple_pareja", clave,
                    title="🎂 Hoy cumple tu pareja",
                    body=f"Es el cumpleaños de {nombre} — felicítala 💞",
                    data_tipo="cumple_pareja",
                )


def _tick():
    db = SessionLocal()
    try:
        ahora = datetime.now()
        hoy = ahora.date()

        # Pastilla: cada minuto
        _check_pastilla(db, ahora)

        # Resto: solo a la hora marcada (08:xx), pero como _ya_enviada deduplica por día
        # no pasa nada si entra varias veces; chequeamos solo a partir de la hora marcada
        # para no spammar antes del amanecer.
        if ahora.hour >= HORA_AVISO_DIARIO:
            _check_regla_y_ovulacion(db, hoy)
            _check_cumple_pareja(db, hoy)
    except Exception:
        traceback.print_exc()
    finally:
        db.close()


def _loop():
    while True:
        try:
            _tick()
        except Exception:
            traceback.print_exc()
        time.sleep(INTERVALO_SEGUNDOS)


def iniciar_scheduler():
    t = threading.Thread(target=_loop, daemon=True, name="nuvia-scheduler")
    t.start()
    print("[scheduler] iniciado (intervalo 60s)")

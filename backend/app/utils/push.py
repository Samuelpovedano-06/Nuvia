"""Servicio de notificaciones push: PWA Web (VAPID) y Android (FCM legacy HTTP).

Variables de entorno:
    VAPID_PUBLIC_KEY       → clave pública VAPID (compartida con el frontend)
    VAPID_PRIVATE_KEY      → clave privada VAPID (solo backend)
    VAPID_CLAIM_EMAIL      → email de contacto VAPID (ej. mailto:admin@nuvia.app)
    FCM_SERVER_KEY         → server key del proyecto Firebase (opcional, para Android)

Generar claves VAPID con (una vez):
    pip install pywebpush
    python -c "from py_vapid import Vapid; v = Vapid(); v.generate_keys(); print('PRIV:', v.private_pem().decode()); print('PUB:', v.public_pem().decode())"

O más simple en línea: https://vapidkeys.com/
"""
import os
import json
import requests
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Cargar .env
_THIS = Path(__file__).resolve()
for _p in [_THIS.parents[2] / ".env", _THIS.parents[3] / ".env", Path.cwd() / ".env", Path("/app/.env")]:
    if _p.exists():
        load_dotenv(_p, override=False)
        break


def _get(k: str) -> str:
    return os.getenv(k, "").strip()


def _send_web_push(subscription_json: str, payload: dict) -> bool:
    """Envía una notificación a un endpoint Web Push usando pywebpush."""
    pub  = _get("VAPID_PUBLIC_KEY")
    priv = _get("VAPID_PRIVATE_KEY")
    mail = _get("VAPID_CLAIM_EMAIL") or "mailto:admin@nuvia.app"
    if not pub or not priv:
        print("[Push web] VAPID keys no configuradas")
        return False
    try:
        from pywebpush import webpush, WebPushException
        sub = json.loads(subscription_json)
        webpush(
            subscription_info=sub,
            data=json.dumps(payload),
            vapid_private_key=priv,
            vapid_claims={"sub": mail},
        )
        return True
    except WebPushException as e:
        # 410 Gone = el navegador desuscribió → marcar token inactivo en el caller
        code = getattr(e.response, "status_code", None)
        print(f"[Push web] error {code}: {e}")
        return False
    except Exception as e:
        print(f"[Push web] error inesperado: {e}")
        return False


def _send_fcm(token: str, payload: dict) -> bool:
    """Envía una push a un token FCM (Android)."""
    key = _get("FCM_SERVER_KEY")
    if not key:
        print("[Push fcm] FCM_SERVER_KEY no configurada")
        return False
    body = {
        "to": token,
        "notification": {
            "title": payload.get("title", "Nuvia"),
            "body":  payload.get("body", ""),
        },
        "data": payload.get("data", {}),
    }
    try:
        r = requests.post(
            "https://fcm.googleapis.com/fcm/send",
            json=body,
            headers={"Authorization": f"key={key}", "Content-Type": "application/json"},
            timeout=10,
        )
        if r.status_code != 200:
            print(f"[Push fcm] HTTP {r.status_code}: {r.text[:200]}")
            return False
        return True
    except Exception as e:
        print(f"[Push fcm] error: {e}")
        return False


def enviar_a_usuaria(db: Session, id_usuaria, title: str, body: str, data: dict = None):
    """Envía una notificación a todos los dispositivos activos de una usuaria."""
    from app.models.models import NotificationDevice
    payload = {"title": title, "body": body, "data": data or {}}
    devices = db.query(NotificationDevice).filter(
        NotificationDevice.id_usuaria == id_usuaria,
        NotificationDevice.activo == True,
    ).all()
    if not devices:
        return
    for d in devices:
        if d.plataforma == "android":
            ok = _send_fcm(d.token, payload)
        else:  # 'web' (PWA)
            ok = _send_web_push(d.token, payload)
        if not ok:
            d.activo = False
    db.commit()

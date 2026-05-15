from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria, Ciclo
from app.routers.auth_utils import get_current_user
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta
import os
import json

router = APIRouter(prefix="/calendar", tags=["Google Calendar"])

# Configuración de Google
CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
SCOPES = ['https://www.googleapis.com/auth/calendar.events']

@router.get("/google/auth")
def google_auth(current_user: Usuaria = Depends(get_current_user)):
    """Inicia el flujo de autenticación de Google."""
    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        },
        scopes=SCOPES
    )
    flow.redirect_uri = REDIRECT_URI
    
    # Usamos el state para pasar el ID de la usuaria de forma segura
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true',
        prompt='consent',
        state=str(current_user.id_usuaria)
    )
    return {"url": authorization_url}

@router.post("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Recibe el código de Google y guarda los tokens."""
    data = await request.json()
    code = data.get("code")
    user_id = data.get("state") # El state que enviamos arriba

    if not code or not user_id:
        raise HTTPException(status_code=400, detail="Código o estado faltante")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": CLIENT_ID,
                "client_secret": CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [REDIRECT_URI]
            }
        },
        scopes=SCOPES
    )
    flow.redirect_uri = REDIRECT_URI
    flow.fetch_token(code=code)
    
    creds = flow.credentials

    # Guardar en la configuración de la usuaria
    config = db.query(ConfiguracionUsuaria).filter(ConfiguracionUsuaria.id_usuaria == user_id).first()
    if not config:
        config = ConfiguracionUsuaria(id_usuaria=user_id)
        db.add(config)
    
    config.google_token = creds.token
    config.google_refresh_token = creds.refresh_token
    config.google_token_expiry = creds.expiry
    
    db.commit()
    return {"status": "success", "message": "Cuenta de Google vinculada correctamente"}

@router.post("/sync")
def sync_calendar(current_user: Usuaria = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sincroniza los eventos del ciclo con Google Calendar."""
    config = current_user.configuracion
    if not config or not config.google_token:
        raise HTTPException(status_code=400, detail="Google Calendar no vinculado")

    creds = Credentials(
        token=config.google_token,
        refresh_token=config.google_refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        expiry=config.google_token_expiry
    )

    try:
        service = build('calendar', 'v3', credentials=creds)
        
        # Obtener el último ciclo
        ciclo = db.query(Ciclo).filter(Ciclo.id_usuaria == current_user.id_usuaria).order_by(Ciclo.fecha_inicio.desc()).first()
        if not ciclo:
            return {"status": "info", "message": "No hay ciclos para sincronizar"}

        # Calcular eventos
        duracion_ciclo = config.duracion_ciclo or 28
        duracion_periodo = config.duracion_periodo or 5
        inicio = ciclo.fecha_inicio
        
        events = [
            {
                'summary': 'Nuvia: Inicio de Periodo 🩸',
                'description': 'Inicio estimado de tu ciclo menstrual.',
                'start': {'date': str(inicio)},
                'end': {'date': str(inicio + timedelta(days=duracion_periodo))},
                'colorId': '11' # Rojo
            },
            {
                'summary': 'Nuvia: Ovulación 🌟',
                'description': 'Día de máxima fertilidad estimado.',
                'start': {'date': str(inicio + timedelta(days=duracion_ciclo - 14))},
                'end': {'date': str(inicio + timedelta(days=duracion_ciclo - 13))},
                'colorId': '7' # Turquesa
            }
        ]

        for event_data in events:
            service.events().insert(calendarId='primary', body=event_data).execute()

        return {"status": "success", "message": "Eventos sincronizados con Google Calendar"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

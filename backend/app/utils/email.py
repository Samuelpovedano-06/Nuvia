import os
import requests
from dotenv import load_dotenv

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"

def enviar_otp_email(destinatario: str, nombre: str, otp: str):
    """Envía un correo con el código OTP usando la API de Brevo."""
    key = (os.getenv("BREVO_API_KEY") or "").strip()
    sender_email = (os.getenv("BREVO_SENDER_EMAIL") or "samuelpovedano06@gmail.com").strip()
    sender_name = (os.getenv("BREVO_SENDER_NAME") or "Nuvia Bienestar").strip()

    if not key:
        return False, "BREVO_API_KEY no configurada en las variables de entorno."

    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": destinatario, "name": nombre}],
        "subject": f"{otp} es tu código de recuperación Nuvia",
        "htmlContent": f"""
            <div style="font-family: sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #b05bb5; text-align: center;">Hola {nombre}</h2>
                <p style="text-align: center;">Tu código para recuperar la contraseña en Nuvia es:</p>
                <div style="background: #fdf0fa; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #b05bb5; letter-spacing: 5px;">
                    {otp}
                </div>
                <p style="color: #666; font-size: 13px; text-align: center; margin-top: 20px;">Este código caducará en 10 minutos por seguridad.</p>
            </div>
        """
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": key
    }

    try:
        response = requests.post(BREVO_URL, json=payload, headers=headers)
        if response.status_code in [201, 200, 202]:
            return True, "Enviado"
        else:
            # Capturar el error real de Brevo (ej: 'Email not verified', 'Unauthorized')
            data = response.json()
            error_msg = data.get("message", response.text)
            return False, f"Error de Brevo: {error_msg}"
    except Exception as e:
        return False, f"Error de conexión: {str(e)}"

import os
import requests
from dotenv import load_dotenv

load_dotenv()

BREVO_API_KEY = os.getenv("BREVO_API_KEY")
BREVO_URL = "https://api.brevo.com/v3/smtp/email"

def enviar_otp_email(destinatario: str, nombre: str, otp: str):
    """Envía un correo con el código OTP usando la API de Brevo."""
    if not BREVO_API_KEY:
        print("ADVERTENCIA: BREVO_API_KEY no configurada. No se pudo enviar el correo.")
        return False

    payload = {
        "sender": {"name": "Nuvia Bienestar", "email": "soporte@nuvia.com"},
        "to": [{"email": destinatario, "name": nombre}],
        "subject": "Tu código de recuperación - Nuvia",
        "htmlContent": f"""
            <div style="font-family: Arial, sans-serif; text-align: center; color: #333;">
                <h2 style="color: #b05bb5;">Hola {nombre},</h2>
                <p>Has solicitado restablecer tu contraseña en Nuvia.</p>
                <p>Usa el siguiente código de un solo uso para continuar:</p>
                <div style="background: #fdf0fa; padding: 20px; border-radius: 12px; display: inline-block; font-size: 32px; font-weight: bold; color: #b05bb5; letter-spacing: 5px;">
                    {otp}
                </div>
                <p style="margin-top: 20px; font-size: 14px; color: #777;">Este código caducará en 10 minutos.</p>
                <p>Si no has solicitado esto, puedes ignorar este correo de forma segura.</p>
                <br>
                <hr style="border: none; border-top: 1px solid #eee;">
                <p style="font-size: 12px; color: #aaa;">Equuipo Nuvia</p>
            </div>
        """
    }

    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": BREVO_API_KEY
    }

    try:
        response = requests.post(BREVO_URL, json=payload, headers=headers)
        if response.status_code in [201, 200, 202]:
            return True
        else:
            print(f"Error Brevo: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción al enviar correo: {e}")
        return False

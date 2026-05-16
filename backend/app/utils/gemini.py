"""Utilidades para llamar a Google Gemini.

Variables de entorno:
    GEMINI_API_KEY     → tu API key de https://aistudio.google.com/apikey

Funciones:
    generar_imagen_consejo(titulo, resumen) -> (mime, bytes) | None
    clasificar_texto_foro(texto, categorias) -> str | None
"""

import os
import base64
import json
from pathlib import Path
import requests
from dotenv import load_dotenv

# Buscar .env desde rutas habituales (raíz repo, backend/, dir del archivo)
_THIS_FILE = Path(__file__).resolve()
_POSIBLES_ENV = [
    _THIS_FILE.parents[2] / ".env",   # backend/.env
    _THIS_FILE.parents[3] / ".env",   # raíz del repo
    Path.cwd() / ".env",
    Path("/app/.env"),                # típico en Docker
]
for _p in _POSIBLES_ENV:
    if _p.exists():
        load_dotenv(_p, override=False)
        break
else:
    load_dotenv(override=False)  # fallback al comportamiento por defecto

# Modelo de generación de imágenes (Gemini 2.5 Flash Image, free tier)
IMAGEN_MODEL = "gemini-2.5-flash-image"
# Modelo de texto (free tier)
TEXTO_MODEL = "gemini-2.0-flash"

_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# Último error capturado (para mostrar al admin). Se actualiza en cada llamada.
_ULTIMO_ERROR: str | None = None


def ultimo_error() -> str | None:
    return _ULTIMO_ERROR


def _get_key() -> str:
    # Leer en cada llamada para soportar reinicios y cambios en .env sin reimportar
    return os.getenv("GEMINI_API_KEY", "").strip()


def _has_key() -> bool:
    return bool(_get_key())


def diagnostico() -> dict:
    """Devuelve info útil para diagnosticar por qué Gemini no funciona."""
    key = _get_key()
    return {
        "tiene_key": bool(key),
        "longitud_key": len(key) if key else 0,
        "prefijo_key": key[:6] + "…" if key else None,
        "cwd": str(Path.cwd()),
        "envs_buscados": [str(p) + (" ✓" if p.exists() else "") for p in _POSIBLES_ENV],
    }


def generar_imagen_consejo(titulo: str, resumen: str = "", prompt_extra: str = ""):
    """
    Genera una imagen ilustrativa para un consejo, estilo Flo (ilustración suave,
    pastel, sin texto). Devuelve tupla (mime, bytes) o None si falla / no hay key.
    """
    if not _has_key():
        print("[Gemini] GEMINI_API_KEY no configurada — saltando generación de imagen")
        return None

    prompt = prompt_extra.strip() if prompt_extra else (
        f"Ilustración digital estilo aplicación de salud femenina (estilo Flo / Clue), "
        f"colores pastel suaves (rosas, morados, melocotón), figura humana estilizada, "
        f"sin texto, fondo limpio. Tema: {titulo}. {resumen}"
    )

    url = f"{_BASE}/{IMAGEN_MODEL}:generateContent?key={_get_key()}"
    body = {
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseModalities": ["IMAGE"]
        }
    }

    global _ULTIMO_ERROR
    _ULTIMO_ERROR = None
    try:
        r = requests.post(url, json=body, timeout=60)
        if r.status_code == 429:
            print(f"[Gemini imagen] 429 cuota: {r.text[:200]}")
            _ULTIMO_ERROR = "Has agotado la cuota gratuita diaria de Gemini para imágenes. Espera ~24h o sube de plan."
            return None
        if r.status_code != 200:
            print(f"[Gemini imagen] HTTP {r.status_code}: {r.text[:300]}")
            _ULTIMO_ERROR = f"Gemini devolvió HTTP {r.status_code}"
            return None
        data = r.json()
        candidates = data.get("candidates", [])
        for cand in candidates:
            parts = cand.get("content", {}).get("parts", [])
            for p in parts:
                inline = p.get("inlineData") or p.get("inline_data")
                if inline and inline.get("data"):
                    mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                    return mime, base64.b64decode(inline["data"])
        print(f"[Gemini imagen] Sin parte de imagen en respuesta: {json.dumps(data)[:400]}")
        _ULTIMO_ERROR = "Gemini respondió sin contenido de imagen (posible filtro de seguridad)"
        return None
    except Exception as e:
        print(f"[Gemini imagen] Excepción: {e}")
        _ULTIMO_ERROR = f"Excepción: {e}"
        return None


def clasificar_texto_foro(texto: str, categorias: list) -> str | None:
    """
    Pide a Gemini que asigne UNA categoría de la lista dada al texto.
    Devuelve la categoría (string) o None si no se pudo.
    """
    if not _has_key():
        return None
    cats = ", ".join(categorias)
    prompt = (
        f"Clasifica el siguiente texto en UNA SOLA de estas categorías: {cats}. "
        f"Responde SOLO con el nombre exacto de la categoría, sin explicación.\n\n"
        f"Texto: {texto[:1500]}"
    )
    url = f"{_BASE}/{TEXTO_MODEL}:generateContent?key={_get_key()}"
    body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
    try:
        r = requests.post(url, json=body, timeout=30)
        if r.status_code != 200:
            print(f"[Gemini texto] HTTP {r.status_code}: {r.text[:200]}")
            return None
        data = r.json()
        candidates = data.get("candidates", [])
        for cand in candidates:
            parts = cand.get("content", {}).get("parts", [])
            for p in parts:
                txt = (p.get("text") or "").strip().lower()
                if txt:
                    # Match con alguna categoría
                    for c in categorias:
                        if c.lower() in txt:
                            return c
        return None
    except Exception as e:
        print(f"[Gemini texto] Excepción: {e}")
        return None

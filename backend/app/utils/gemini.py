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
import requests

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()

# Modelo de generación de imágenes (Gemini 2.5 Flash Image, free tier)
IMAGEN_MODEL = "gemini-2.5-flash-image"
# Modelo de texto (free tier)
TEXTO_MODEL = "gemini-2.0-flash"

_BASE = "https://generativelanguage.googleapis.com/v1beta/models"


def _has_key() -> bool:
    return bool(GEMINI_API_KEY)


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

    url = f"{_BASE}/{IMAGEN_MODEL}:generateContent?key={GEMINI_API_KEY}"
    body = {
        "contents": [{
            "role": "user",
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "responseModalities": ["IMAGE"]
        }
    }

    try:
        r = requests.post(url, json=body, timeout=60)
        if r.status_code != 200:
            print(f"[Gemini imagen] HTTP {r.status_code}: {r.text[:300]}")
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
        return None
    except Exception as e:
        print(f"[Gemini imagen] Excepción: {e}")
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
    url = f"{_BASE}/{TEXTO_MODEL}:generateContent?key={GEMINI_API_KEY}"
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

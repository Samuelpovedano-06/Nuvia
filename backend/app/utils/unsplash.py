"""Buscar fotos en Unsplash y validar con Gemini si encajan.

Variables de entorno:
    UNSPLASH_ACCESS_KEY  → desde https://unsplash.com/developers
"""
import os
import re
import unicodedata
import requests
from typing import Optional


UNSPLASH_API = "https://api.unsplash.com/search/photos"
MAX_CANDIDATOS = 6


def _get_key() -> str:
    return os.getenv("UNSPLASH_ACCESS_KEY", "").strip()


def _quitar_acentos(t: str) -> str:
    t = unicodedata.normalize("NFD", t)
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


# Sinónimos / términos en inglés que dan mejores resultados en Unsplash
TRADUCCIONES = {
    "menstruacion": "menstrual cycle",
    "menstrual":    "menstrual cycle",
    "regla":        "menstrual cycle period",
    "ciclo":        "menstrual cycle calendar",
    "embarazo":     "pregnancy belly",
    "embarazada":   "pregnancy belly",
    "fertilidad":   "fertility woman",
    "anticoncep":   "birth control pills",
    "sexo":         "couple intimacy soft",
    "sexual":       "couple intimacy soft",
    "placer":       "wellness woman peace",
    "vagina":       "feminine wellness flowers",
    "vulva":        "feminine wellness flowers",
    "higiene":      "feminine hygiene products",
    "flujo":        "feminine health flowers",
    "ovario":       "feminine wellness",
    "ovulacion":    "fertility ovulation",
    "ansiedad":     "anxiety calm woman",
    "estres":       "stress relax woman",
    "depres":       "sad woman wellness",
    "salud mental": "mental wellness woman",
    "mental":       "mindfulness woman meditation",
    "autoestima":   "confident woman portrait",
    "sueno":        "woman sleeping peaceful",
    "dormir":       "woman sleeping peaceful",
    "nutricion":    "healthy food fruits",
    "comida":       "healthy food fruits",
    "dieta":        "healthy food vegetables",
    "alimentac":    "healthy food woman",
    "ejercicio":    "woman yoga exercise",
    "deporte":      "woman fitness exercise",
    "yoga":         "woman yoga peace",
    "meditac":      "meditation woman",
    "menopaus":     "mature woman wellness",
    "adolescen":    "teenage girl wellness",
    "pareja":       "couple love soft",
    "amor":         "couple love",
    "anatomia":     "human anatomy diagram",
    "mitos":        "questions doubt woman",
    "doctor":       "doctor consultation",
    "ginecol":      "gynecology doctor",
}


def _query_para(titulo: str, resumen: str = "") -> str:
    """Convierte el título a una query óptima en inglés para Unsplash."""
    base = _quitar_acentos((titulo + " " + resumen).lower())
    base = re.sub(r"[^\w\s]", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    # Buscar la primera coincidencia en el diccionario de traducciones
    for clave, traduccion in TRADUCCIONES.items():
        if clave in base:
            return traduccion
    # Fallback genérico para temas de salud femenina
    return "woman wellness soft pastel"


def _buscar_unsplash(query: str, n: int = MAX_CANDIDATOS):
    """Devuelve hasta n candidatos: [{'id', 'url_regular', 'url_descarga', 'desc'}, ...]"""
    key = _get_key()
    if not key:
        print("[Unsplash] UNSPLASH_ACCESS_KEY no configurada")
        return []
    try:
        r = requests.get(
            UNSPLASH_API,
            params={"query": query, "per_page": n, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {key}"},
            timeout=15,
        )
        if r.status_code != 200:
            print(f"[Unsplash] HTTP {r.status_code}: {r.text[:200]}")
            return []
        data = r.json()
        candidatos = []
        for it in data.get("results", []):
            candidatos.append({
                "id": it.get("id"),
                "url_regular": (it.get("urls") or {}).get("regular"),
                "url_descarga": (it.get("links") or {}).get("download_location"),
                "desc": it.get("alt_description") or it.get("description") or "",
                "color": it.get("color"),
            })
        return [c for c in candidatos if c["url_regular"]]
    except Exception as e:
        print(f"[Unsplash] Excepción: {e}")
        return []


def _evaluar_con_gemini(titulo: str, resumen: str, candidatos: list) -> int:
    """Pregunta a Gemini cuál de las descripciones encaja mejor con el tema. Devuelve índice 0..n-1."""
    if not candidatos:
        return -1
    try:
        from app.utils.gemini import _get_key as gem_key, _BASE, TEXTO_MODEL
        if not gem_key():
            return 0  # Sin Gemini → primera
        opciones = "\n".join(f"{i+1}. {c['desc'] or '(sin descripción)'}" for i, c in enumerate(candidatos))
        prompt = (
            f"Tema del artículo: «{titulo}». Resumen: «{resumen}».\n"
            f"Te paso descripciones de fotos candidatas. Elige el NÚMERO de la que mejor ilustra el tema "
            f"para una app de salud femenina (estilo Flo). Si NINGUNA encaja, responde 0. Responde SOLO con el número.\n\n"
            f"{opciones}"
        )
        url = f"{_BASE}/{TEXTO_MODEL}:generateContent?key={gem_key()}"
        body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
        r = requests.post(url, json=body, timeout=20)
        if r.status_code != 200:
            print(f"[Unsplash+Gemini] HTTP {r.status_code} en validación → uso 1ª")
            return 0
        data = r.json()
        for cand in data.get("candidates", []):
            for p in cand.get("content", {}).get("parts", []):
                txt = (p.get("text") or "").strip()
                m = re.search(r"\d+", txt)
                if m:
                    n = int(m.group(0))
                    if 1 <= n <= len(candidatos):
                        return n - 1
                    if n == 0:
                        return -1  # ninguna encaja
        return 0
    except Exception as e:
        print(f"[Unsplash+Gemini] Excepción evaluando: {e}")
        return 0


def _descargar(url: str):
    """Descarga la imagen y devuelve (mime, bytes) o None."""
    try:
        r = requests.get(url, timeout=20)
        if r.status_code != 200:
            return None
        mime = r.headers.get("content-type", "image/jpeg").split(";")[0].strip()
        return mime, r.content
    except Exception as e:
        print(f"[Unsplash] Descarga falló: {e}")
        return None


def _trigger_download(url_descarga: str):
    """Unsplash exige notificar la descarga (cuestión de licencia/atribución)."""
    key = _get_key()
    if not key or not url_descarga:
        return
    try:
        requests.get(url_descarga, headers={"Authorization": f"Client-ID {key}"}, timeout=5)
    except Exception:
        pass


def buscar_imagen_validada(titulo: str, resumen: str = "", prompt_extra: str = "") -> Optional[tuple]:
    """
    Devuelve (mime, bytes) de la foto más apropiada para el consejo, o None si nada encaja.

    1) Construye una query óptima a partir del título (con traducción a inglés).
    2) Busca candidatos en Unsplash.
    3) Pide a Gemini que evalúe cuál encaja mejor.
    4) Descarga la elegida (y notifica a Unsplash por licencia).
    """
    query = (prompt_extra.strip() or _query_para(titulo, resumen))
    candidatos = _buscar_unsplash(query)
    if not candidatos:
        # Fallback: query genérica
        candidatos = _buscar_unsplash("woman wellness soft pastel")
        if not candidatos:
            return None

    idx = _evaluar_con_gemini(titulo, resumen, candidatos)
    if idx < 0:
        print(f"[Unsplash] Gemini dijo que ninguna encaja para '{titulo}'")
        return None

    elegida = candidatos[idx]
    print(f"[Unsplash] Imagen elegida para '{titulo}': '{elegida['desc'][:80]}'")
    _trigger_download(elegida["url_descarga"])
    return _descargar(elegida["url_regular"])

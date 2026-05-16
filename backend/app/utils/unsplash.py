"""Buscar fotos en Unsplash y validar con Gemini si encajan.

Variables de entorno:
    UNSPLASH_ACCESS_KEY  → desde https://unsplash.com/developers
"""
import os
import re
import unicodedata
from pathlib import Path
import requests
from typing import Optional
from dotenv import load_dotenv

# Buscar .env desde rutas habituales (igual que gemini.py)
_THIS_FILE = Path(__file__).resolve()
for _p in [
    _THIS_FILE.parents[2] / ".env",
    _THIS_FILE.parents[3] / ".env",
    Path.cwd() / ".env",
    Path("/app/.env"),
]:
    if _p.exists():
        load_dotenv(_p, override=False)
        break


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


def _query_keywords(titulo: str, resumen: str = "") -> str:
    """Fallback determinista: si Gemini no responde, buscamos por palabra clave conocida."""
    base = _quitar_acentos((titulo + " " + resumen).lower())
    base = re.sub(r"[^\w\s]", " ", base)
    base = re.sub(r"\s+", " ", base).strip()
    for clave, traduccion in TRADUCCIONES.items():
        if clave in base:
            return traduccion
    return "woman wellness soft pastel"


def _query_desde_titulo_con_gemini(titulo: str, resumen: str = "") -> Optional[str]:
    """Pide a Gemini que genere 2-4 palabras en inglés para buscar en Unsplash."""
    try:
        from app.utils.gemini import _get_key as gem_key, _BASE, TEXTO_MODEL
        if not gem_key():
            return None
        prompt = (
            f"Eres asistente de búsqueda de imágenes para una app de salud femenina. "
            f"Dado el siguiente título de un artículo en español, devuelve 2 a 4 palabras EN INGLÉS "
            f"que sirvan como query para Unsplash y traigan una foto representativa del tema. "
            f"NO incluyas comillas, signos de puntuación ni el texto original. Solo las palabras inglesas separadas por espacios.\n\n"
            f"Título: {titulo}\n"
            f"Resumen: {resumen[:300]}"
        )
        url = f"{_BASE}/{TEXTO_MODEL}:generateContent?key={gem_key()}"
        body = {"contents": [{"role": "user", "parts": [{"text": prompt}]}]}
        r = requests.post(url, json=body, timeout=20)
        if r.status_code != 200:
            return None
        data = r.json()
        for cand in data.get("candidates", []):
            for p in cand.get("content", {}).get("parts", []):
                txt = (p.get("text") or "").strip()
                # Sanitiza: quita comillas, puntos, saltos
                txt = re.sub(r"[\"'`.,!?:\n]", " ", txt)
                txt = re.sub(r"\s+", " ", txt).strip().lower()
                if 2 <= len(txt.split()) <= 6:
                    return txt
        return None
    except Exception as e:
        print(f"[Unsplash+Gemini] query falló: {e}")
        return None


# Último error capturado, accesible desde gemini.py para mostrar al admin
_ULTIMO_ERROR_UNSPLASH: Optional[str] = None


def ultimo_error_unsplash() -> Optional[str]:
    return _ULTIMO_ERROR_UNSPLASH


def _buscar_unsplash(query: str, n: int = MAX_CANDIDATOS):
    """Devuelve hasta n candidatos: [{'id', 'url_regular', 'url_descarga', 'desc'}, ...]"""
    global _ULTIMO_ERROR_UNSPLASH
    _ULTIMO_ERROR_UNSPLASH = None
    key = _get_key()
    if not key:
        print("[Unsplash] UNSPLASH_ACCESS_KEY no configurada")
        _ULTIMO_ERROR_UNSPLASH = "Falta UNSPLASH_ACCESS_KEY en el .env del backend."
        return []
    try:
        r = requests.get(
            UNSPLASH_API,
            params={"query": query, "per_page": n, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {key}"},
            timeout=15,
        )
        if r.status_code == 403:
            print(f"[Unsplash] 403: {r.text[:200]}")
            _ULTIMO_ERROR_UNSPLASH = "Unsplash devolvió 403. Has agotado la cuota (50/h en demo) o la key es incorrecta."
            return []
        if r.status_code != 200:
            print(f"[Unsplash] HTTP {r.status_code}: {r.text[:200]}")
            _ULTIMO_ERROR_UNSPLASH = f"Unsplash devolvió HTTP {r.status_code}: {r.text[:120]}"
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
        out = [c for c in candidatos if c["url_regular"]]
        if not out:
            _ULTIMO_ERROR_UNSPLASH = f"Unsplash no devolvió ninguna foto para «{query}»."
        return out
    except Exception as e:
        print(f"[Unsplash] Excepción: {e}")
        _ULTIMO_ERROR_UNSPLASH = f"Error al llamar a Unsplash: {e}"
        return []


def _evaluar_con_gemini(titulo: str, resumen: str, candidatos: list) -> int:
    """Pregunta a Gemini cuál encaja BIEN con el tema. Devuelve índice 0..n-1, o -1 si ninguna encaja.

    Estricto: solo elige si hay relación clara. No vale "la menos mala".
    """
    if not candidatos:
        return -1
    try:
        from app.utils.gemini import _get_key as gem_key, _BASE, TEXTO_MODEL
        if not gem_key():
            return 0  # Sin Gemini → primera
        opciones = "\n".join(f"{i+1}. {c['desc'] or '(sin descripción)'}" for i, c in enumerate(candidatos))
        prompt = (
            f"Eres curadora de imágenes para una app de salud femenina (estilo Flo).\n"
            f"Tema del artículo: «{titulo}»\n"
            f"Resumen: «{resumen[:300]}»\n\n"
            f"Te paso descripciones (en inglés) de fotos candidatas de Unsplash. "
            f"SÉ EXIGENTE: elige solo si la foto está claramente relacionada con el tema concreto "
            f"(no vale algo genérico tipo 'flores' si el tema es anatomía, ni 'mujer mirando' si el tema "
            f"es nutrición). Si NINGUNA encaja con suficiente claridad, responde 0. "
            f"Responde SOLO con el número (0 si ninguna, o 1-{len(candidatos)} si una encaja bien).\n\n"
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


# Palabras vacías comunes que dañan la búsqueda en Unsplash
STOPWORDS_ES = {
    "el","la","los","las","un","una","unos","unas","de","del","a","al","en","por","para","con","sin",
    "y","o","u","e","que","qué","cual","cuál","como","cómo","cuando","cuándo","donde","dónde",
    "es","son","ser","estar","esta","este","esto","eso","ese","esa","tu","tus","mi","mis","su","sus",
    "lo","le","les","se","sí","no","te","me","nos","os","muy","mas","más","ya","pues","sobre","entre",
    "hay","hace","ha","han","fue","fueron","será","sera","han","habrá","habra","etc",
    "qué","qué","aún","aun","sí","también","tan","tanto"
}


def _query_limpia(titulo: str) -> str:
    """Limpia el título dejando solo palabras significativas (>3 letras, sin stopwords)."""
    base = _quitar_acentos(titulo.lower())
    base = re.sub(r"[^\w\s]", " ", base)
    palabras = [p for p in base.split() if len(p) > 3 and p not in STOPWORDS_ES]
    return " ".join(palabras) if palabras else titulo.strip()


def buscar_imagen_validada(titulo: str, resumen: str = "", prompt_extra: str = "") -> Optional[tuple]:
    """
    Busca en Unsplash con las palabras clave del TÍTULO del consejo (o prompt manual)
    y devuelve la primera foto encontrada.
    """
    if prompt_extra and prompt_extra.strip():
        query = prompt_extra.strip()
    else:
        query = _query_limpia(titulo)
    print(f"[Unsplash] Query: '{query}' para «{titulo}»")
    candidatos = _buscar_unsplash(query, n=1)
    if not candidatos:
        print(f"[Unsplash] Sin resultados para '{query}'")
        return None
    elegida = candidatos[0]
    print(f"[Unsplash] ✓ Imagen elegida para '{titulo}': '{(elegida['desc'] or '')[:80]}'")
    _trigger_download(elegida["url_descarga"])
    return _descargar(elegida["url_regular"])

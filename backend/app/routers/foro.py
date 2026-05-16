import base64
import unicodedata
import re
from datetime import timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

MIMES_VALIDOS = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5MB


def _decode_data_url(data_url: str):
    """Convierte 'data:image/png;base64,xxx' en (mime, bytes)."""
    try:
        header, b64 = data_url.split(",", 1)
        mime = header.split(";")[0].replace("data:", "").strip().lower()
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen mal formada")
    if mime not in MIMES_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo de imagen no permitido")
    try:
        data = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Imagen no decodificable")
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Imagen demasiado grande (máx 5MB)")
    return mime, data

from app.database.connection import get_db
from app.models.models import (
    PublicacionForo, RespuestaForo, LikeForo, FavoritoForo,
    ReaccionForo, SeguimientoForo, Usuaria
)
from app.schemas.schemas import PublicacionForoCreate, RespuestaForoCreate, ReaccionForoCreate
from app.routers.auth_utils import get_current_user


def _iso_utc(dt):
    """Devuelve siempre un ISO en UTC con 'Z' para que el frontend lo interprete bien."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


router = APIRouter(prefix="/foro", tags=["Foro"])

REACCIONES_VALIDAS = {'❤️', '🔥', '💪', '🤗', '😢'}

CATEGORIA_KEYWORDS = {
    "menstruacion": ["regla", "periodo", "menstruac", "sangrado", "menstrual", "compresa", "tampon", "copa menstrual", "dismenorrea", "manchad"],
    "sexo_placer": ["sexo", "masturbac", "orgasmo", "placer", "libido", "deseo sexual", "sexual", "intimidad", "vibrador", "juguete", "clitor", "vagin", "lubric"],
    "embarazo": ["embaraz", "gestac", "trimestre", "feto", "ecograf", "parto", "cesarea", "lactanc", "matern", "preconcep", "test de embarazo", "prueba de embarazo"],
    "anticoncepcion": ["anticoncep", "pildora", "condon", "preservativo", "diu", "implant", "metodo barrera", "mac", "ligadura", "vasectom", "parche anticonc", "anillo vaginal"],
    "fertilidad": ["fertilidad", "ovulac", "concebir", "concepc", "fertil", "esteril", "tratamiento de fert", "fiv ", "inseminac"],
    "salud_mental": ["ansiedad", "depres", "estres", "terapia", "psicol", "psiquia", "animo", "tristeza", "panic", "mental", "autoestima", "burnout", "trauma"],
    "relaciones": ["pareja", "novio", "novia", "relacion", "ruptura", "celos", "infidel", "discusion", "matrimonio", "boda", "ex ", "amor"],
    "nutricion": ["comida", "dieta", "alimentac", "comer", "nutric", "antojo", "ayuno", "vegan", "vegetar", "calor", "azucar", "proteina"],
    "ejercicio": ["ejercicio", "deporte", "gimnasio", "gym", "correr", "yoga", "pilates", "entrenam", "rutina", "cardio", "pesas", "caminar"],
    "adolescencia": ["adolescen", "primera regla", "menarquia", "primera vez", "pubertad", "instituto", "secundaria", "joven"],
    "menopausia": ["menopaus", "climater", "sofoco", "perimenop", "postmenop"],
    "salud": ["doctor", "medico", "doctora", "ginecol", "hospital", "clinica", "analitica", "analisis", "infeccion", "candidiasis", "cistitis", "ovario poliquist", "endometriosis", "mioma", "quiste", "dolor", "sintoma", "enfermedad"],
}


def _normalize(text: str) -> str:
    t = text.lower()
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return t


def clasificar_categoria(contenido: str) -> str:
    """Devuelve la categoría con más coincidencias de keywords. 'general' si ninguna."""
    texto = _normalize(contenido)
    mejor_cat = "general"
    mejor_score = 0
    for cat, kws in CATEGORIA_KEYWORDS.items():
        score = sum(len(re.findall(re.escape(kw), texto)) for kw in kws)
        if score > mejor_score:
            mejor_score = score
            mejor_cat = cat
    return mejor_cat


def _build_posts(posts, db, current_user_id):
    if not posts:
        return []
    post_ids = [p.id for p in posts]

    all_likes = db.query(LikeForo).filter(LikeForo.id_publicacion.in_(post_ids)).all()
    all_favs  = db.query(FavoritoForo).filter(FavoritoForo.id_publicacion.in_(post_ids)).all()
    all_reacs = db.query(ReaccionForo).filter(ReaccionForo.id_publicacion.in_(post_ids)).all()
    comments_q = (
        db.query(RespuestaForo.id_publicacion, func.count('*').label('cnt'))
        .filter(RespuestaForo.id_publicacion.in_(post_ids))
        .group_by(RespuestaForo.id_publicacion)
        .all()
    )
    seguidos = {
        str(s.id_seguido)
        for s in db.query(SeguimientoForo)
        .filter(SeguimientoForo.id_seguidor == current_user_id)
        .all()
    }

    likes_map     = {}
    liked_set     = set()
    for l in all_likes:
        pid = str(l.id_publicacion)
        likes_map[pid] = likes_map.get(pid, 0) + 1
        if l.id_usuaria == current_user_id:
            liked_set.add(pid)

    favs_set = {str(f.id_publicacion) for f in all_favs if f.id_usuaria == current_user_id}
    favs_map = {}
    for f in all_favs:
        pid = str(f.id_publicacion)
        favs_map[pid] = favs_map.get(pid, 0) + 1

    reac_map     = {}
    mi_reac_map  = {}
    for r in all_reacs:
        pid = str(r.id_publicacion)
        reac_map.setdefault(pid, {})
        reac_map[pid][r.emoji] = reac_map[pid].get(r.emoji, 0) + 1
        if r.id_usuaria == current_user_id:
            mi_reac_map[pid] = r.emoji

    comments_map = {str(r.id_publicacion): r.cnt for r in comments_q}

    result = []
    for p in posts:
        pid = str(p.id)
        result.append({
            "id": pid,
            "id_autor": str(p.id_usuaria),
            "avatar_seed": str(p.id_usuaria)[:12],
            "contenido": p.contenido or "",
            "categoria": p.categoria,
            "created_at": _iso_utc(p.created_at),
            "tiene_imagen": p.imagen is not None,
            "likes_count": likes_map.get(pid, 0),
            "favs_count": favs_map.get(pid, 0),
            "comments_count": comments_map.get(pid, 0),
            "is_liked": pid in liked_set,
            "is_guardado": pid in favs_set,
            "reacciones": reac_map.get(pid, {}),
            "mi_reaccion": mi_reac_map.get(pid),
            "es_mia": p.id_usuaria == current_user_id,
            "es_seguido": str(p.id_usuaria) in seguidos,
        })
    return result


@router.get("/")
def listar_publicaciones(
    categoria: Optional[str] = None,
    tab: str = "popular",
    page: int = 1,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    limit = 20
    offset = (page - 1) * limit
    q = db.query(PublicacionForo)

    if categoria:
        q = q.filter(PublicacionForo.categoria == categoria)

    if tab == "mis":
        q = q.filter(PublicacionForo.id_usuaria == current_user.id_usuaria)
    elif tab == "guardados":
        q = q.join(FavoritoForo, FavoritoForo.id_publicacion == PublicacionForo.id)\
              .filter(FavoritoForo.id_usuaria == current_user.id_usuaria)
    elif tab == "siguiendo":
        seguidos = db.query(SeguimientoForo.id_seguido)\
                     .filter(SeguimientoForo.id_seguidor == current_user.id_usuaria)\
                     .subquery()
        q = q.filter(PublicacionForo.id_usuaria.in_(seguidos))

    if tab == "popular":
        likes_sq = (
            db.query(LikeForo.id_publicacion, func.count('*').label('cnt'))
            .group_by(LikeForo.id_publicacion)
            .subquery()
        )
        q = q.outerjoin(likes_sq, likes_sq.c.id_publicacion == PublicacionForo.id)\
              .order_by(desc(func.coalesce(likes_sq.c.cnt, 0)), desc(PublicacionForo.created_at))
    else:
        q = q.order_by(desc(PublicacionForo.created_at))

    posts = q.offset(offset).limit(limit).all()
    return _build_posts(posts, db, current_user.id_usuaria)


@router.post("/")
def crear_publicacion(
    datos: PublicacionForoCreate,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    contenido = (datos.contenido or "").strip()
    imagen_bytes = None
    imagen_mime = None
    if datos.imagen_data:
        imagen_mime, imagen_bytes = _decode_data_url(datos.imagen_data)
    if not contenido and not imagen_bytes:
        raise HTTPException(status_code=400, detail="La publicación debe tener texto o imagen")
    # 1) Intenta el clasificador de keywords; 2) si falla (resultado 'general' y hay texto), intenta Gemini
    categoria_auto = clasificar_categoria(contenido) if contenido else "general"
    if categoria_auto == "general" and contenido and len(contenido) > 8:
        try:
            from app.utils.gemini import clasificar_texto_foro
            categorias_validas = list(CATEGORIA_KEYWORDS.keys()) + ["general"]
            ia = clasificar_texto_foro(contenido, categorias_validas)
            if ia:
                categoria_auto = ia
                print(f"[Foro] Categoría asignada por IA: '{ia}'")
        except Exception as e:
            print(f"[Foro] Fallback IA falló: {e}")
    print(f"[Foro] Nueva publicación → categoría final: '{categoria_auto}' | texto: {contenido[:80]!r}")
    pub = PublicacionForo(
        id_usuaria=current_user.id_usuaria,
        contenido=contenido,
        categoria=categoria_auto,
        imagen=imagen_bytes,
        imagen_mime=imagen_mime,
    )
    db.add(pub)
    db.commit()
    db.refresh(pub)
    return _build_posts([pub], db, current_user.id_usuaria)[0]


@router.get("/{id}")
def obtener_publicacion(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    pub = db.query(PublicacionForo).filter(PublicacionForo.id == id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    return _build_posts([pub], db, current_user.id_usuaria)[0]


@router.delete("/{id}", status_code=204)
def eliminar_publicacion(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    pub = db.query(PublicacionForo).filter(PublicacionForo.id == id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="No encontrada")
    if pub.id_usuaria != current_user.id_usuaria and current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Sin permiso")
    db.delete(pub)
    db.commit()


@router.post("/{id}/like")
def toggle_like(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    existing = db.query(LikeForo).filter(
        LikeForo.id_publicacion == id,
        LikeForo.id_usuaria == current_user.id_usuaria
    ).first()
    if existing:
        db.delete(existing)
        liked = False
    else:
        db.add(LikeForo(id_publicacion=id, id_usuaria=current_user.id_usuaria))
        liked = True
    db.commit()
    count = db.query(LikeForo).filter(LikeForo.id_publicacion == id).count()
    return {"liked": liked, "likes_count": count}


@router.post("/{id}/favorito")
def toggle_favorito(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    existing = db.query(FavoritoForo).filter(
        FavoritoForo.id_publicacion == id,
        FavoritoForo.id_usuaria == current_user.id_usuaria
    ).first()
    if existing:
        db.delete(existing)
        guardado = False
    else:
        db.add(FavoritoForo(id_publicacion=id, id_usuaria=current_user.id_usuaria))
        guardado = True
    db.commit()
    favs_count = db.query(FavoritoForo).filter(FavoritoForo.id_publicacion == id).count()
    return {"guardado": guardado, "favs_count": favs_count}


@router.post("/{id}/reaccion")
def toggle_reaccion(
    id: UUID,
    datos: ReaccionForoCreate,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    if datos.emoji not in REACCIONES_VALIDAS:
        raise HTTPException(status_code=400, detail="Reacción no válida")
    existing = db.query(ReaccionForo).filter(
        ReaccionForo.id_publicacion == id,
        ReaccionForo.id_usuaria == current_user.id_usuaria
    ).first()
    if existing:
        if existing.emoji == datos.emoji:
            db.delete(existing)
            mi_reaccion = None
        else:
            existing.emoji = datos.emoji
            mi_reaccion = datos.emoji
    else:
        db.add(ReaccionForo(id_publicacion=id, id_usuaria=current_user.id_usuaria, emoji=datos.emoji))
        mi_reaccion = datos.emoji
    db.commit()
    reacciones_raw = db.query(ReaccionForo).filter(ReaccionForo.id_publicacion == id).all()
    counts = {}
    for r in reacciones_raw:
        counts[r.emoji] = counts.get(r.emoji, 0) + 1
    return {"reacciones": counts, "mi_reaccion": mi_reaccion}


@router.get("/{id}/respuestas")
def listar_respuestas(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    # Si la publicación ya no existe (borrada por otra persona), devolvemos 404
    existe = db.query(PublicacionForo.id).filter(PublicacionForo.id == id).first()
    if not existe:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    respuestas = db.query(RespuestaForo)\
                   .filter(RespuestaForo.id_publicacion == id)\
                   .order_by(RespuestaForo.created_at)\
                   .all()

    resp_ids = [r.id for r in respuestas]
    all_likes = db.query(LikeForo).filter(LikeForo.id_publicacion.in_(resp_ids)).all() if resp_ids else []
    liked_set  = {str(l.id_publicacion) for l in all_likes if l.id_usuaria == current_user.id_usuaria}
    likes_map  = {}
    for l in all_likes:
        pid = str(l.id_publicacion)
        likes_map[pid] = likes_map.get(pid, 0) + 1

    return [
        {
            "id": str(r.id),
            "avatar_seed": str(r.id_usuaria)[:12],
            "contenido": r.contenido or "",
            "tiene_imagen": r.imagen is not None,
            "created_at": _iso_utc(r.created_at),
            "likes_count": likes_map.get(str(r.id), 0),
            "is_liked": str(r.id) in liked_set,
            "es_mia": r.id_usuaria == current_user.id_usuaria,
        }
        for r in respuestas
    ]


@router.post("/{id}/respuestas")
def crear_respuesta(
    id: UUID,
    datos: RespuestaForoCreate,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    pub = db.query(PublicacionForo).filter(PublicacionForo.id == id).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")
    contenido = (datos.contenido or "").strip()
    imagen_bytes = None
    imagen_mime = None
    if datos.imagen_data:
        imagen_mime, imagen_bytes = _decode_data_url(datos.imagen_data)
    if not contenido and not imagen_bytes:
        raise HTTPException(status_code=400, detail="La respuesta debe tener texto o imagen")
    r = RespuestaForo(
        id_publicacion=id,
        id_usuaria=current_user.id_usuaria,
        contenido=contenido,
        imagen=imagen_bytes,
        imagen_mime=imagen_mime,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {
        "id": str(r.id),
        "avatar_seed": str(r.id_usuaria)[:12],
        "contenido": r.contenido or "",
        "tiene_imagen": r.imagen is not None,
        "created_at": _iso_utc(r.created_at),
        "likes_count": 0,
        "is_liked": False,
        "es_mia": True,
    }


@router.get("/respuestas/{id}/imagen")
def obtener_imagen_respuesta(id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    r = db.query(RespuestaForo).filter(RespuestaForo.id == id).first()
    if not r or not r.imagen:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return Response(content=bytes(r.imagen), media_type=r.imagen_mime or "image/jpeg")


@router.delete("/respuestas/{id}", status_code=204)
def eliminar_respuesta(
    id: UUID,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    r = db.query(RespuestaForo).filter(RespuestaForo.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="No encontrada")
    if r.id_usuaria != current_user.id_usuaria and current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Sin permiso")
    db.delete(r)
    db.commit()


@router.post("/seguir/{id_usuaria}")
def seguir_usuario(
    id_usuaria: UUID,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    if id_usuaria == current_user.id_usuaria:
        raise HTTPException(status_code=400, detail="No puedes seguirte a ti misma")
    existing = db.query(SeguimientoForo).filter(
        SeguimientoForo.id_seguidor == current_user.id_usuaria,
        SeguimientoForo.id_seguido == id_usuaria
    ).first()
    if existing:
        db.delete(existing)
        siguiendo = False
    else:
        db.add(SeguimientoForo(id_seguidor=current_user.id_usuaria, id_seguido=id_usuaria))
        siguiendo = True
    db.commit()
    return {"siguiendo": siguiendo}


@router.get("/{id}/imagen")
def obtener_imagen_publicacion(id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    p = db.query(PublicacionForo).filter(PublicacionForo.id == id).first()
    if not p or not p.imagen:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    return Response(content=bytes(p.imagen), media_type=p.imagen_mime or "image/jpeg")

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import Optional
from uuid import UUID
from app.database.connection import get_db
from app.models.models import (
    PublicacionForo, RespuestaForo, LikeForo, FavoritoForo,
    ReaccionForo, SeguimientoForo, Usuaria
)
from app.schemas.schemas import PublicacionForoCreate, RespuestaForoCreate, ReaccionForoCreate
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/foro", tags=["Foro"])

REACCIONES_VALIDAS = {'❤️', '🔥', '💪', '🤗', '😢'}


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
            "avatar_seed": str(p.id_usuaria)[:12],
            "contenido": p.contenido,
            "categoria": p.categoria,
            "created_at": p.created_at.isoformat(),
            "likes_count": likes_map.get(pid, 0),
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
    if not datos.contenido.strip():
        raise HTTPException(status_code=400, detail="El contenido no puede estar vacío")
    pub = PublicacionForo(
        id_usuaria=current_user.id_usuaria,
        contenido=datos.contenido.strip(),
        categoria=datos.categoria
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
    return {"guardado": guardado}


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
            "contenido": r.contenido,
            "created_at": r.created_at.isoformat(),
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
    r = RespuestaForo(
        id_publicacion=id,
        id_usuaria=current_user.id_usuaria,
        contenido=datos.contenido.strip()
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return {
        "id": str(r.id),
        "avatar_seed": str(r.id_usuaria)[:12],
        "contenido": r.contenido,
        "created_at": r.created_at.isoformat(),
        "likes_count": 0,
        "is_liked": False,
        "es_mia": True,
    }


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

"""Router de Consejos.

- Lectura: cualquier usuario autenticado puede ver clasificaciones, etiquetas y
  artículos *activos*.
- Escritura (crear / editar / borrar / activar): solo admin.
- Favoritos: cualquier usuario, solo sobre artículos activos.
"""
import base64
import re
import unicodedata
from datetime import timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.connection import get_db
from app.models.models import (
    Usuaria,
    ConsejoClasificacion,
    ConsejoEtiqueta,
    ConsejoArticulo,
    ConsejoArticuloEtiqueta,
    ConsejoFavorito,
)
from app.schemas.schemas import (
    ConsejoClasificacionCreate,
    ConsejoClasificacionUpdate,
    ConsejoEtiquetaCreate,
    ConsejoEtiquetaUpdate,
    ConsejoArticuloCreate,
    ConsejoArticuloUpdate,
)
from app.routers.auth_utils import get_current_user
from app.utils.gemini import generar_imagen_consejo

router = APIRouter(prefix="/consejos", tags=["Consejos"])

MIMES_VALIDOS = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024


def _iso_utc(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _decode_data_url(data_url: str):
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


def require_admin(current_user: Usuaria = Depends(get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solo administradores")
    return current_user


# ─────────────────────── CLASIFICACIONES ───────────────────────

def _cla_out(c: ConsejoClasificacion) -> dict:
    return {
        "id": str(c.id),
        "nombre": c.nombre,
        "descripcion": c.descripcion or "",
        "activa": bool(c.activa),
        "orden": c.orden or 0,
    }


@router.get("/clasificaciones")
def listar_clasificaciones(
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    q = db.query(ConsejoClasificacion)
    if not (incluir_inactivas and current_user.rol == "admin"):
        q = q.filter(ConsejoClasificacion.activa == True)
    rows = q.order_by(ConsejoClasificacion.orden, ConsejoClasificacion.nombre).all()
    return [_cla_out(c) for c in rows]


@router.post("/clasificaciones", dependencies=[Depends(require_admin)])
def crear_clasificacion(datos: ConsejoClasificacionCreate, db: Session = Depends(get_db)):
    c = ConsejoClasificacion(
        nombre=datos.nombre.strip(),
        descripcion=(datos.descripcion or "").strip() or None,
        orden=datos.orden or 0,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return _cla_out(c)


@router.put("/clasificaciones/{id}", dependencies=[Depends(require_admin)])
def actualizar_clasificacion(id: UUID, datos: ConsejoClasificacionUpdate, db: Session = Depends(get_db)):
    c = db.query(ConsejoClasificacion).filter(ConsejoClasificacion.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Clasificación no encontrada")
    if datos.nombre is not None:
        c.nombre = datos.nombre.strip()
    if datos.descripcion is not None:
        c.descripcion = datos.descripcion.strip() or None
    if datos.orden is not None:
        c.orden = datos.orden
    if datos.activa is not None:
        c.activa = datos.activa
    db.commit()
    db.refresh(c)
    return _cla_out(c)


@router.delete("/clasificaciones/{id}", status_code=204, dependencies=[Depends(require_admin)])
def eliminar_clasificacion(id: UUID, db: Session = Depends(get_db)):
    c = db.query(ConsejoClasificacion).filter(ConsejoClasificacion.id == id).first()
    if not c:
        raise HTTPException(status_code=404, detail="No existe")
    db.delete(c)
    db.commit()


# ─────────────────────── ETIQUETAS ───────────────────────

def _et_out(e: ConsejoEtiqueta) -> dict:
    return {"id": str(e.id), "nombre": e.nombre, "activa": bool(e.activa)}


@router.get("/etiquetas")
def listar_etiquetas(
    incluir_inactivas: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    q = db.query(ConsejoEtiqueta)
    if not (incluir_inactivas and current_user.rol == "admin"):
        q = q.filter(ConsejoEtiqueta.activa == True)
    rows = q.order_by(ConsejoEtiqueta.nombre).all()
    return [_et_out(e) for e in rows]


@router.post("/etiquetas", dependencies=[Depends(require_admin)])
def crear_etiqueta(datos: ConsejoEtiquetaCreate, db: Session = Depends(get_db)):
    nombre = datos.nombre.strip()
    if not nombre:
        raise HTTPException(status_code=400, detail="Nombre vacío")
    if db.query(ConsejoEtiqueta).filter(func.lower(ConsejoEtiqueta.nombre) == nombre.lower()).first():
        raise HTTPException(status_code=400, detail="Ya existe esa etiqueta")
    e = ConsejoEtiqueta(nombre=nombre)
    db.add(e)
    db.commit()
    db.refresh(e)
    return _et_out(e)


@router.put("/etiquetas/{id}", dependencies=[Depends(require_admin)])
def actualizar_etiqueta(id: UUID, datos: ConsejoEtiquetaUpdate, db: Session = Depends(get_db)):
    e = db.query(ConsejoEtiqueta).filter(ConsejoEtiqueta.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="No existe")
    if datos.nombre is not None:
        e.nombre = datos.nombre.strip()
    if datos.activa is not None:
        e.activa = datos.activa
    db.commit()
    db.refresh(e)
    return _et_out(e)


@router.delete("/etiquetas/{id}", status_code=204, dependencies=[Depends(require_admin)])
def eliminar_etiqueta(id: UUID, db: Session = Depends(get_db)):
    e = db.query(ConsejoEtiqueta).filter(ConsejoEtiqueta.id == id).first()
    if not e:
        raise HTTPException(status_code=404, detail="No existe")
    db.delete(e)
    db.commit()


# ─────────────────────── ARTÍCULOS ───────────────────────

def _articulo_out(a: ConsejoArticulo, etiquetas_map: dict, favoritos_set: set) -> dict:
    return {
        "id": str(a.id),
        "id_clasificacion": str(a.id_clasificacion),
        "titulo": a.titulo,
        "resumen": a.resumen or "",
        "cuerpo": a.cuerpo or "",
        "tiene_imagen": a.imagen is not None,
        "activo": bool(a.activo),
        "orden": a.orden or 0,
        "created_at": _iso_utc(a.created_at),
        "etiquetas": [{"id": str(eid), "nombre": en} for eid, en in etiquetas_map.get(str(a.id), [])],
        "es_favorito": str(a.id) in favoritos_set,
    }


def _build_articulos(articulos, db: Session, current_user_id):
    if not articulos:
        return []
    art_ids = [a.id for a in articulos]

    # Etiquetas de cada artículo
    rels = (
        db.query(ConsejoArticuloEtiqueta, ConsejoEtiqueta)
          .join(ConsejoEtiqueta, ConsejoEtiqueta.id == ConsejoArticuloEtiqueta.id_etiqueta)
          .filter(ConsejoArticuloEtiqueta.id_articulo.in_(art_ids))
          .all()
    )
    etiquetas_map = {}
    for rel, et in rels:
        etiquetas_map.setdefault(str(rel.id_articulo), []).append((et.id, et.nombre))

    # Favoritos del usuario actual
    favs_set = {
        str(f.id_articulo)
        for f in db.query(ConsejoFavorito).filter(
            ConsejoFavorito.id_usuaria == current_user_id,
            ConsejoFavorito.id_articulo.in_(art_ids)
        ).all()
    }

    return [_articulo_out(a, etiquetas_map, favs_set) for a in articulos]


@router.get("/articulos")
def listar_articulos(
    clasificacion: Optional[UUID] = None,
    etiqueta: Optional[UUID] = None,
    favoritos: bool = False,
    incluir_inactivos: bool = False,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    q = db.query(ConsejoArticulo)
    if not (incluir_inactivos and current_user.rol == "admin"):
        q = q.filter(ConsejoArticulo.activo == True)
        q = q.join(ConsejoClasificacion, ConsejoClasificacion.id == ConsejoArticulo.id_clasificacion)\
             .filter(ConsejoClasificacion.activa == True)
    if clasificacion:
        q = q.filter(ConsejoArticulo.id_clasificacion == clasificacion)
    if etiqueta:
        q = q.join(ConsejoArticuloEtiqueta, ConsejoArticuloEtiqueta.id_articulo == ConsejoArticulo.id)\
             .filter(ConsejoArticuloEtiqueta.id_etiqueta == etiqueta)
    if favoritos:
        q = q.join(ConsejoFavorito, ConsejoFavorito.id_articulo == ConsejoArticulo.id)\
             .filter(ConsejoFavorito.id_usuaria == current_user.id_usuaria)
    q = q.order_by(ConsejoArticulo.orden, ConsejoArticulo.created_at.desc())
    rows = q.all()
    return _build_articulos(rows, db, current_user.id_usuaria)


@router.get("/articulos/{id}")
def obtener_articulo(id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    a = db.query(ConsejoArticulo).filter(ConsejoArticulo.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="No encontrado")
    # Si no es admin y el artículo o la clasificación están inactivos → 404
    if current_user.rol != "admin":
        cla = db.query(ConsejoClasificacion).filter(ConsejoClasificacion.id == a.id_clasificacion).first()
        if not a.activo or not cla or not cla.activa:
            raise HTTPException(status_code=404, detail="No encontrado")
    return _build_articulos([a], db, current_user.id_usuaria)[0]


@router.get("/articulos/{id}/imagen")
def obtener_imagen_articulo(id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    a = db.query(ConsejoArticulo).filter(ConsejoArticulo.id == id).first()
    if not a or not a.imagen:
        raise HTTPException(status_code=404, detail="Sin imagen")
    if current_user.rol != "admin":
        cla = db.query(ConsejoClasificacion).filter(ConsejoClasificacion.id == a.id_clasificacion).first()
        if not a.activo or not cla or not cla.activa:
            raise HTTPException(status_code=404, detail="Sin imagen")
    return Response(content=bytes(a.imagen), media_type=a.imagen_mime or "image/png")


@router.post("/articulos")
def crear_articulo(datos: ConsejoArticuloCreate, db: Session = Depends(get_db), current_user: Usuaria = Depends(require_admin)):
    cla = db.query(ConsejoClasificacion).filter(ConsejoClasificacion.id == datos.id_clasificacion).first()
    if not cla:
        raise HTTPException(status_code=400, detail="Clasificación inválida")

    imagen_bytes = None
    imagen_mime = None
    imagen_prompt = None
    if datos.imagen_data:
        imagen_mime, imagen_bytes = _decode_data_url(datos.imagen_data)
    elif datos.generar_imagen:
        gen = generar_imagen_consejo(datos.titulo, datos.resumen or "", datos.prompt_imagen or "")
        if gen:
            imagen_mime, imagen_bytes = gen
            imagen_prompt = datos.prompt_imagen or f"auto:{datos.titulo}"

    a = ConsejoArticulo(
        id_clasificacion=datos.id_clasificacion,
        titulo=datos.titulo.strip(),
        resumen=(datos.resumen or "").strip() or None,
        cuerpo=(datos.cuerpo or "").strip() or None,
        imagen=imagen_bytes,
        imagen_mime=imagen_mime,
        imagen_prompt=imagen_prompt,
    )
    db.add(a)
    db.commit()
    db.refresh(a)

    # etiquetas
    if datos.etiquetas:
        for eid in datos.etiquetas:
            try:
                eid_uuid = UUID(str(eid))
            except Exception:
                continue
            db.add(ConsejoArticuloEtiqueta(id_articulo=a.id, id_etiqueta=eid_uuid))
        db.commit()

    return _build_articulos([a], db, current_user.id_usuaria)[0]


@router.put("/articulos/{id}")
def actualizar_articulo(id: UUID, datos: ConsejoArticuloUpdate, db: Session = Depends(get_db), current_user: Usuaria = Depends(require_admin)):
    a = db.query(ConsejoArticulo).filter(ConsejoArticulo.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="No existe")
    if datos.id_clasificacion is not None:
        cla = db.query(ConsejoClasificacion).filter(ConsejoClasificacion.id == datos.id_clasificacion).first()
        if not cla:
            raise HTTPException(status_code=400, detail="Clasificación inválida")
        a.id_clasificacion = datos.id_clasificacion
    if datos.titulo is not None:
        a.titulo = datos.titulo.strip()
    if datos.resumen is not None:
        a.resumen = datos.resumen.strip() or None
    if datos.cuerpo is not None:
        a.cuerpo = datos.cuerpo.strip() or None
    if datos.activo is not None:
        a.activo = datos.activo
    if datos.orden is not None:
        a.orden = datos.orden
    if datos.imagen_data is not None:
        if datos.imagen_data == "":
            a.imagen = None
            a.imagen_mime = None
        else:
            mime, b = _decode_data_url(datos.imagen_data)
            a.imagen = b
            a.imagen_mime = mime
            a.imagen_prompt = None
    if datos.etiquetas is not None:
        db.query(ConsejoArticuloEtiqueta).filter(ConsejoArticuloEtiqueta.id_articulo == id).delete()
        for eid in datos.etiquetas:
            try:
                eid_uuid = UUID(str(eid))
            except Exception:
                continue
            db.add(ConsejoArticuloEtiqueta(id_articulo=id, id_etiqueta=eid_uuid))
    db.commit()
    db.refresh(a)
    return _build_articulos([a], db, current_user.id_usuaria)[0]


@router.post("/articulos/{id}/regenerar-imagen")
def regenerar_imagen(id: UUID, db: Session = Depends(get_db), prompt: Optional[str] = None, _admin: Usuaria = Depends(require_admin)):
    a = db.query(ConsejoArticulo).filter(ConsejoArticulo.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="No existe")
    gen = generar_imagen_consejo(a.titulo, a.resumen or "", prompt or "")
    if not gen:
        raise HTTPException(status_code=502, detail="No se pudo generar la imagen (configura GEMINI_API_KEY o revisa logs)")
    mime, b = gen
    a.imagen = b
    a.imagen_mime = mime
    a.imagen_prompt = prompt or f"auto:{a.titulo}"
    db.commit()
    return {"ok": True, "tiene_imagen": True}


@router.delete("/articulos/{id}", status_code=204, dependencies=[Depends(require_admin)])
def eliminar_articulo(id: UUID, db: Session = Depends(get_db)):
    a = db.query(ConsejoArticulo).filter(ConsejoArticulo.id == id).first()
    if not a:
        raise HTTPException(status_code=404, detail="No existe")
    db.delete(a)
    db.commit()


# ─────────────────────── FAVORITOS ───────────────────────

@router.post("/articulos/{id}/favorito")
def toggle_favorito(id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    art = db.query(ConsejoArticulo).filter(ConsejoArticulo.id == id).first()
    if not art:
        raise HTTPException(status_code=404, detail="No existe")
    # Solo se permite marcar como favorito artículos activos
    if not art.activo:
        raise HTTPException(status_code=400, detail="Artículo no disponible")
    existing = db.query(ConsejoFavorito).filter(
        ConsejoFavorito.id_articulo == id,
        ConsejoFavorito.id_usuaria == current_user.id_usuaria
    ).first()
    if existing:
        db.delete(existing)
        es_favorito = False
    else:
        db.add(ConsejoFavorito(id_articulo=id, id_usuaria=current_user.id_usuaria))
        es_favorito = True
    db.commit()
    return {"es_favorito": es_favorito}


# ─────────────────────── SEED DEMO (admin) ───────────────────────

@router.post("/seed-demo")
def cargar_contenido_demo(
    generar_imagenes: bool = False,
    sobreescribir: bool = False,
    db: Session = Depends(get_db),
    _admin: Usuaria = Depends(require_admin)
):
    """Carga un lote completo de clasificaciones, etiquetas y artículos.

    - sobreescribir=False (recomendado): se saltan los que ya existan por nombre/título.
    - sobreescribir=True: actualiza los existentes con el contenido del seed.
    - generar_imagenes=True: pide a Gemini una portada para cada artículo nuevo.
      Atención: puede tardar 1-2 minutos si hay ~20 artículos.
    """
    from app.data.consejos_seed import CLASIFICACIONES, ETIQUETAS, ARTICULOS
    from app.utils.gemini import generar_imagen_consejo

    creadas_cla = 0
    creadas_et  = 0
    creados_art = 0
    actualizados = 0
    sin_imagen   = 0

    # 1) Clasificaciones
    cla_por_nombre = {}
    for c in CLASIFICACIONES:
        existing = db.query(ConsejoClasificacion).filter(
            func.lower(ConsejoClasificacion.nombre) == c["nombre"].lower()
        ).first()
        if existing:
            if sobreescribir:
                existing.descripcion = c.get("descripcion") or None
                existing.orden = c.get("orden", 0)
                actualizados += 1
            cla_por_nombre[c["nombre"]] = existing
        else:
            nuevo = ConsejoClasificacion(
                nombre=c["nombre"],
                descripcion=c.get("descripcion") or None,
                orden=c.get("orden", 0),
            )
            db.add(nuevo)
            db.flush()
            cla_por_nombre[c["nombre"]] = nuevo
            creadas_cla += 1
    db.commit()

    # 2) Etiquetas
    et_por_nombre = {}
    for nombre in ETIQUETAS:
        existing = db.query(ConsejoEtiqueta).filter(
            func.lower(ConsejoEtiqueta.nombre) == nombre.lower()
        ).first()
        if existing:
            et_por_nombre[nombre] = existing
        else:
            nueva = ConsejoEtiqueta(nombre=nombre)
            db.add(nueva)
            db.flush()
            et_por_nombre[nombre] = nueva
            creadas_et += 1
    db.commit()

    # 3) Artículos
    for art in ARTICULOS:
        cla = cla_por_nombre.get(art["clasificacion"])
        if not cla:
            continue
        existing = db.query(ConsejoArticulo).filter(
            ConsejoArticulo.id_clasificacion == cla.id,
            func.lower(ConsejoArticulo.titulo) == art["titulo"].lower()
        ).first()
        if existing and not sobreescribir:
            continue

        imagen_bytes = None
        imagen_mime  = None
        if generar_imagenes and (not existing or not existing.imagen):
            gen = generar_imagen_consejo(art["titulo"], art.get("resumen") or "")
            if gen:
                imagen_mime, imagen_bytes = gen
            else:
                sin_imagen += 1

        if existing:
            existing.resumen = art.get("resumen") or None
            existing.cuerpo  = art.get("cuerpo") or None
            if imagen_bytes:
                existing.imagen = imagen_bytes
                existing.imagen_mime = imagen_mime
            obj = existing
            actualizados += 1
        else:
            obj = ConsejoArticulo(
                id_clasificacion=cla.id,
                titulo=art["titulo"],
                resumen=art.get("resumen") or None,
                cuerpo=art.get("cuerpo") or None,
                imagen=imagen_bytes,
                imagen_mime=imagen_mime,
            )
            db.add(obj)
            db.flush()
            creados_art += 1

        # Etiquetas del artículo: limpiar y reasignar
        db.query(ConsejoArticuloEtiqueta).filter(
            ConsejoArticuloEtiqueta.id_articulo == obj.id
        ).delete()
        for et_nombre in art.get("etiquetas", []):
            et = et_por_nombre.get(et_nombre)
            if et:
                db.add(ConsejoArticuloEtiqueta(id_articulo=obj.id, id_etiqueta=et.id))

    db.commit()

    return {
        "ok": True,
        "clasificaciones_creadas": creadas_cla,
        "etiquetas_creadas": creadas_et,
        "articulos_creados": creados_art,
        "actualizados": actualizados,
        "sin_imagen_ia": sin_imagen,
    }

import base64
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from app.database.connection import get_db
from app.models.models import Usuaria, Mensaje, Pareja, PublicacionForo, ReporteForo, Ciclo, ConfiguracionUsuaria, Prediccion, RegistroSintoma, Sintoma, RegistroDiario
from app.schemas.schemas import MensajeCreate, MensajeOut
from app.routers.auth_utils import get_current_user
from sqlalchemy import or_, and_, func


class CompartirPublicacionBody(BaseModel):
    id_receptor: UUID
    id_publicacion: UUID

router = APIRouter(prefix="/chat", tags=["Chat"])

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


def _mensaje_out(m: Mensaje) -> dict:
    return {
        "id": m.id,
        "id_remitente": m.id_remitente,
        "id_receptor": m.id_receptor,
        "contenido": m.contenido or "",
        "tiene_imagen": m.imagen is not None,
        "es_compartido": bool(getattr(m, "es_compartido", False)),
        "leido": bool(m.leido),
        "fecha": m.fecha,
    }


def _puede_chatear(db: Session, current_user: Usuaria, id_otro: UUID) -> bool:
    """Permite chat si son pareja vinculada o si uno de los dos es admin (soporte)."""
    if current_user.rol == "admin":
        return True
    otro = db.query(Usuaria).filter(Usuaria.id_usuaria == id_otro).first()
    if otro and otro.rol == "admin":
        return True
    return db.query(Pareja).filter(
        or_(
            and_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == id_otro),
            and_(Pareja.id_pareja == current_user.id_usuaria, Pareja.id_usuaria == id_otro)
        )
    ).first() is not None


@router.get("/soporte/admin")
def obtener_admin_soporte(db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    """Devuelve el admin con el que hablar para atención al cliente."""
    admin = db.query(Usuaria).filter(Usuaria.rol == "admin").order_by(Usuaria.fecha_registro.asc()).first()
    if not admin:
        raise HTTPException(status_code=404, detail="No hay administradores disponibles")
    return {"id_usuaria": str(admin.id_usuaria), "nombre": admin.nombre}


@router.get("/soporte/conversaciones")
def listar_conversaciones_soporte(db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    """Solo admin. Devuelve la lista de usuarias que han chateado con admins, con el último mensaje y los no leídos."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="Solo administradores")

    admin_ids = [a.id_usuaria for a in db.query(Usuaria.id_usuaria).filter(Usuaria.rol == "admin").all()]

    # Todos los mensajes en los que un admin es remitente o receptor
    mensajes = db.query(Mensaje).filter(
        or_(Mensaje.id_remitente.in_(admin_ids), Mensaje.id_receptor.in_(admin_ids))
    ).order_by(Mensaje.fecha.asc()).all()

    # Agrupar por "la otra parte" (la usuaria no admin)
    conv = {}  # id_usuaria_no_admin -> { ultimo_mensaje, fecha, no_leidos, mio }
    for m in mensajes:
        otro = m.id_receptor if m.id_remitente in admin_ids else m.id_remitente
        if otro in admin_ids:
            continue  # admin <-> admin, ignorar
        entry = conv.get(otro)
        es_de_admin = m.id_remitente in admin_ids
        no_leido_para_admin = (not es_de_admin) and (m.id_receptor == current_user.id_usuaria) and (not m.leido)
        if entry is None:
            entry = {"no_leidos": 0}
            conv[otro] = entry
        entry["ultimo_mensaje"] = (m.contenido or ("📷 Imagen" if m.imagen else ""))[:120]
        entry["fecha"] = m.fecha
        entry["mio"] = es_de_admin
        if no_leido_para_admin:
            entry["no_leidos"] += 1

    if not conv:
        return []

    usuarias = {u.id_usuaria: u for u in db.query(Usuaria).filter(Usuaria.id_usuaria.in_(list(conv.keys()))).all()}

    out = []
    for uid, info in conv.items():
        u = usuarias.get(uid)
        if not u:
            continue
        out.append({
            "id_usuaria": str(uid),
            "nombre": u.nombre,
            "email": u.email,
            "ultimo_mensaje": info["ultimo_mensaje"],
            "fecha": info["fecha"],
            "no_leidos": info["no_leidos"],
            "mio": info["mio"],
        })
    out.sort(key=lambda r: r["fecha"], reverse=True)
    return out


@router.post("/", response_model=MensajeOut)
def enviar_mensaje(mensaje: MensajeCreate, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    if not _puede_chatear(db, current_user, mensaje.id_receptor):
        raise HTTPException(status_code=403, detail="No puedes enviar mensajes a esta usuaria.")

    contenido = (mensaje.contenido or "").strip()
    imagen_bytes = None
    imagen_mime = None
    if mensaje.imagen_data:
        imagen_mime, imagen_bytes = _decode_data_url(mensaje.imagen_data)

    if not contenido and not imagen_bytes:
        raise HTTPException(status_code=400, detail="El mensaje debe tener texto o imagen")

    nuevo_mensaje = Mensaje(
        id_remitente=current_user.id_usuaria,
        id_receptor=mensaje.id_receptor,
        contenido=contenido,
        imagen=imagen_bytes,
        imagen_mime=imagen_mime,
    )
    db.add(nuevo_mensaje)
    db.commit()
    db.refresh(nuevo_mensaje)
    return _mensaje_out(nuevo_mensaje)


@router.get("/imagen/{id}")
def obtener_imagen_mensaje(id: UUID, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    m = db.query(Mensaje).filter(Mensaje.id == id).first()
    if not m or not m.imagen:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")
    # Solo remitente o receptor pueden verla
    if current_user.id_usuaria not in (m.id_remitente, m.id_receptor):
        raise HTTPException(status_code=403, detail="No autorizado")
    return Response(content=bytes(m.imagen), media_type=m.imagen_mime or "image/jpeg")

@router.get("/{id_pareja}")
def obtener_mensajes(id_pareja: UUID, limit: int = 50, db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    if not _puede_chatear(db, current_user, id_pareja):
        raise HTTPException(status_code=403, detail="No puedes ver mensajes con esta usuaria.")

    mensajes = db.query(Mensaje).filter(
        or_(
            and_(Mensaje.id_remitente == current_user.id_usuaria, Mensaje.id_receptor == id_pareja),
            and_(Mensaje.id_remitente == id_pareja, Mensaje.id_receptor == current_user.id_usuaria)
        )
    ).order_by(Mensaje.fecha.asc()).limit(limit).all()

    # Marcar como leídos los mensajes recibidos
    db.query(Mensaje).filter(
        Mensaje.id_remitente == id_pareja,
        Mensaje.id_receptor == current_user.id_usuaria,
        Mensaje.leido == False
    ).update({"leido": True})
    db.commit()

    return [_mensaje_out(m) for m in mensajes]


class DescartarAvisoBody(BaseModel):
    tipo: str


@router.post("/mascota/avisos/descartar")
def descartar_aviso_mascota(
    body: DescartarAvisoBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user),
):
    """Marca un aviso como descartado por la usuaria — no se mostrará en 24h.
    Usa upsert para refrescar el timestamp si ya existía."""
    from sqlalchemy import text as sql_text
    db.execute(
        sql_text("""
            INSERT INTO avisos_mascota_descartados (id_usuaria, tipo, descartado_at)
            VALUES (:uid, :tipo, NOW())
            ON CONFLICT (id_usuaria, tipo) DO UPDATE SET descartado_at = NOW()
        """),
        {"uid": str(current_user.id_usuaria), "tipo": body.tipo},
    )
    db.commit()
    return {"ok": True}


@router.get("/mascota/avisos")
def avisos_mascota(db: Session = Depends(get_db), current_user: Usuaria = Depends(get_current_user)):
    """Lista avisos pendientes para la mascota:
    - usuaria: mensajes no leídos de su pareja + respuestas no leídas del admin
    - admin: mensajes no leídos de usuarias (soporte) + reportes pendientes + mensajes de su pareja
    """
    # Avisos descartados en las últimas 24h (se ocultan)
    from sqlalchemy import text as sql_text
    descartados = {
        row[0] for row in db.execute(
            sql_text("""
                SELECT tipo FROM avisos_mascota_descartados
                WHERE id_usuaria = :uid AND descartado_at > NOW() - INTERVAL '1 day'
            """),
            {"uid": str(current_user.id_usuaria)},
        ).fetchall()
    }

    avisos = []
    admin_ids = {a.id_usuaria for a in db.query(Usuaria.id_usuaria).filter(Usuaria.rol == "admin").all()}

    # IDs de parejas vinculadas a current_user
    pareja_links = db.query(Pareja).filter(
        or_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == current_user.id_usuaria)
    ).all()
    pareja_ids = set()
    for v in pareja_links:
        pareja_ids.add(v.id_usuaria if v.id_pareja == current_user.id_usuaria else v.id_pareja)

    # Mensajes no leídos recibidos
    no_leidos = db.query(Mensaje).filter(
        Mensaje.id_receptor == current_user.id_usuaria,
        Mensaje.leido == False,
    ).all()

    de_pareja = [m for m in no_leidos if m.id_remitente in pareja_ids]
    de_admin = [m for m in no_leidos if m.id_remitente in admin_ids and m.id_remitente != current_user.id_usuaria]
    de_usuarias = [m for m in no_leidos if m.id_remitente not in admin_ids and m.id_remitente not in pareja_ids]

    if de_pareja:
        n = len(de_pareja)
        avisos.append({
            "tipo": "mensaje_pareja",
            "texto": "Tu pareja te ha escrito 💜" if n == 1 else f"Tienes {n} mensajes de tu pareja 💜",
            "count": n,
        })

    if current_user.rol != "admin" and de_admin:
        n = len(de_admin)
        avisos.append({
            "tipo": "respuesta_soporte",
            "texto": "El equipo te ha respondido" if n == 1 else f"Tienes {n} respuestas de soporte",
            "count": n,
        })

    if current_user.rol == "admin":
        if de_usuarias:
            # Cuántas usuarias distintas han escrito
            usuarias_distintas = {m.id_remitente for m in de_usuarias}
            n_u = len(usuarias_distintas)
            n_m = len(de_usuarias)
            avisos.append({
                "tipo": "soporte_admin",
                "texto": (f"Una usuaria espera respuesta en soporte" if n_u == 1
                          else f"{n_u} usuarias esperan respuesta en soporte ({n_m} mensajes)"),
                "count": n_m,
            })

        reportes_pendientes = db.query(func.count(ReporteForo.id)).filter(
            ReporteForo.estado == "pendiente"
        ).scalar() or 0
        if reportes_pendientes > 0:
            avisos.append({
                "tipo": "reporte_pendiente",
                "texto": ("Hay un reporte pendiente" if reportes_pendientes == 1
                          else f"Hay {reportes_pendientes} reportes pendientes"),
                "count": int(reportes_pendientes),
            })

    # Ciclo abierto demasiado tiempo: la usuaria empezó la regla pero no marcó
    # la fecha de fin → la mascota se lo recuerda para que cierre el ciclo.
    from datetime import date
    ultimo_ciclo = (
        db.query(Ciclo)
          .filter(Ciclo.id_usuaria == current_user.id_usuaria,
                  Ciclo.fecha_fin == None)
          .order_by(Ciclo.fecha_inicio.desc())
          .first()
    )
    if ultimo_ciclo and ultimo_ciclo.fecha_inicio and "ciclo_abierto" not in descartados:
        cfg = db.query(ConfiguracionUsuaria).filter(
            ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria
        ).first()
        duracion_esperada = (cfg.duracion_periodo if cfg and cfg.duracion_periodo else 5)
        umbral_dias = max(duracion_esperada + 2, 7)
        dias = (date.today() - ultimo_ciclo.fecha_inicio).days
        if dias >= umbral_dias:
            avisos.append({
                "tipo": "ciclo_abierto",
                "texto": f"¿Ya terminó tu regla? Lleva {dias} días sin cerrar",
                "count": dias,
                "id_ciclo": str(ultimo_ciclo.id_ciclo),
            })

    # Regla muy retrasada (≥14 días después de lo previsto y sin iniciar):
    # posible embarazo → mascota recomienda acudir al ginecólogo.
    # Calcula la fecha esperada usando la Prediccion si existe; si no, se basa
    # en el último ciclo + duración configurada de la usuaria.
    if "regla_retrasada" not in descartados:
        from datetime import timedelta
        fecha_esperada = None

        prediccion = (
            db.query(Prediccion)
              .filter(Prediccion.id_usuaria == current_user.id_usuaria)
              .first()
        )
        if prediccion and prediccion.proxima_menstruacion:
            fecha_esperada = prediccion.proxima_menstruacion
        else:
            # Sin predicción: estimar desde el último ciclo + duración configurada
            ultimo = (
                db.query(Ciclo)
                  .filter(Ciclo.id_usuaria == current_user.id_usuaria,
                          Ciclo.fecha_inicio != None)
                  .order_by(Ciclo.fecha_inicio.desc())
                  .first()
            )
            if ultimo:
                cfg_r = db.query(ConfiguracionUsuaria).filter(
                    ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria
                ).first()
                dur_c = (cfg_r.duracion_ciclo if cfg_r and cfg_r.duracion_ciclo else 28)
                fecha_esperada = ultimo.fecha_inicio + timedelta(days=dur_c)

        if fecha_esperada:
            dias_retraso = (date.today() - fecha_esperada).days
            if dias_retraso >= 14:
                # ¿Ha empezado un ciclo dentro de la ventana esperada?
                inicio_ventana = fecha_esperada - timedelta(days=7)
                ciclo_iniciado = (
                    db.query(Ciclo)
                      .filter(Ciclo.id_usuaria == current_user.id_usuaria,
                              Ciclo.fecha_inicio >= inicio_ventana)
                      .first()
                )
                if not ciclo_iniciado:
                    avisos.append({
                        "tipo": "regla_retrasada",
                        "texto": f"Tu regla lleva {dias_retraso} días de retraso — podría ser embarazo, acude a tu ginecóloga 🩺",
                        "count": dias_retraso,
                    })

    # Detección de ciclos irregulares: si los últimos ciclos tienen gaps muy
    # variables o fuera del rango fisiológico normal (21-45 días), la mascota
    # recomienda generar el informe en PDF y acudir al ginecólogo.
    ciclos_recientes = (
        db.query(Ciclo)
          .filter(Ciclo.id_usuaria == current_user.id_usuaria,
                  Ciclo.fecha_inicio != None)
          .order_by(Ciclo.fecha_inicio.asc())
          .all()
    )
    if len(ciclos_recientes) >= 4 and "ciclo_irregular" not in descartados:  # necesitamos ≥3 gaps para detectar variabilidad
        ultimos = ciclos_recientes[-6:]  # últimos 6 ciclos
        gaps = []
        for i in range(1, len(ultimos)):
            gap = (ultimos[i].fecha_inicio - ultimos[i - 1].fecha_inicio).days
            if gap > 0:
                gaps.append(gap)
        if len(gaps) >= 3:
            fuera_de_rango = any(g < 21 or g > 45 for g in gaps)
            muy_variable = (max(gaps) - min(gaps)) >= 14
            if fuera_de_rango or muy_variable:
                avisos.append({
                    "tipo": "ciclo_irregular",
                    "texto": "Tus ciclos están irregulares — genera el informe y consulta a tu ginecóloga 🩺",
                    "count": len(gaps),
                })

    # Síntomas/flujo/observaciones atípicos para la fase actual del ciclo.
    # Detecta sangrado fuera de regla, flujo fértil en lútea, flujo seco en
    # ovulación y palabras de alarma en las notas (fiebre, mareo, etc.).
    from datetime import timedelta
    ultimo_ciclo_iniciado = (
        db.query(Ciclo)
          .filter(Ciclo.id_usuaria == current_user.id_usuaria,
                  Ciclo.fecha_inicio != None)
          .order_by(Ciclo.fecha_inicio.desc())
          .first()
    )
    if ultimo_ciclo_iniciado and "sintomas_atipicos" not in descartados:
        cfg_u = db.query(ConfiguracionUsuaria).filter(
            ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria
        ).first()
        dur_ciclo = (cfg_u.duracion_ciclo if cfg_u and cfg_u.duracion_ciclo else 28)
        dur_periodo = (cfg_u.duracion_periodo if cfg_u and cfg_u.duracion_periodo else 5)
        dia_ciclo = (date.today() - ultimo_ciclo_iniciado.fecha_inicio).days + 1

        # Solo evaluamos dentro de una ventana razonable (1..ciclo+7)
        if 1 <= dia_ciclo <= dur_ciclo + 7:
            ovulacion_dia = max(7, dur_ciclo - 14)
            fertil_ini, fertil_fin = ovulacion_dia - 5, ovulacion_dia + 1

            if dia_ciclo <= dur_periodo:
                fase = "menstrual"
            elif dia_ciclo < fertil_ini:
                fase = "folicular"
            elif fertil_ini <= dia_ciclo <= fertil_fin:
                fase = "ovulatoria"
            else:
                fase = "lutea"

            desde = date.today() - timedelta(days=2)
            regs_sint = (
                db.query(Sintoma.nombre_sintoma)
                  .join(RegistroSintoma, RegistroSintoma.id_sintoma == Sintoma.id_sintoma)
                  .filter(RegistroSintoma.id_usuaria == current_user.id_usuaria,
                          RegistroSintoma.fecha >= desde)
                  .all()
            )
            diarios = (
                db.query(RegistroDiario)
                  .filter(RegistroDiario.id_usuaria == current_user.id_usuaria,
                          RegistroDiario.fecha >= desde)
                  .all()
            )
            nombres_sintomas = {r[0] for r in regs_sint}
            flujos = {d.flujo for d in diarios if d.flujo}
            notas_texto = " ".join((d.notas or "") for d in diarios).lower()

            atipicos = []

            # A) Sangrado/cólicos fuera de menstrual (y fuera del premenstrual tardío)
            sintomas_sangrado = {"Manchada", "Cólicos", "Dolor Abdominal"}
            if fase in ("folicular", "ovulatoria") and (nombres_sintomas & sintomas_sangrado):
                atipicos.append("sangrado o cólicos fuera de tu regla")
            elif fase == "lutea" and "Manchada" in nombres_sintomas and dia_ciclo < dur_ciclo - 3:
                atipicos.append("manchado a media fase lútea")

            # B) Flujo fértil en lútea
            if fase == "lutea" and (flujos & {"clara_huevo", "acuoso"}):
                atipicos.append("flujo fértil en fase premenstrual")

            # C) Sin flujo fértil en ovulación (seco aislado durante ventana fértil)
            if fase == "ovulatoria" and "seco" in flujos and not (flujos & {"clara_huevo", "acuoso", "cremoso"}):
                atipicos.append("flujo seco durante tu ovulación")

            # D) Palabras de alarma en observaciones
            palabras_alarma = ["fiebre", "mareo", "desmayo", "vómito", "vomito",
                               "sangrado abundante", "dolor intenso", "sangre coágulo",
                               "sangre coagulo", "pérdida de conciencia"]
            if any(p in notas_texto for p in palabras_alarma):
                atipicos.append("síntomas preocupantes en tus notas")

            if atipicos:
                principal = atipicos[0]
                avisos.append({
                    "tipo": "sintomas_atipicos",
                    "texto": f"Has registrado {principal} — coméntalo con tu ginecóloga 🩺",
                    "count": len(atipicos),
                    "fase": fase,
                    "detalles": atipicos,
                })

    return avisos


@router.post("/compartir-publicacion", response_model=MensajeOut)
def compartir_publicacion(
    body: CompartirPublicacionBody,
    db: Session = Depends(get_db),
    current_user: Usuaria = Depends(get_current_user)
):
    # Verificar vínculo de pareja
    vinculo = db.query(Pareja).filter(
        or_(
            and_(Pareja.id_usuaria == current_user.id_usuaria, Pareja.id_pareja == body.id_receptor),
            and_(Pareja.id_pareja == current_user.id_usuaria, Pareja.id_usuaria == body.id_receptor)
        )
    ).first()
    if not vinculo:
        raise HTTPException(status_code=403, detail="No es tu pareja vinculada")

    pub = db.query(PublicacionForo).filter(PublicacionForo.id == body.id_publicacion).first()
    if not pub:
        raise HTTPException(status_code=404, detail="Publicación no encontrada")

    nuevo = Mensaje(
        id_remitente=current_user.id_usuaria,
        id_receptor=body.id_receptor,
        contenido=(pub.contenido or "").strip() or None,
        imagen=pub.imagen,
        imagen_mime=pub.imagen_mime,
        es_compartido=True,
    )
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return _mensaje_out(nuevo)

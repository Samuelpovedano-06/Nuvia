from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID
from datetime import date
from app.database.connection import get_db
from app.models.models import Usuaria, Sintoma, RegistroSintoma, Pareja
from app.schemas.schemas import SintomaOut, RegistroSintomaCreate, RegistroSintomaOut
from app.routers.auth_utils import get_current_user

router = APIRouter(tags=["Síntomas"])

@router.get("/sintomas", response_model=List[SintomaOut])
def listar_sintomas(db: Session = Depends(get_db)):
    return db.query(Sintoma).all()

@router.post("/registros-sintomas", response_model=RegistroSintomaOut, status_code=201)
def registrar_sintoma(datos: RegistroSintomaCreate, db: Session = Depends(get_db),
                      current_user: Usuaria = Depends(get_current_user)):
    sintoma = db.query(Sintoma).filter(Sintoma.id_sintoma == datos.id_sintoma).first()
    if not sintoma:
        raise HTTPException(status_code=404, detail="Síntoma no encontrado")
    registro = RegistroSintoma(id_usuaria=current_user.id_usuaria, **datos.model_dump())
    db.add(registro)
    db.commit()
    db.refresh(registro)
    return registro

@router.get("/registros-sintomas", response_model=List[RegistroSintomaOut])
def listar_registros_sintomas(id_usuaria: UUID = None, db: Session = Depends(get_db),
                              current_user: Usuaria = Depends(get_current_user)):
    target_id = current_user.id_usuaria
    if id_usuaria:
        if current_user.rol == "admin":
            target_id = id_usuaria
        else:
            link = db.query(Pareja).filter(
                Pareja.id_usuaria == id_usuaria,
                Pareja.id_pareja == current_user.id_usuaria
            ).first()
            if not link:
                raise HTTPException(status_code=403, detail="No tienes acceso a los datos de esta usuaria")
            target_id = id_usuaria
    return db.query(RegistroSintoma)\
             .filter(RegistroSintoma.id_usuaria == target_id)\
             .order_by(RegistroSintoma.fecha.desc()).all()

@router.get("/registros-sintomas/{fecha}", response_model=List[RegistroSintomaOut])
def listar_registros_por_fecha(fecha: date, id_usuaria: UUID = None, db: Session = Depends(get_db),
                               current_user: Usuaria = Depends(get_current_user)):
    """Lista los registros de síntomas de una fecha para la usuaria o vinculada."""
    target_id = current_user.id_usuaria
    if id_usuaria:
        if current_user.rol == "admin":
            target_id = id_usuaria
        else:
            # Verificar vínculo
            link = db.query(Pareja).filter(
                Pareja.id_usuaria == id_usuaria,
                Pareja.id_pareja == current_user.id_usuaria
            ).first()
            if not link:
                raise HTTPException(status_code=403, detail="No tienes acceso a los datos de esta usuaria")
            target_id = id_usuaria

    return db.query(RegistroSintoma).filter(
        RegistroSintoma.id_usuaria == target_id,
        RegistroSintoma.fecha == fecha
    ).all()

@router.delete("/registros-sintomas/{id_registro}", status_code=204)
def eliminar_registro_sintoma(id_registro: UUID, db: Session = Depends(get_db),
                               current_user: Usuaria = Depends(get_current_user)):
    registro = db.query(RegistroSintoma).filter(
        RegistroSintoma.id_registro == id_registro,
        RegistroSintoma.id_usuaria == current_user.id_usuaria
    ).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(registro)
    db.commit()

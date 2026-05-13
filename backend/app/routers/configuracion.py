from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria
from app.schemas.schemas import ConfiguracionUpdate, ConfiguracionOut
from app.routers.auth_utils import get_current_user

router = APIRouter(prefix="/configuracion", tags=["Configuración"])


@router.get("/", response_model=ConfiguracionOut)
def obtener_configuracion(db: Session = Depends(get_db),
                          current_user: Usuaria = Depends(get_current_user)):
    config = db.query(ConfiguracionUsuaria)\
               .filter(ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria)\
               .first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return config


@router.put("/", response_model=ConfiguracionOut)
def actualizar_configuracion(datos: ConfiguracionUpdate,
                              db: Session = Depends(get_db),
                              current_user: Usuaria = Depends(get_current_user)):
    config = db.query(ConfiguracionUsuaria)\
               .filter(ConfiguracionUsuaria.id_usuaria == current_user.id_usuaria)\
               .first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")

    for campo, valor in datos.model_dump(exclude_unset=True).items():
        if campo == "codigo_pareja":
            current_user.codigo_pareja = valor
        else:
            setattr(config, campo, valor)
    db.commit()
    db.refresh(config)
    return config

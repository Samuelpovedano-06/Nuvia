from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.models.models import Usuaria, ConfiguracionUsuaria
from app.schemas.schemas import UsuariaCreate, UsuariaLogin, UsuariaOut, Token
from app.routers.auth_utils import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/registro", response_model=UsuariaOut, status_code=201)
def registrar_usuaria(datos: UsuariaCreate, db: Session = Depends(get_db)):
    """Registra una nueva usuaria y crea su configuración por defecto."""

    # Comprobar si el email ya existe
    existente = db.query(Usuaria).filter(Usuaria.email == datos.email).first()
    if existente:
        raise HTTPException(status_code=400, detail="El email ya está registrado")

    nueva = Usuaria(
        nombre        = datos.nombre,
        email         = datos.email,
        password_hash = hash_password(datos.password),
    )
    db.add(nueva)
    db.flush()  # obtener id_usuaria antes del commit

    # Crear configuración por defecto
    config = ConfiguracionUsuaria(id_usuaria=nueva.id_usuaria)
    db.add(config)
    db.commit()
    db.refresh(nueva)
    return nueva


@router.post("/login", response_model=Token)
def login(datos: UsuariaLogin, db: Session = Depends(get_db)):
    """Devuelve un JWT si las credenciales son correctas."""

    usuaria = db.query(Usuaria).filter(Usuaria.email == datos.email).first()
    if not usuaria or not verify_password(datos.password, usuaria.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    token = create_access_token(data={"sub": str(usuaria.id_usuaria)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UsuariaOut)
def get_me(db: Session = Depends(get_db),
           current_user: Usuaria = Depends(__import__("app.routers.auth_utils", fromlist=["get_current_user"]).get_current_user)):
    """Devuelve los datos de la usuaria autenticada."""
    return current_user

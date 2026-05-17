"""Genera un par de claves VAPID para Web Push.

Uso (desde la carpeta backend):
    pip install py-vapid
    python scripts/generar_vapid.py

Imprime las claves base64 url-safe listas para pegar en .env:
    VAPID_PUBLIC_KEY=...
    VAPID_PRIVATE_KEY=...
"""
import base64
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization


def _b64url(data: bytes) -> str:
    """base64 url-safe sin padding (formato que pide Web Push)."""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def main():
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    # Clave privada: 32 bytes raw (formato Web Push)
    priv_bytes = private_key.private_numbers().private_value.to_bytes(32, "big")

    # Clave pública: 65 bytes en formato uncompressed (0x04 + X + Y)
    pub_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint,
    )

    print()
    print("==================  CLAVES VAPID GENERADAS  ==================")
    print()
    print("Pega esto al final de backend/.env :")
    print()
    print(f"VAPID_PUBLIC_KEY={_b64url(pub_bytes)}")
    print(f"VAPID_PRIVATE_KEY={_b64url(priv_bytes)}")
    print(f"VAPID_CLAIM_EMAIL=mailto:samuelpovedano06@gmail.com")
    print()
    print("===============================================================")
    print()
    print("Después reinicia el backend. Las claves SON SECRETAS — no las publiques.")


if __name__ == "__main__":
    main()

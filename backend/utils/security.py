"""Credential encryption helpers (Fernet symmetric)."""
import base64
import os
from cryptography.fernet import Fernet

from config import config


def _key() -> bytes:
    if config.FERNET_KEY:
        return config.FERNET_KEY.encode()
    # Derive a stable dev key from SECRET_KEY (NOT for production)
    raw = (config.SECRET_KEY * 4).encode()[:32]
    return base64.urlsafe_b64encode(raw)


def encrypt(value: str) -> str:
    if not value:
        return ""
    return Fernet(_key()).encrypt(value.encode()).decode()


def decrypt(token: str) -> str:
    if not token:
        return ""
    return Fernet(_key()).decrypt(token.encode()).decode()


def generate_fernet_key() -> str:
    """Helper for ops: returns a new Fernet key as base64 string."""
    return Fernet.generate_key().decode()


def mask(secret: str, keep: int = 4) -> str:
    if not secret:
        return ""
    return "*" * max(0, len(secret) - keep) + secret[-keep:]


# CLI: python -m utils.security
if __name__ == "__main__":
    print(generate_fernet_key())
    _ = os

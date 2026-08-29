import hashlib
import secrets
from typing import Optional, Tuple


def hash_password(password: str, salt: Optional[str] = None) -> Tuple[str, str]:
    if salt is None:
        salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 100_000).hex()
    return salt, digest


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    _, digest = hash_password(password, salt)
    return secrets.compare_digest(digest, expected_hash)


def new_token() -> str:
    return secrets.token_urlsafe(32)

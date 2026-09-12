import logging
import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

logger = logging.getLogger("uvicorn.error")

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    JWT_SECRET = "dev-secret-change-me"
    logger.warning(
        "JWT_SECRET is not set — using an insecure default. Set JWT_SECRET in backend/.env before deploying."
    )
JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_DAYS = 7


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def create_access_token(profile_id: int, role: str) -> str:
    payload = {
        "sub": str(profile_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

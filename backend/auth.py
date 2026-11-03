from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from datetime import datetime, timedelta, timezone
import os

from jose import jwt
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY is missing from .env")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)


def create_access_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(minutes=30)

    payload = {
        "sub": str(user_id),
        "exp": expires,
    }

    token = jwt.encode(
        payload,
        SECRET_KEY,
        algorithm="HS256",
    )

    print("DEBUG: Generated token type:", type(token))

    return token
def verify_access_token(token: str):
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("sub")

        if user_id is None:
            return None

        return int(user_id)

    except Exception:
        return None
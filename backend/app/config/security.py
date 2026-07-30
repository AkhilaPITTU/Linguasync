from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError

from app.config.settings import settings


# ==========================================
# PASSWORD HASHING
# ==========================================

def hash_password(password: str) -> str:
    """
    Hash a plain password using bcrypt.
    """

    salt = bcrypt.gensalt()

    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        salt
    )

    return hashed_password.decode("utf-8")


# ==========================================
# VERIFY PASSWORD
# ==========================================

def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:
    """
    Compare plain password with hashed password.
    """

    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ==========================================
# CREATE ACCESS TOKEN (JWT)
# ==========================================

def create_access_token(data: dict) -> str:
    """
    Create JWT access token.
    """

    payload = data.copy()

    expire = datetime.now(
        timezone.utc
    ) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload.update(
        {
            "exp": expire,
            "type": "access"
        }
    )

    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return token


# ==========================================
# VERIFY ACCESS TOKEN
# ==========================================

def verify_token(token: str):
    """
    Decode and verify JWT access token.
    """

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        if payload.get("type") != "access":
            return None

        return payload

    except JWTError:

        return None


# ==========================================
# GET USER ID FROM TOKEN
# ==========================================

def get_user_id(token: str):
    """
    Extract user_id from JWT.
    """

    payload = verify_token(token)

    if payload is None:
        return None

    return payload.get("user_id")


# ==========================================
# CREATE RESET PASSWORD TOKEN
# ==========================================

def create_reset_token(email: str) -> str:
    """
    Generate password reset token.
    Expires in 15 minutes.
    """

    expire = datetime.now(
        timezone.utc
    ) + timedelta(minutes=15)

    payload = {
        "sub": email,
        "exp": expire,
        "type": "reset"
    }

    token = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )

    return token


# ==========================================
# VERIFY RESET TOKEN
# ==========================================

def verify_reset_token(token: str):
    """
    Verify password reset token.
    """

    try:

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        if payload.get("type") != "reset":
            return None

        return payload.get("sub")

    except JWTError:

        return None
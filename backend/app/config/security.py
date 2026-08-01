from datetime import datetime, timedelta, timezone

import bcrypt
from jose import jwt, JWTError

from app.config.settings import settings


# ==========================================
# PASSWORD HASHING
# ==========================================

def hash_password(password: str) -> str:

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

    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


# ==========================================
# CREATE ACCESS TOKEN
# ==========================================

def create_access_token(data: dict) -> str:

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

    print("\n========== TOKEN CREATED ==========")
    print(token)
    print("===================================\n")

    return token


# ==========================================
# VERIFY ACCESS TOKEN
# ==========================================

def verify_token(token: str):

    try:

        print("\n========== VERIFY TOKEN ==========")
        print("Incoming Token:")
        print(token)
        print("----------------------------------")
        print("SECRET_KEY:")
        print(settings.SECRET_KEY)
        print("----------------------------------")
        print("ALGORITHM:")
        print(settings.ALGORITHM)

        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )

        print("----------------------------------")
        print("PAYLOAD:")
        print(payload)
        print("==================================\n")

        if payload.get("type") != "access":
            print("Invalid token type")
            return None

        return payload

    except JWTError as e:

        print("\n========== JWT ERROR ==========")
        print(type(e).__name__)
        print(str(e))
        print("===============================\n")

        return None

    except Exception as e:

        print("\n========== UNKNOWN ERROR ==========")
        print(type(e).__name__)
        print(str(e))
        print("===================================\n")

        return None


# ==========================================
# GET USER ID
# ==========================================

def get_user_id(token: str):

    payload = verify_token(token)

    if payload is None:
        return None

    return payload.get("user_id")


# ==========================================
# RESET TOKEN
# ==========================================

def create_reset_token(email: str) -> str:

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
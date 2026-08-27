from dotenv import load_dotenv
import os

load_dotenv()


def _parse_allowed_origins(raw_value, fallback):

    origins = [
        origin.strip()
        for origin in raw_value.split(",")
        if origin.strip()
    ]

    if origins:
        return origins

    return [fallback] if fallback else []


class Settings:

    # ==========================
    # Database
    # ==========================

    MONGODB_URL = os.getenv("MONGODB_URL")

    DATABASE_NAME = os.getenv("DATABASE_NAME")

    # ==========================
    # JWT
    # ==========================

    SECRET_KEY = os.getenv("SECRET_KEY")

    ALGORITHM = os.getenv("ALGORITHM", "HS256")

    ACCESS_TOKEN_EXPIRE_MINUTES = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    # ==========================
    # Server
    # ==========================

    HOST = os.getenv("HOST", "0.0.0.0")

    PORT = int(os.getenv("PORT", "8000"))

    # "development" or "production". Controls Uvicorn's auto-reload
    # in run.py; everything else defaults exactly as before.
    ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

    # ==========================
    # Frontend
    # ==========================

    FRONTEND_URL = os.getenv("FRONTEND_URL")

    # Comma-separated list of allowed CORS origins for production
    # frontend domain(s), e.g. "https://app.example.com,https://example.com".
    # Falls back to FRONTEND_URL alone when unset, so local dev and the
    # existing LAN allow_origin_regex below are unaffected.
    ALLOWED_ORIGINS = _parse_allowed_origins(
        os.getenv("ALLOWED_ORIGINS", ""),
        FRONTEND_URL,
    )

    # ==========================
    # Mail
    # ==========================

    MAIL_USERNAME = os.getenv("MAIL_USERNAME")

    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")

    MAIL_FROM = os.getenv("MAIL_FROM")

    MAIL_PORT = int(os.getenv("MAIL_PORT", "587"))

    MAIL_SERVER = os.getenv("MAIL_SERVER")

    MAIL_STARTTLS = (
        os.getenv("MAIL_STARTTLS", "True").lower() == "true"
    )

    MAIL_SSL_TLS = (
        os.getenv("MAIL_SSL_TLS", "False").lower() == "true"
    )

    # ==========================
    # Upload Paths
    # ==========================

    UPLOAD_FOLDER = os.getenv(
        "UPLOAD_FOLDER",
        "uploads"
    )

    TRANSCRIPT_EXPORT_FOLDER = os.getenv(
        "TRANSCRIPT_EXPORT_FOLDER",
        "transcript_exports"
    )

    PDF_UNICODE_FONT_PATH = os.getenv(
        "PDF_UNICODE_FONT_PATH",
        r"C:\Windows\Fonts\Nirmala.ttc",
    )


settings = Settings()

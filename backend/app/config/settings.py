from dotenv import load_dotenv
import os

load_dotenv()


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
    # Frontend
    # ==========================

    FRONTEND_URL = os.getenv("FRONTEND_URL")

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


settings = Settings()
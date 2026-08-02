from fastapi_mail import (
    FastMail,
    MessageSchema,
    ConnectionConfig,
    MessageType
)

from app.config.settings import settings


conf = ConnectionConfig(

    MAIL_USERNAME=settings.MAIL_USERNAME,

    MAIL_PASSWORD=settings.MAIL_PASSWORD,

    MAIL_FROM=settings.MAIL_FROM,

    MAIL_PORT=settings.MAIL_PORT,

    MAIL_SERVER=settings.MAIL_SERVER,

    MAIL_STARTTLS=settings.MAIL_STARTTLS,

    MAIL_SSL_TLS=settings.MAIL_SSL_TLS,

    USE_CREDENTIALS=True,

    VALIDATE_CERTS=True

)


async def send_reset_email(
    email: str,
    token: str
):

    reset_link = (
        f"{settings.FRONTEND_URL}/reset-password?token={token}"
    )

    html = f"""
    <html>
    <body style="font-family:Arial">

    <h2>LINGUASYNC Password Reset</h2>

    <p>Hello,</p>

    <p>We received a request to reset your password.</p>

    <p>
        <a href="{reset_link}"
           style="
           background:#6C63FF;
           color:white;
           padding:12px 22px;
           text-decoration:none;
           border-radius:8px;">
           Reset Password
        </a>
    </p>

    <p>Or copy this link:</p>

    <p>{reset_link}</p>

    <p>This link expires in <strong>15 minutes</strong>.</p>

    <p>
        Regards,<br>
        <strong>LINGUASYNC Team</strong>
    </p>

    </body>
    </html>
    """

    message = MessageSchema(

        subject="LINGUASYNC Password Reset",

        recipients=[email],

        body=html,

        subtype=MessageType.html

    )

    try:

        fm = FastMail(conf)

        await fm.send_message(message)

        return True

    except Exception as e:

        print(f"Email Error: {e}")

        return False
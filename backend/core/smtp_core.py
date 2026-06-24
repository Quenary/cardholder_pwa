import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid

from fastapi import HTTPException, status

from backend.config import Config


class EmailSender:
    _LOGGER = logging.getLogger(__name__)

    @classmethod
    def status(cls) -> bool:
        """Check minimum configuration of client. True is valid"""
        return all([Config.SMTP_SERVER, Config.SMTP_PORT, Config.SMTP_FROM_EMAIL])

    @classmethod
    def send_email(cls, to_email: str, subject: str, body: str) -> None:
        if Config.SMTP_DISABLED:
            message = "SMTP is disabled in environment variables, but the application tried to send email."
            cls._LOGGER.error(message)
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                detail=message,
            )

        if not cls.status():
            message = "SMTP configuration is incomplete. You need to set at least 'SMTP_SERVER', 'SMTP_PORT', 'SMTP_FROM_EMAIL' environment variables."
            cls._LOGGER.error(message)
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=message)

        msg = MIMEMultipart()
        msg["From"] = Config.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain=Config.SMTP_FROM_EMAIL.split("@")[-1])
        msg["Precedence"] = "bulk"
        msg["Auto-Submitted"] = "auto-generated"
        msg.attach(MIMEText(body, "plain", "utf-8"))

        try:
            server_context: smtplib.SMTP_SSL | smtplib.SMTP
            if Config.SMTP_ENCRYPTION == "TLS":
                server_context = smtplib.SMTP_SSL(
                    Config.SMTP_SERVER, Config.SMTP_PORT, timeout=Config.SMTP_TIMEOUT
                )
            else:
                server_context = smtplib.SMTP(
                    Config.SMTP_SERVER, Config.SMTP_PORT, timeout=Config.SMTP_TIMEOUT
                )

            with server_context as server:
                if Config.SMTP_ENCRYPTION == "STARTTLS":
                    server.starttls()

                if Config.SMTP_USERNAME and Config.SMTP_PASSWORD:
                    server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)

                server.send_message(msg)
        except Exception as e:
            cls._LOGGER.exception("Failed to send email")
            raise HTTPException(
                status_code=500, detail=f"Failed to send email {e}"
            ) from e

    @classmethod
    def send_password_reset_email(
        cls, to_email: str, code: str, reset_url: str | None = None
    ) -> None:
        """Send password reset email to user"""

        subject = "Password Reset Request"

        body = """
Hello from your Cardholder PWA App!
You have requested to reset your password.
"""

        if reset_url:
            body += f"""
Please click on the following link to do so:  
🔗 **<a href="{reset_url}" style="color: #0066cc;">Reset Password</a>**  
*(or enter this code on the recovery page: `{code}`)*  
"""
        else:
            body += f"""
Your verification code is:  
**`{code}`**  
"""

        body += """
If you did not request this, please ignore this email.
"""

        cls.send_email(to_email, subject, body)

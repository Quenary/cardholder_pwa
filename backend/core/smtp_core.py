import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr, formatdate, make_msgid

from fastapi import HTTPException, status

from backend.config import Config


class EmailSender:
    _LOGGER = logging.getLogger(__name__)

    @classmethod
    def status(cls) -> bool:
        """Check minimum configuration of client. True is valid"""
        return all([Config.SMTP_SERVER, Config.SMTP_PORT, Config.SMTP_FROM_EMAIL])

    @classmethod
    def send_email(
        cls, to_email: str, subject: str, body: str, html_body: str | None = None
    ) -> None:
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

        msg = MIMEMultipart("alternative")
        # formataddr encodes the display name safely, and Config.SMTP_FROM_EMAIL
        # itself stays a bare address, which the Message-ID domain below relies on.
        msg["From"] = (
            formataddr((Config.SMTP_FROM_NAME, Config.SMTP_FROM_EMAIL))
            if Config.SMTP_FROM_NAME
            else Config.SMTP_FROM_EMAIL
        )
        msg["To"] = to_email
        msg["Subject"] = subject
        msg["Date"] = formatdate(localtime=True)
        msg["Message-ID"] = make_msgid(domain=Config.SMTP_FROM_EMAIL.split("@")[-1])
        msg["Precedence"] = "bulk"
        msg["Auto-Submitted"] = "auto-generated"
        # Plain text first, HTML second: RFC 2046 has clients prefer the last
        # alternative they understand, so this order makes HTML-capable clients
        # render the rich version while plain-text clients still get something
        # readable.
        msg.attach(MIMEText(body, "plain", "utf-8"))
        if html_body:
            msg.attach(MIMEText(html_body, "html", "utf-8"))

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
        """Send password reset email to user.

        A plain-text body is always sent — some clients only render that part,
        and it must stand on its own. An HTML alternative is sent alongside it
        so the reset link is an actual clickable link rather than raw markup,
        which the plain-text-only version used to send verbatim.
        """

        subject = "Password Reset Request"

        body = "Hello from your Cardholder PWA App!\nYou have requested to reset your password.\n"
        html = (
            "<p>Hello from your Cardholder PWA App!<br>"
            "You have requested to reset your password.</p>"
        )

        if reset_url:
            body += (
                f"\nPlease follow this link to do so:\n{reset_url}\n"
                f"\n(or enter this code on the recovery page: {code})\n"
            )
            html += (
                "<p>Please click the button below to do so:</p>"
                f'<p><a href="{reset_url}" '
                'style="display:inline-block;padding:10px 18px;background:#0066cc;'
                'color:#ffffff;text-decoration:none;border-radius:4px;">'
                "Reset Password</a></p>"
                f"<p>Or enter this code on the recovery page: <code>{code}</code></p>"
            )
        else:
            body += f"\nYour verification code is: {code}\n"
            html += f"<p>Your verification code is: <code>{code}</code></p>"

        body += "\nIf you did not request this, please ignore this email.\n"
        html += "<p>If you did not request this, please ignore this email.</p>"

        cls.send_email(to_email, subject, body, html)

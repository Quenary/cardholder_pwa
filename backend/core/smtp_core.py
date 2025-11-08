import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from backend.config import Config
import logging


class EmailSender:
    @classmethod
    def status(cls) -> bool:
        """Check minimum configuration of client. True is valid"""
        return all([Config.SMTP_SERVER, Config.SMTP_PORT, Config.SMTP_FROM_EMAIL])

    @classmethod
    def send_email(cls, to_email: str, subject: str, body: str) -> bool:
        if not cls.status():
            msg = "SMTP configuration is incomplete. You need to set at least 'SMTP_SERVER', 'SMTP_PORT', 'SMTP_FROM_EMAIL' environment variables."
            logging.error(msg)
            return False

        if Config.SMTP_DISABLED:
            msg = "SMTP is disabled in environment variables, but the application tried to send email."
            logging.error(msg)
            return False

        msg = MIMEMultipart()
        msg["From"] = Config.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT) as server:
            try:
                if Config.SMTP_USE_TLS:
                    server.starttls()

                if Config.SMTP_USERNAME and Config.SMTP_PASSWORD:
                    server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)

                server.send_message(msg)
            except smtplib.SMTPResponseException as e:
                logging.error(e.strerror)
                return False
        return True

    @classmethod
    def send_password_reset_email(
        cls, to_email: str, code: str, reset_url: Optional[str] = None
    ) -> bool:
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

        return cls.send_email(to_email, subject, body)

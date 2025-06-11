import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from app.config import Config


class EmailSender:
    def __init__(self):
        pass

    def send_email(self, to_email: str, subject: str, body: str) -> bool:
        if not all([Config.SMTP_SERVER, Config.SMTP_PORT, Config.SMTP_FROM_EMAIL]):
            raise ValueError("SMTP configuration is incomplete")

        msg = MIMEMultipart()
        msg["From"] = Config.SMTP_FROM_EMAIL
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with smtplib.SMTP(Config.SMTP_SERVER, Config.SMTP_PORT) as server:
            if Config.SMTP_USE_TLS:
                server.starttls()

            if Config.SMTP_USERNAME and Config.SMTP_PASSWORD:
                server.login(Config.SMTP_USERNAME, Config.SMTP_PASSWORD)

            server.send_message(msg)
        return True

    def send_password_reset_email(
        self, to_email: str, code: str, reset_url: Optional[str] = None
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

        return self.send_email(to_email, subject, body)

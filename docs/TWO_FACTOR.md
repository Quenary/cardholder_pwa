# Two-factor authentication

Optional second step at sign-in: an authenticator app (TOTP) and one-time recovery codes. Users can turn it on only when `MASTER_KEY` is set. See [Encryption](./ENCRYPTION.md).

## Turn on

On the user page, choose **Enable 2FA**. The app shows a QR code and the secret. After the authenticator app has the secret, confirm with the account password and a 6-digit code.

The app then shows ten recovery codes, once. Each code works a single time. Copy or download them before leaving the screen. They are not shown again.

## Sign in

After the password, sign-in asks for a 6-digit code or a recovery code. A recovery code is consumed when it is accepted. A code that was just accepted is not accepted again.

Several wrong codes in a row lock sign-in for that account for a short time.

## Change or turn off

While two-factor authentication is on, the user page offers:

- **Regenerate recovery codes.** Password plus a current code. The previous codes stop working, and the new set is shown once.
- **Disable.** Password plus a current authenticator code or a recovery code.

## Reset from the admin page

An admin or the owner can clear another user's two-factor authentication from that user's dialog. The reset does not need a working `MASTER_KEY`. Who can reset whom is in [Account roles](./ROLES.md).

If the owner loses the authenticator and every recovery code, the only recovery is SQL on the database:

```sql
UPDATE users SET two_factor_secret = NULL, two_factor_enabled_at = NULL, two_factor_last_step = NULL, two_factor_failed_attempts = 0, two_factor_locked_until = NULL WHERE username = '<name>';
DELETE FROM two_factor_recovery_codes WHERE user_id = (SELECT id FROM users WHERE username = '<name>');
```

What a changed or lost `MASTER_KEY` does is in [Encryption](./ENCRYPTION.md).

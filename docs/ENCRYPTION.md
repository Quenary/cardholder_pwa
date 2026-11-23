# Encryption

`MASTER_KEY` seals secrets stored at rest. Today it is used only for two-factor authentication: the TOTP secret and the key that HMACs recovery codes. See [Two-factor authentication](./TWO_FACTOR.md).

## MASTER_KEY

Generate one with `openssl rand -base64 32` and keep a copy somewhere other than the database backup. Without it, users cannot turn 2FA on.

The key is separate from `JWT_SECRET_KEY`. An unset JWT secret is random on every start. `MASTER_KEY` is not.

Changing or losing `MASTER_KEY` makes existing 2FA secrets and recovery codes unusable. An admin resets those users from the admin page. For the owner, the reset is the SQL in [Two-factor authentication](./TWO_FACTOR.md). That reset does not need a working key.

## Key rotation

Rotating the key is not supported yet. Stored ciphertext keeps a `v1:` prefix so a later tool can tell versions apart.

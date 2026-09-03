# Security policy

Cardholder PWA is a **self-hosted** app for loyalty and discount cards. It
supports several users on one instance (owner, admin, member) and optional
password recovery by email. It is distributed as-is and is not a public
multi-tenant SaaS. Please read this page before opening a security advisory.

## Threat model

- The instance is run by a household, family, or other **small trusted group**.
  The operator is expected to keep the host, reverse proxy, and database volume
  under their control.
- Users are **not** all equally privileged:
  - **Member** — own cards only
  - **Admin** — app settings, delete member accounts
  - **Owner** — the same as admin, plus assigning admin/member roles. The first
    registered account after a fresh deploy becomes owner; that role cannot be
    reassigned in the UI
- A user's loyalty cards (barcodes, numbers, logos) are **private to that
  user** by default, unless explicitly shared with specific accounts via the
  shared cards feature. Even when shared:
  - Recipients receive **read-only** access (barcode and logo); they cannot
    modify, delete, or re-share the card.
  - Owner and admin roles do not grant access to another user's unshared cards.
  - Deleting an account (and its cards) is an intended admin/owner action.
- Registration can be turned off in settings. Password recovery depends on
  SMTP; without it, that path is simply unavailable.

Reports are judged against this model, not against a public multi-tenant SaaS.
Cross-user isolation and privilege boundaries **are** security boundaries here.

## In scope

- Unauthenticated access to cards, accounts, or privileged API
- Authentication / authorization bypass
- Privilege escalation (member → admin/owner, admin → owner)
- One user reading another user's unshared cards, or modifying/deleting any card
  they do not own
- Secret leakage to unauthenticated callers (tokens, recovery codes, SMTP
  credentials, JWT secret)
- Password-recovery flaws that let an attacker reset someone else's password
  without mailbox access
- Issues that affect an operator who did **not** opt into a risky setting

## Out of scope

These are not treated as vulnerabilities (and will not be accepted as High):

- Access to the Docker host, the data volume, or environment variables
  (`JWT_SECRET_KEY`, SMTP password, database URL)
- An admin or owner deleting members, changing `ALLOW_REGISTRATION`, or
  otherwise using documented admin UI
- Password recovery being unavailable when SMTP is unset or `SMTP_DISABLED` is
  true
- Default cookie / HTTPS / proxy setup that the operator can tighten
- Weak user-chosen passwords
- Self-XSS, or a user uploading a logo that only affects their own card
- Issues that exist only because the instance was left on HTTP, or registration
  was left open on a public URL after the first owner account was created

## Known limitations

### Password-reset links and `PUBLIC_URL`

Reset emails include a link. When `PUBLIC_URL` is set, that value is used.
When it is not, the link is built from the incoming request's `Host` header,
which a client can set if they can reach the app directly (for example on the
LAN, bypassing the reverse proxy). Set `PUBLIC_URL` to the public HTTPS origin
whenever the app is reachable by more than one hostname. See [.env.example](../.env.example).

### First user is owner

Registration is enabled by default. The first account created on a new instance
becomes owner. On a network-exposed deploy, create that account promptly and
turn registration off if you do not want more sign-ups.

### JWT secret

If `JWT_SECRET_KEY` is unset, a secret is generated at process start. Access
tokens then become invalid on every container restart; refresh tokens in the
database stay valid. Set a stable secret in production.

### Logos

Uploaded logos are size-capped, SVG is rasterised in a child process with a
timeout, and the result is re-encoded to WebP before it is stored. The original
bytes are never served back.

### Shared cards

Card sharing allows granting read-only access to specific user accounts. Only
the card owner can grant, modify, or revoke sharing rules. Recipients can remove
a shared card from their own view at any time, but cannot alter the underlying
card or its sharing permissions.

## Severity

CVSS will be scored against this threat model.

- Cross-user card access and auth/recovery bypass are treated as High
- Privilege escalation across owner / admin / member is in scope
- **PR:H** when only an authenticated owner or admin can trigger the issue
  *and* the impact is something that role is already meant to do
- Compromising the host or volume is outside the app's threat model

## Reporting

Please report privately (GitHub Security Advisory), not as a public issue.

Include a realistic exploit path under this threat model: who is
authenticated (anonymous / member / admin / owner), which setting they
control, and what they gain **beyond** what that role is already allowed to do.

Thanks for taking the time to read this first.

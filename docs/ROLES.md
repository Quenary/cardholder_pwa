# Account roles

Every account is an **owner**, an **admin**, or a **member**.

The first account registered on a new instance, including after the migration from version 0.0.13, becomes the owner. That account cannot be deleted. The owner role cannot be given to another account or taken away.

Registration is on until an admin or the owner turns it off. That switch is the only app setting on the admin page.

## What each role can do

| Action | Member | Admin | Owner |
| --- | --- | --- | --- |
| Own cards, profile, and two-factor authentication | yes | yes | yes |
| Admin page: user list, health, SMTP status | | yes | yes |
| Turn registration on or off | | yes | yes |
| Send an SMTP test email to their own address | | yes | yes |
| Delete a member, and that member's cards | | yes | yes |
| Reset a member's two-factor authentication | | yes | yes |
| Promote a member to admin, or demote an admin to member | | | yes |
| Delete an admin, and that admin's cards | | | yes |
| Reset an admin's two-factor authentication | | | yes |

An admin or the owner cannot delete their own account from the admin page, and cannot reset their own two-factor authentication there. The owner's two-factor authentication cannot be reset from the admin page. If the owner loses the authenticator and every recovery code, the recovery is the SQL in [Two-factor authentication](./TWO_FACTOR.md).

A role does not open another user's cards. Cards stay with their owner until that owner shares them. See [Shared cards](./SHARED_CARDS.md).

from enum import StrEnum


class ECardShareStatus(StrEnum):
    """What the recipient decided about a share.

    A share starts as pending. Only an accepted one puts the card in the
    recipient's list, and a declined one stays on record so that the owner
    sharing the card again does not bring it back.
    """

    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"

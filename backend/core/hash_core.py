import hashlib


def hash_token(token: str) -> str:
    """What the database stores for a high-entropy random token: a sha256, so
    a copy of the database (a backup, a leaked volume) holds nothing anyone
    can use. A fast hash is enough for 256 random bits; there is nothing to
    brute-force."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

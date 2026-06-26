from enum import StrEnum


class ESettingKey(StrEnum):
    """
    Enum of app settings keys.
    It is helper, do not use for validation.
    """

    ALLOW_REGISTRATION = "ALLOW_REGISTRATION"


class ESettingType(StrEnum):
    """
    Enum of app settings types.
    It is helper, do not use for validation.
    """

    BOOL = "bool"
    FLOAT = "float"
    INT = "int"
    STR = "str"

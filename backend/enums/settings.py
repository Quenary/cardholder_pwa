from enum import Enum


class ESettingKey(str, Enum):
    """
    Enum of app settings keys.
    It is helper, do not use for validation.
    """

    ALLOW_REGISTRATION = "ALLOW_REGISTRATION"


class ESettingType(str, Enum):
    """
    Enum of app settings types.
    It is helper, do not use for validation.
    """

    BOOL = "bool"
    FLOAT = "float"
    INT = "int"
    STR = "str"

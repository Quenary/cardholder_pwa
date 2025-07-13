/**
 * Enum of app local storage keys
 */
export enum ELocalStorageKey {
  TOKEN_RESPONSE = 'cardholder-token-response',
  USER = 'cardholder-user',
  /**
   * This is key of app version string.
   * Used to display changelog dialog on startup/reload,
   * if version changed.
   */
  VERSION = 'cardholder-version',
  /**
   * Flag indicationg that app loaded after an update.
   */
  AFTER_UPDATE = 'cardholder-after-update',
  /**
   * Last sorting model
   */
  CARD_SORTING = 'cardholder-card-sorting',
  /**
   * Last filters model
   */
  CARD_FILTERS = 'cardholder-card-filters',
  /**
   * Wether to invert code colors by default
   */
  CODE_COLOR_INVERSION = 'cardholder-code-color-inversion',
}
/**
 * Enum of useful regexp
 */
export const ERegexp = {
  login: /^[a-zA-Z0-9_]{4,32}$/,
  /**
   * At least 8 chars
   * 1 upper case char
   * 1 lower case char
   * 1 num
   */
  password: /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}/,
  /**
   * Hex color string
   */
  color: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
};

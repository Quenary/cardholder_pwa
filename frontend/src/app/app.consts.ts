/**
 * Enum of app local storage keys
 */
export enum ELocalStorageKey {
  TOKEN_RESPONSE = 'cardholder-token-response',
  USER = 'cardholder-user',
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

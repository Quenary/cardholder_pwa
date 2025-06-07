/**
 * Enum of app local storage keys
 */
export enum ELocalStorageKey {
  TOKEN_RESPONSE = 'cardholder-token-response',
}
/**
 * Enum of useful regexp
 */
export const ERegexp = {
  login: /^[a-zA-Z0-9]{4,}$/,
  /**
   * At least
   * 1 char
   * 1 num
   * 1 spec
   */
  password: /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/,
};

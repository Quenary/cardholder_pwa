export interface IVersion {
  image_version: string;
}

export enum EPublicSettingKey {
  ALLOW_REGISTRATION = 'ALLOW_REGISTRATION',
  SMTP_DISABLED = 'SMTP_DISABLED',
  TWO_FACTOR_AVAILABLE = 'TWO_FACTOR_AVAILABLE',
}
export interface TPublicSettingValueType {
  [EPublicSettingKey.ALLOW_REGISTRATION]: boolean;
  [EPublicSettingKey.SMTP_DISABLED]: boolean;
  [EPublicSettingKey.TWO_FACTOR_AVAILABLE]: boolean;
  [K: string]: unknown;
}
export interface IPublicSettingsItem<
  T extends EPublicSettingKey | string = string,
  R extends TPublicSettingValueType[T] = TPublicSettingValueType[T],
> {
  key: T;
  value: R;
}

export interface IVersion {
  image_version: string;
}

export enum EPublicSettingKey {
  ALLOW_REGISTRATION = 'ALLOW_REGISTRATION',
  SMTP_DISABLED = 'SMTP_DISABLED',
}
export type TPublicSettingValueType = {
  [EPublicSettingKey.ALLOW_REGISTRATION]: boolean;
  [EPublicSettingKey.SMTP_DISABLED]: boolean;
  [K: string]: unknown;
};
export interface IPublicSettingsItem<
  T extends EPublicSettingKey | string = string,
  R extends TPublicSettingValueType[T] = TPublicSettingValueType[T],
> {
  key: T;
  value: R;
}

export interface IVersion {
  image_version: string;
}

export enum EPublicSettingKey {
  ALLOW_REGISTRATION = 'ALLOW_REGISTRATION'
}
export type TPublicSettingValueType = {
  [EPublicSettingKey.ALLOW_REGISTRATION]: boolean;
  [K: string]: unknown;
};
export interface IPublicSettingsItem<
  T extends EPublicSettingKey | string = string,
  R extends TPublicSettingValueType[T] = TPublicSettingValueType[T],
> {
  key: T;
  value: R;
}

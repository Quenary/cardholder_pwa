export enum ESettingValueType {
  BOOL = 'bool',
  FLOAT = 'float',
  INT = 'int',
  STR = 'str',
}
export interface ISetting {
  key: string;
  value: boolean | number | string;
  value_type: ESettingValueType;
  updated_at: string;
}
export interface ISettingUpdate {
  key: string;
  value: boolean | number | string;
}

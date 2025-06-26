import { createSelector } from '@ngrx/store';
import { IAppState } from './app.reducers';
import {
  EPublicSettingKey,
  IPublicSettingsItem,
  TPublicSettingValueType,
} from '../entities/public/public-interface';

const _selectApp = (state) => state.app as IAppState;
export const selectAppIsOnline = createSelector(
  _selectApp,
  (state) => state.isOnline,
);
export const selectAppIsOffline = createSelector(
  _selectApp,
  (state) => !state.isOnline,
);
const _selectAppSettingValue = <K extends EPublicSettingKey>(
  settings: IPublicSettingsItem[],
  key: K,
  defaultValue: TPublicSettingValueType[K] = null,
): TPublicSettingValueType[K] => {
  const item = settings.find(
    (item) => item.key === key,
  ) as IPublicSettingsItem<K>;
  return item?.value ?? defaultValue;
};
export const selectAppAllowRegistration = createSelector(_selectApp, (state) =>
  _selectAppSettingValue(
    state.settings,
    EPublicSettingKey.ALLOW_REGISTRATION,
    true,
  ),
);
export const selectAppSmtpDisabled = createSelector(_selectApp, (state) =>
  _selectAppSettingValue(
    state.settings,
    EPublicSettingKey.SMTP_DISABLED,
    false,
  ),
);

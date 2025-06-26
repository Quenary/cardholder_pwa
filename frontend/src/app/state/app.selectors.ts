import { createSelector } from '@ngrx/store';
import { IAppState } from './app.reducers';
import {
  EPublicSettingKey,
  IPublicSettingsItem,
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
export const selectAppAllowRegistration = createSelector(
  _selectApp,
  (state) => {
    const item = state.settings.find(
      (item) => item.key === EPublicSettingKey.ALLOW_REGISTRATION,
    ) as IPublicSettingsItem<EPublicSettingKey.ALLOW_REGISTRATION>;
    return item?.value ?? false;
  },
);

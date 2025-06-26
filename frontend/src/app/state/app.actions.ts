import {
  NoNewVersionDetectedEvent,
  UnrecoverableStateEvent,
  VersionDetectedEvent,
  VersionInstallationFailedEvent,
  VersionReadyEvent,
} from '@angular/service-worker';
import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { IPublicSettingsItem } from '../entities/public/public-interface';
import { HttpErrorResponse } from '@angular/common/http';

export const AppActions = createActionGroup({
  source: 'APP',
  events: {
    init: emptyProps(),
    getPublicSettings: emptyProps(),
    getPublicSettingsSuccess: props<{ settings: IPublicSettingsItem[] }>(),
    getPublicSettingsError: props<{ error: HttpErrorResponse }>(),
    networkOnline: emptyProps(),
    networkOffline: emptyProps(),
    versionDetected: props<{ event: VersionDetectedEvent }>(),
    versionInstallationFailed: props<{
      event: VersionInstallationFailedEvent;
    }>(),
    versionReady: props<{ event: VersionReadyEvent }>(),
    noNewVersionDetected: props<{ event: NoNewVersionDetectedEvent }>(),
    unrecoverable: props<{ event: UnrecoverableStateEvent }>(),
  },
});

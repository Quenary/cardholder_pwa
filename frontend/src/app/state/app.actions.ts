import {
  NoNewVersionDetectedEvent,
  UnrecoverableStateEvent,
  VersionDetectedEvent,
  VersionInstallationFailedEvent,
  VersionReadyEvent,
} from '@angular/service-worker';
import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const AppActions = createActionGroup({
  source: 'APP',
  events: {
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

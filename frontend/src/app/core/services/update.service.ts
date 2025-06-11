import { ApplicationRef, inject, Injectable } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { Store } from '@ngrx/store';
import { concat, first, interval, Subject, takeUntil } from 'rxjs';
import { AppActions } from 'src/app/state/app.actions';

/**
 * Service that maps service worker events to ngrx actions
 */
@Injectable({
  providedIn: 'root',
})
export class UpdateService {
  private readonly swUpdate = inject(SwUpdate);
  private readonly store = inject(Store);
  private readonly applicationRef = inject(ApplicationRef);
  private readonly init$ = new Subject<void>();

  public init(): void {
    this.init$.next();

    this.swUpdate.versionUpdates
      .pipe(takeUntil(this.init$))
      .subscribe((event) => {
        switch (event.type) {
          case 'VERSION_DETECTED': {
            this.store.dispatch(AppActions.versionDetected({ event }));
            break;
          }
          case 'VERSION_INSTALLATION_FAILED': {
            this.store.dispatch(
              AppActions.versionInstallationFailed({ event })
            );
            break;
          }
          case 'VERSION_READY': {
            this.store.dispatch(AppActions.versionReady({ event }));
            break;
          }
          case 'NO_NEW_VERSION_DETECTED': {
            this.store.dispatch(AppActions.noNewVersionDetected({ event }));
            break;
          }
        }
      });

    const appIsStable$ = this.applicationRef.isStable.pipe(
      first((isStable) => isStable === true)
    );
    const checkInterval$ = interval(6 * 60 * 60 * 1000);
    concat(appIsStable$, checkInterval$)
      .pipe(takeUntil(this.init$))
      .subscribe(async () => {
        try {
          const updateFound = await this.swUpdate.checkForUpdate();

          console.log(
            updateFound
              ? 'A new version is available.'
              : 'Already on the latest version.'
          );
        } catch (err) {
          console.error('Failed to check for updates:', err);
        }
      });

    this.swUpdate.unrecoverable
      .pipe(takeUntil(this.init$))
      .subscribe((event) => {
        this.store.dispatch(AppActions.unrecoverable({ event }));
      });
  }
}

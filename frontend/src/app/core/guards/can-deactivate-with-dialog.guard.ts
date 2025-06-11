import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MaybeAsync } from '@angular/router';
import {
  first,
  forkJoin,
  from,
  isObservable,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

export const canDeactivateWithDialogGuard = (
  hasChanges: MaybeAsync<boolean>[]
): Observable<boolean> => {
  const matDialog = inject(MatDialog);
  const asyncHasChanges: Observable<boolean>[] = hasChanges.map((item) => {
    if (isObservable(item)) {
      return item.pipe(first());
    } else if (item instanceof Promise) {
      return from(item);
    } else {
      return of(item);
    }
  });
  return forkJoin(asyncHasChanges).pipe(
    switchMap((hasChanges) => {
      if (hasChanges.some((item) => item)) {
        return matDialog.open(ConfirmDialogComponent).afterClosed();
      }
      return of(true);
    })
  );
};

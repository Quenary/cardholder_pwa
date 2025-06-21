import { AsyncPipe, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogContent,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  switchMap,
  finalize,
  EMPTY,
  BehaviorSubject,
  tap,
  Observable,
} from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import { selectUserIsOwner } from 'src/app/entities/user/state/user.selectors';
import { EUserRole, IUser } from 'src/app/entities/user/user-interface';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { NaiveDatePipe } from 'src/app/shared/pipes/naive-date.pipe';

export interface IAdminUserDialogData {
  user: IUser;
}

@Component({
  selector: 'app-admin-user-dialog',
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogContent,
    MatDialogTitle,
    TranslateModule,
    FormsModule,
    AsyncPipe,
    MatListModule,
    DatePipe,
    MatIcon,
    NaiveDatePipe,
  ],
  templateUrl: './admin-user-dialog.component.html',
  styleUrl: './admin-user-dialog.component.scss',
})
export class AdminUserDialogComponent {
  private readonly adminApiService = inject(AdminApiService);
  private readonly snackService = inject(SnackService);
  private readonly matDialog = inject(MatDialog);
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly data: IAdminUserDialogData = inject(MAT_DIALOG_DATA);
  private readonly translateService = inject(TranslateService);
  private readonly store = inject(Store);

  public readonly isOwner$: Observable<boolean> =
    this.store.select(selectUserIsOwner);
  public readonly EUserRole = EUserRole;
  public readonly rolesTranslates =
    this.translateService.instant('ADMIN.USERS.ROLES');
  public user = this.data.user;
  public readonly isLoading$ = new BehaviorSubject<boolean>(false);

  public deleteUser(): void {
    this.matDialog
      .open(ConfirmDialogComponent, {
        data: <IConfirmDialogData>{
          addCheckbox: true,
          title: 'GENERAL.DELETE_WARN',
          subtitle: 'USER.DELETE_WARN',
        },
        minHeight: '220px',
      })
      .afterClosed()
      .pipe(
        switchMap((res) => {
          if (res) {
            this.isLoading$.next(true);
            return this.adminApiService.deleteUser(this.user.id).pipe(
              tap(() => {
                this.close();
              }),
              finalize(() => {
                this.isLoading$.next(false);
              })
            );
          }
          return EMPTY;
        })
      )
      .subscribe({
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }

  public changeUserRole(role: EUserRole): void {
    const title = 'ADMIN.USERS.CHANGE_ROLE.CONFIRM';
    const subtitle = this.translateService.instant(
      'ADMIN.USERS.CHANGE_ROLE.CONFIRM_SUBTITLE',
      { role: this.rolesTranslates[role] }
    );
    this.matDialog
      .open(ConfirmDialogComponent, {
        data: <IConfirmDialogData>{
          addCheckbox: true,
          title,
          subtitle,
        },
        minHeight: '220px',
      })
      .afterClosed()
      .pipe(
        switchMap((res) => {
          if (res) {
            this.isLoading$.next(true);
            return this.adminApiService
              .changeUserRole(this.data.user.id, role)
              .pipe(
                tap(() => {
                  this.close();
                }),
                finalize(() => {
                  this.isLoading$.next(false);
                })
              );
          }
          return EMPTY;
        })
      )
      .subscribe({
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }

  public close(): void {
    this.matDialogRef.close();
  }
}

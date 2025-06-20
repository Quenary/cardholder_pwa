import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, EMPTY, finalize, switchMap } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import { IUser } from 'src/app/entities/user/user-interface';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-admin-users',
  imports: [MatTableModule, AsyncPipe, TranslateModule, MatIconButton, MatIcon],
  templateUrl: './admin-users.component.html',
  styleUrl: './admin-users.component.scss',
})
export class AdminUsersComponent {
  private readonly adminApiService = inject(AdminApiService);
  private readonly snackService = inject(SnackService);
  private readonly matDialog = inject(MatDialog);

  public readonly displayedColumns = [
    'id',
    'username',
    'email',
    'role_code',
    'delete_user',
  ];
  public readonly isLoading$ = new BehaviorSubject<boolean>(false);
  public readonly users$ = new BehaviorSubject<IUser[]>([]);

  ngOnInit(): void {
    this.getUsers();
  }

  private getUsers(): void {
    this.isLoading$.next(true);
    this.adminApiService
      .usersList()
      .pipe(
        finalize(() => {
          this.isLoading$.next(false);
        })
      )
      .subscribe({
        next: (list) => {
          this.users$.next(list);
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }

  public deleteUser(user: IUser): void {
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
            return this.adminApiService.deleteUser(user.id).pipe(
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
}

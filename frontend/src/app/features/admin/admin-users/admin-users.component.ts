import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, finalize } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { AdminApiService } from 'src/app/entities/admin/admin-api.service';
import { IUser } from 'src/app/entities/user/user-interface';
import type { IAdminUserDialogData } from '../admin-user-dialog/admin-user-dialog.component';

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
  private readonly translateService = inject(TranslateService);

  public readonly rolesTranslates =
    this.translateService.instant('ADMIN.USERS.ROLES');
  public readonly displayedColumns = ['username', 'role_code', 'open_user'];
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

  public openUserDialog(user: IUser): void {
    import('../admin-user-dialog/admin-user-dialog.component').then((c) => {
      this.matDialog
        .open(c.AdminUserDialogComponent, {
          data: <IAdminUserDialogData>{
            user,
          },
          width: 'calc(100% - 50px)',
          height: 'calc(100% - 50px)',
        })
        .afterClosed()
        .subscribe({
          complete: () => {
            this.getUsers();
          },
        });
    });
  }
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserApiService } from 'src/app/entities/user/user-api.service';
import { IUserCreate } from 'src/app/entities/user/user-interface';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { UserFormComponent } from '../user-form/user-form.component';

@Component({
  selector: 'app-register',
  imports: [
    MatIcon,
    MatButton,
    TranslateModule,
    MatProgressSpinner,
    RouterLink,
    UserFormComponent,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly matSnackBar = inject(MatSnackBar);
  private readonly translateService = inject(TranslateService);

  public isLoading: boolean = false;

  onSubmit(form: IUserCreate): void {
    this.userApiService
      .create(form)
      .pipe(
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.matSnackBar.open(
            this.translateService.instant('REGISTER.SUCCESS'),
            this.translateService.instant('GENERAL.CLOSE'),
            { duration: 5000 }
          );
          this.router.navigate(['/auth']);
        },
        error: (error: HttpErrorResponse) => {
          this.matSnackBar.open(
            `${this.translateService.instant('GENERAL.REQUEST_ERROR')} ${
              error.message
            }`,
            this.translateService.instant('GENERAL.CLOSE'),
            { duration: 10000 }
          );
        },
      });
  }
}

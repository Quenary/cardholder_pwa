import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatFormField, MatLabel } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, finalize } from 'rxjs';
import { PasswordRecoveryApiService } from 'src/app/entities/password-recovery/password-recovery-api.service';
import { IPasswordRecoveryCode } from 'src/app/entities/password-recovery/password-recovery-interface';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';

@Component({
  selector: 'app-password-recovery-request',
  imports: [
    MatButton,
    RouterLink,
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    ReactiveFormsModule,
    TranslateModule,
    MatProgressSpinner,
    AsyncPipe,
  ],
  templateUrl: './password-recovery-request.component.html',
  styleUrl: './password-recovery-request.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoveryRequestComponent {
  private readonly passwordRecoveryApiService = inject(
    PasswordRecoveryApiService
  );
  private readonly matSnackBar = inject(MatSnackBar);
  private readonly translateServie = inject(TranslateService);
  private readonly router = inject(Router);

  public readonly isLoading$ = new BehaviorSubject<boolean>(false);
  public readonly form = new FormGroup<TInterfaceToForm<IPasswordRecoveryCode>>(
    {
      email: new FormControl<string>(null, [
        Validators.required,
        Validators.email,
      ]),
    }
  );

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const body = this.form.getRawValue();
    this.isLoading$.next(true);
    this.passwordRecoveryApiService
      .code(body)
      .pipe(
        finalize(() => {
          this.isLoading$.next(false);
        })
      )
      .subscribe({
        next: () => {
          this.matSnackBar.open(
            this.translateServie.instant('PASSWORD_RECOVERY.SENT'),
            this.translateServie.instant('GENERAL.CLOSE'),
            { duration: 10000 }
          );
          this.router.navigate(['/auth']);
        },
        error: (error: HttpErrorResponse) => {
          this.matSnackBar.open(
            `${this.translateServie.instant('GENERAL.REQUEST_ERROR')}: ${
              error.message
            }`,
            this.translateServie.instant('GENERAL.CLOSE'),
            { duration: 10000 }
          );
        },
      });
  }
}

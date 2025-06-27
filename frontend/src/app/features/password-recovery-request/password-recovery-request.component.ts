import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
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
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
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
  ],
  templateUrl: './password-recovery-request.component.html',
  styleUrl: './password-recovery-request.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoveryRequestComponent {
  private readonly passwordRecoveryApiService = inject(
    PasswordRecoveryApiService,
  );
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly snackService = inject(SnackService);

  public readonly isLoading = signal(false);
  public readonly form = new FormGroup<TInterfaceToForm<IPasswordRecoveryCode>>(
    {
      email: new FormControl<string>(null, [
        Validators.required,
        Validators.email,
      ]),
    },
  );

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const body = this.form.getRawValue();
    this.isLoading.set(true);
    this.passwordRecoveryApiService
      .code(body)
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.snackService.success(
            this.translateService.instant('PASSWORD_RECOVERY.SENT'),
          );
          this.router.navigate(['/auth']);
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }
}

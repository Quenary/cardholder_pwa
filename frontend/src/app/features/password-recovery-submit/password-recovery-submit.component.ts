import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
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
import {
  MatInput,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize, first } from 'rxjs';
import { ERegexp } from 'src/app/app.consts';
import { SnackService } from 'src/app/core/services/snack.service';
import { PasswordRecoveryApiService } from 'src/app/entities/password-recovery/password-recovery-api.service';
import { IPasswordRecoverySubmit } from 'src/app/entities/password-recovery/password-recovery-interface';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { passwordMatchValidator } from 'src/app/shared/validators/passwords-match.validator';

@Component({
  selector: 'app-password-recovery-submit',
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
    MatSuffix,
  ],
  templateUrl: './password-recovery-submit.component.html',
  styleUrl: './password-recovery-submit.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PasswordRecoverySubmitComponent implements OnInit {
  private readonly passwordRecoveryApiService = inject(
    PasswordRecoveryApiService,
  );
  private readonly translateService = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackService = inject(SnackService);

  public readonly isLoading = signal(false);
  public readonly hidePassword = signal(true);
  public readonly hideConfirmPassword = signal(true);

  public readonly form = new FormGroup<
    TInterfaceToForm<IPasswordRecoverySubmit>
  >(
    {
      code: new FormControl<string>(null, [Validators.required]),
      password: new FormControl<string>(null, [
        Validators.required,
        Validators.pattern(ERegexp.password),
      ]),
      confirm_password: new FormControl<string>(null, [
        Validators.required,
        Validators.pattern(ERegexp.password),
      ]),
    },
    [passwordMatchValidator()],
  );

  ngOnInit(): void {
    this.activatedRoute.queryParams.pipe(first()).subscribe((params) => {
      if (params.code) {
        const code = this.form.controls.code;
        code.setValue(params.code);
        code.disable();
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.passwordRecoveryApiService
      .submit(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.snackService.success(
            this.translateService.instant('PASSWORD_RECOVERY.SUCCESS'),
          );
          this.router.navigate(['/auth']);
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }
}

import { Clipboard } from '@angular/cdk/clipboard';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import {
  MatError,
  MatFormField,
  MatInput,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { TwoFactorApiService } from 'src/app/entities/two-factor/two-factor-api.service';
import { ITwoFactorSetup } from 'src/app/entities/two-factor/two-factor-interface';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { QrCodeComponent } from 'src/app/shared/components/qr-code/qr-code.component';
import { TwoFactorRecoveryCodesComponent } from '../two-factor-recovery-codes/two-factor-recovery-codes.component';

/** The server strips spaces. An authenticator paste looks like "123 456". */
function sixDigitCode(control: AbstractControl): ValidationErrors | null {
  const compact = String(control.value ?? '').replace(/ /g, '');
  return /^\d{6}$/.test(compact) ? null : { pattern: true };
}

@Component({
  selector: 'app-two-factor-setup-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButton,
    MatIcon,
    MatFormField,
    MatLabel,
    MatInput,
    MatSuffix,
    MatError,
    MatProgressSpinner,
    TranslatePipe,
    QrCodeComponent,
    TwoFactorRecoveryCodesComponent,
  ],
  templateUrl: './two-factor-setup-dialog.component.html',
  styleUrl: './two-factor-setup-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorSetupDialogComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly api = inject(TwoFactorApiService);
  private readonly dialogRef = inject(MatDialogRef);
  private readonly clipboard = inject(Clipboard);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly setup = signal<ITwoFactorSetup | null>(null);
  protected readonly codes = signal<string[] | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly hidePassword = signal(true);
  protected readonly groupedSecret = computed(() =>
    (this.setup()?.secret ?? '').replace(/(.{4})/g, '$1 ').trim(),
  );

  protected readonly form = new FormGroup({
    password: new FormControl<string>(null, [Validators.required]),
    code: new FormControl<string>(null, [Validators.required, sixDigitCode]),
  });

  constructor() {
    effect(() => {
      const codes = this.codes();
      const loading = this.isLoading();
      untracked(() => {
        this.dialogRef.disableClose = loading || !!codes?.length;
      });
    });
  }

  ngOnInit(): void {
    this.isLoading.set(true);
    this.api
      .setup()
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (setup) => this.setup.set(setup),
        error: (error) => this.snackService.error(error),
      });
  }

  protected copySecret(): void {
    const secret = this.setup()?.secret;
    if (!secret) {
      return;
    }
    this.clipboard.copy(secret);
    this.snackService.success(
      this.translateService.instant('USER.TWO_FACTOR.COPIED'),
    );
  }

  protected enable(): void {
    if (this.form.invalid) {
      return;
    }
    this.isLoading.set(true);
    this.api
      .enable({
        password: this.form.controls.password.value,
        code: this.form.controls.code.value,
      })
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.codes.set(response.recovery_codes);
          this.snackService.success(
            this.translateService.instant('USER.TWO_FACTOR.ENABLE_SUCCESS'),
          );
          this.replaceSession(response.tokens);
        },
        error: (error) => this.snackService.error(error),
      });
  }

  private replaceSession(tokens: ITokenResponse | null): void {
    if (tokens) {
      this.store.dispatch(
        AuthActions.tokensReplaced({ tokenResponse: tokens }),
      );
    }
    this.store.dispatch(UserActions.read());
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected done(): void {
    this.dialogRef.close();
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import {
  MatFormField,
  MatInput,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';
import { SnackService } from 'src/app/core/services/snack.service';
import { ITokenResponse } from 'src/app/entities/auth/auth-interface';
import { AuthActions } from 'src/app/entities/auth/state/auth.actions';
import { TwoFactorApiService } from 'src/app/entities/two-factor/two-factor-api.service';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { TwoFactorRecoveryCodesComponent } from '../two-factor-recovery-codes/two-factor-recovery-codes.component';

export interface ITwoFactorConfirmDialogData {
  action: 'disable' | 'regenerate';
}

@Component({
  selector: 'app-two-factor-confirm-dialog',
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
    MatProgressSpinner,
    TranslatePipe,
    TwoFactorRecoveryCodesComponent,
  ],
  templateUrl: './two-factor-confirm-dialog.component.html',
  styleUrl: './two-factor-confirm-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TwoFactorConfirmDialogComponent {
  private readonly store = inject(Store);
  private readonly api = inject(TwoFactorApiService);
  private readonly dialogRef = inject(MatDialogRef);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly data =
    inject<ITwoFactorConfirmDialogData>(MAT_DIALOG_DATA);

  protected readonly codes = signal<string[] | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly hidePassword = signal(true);

  protected readonly form = new FormGroup({
    password: new FormControl<string>(null, [Validators.required]),
    code: new FormControl<string>(null, [Validators.required]),
  });

  constructor() {
    effect(() => {
      const codes = this.codes();
      const loading = this.isLoading();
      const action = this.data.action;
      untracked(() => {
        this.dialogRef.disableClose =
          loading || (action === 'regenerate' && !!codes?.length);
      });
    });
  }

  protected confirm(): void {
    if (this.form.invalid) {
      return;
    }
    const body = {
      password: this.form.controls.password.value,
      code: this.form.controls.code.value,
    };
    this.isLoading.set(true);
    if (this.data.action === 'disable') {
      this.api
        .disable(body)
        .pipe(
          finalize(() => this.isLoading.set(false)),
          takeUntilDestroyed(this.destroyRef),
        )
        .subscribe({
          next: (response) => {
            this.snackService.success(
              this.translateService.instant('USER.TWO_FACTOR.DISABLE_SUCCESS'),
            );
            this.replaceSession(response.tokens);
            this.dialogRef.close();
          },
          error: (error) => this.snackService.error(error),
        });
      return;
    }
    this.api
      .regenerateRecoveryCodes(body)
      .pipe(
        finalize(() => this.isLoading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (response) => {
          this.codes.set(response.recovery_codes);
          this.snackService.success(
            this.translateService.instant('USER.TWO_FACTOR.REGENERATE_SUCCESS'),
          );
        },
        error: (error) => this.snackService.error(error),
      });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected done(): void {
    this.dialogRef.close();
  }

  private replaceSession(tokens: ITokenResponse | null): void {
    if (tokens) {
      this.store.dispatch(
        AuthActions.tokensReplaced({ tokenResponse: tokens }),
      );
    }
    this.store.dispatch(UserActions.read());
  }
}

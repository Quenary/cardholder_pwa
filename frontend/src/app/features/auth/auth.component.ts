import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { MatInput } from '@angular/material/input';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatButton } from '@angular/material/button';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Store } from '@ngrx/store';
import { AuthActions } from '../../entities/auth/state/auth.actions';
import { TranslatePipe } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IOAuth2PasswordRequestForm } from 'src/app/entities/auth/auth-interface';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import {
  selectAuthIsLoading,
  selectAuthTwoFactorChallenge,
} from 'src/app/entities/auth/state/auth.selectors';
import { SnackService } from 'src/app/core/services/snack.service';
import { TranslateService } from '@ngx-translate/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import {
  selectAppAllowRegistration,
  selectAppSmtpDisabled,
} from 'src/app/state/app.selectors';
import { MatTooltip } from '@angular/material/tooltip';

@Component({
  selector: 'app-auth',
  imports: [
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    MatButton,
    ReactiveFormsModule,
    TranslatePipe,
    RouterLink,
    MatProgressSpinner,
    MatTooltip,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private readonly store = inject(Store);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);

  protected readonly isLoading = this.store.selectSignal(selectAuthIsLoading);
  protected readonly challenge = this.store.selectSignal(
    selectAuthTwoFactorChallenge,
  );
  protected readonly allowRegistration = this.store.selectSignal(
    selectAppAllowRegistration,
  );
  protected readonly smtpDisabled = this.store.selectSignal(
    selectAppSmtpDisabled,
  );
  protected readonly form = new FormGroup<
    TInterfaceToForm<Omit<IOAuth2PasswordRequestForm, 'grant_type'>>
  >({
    username: new FormControl<string>(null, [Validators.required]),
    password: new FormControl<string>(null, [Validators.required]),
  });
  protected readonly codeForm = new FormGroup({
    code: new FormControl<string>(null, [Validators.required]),
  });
  private readonly codeInput =
    viewChild<ElementRef<HTMLInputElement>>('codeInput');

  constructor() {
    effect((onCleanup) => {
      const challenge = this.challenge();
      const input = this.codeInput();
      if (!challenge || !input) {
        return;
      }
      untracked(() => {
        this.form.controls.password.reset();
        input.nativeElement.focus();
      });
      const delay = Math.max(0, challenge.expiresAt - Date.now());
      const timer = setTimeout(() => {
        this.store.dispatch(AuthActions.tokenTwoFactorCancel());
        this.snackService.error(
          this.translateService.instant('AUTH.TWO_FACTOR.EXPIRED'),
        );
      }, delay);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected onSubmit(): void {
    const form = this.form.value;
    this.store.dispatch(
      AuthActions.token({
        body: {
          grant_type: 'password',
          username: form.username,
          password: form.password,
        },
      }),
    );
  }

  protected onVerify(): void {
    if (this.codeForm.invalid) {
      return;
    }
    this.store.dispatch(
      AuthActions.tokenTwoFactor({ code: this.codeForm.controls.code.value }),
    );
  }

  protected onBack(): void {
    this.codeForm.reset();
    this.store.dispatch(AuthActions.tokenTwoFactorCancel());
  }
}

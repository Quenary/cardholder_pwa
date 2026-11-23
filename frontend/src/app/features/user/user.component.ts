import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { IUserCreate, IUserUpdate } from 'src/app/entities/user/user-interface';
import {
  selectUserHasChanges,
  selectUserInfo,
  selectUserIsLoading,
  selectUserIsOwner,
} from 'src/app/entities/user/state/user.selectors';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ReactiveFormsModule,
  FormGroup,
  FormControl,
  Validators,
} from '@angular/forms';
import {
  MatInput,
  MatFormField,
  MatLabel,
  MatSuffix,
  MatError,
} from '@angular/material/input';
import { ERegexp } from 'src/app/app.consts';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { passwordMatchValidator } from 'src/app/shared/validators/passwords-match.validator';
import { PasswordsMatchErrorStateMatcher } from 'src/app/shared/validators/passwords-match.error-state-matcher';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { selectAppTwoFactorAvailable } from 'src/app/state/app.selectors';
import { TwoFactorSetupDialogComponent } from './two-factor-setup-dialog/two-factor-setup-dialog.component';
import {
  ITwoFactorConfirmDialogData,
  TwoFactorConfirmDialogComponent,
} from './two-factor-confirm-dialog/two-factor-confirm-dialog.component';

@Component({
  selector: 'app-user',
  imports: [
    MatIcon,
    MatButton,
    TranslatePipe,
    MatProgressSpinner,
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    ReactiveFormsModule,
    MatSuffix,
    MatError,
    MatCheckbox,
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserComponent implements OnInit {
  protected readonly passwordsMatchErrorStateMatcher =
    new PasswordsMatchErrorStateMatcher();
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly changeDetector = inject(ChangeDetectorRef);

  protected readonly isOwner = this.store.selectSignal(selectUserIsOwner);
  protected readonly isLoading = this.store.selectSignal(selectUserIsLoading);
  protected readonly userInfo = this.store.selectSignal(selectUserInfo);
  protected readonly twoFactorAvailable = this.store.selectSignal(
    selectAppTwoFactorAvailable,
  );
  protected readonly hasChanges = this.store.selectSignal(selectUserHasChanges);
  protected readonly hideCurrentPassword = signal(true);
  protected readonly hidePassword = signal(true);
  protected readonly hideConfirmPassword = signal(true);

  protected readonly form = new FormGroup<
    TInterfaceToForm<IUserCreate & IUserUpdate>
  >(
    {
      username: new FormControl<string>(null, [
        Validators.required,
        Validators.pattern(ERegexp.login),
      ]),
      password: new FormControl<string>({ value: null, disabled: true }, [
        Validators.pattern(ERegexp.password),
      ]),
      confirm_password: new FormControl<string>(
        { value: null, disabled: true },
        [Validators.pattern(ERegexp.password)],
      ),
      email: new FormControl<string>(null, [
        Validators.required,
        Validators.email,
      ]),
      current_password: new FormControl<string>({
        value: null,
        disabled: true,
      }),
    },
    passwordMatchValidator(),
  );

  /** Email as it is stored, to tell an actual change from a re-typed value. */
  private readonly storedEmail = signal<string>(null);

  /** The api asks for the current password when either of those changes. */
  protected readonly needsCurrentPassword = signal(false);

  private get value(): IUserUpdate {
    return this.form.value as IUserUpdate;
  }

  ngOnInit(): void {
    this.store.dispatch(UserActions.read());
    this.store
      .select(selectUserInfo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((info) => {
        this.storedEmail.set(info?.email ?? null);
        this.form.patchValue(info);
        this.changeDetector.markForCheck();
      });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.syncCurrentPassword();
        this.store.dispatch(UserActions.setForm({ form: this.value }));
      });
  }

  protected onChangePasswordCheck($event: MatCheckboxChange) {
    this.form.patchValue({
      password: null,
      confirm_password: null,
    });
    const password = this.form.controls.password;
    const confirm_password = this.form.controls.confirm_password;
    if ($event.checked) {
      password.enable();
      confirm_password.enable();
    } else {
      password.disable();
      confirm_password.disable();
    }
    this.syncCurrentPassword();
  }

  /**
   * Enables the current password field only when the api will ask for it,
   * so an unrelated edit such as the username stays a one field change.
   */
  private syncCurrentPassword(): void {
    const control = this.form.controls.current_password;
    const stored = this.storedEmail();
    const needed =
      this.form.controls.password.enabled ||
      (!!stored && this.form.controls.email.value !== stored);

    if (needed === this.needsCurrentPassword()) {
      return;
    }
    this.needsCurrentPassword.set(needed);

    if (needed) {
      control.setValidators([Validators.required]);
      control.enable({ emitEvent: false });
    } else {
      control.clearValidators();
      control.setValue(null, { emitEvent: false });
      control.disable({ emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.store.dispatch(UserActions.update({ body: this.value }));
  }

  protected onDelete(): void {
    this.store.dispatch(UserActions.deleteAttempt());
  }

  protected openTwoFactorSetup(): void {
    this.dialog.open(TwoFactorSetupDialogComponent, { width: '440px' });
  }

  protected openTwoFactorDisable(): void {
    this.dialog.open(TwoFactorConfirmDialogComponent, {
      width: '440px',
      data: { action: 'disable' } as ITwoFactorConfirmDialogData,
    });
  }

  protected openTwoFactorRegenerate(): void {
    this.dialog.open(TwoFactorConfirmDialogComponent, {
      width: '440px',
      data: { action: 'regenerate' } as ITwoFactorConfirmDialogData,
    });
  }
}

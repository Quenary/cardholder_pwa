import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
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
} from '@angular/material/input';
import { ERegexp } from 'src/app/app.consts';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { passwordMatchValidator } from 'src/app/shared/validators/passwords-match.validator';
import { MatCheckbox, MatCheckboxChange } from '@angular/material/checkbox';

@Component({
  selector: 'app-user',
  imports: [
    MatIcon,
    MatButton,
    TranslateModule,
    MatProgressSpinner,
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    ReactiveFormsModule,
    TranslateModule,
    MatSuffix,
    MatCheckbox,
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
})
export class UserComponent implements OnInit {
  private readonly store = inject(Store);
  private readonly destroyRef = inject(DestroyRef);

  private get value(): IUserUpdate {
    return this.form.value as IUserUpdate;
  }

  public readonly isOwner = this.store.selectSignal(selectUserIsOwner);
  public readonly isLoading = this.store.selectSignal(selectUserIsLoading);
  public readonly hasChanges = this.store.selectSignal(selectUserHasChanges);
  public readonly hidePassword = signal(true);
  public readonly hideConfirmPassword = signal(true);

  public readonly form = new FormGroup<
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
    },
    passwordMatchValidator(),
  );

  onChangePasswordCheck($event: MatCheckboxChange) {
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
  }

  ngOnInit(): void {
    this.store.dispatch(UserActions.read());
    this.store
      .select(selectUserInfo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((info) => {
        this.form.patchValue(info);
      });
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.store.dispatch(UserActions.setForm({ form: this.value }));
      });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.store.dispatch(UserActions.update({ body: this.value }));
  }

  onDelete(): void {
    this.store.dispatch(UserActions.deleteAttempt());
  }
}

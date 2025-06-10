import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import {
  ValidatorFn,
  AbstractControl,
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatIcon } from '@angular/material/icon';
import {
  MatInput,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { ERegexp } from 'src/app/app.consts';
import { IUserCreate, IUserUpdate } from 'src/app/entities/user/user-interface';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';

@Component({
  selector: 'app-user-form',
  imports: [
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    ReactiveFormsModule,
    TranslateModule,
    MatSuffix,
  ],
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
  @Input()
  set value(value: Partial<IUserCreate & IUserUpdate>) {
    this.form.patchValue(value);
  }
  @Input()
  set disabled(value: boolean) {
    if (value) {
      this.form.disable();
    } else {
      this.form.enable();
    }
  }
  @Output()
  readonly OnSubmit = new EventEmitter<IUserCreate & IUserUpdate>();

  public hidePassword: boolean = true;
  public hideConfirmPassword: boolean = true;
  private readonly confirmPasswordMatchValidator: ValidatorFn = (
    control: AbstractControl<string>
  ) => {
    if (!this.form) {
      return null;
    }
    const passwordControl = this.form.get('password');

    if (passwordControl) {
      return passwordControl.value !== control.value
        ? { confirmPasswordMatchValidator: true }
        : null;
    }
    return null;
  };
  public readonly form = new FormGroup<
    TInterfaceToForm<IUserCreate & IUserUpdate> & {
      confirmPassword: FormControl<string>;
    }
  >({
    username: new FormControl<string>(null, [
      Validators.required,
      Validators.pattern(ERegexp.login),
    ]),
    password: new FormControl<string>(null, [
      Validators.required,
      Validators.pattern(ERegexp.password),
    ]),
    confirmPassword: new FormControl<string>(null, [
      Validators.required,
      Validators.pattern(ERegexp.password),
      this.confirmPasswordMatchValidator.bind(this),
    ]),
    email: new FormControl<string>(null, [
      Validators.required,
      Validators.email,
    ]),
  });

  public onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    const { confirmPassword, ...form } = this.form.getRawValue();
    this.OnSubmit.emit(form);
  }
}

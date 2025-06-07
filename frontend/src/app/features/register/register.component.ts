import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
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
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ERegexp } from 'src/app/app.consts';
import { UserApiService } from 'src/app/entities/user/user-api.service';
import { IUsrCreate } from 'src/app/entities/user/user-interface';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { MatTooltip } from '@angular/material/tooltip';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-register',
  imports: [
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    MatButton,
    ReactiveFormsModule,
    TranslateModule,
    MatSuffix,
    MatTooltip,
    MatProgressSpinner,
    RouterLink,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly matStackBar = inject(MatSnackBar);
  private readonly translateService = inject(TranslateService);

  public isLoading: boolean = false;
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
    TInterfaceToForm<IUsrCreate> & { confirmPassword: FormControl<string> }
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

  onSubmit() {
    if (this.form.invalid) {
      return;
    }
    this.form.disable();
    this.isLoading = true;
    const values = this.form.getRawValue();
    this.userApiService
      .create(values)
      .pipe(
        finalize(() => {
          this.form.enable();
          this.isLoading = false;
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/auth']);
        },
        error: (error: HttpErrorResponse) => {
          this.matStackBar.open(
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

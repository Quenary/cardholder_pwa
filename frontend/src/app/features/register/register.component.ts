import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserApiService } from 'src/app/entities/user/user-api.service';
import { IUserCreate, IUserUpdate } from 'src/app/entities/user/user-interface';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { ERegexp } from 'src/app/app.consts';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { passwordMatchValidator } from 'src/app/shared/validators/passwords-match.validator';
import {
  MatInput,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { SnackService } from 'src/app/core/services/snack.service';

@Component({
  selector: 'app-register',
  imports: [
    MatIcon,
    MatButton,
    TranslateModule,
    MatProgressSpinner,
    RouterLink,
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    ReactiveFormsModule,
    TranslateModule,
    MatSuffix,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly translateService = inject(TranslateService);
  private readonly snackService = inject(SnackService);

  public readonly isLoading = signal(false);
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
      password: new FormControl<string>(null, [
        Validators.required,
        Validators.pattern(ERegexp.password),
      ]),
      confirm_password: new FormControl<string>(null, [
        Validators.required,
        Validators.pattern(ERegexp.password),
      ]),
      email: new FormControl<string>(null, [
        Validators.required,
        Validators.email,
      ]),
    },
    [passwordMatchValidator()],
  );

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading.set(true);
    this.userApiService
      .create(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isLoading.set(false);
        }),
      )
      .subscribe({
        next: () => {
          this.snackService.success(
            this.translateService.instant('REGISTER.SUCCESS'),
          );
          this.router.navigate(['/auth']);
        },
        error: (error) => {
          this.snackService.error(error);
        },
      });
  }
}

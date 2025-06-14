import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { UserApiService } from 'src/app/entities/user/user-api.service';
import { IUserCreate, IUserUpdate } from 'src/app/entities/user/user-interface';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { BehaviorSubject, finalize } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
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
import { AsyncPipe } from '@angular/common';

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
    AsyncPipe,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterComponent {
  private readonly userApiService = inject(UserApiService);
  private readonly router = inject(Router);
  private readonly matSnackBar = inject(MatSnackBar);
  private readonly translateService = inject(TranslateService);

  public readonly isLoading$ = new BehaviorSubject<boolean>(false);
  public hidePassword: boolean = true;
  public hideConfirmPassword: boolean = true;
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
    [passwordMatchValidator()]
  );

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }

    this.isLoading$.next(true);
    this.userApiService
      .create(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isLoading$.next(false);
        })
      )
      .subscribe({
        next: () => {
          this.matSnackBar.open(
            this.translateService.instant('REGISTER.SUCCESS'),
            this.translateService.instant('GENERAL.CLOSE'),
            { duration: 5000 }
          );
          this.router.navigate(['/auth']);
        },
        error: (error: HttpErrorResponse) => {
          this.matSnackBar.open(
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

import { AsyncPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, OnInit } from '@angular/core';
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
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, finalize, first } from 'rxjs';
import { ERegexp } from 'src/app/app.consts';
import { PasswordRecoveryApiService } from 'src/app/entities/password-recovery/password-recovery-api.service';
import { IPasswordRecoverySubmit } from 'src/app/entities/password-recovery/password-recovery-interface';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';

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
    AsyncPipe,
  ],
  templateUrl: './password-recovery-submit.component.html',
  styleUrl: './password-recovery-submit.component.scss',
})
export class PasswordRecoverySubmitComponent implements OnInit {
  private readonly passwordRecoveryApiService = inject(
    PasswordRecoveryApiService
  );
  private readonly matSnackBar = inject(MatSnackBar);
  private readonly translateServie = inject(TranslateService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  public readonly isLoading$ = new BehaviorSubject<boolean>(false);
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
    TInterfaceToForm<IPasswordRecoverySubmit>
  >({
    code: new FormControl<string>(null, [Validators.required]),
    password: new FormControl<string>(null, [
      Validators.required,
      Validators.pattern(ERegexp.password),
    ]),
    confirm_password: new FormControl<string>(null, [
      Validators.required,
      Validators.pattern(ERegexp.password),
      this.confirmPasswordMatchValidator.bind(this),
    ]),
  });

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

    this.isLoading$.next(true);
    this.passwordRecoveryApiService
      .submit(this.form.getRawValue())
      .pipe(
        finalize(() => {
          this.isLoading$.next(false);
        })
      )
      .subscribe({
        next: () => {
          this.router.navigate(['/auth']);
        },
        error: (error: HttpErrorResponse) => {
          this.matSnackBar.open(
            `${this.translateServie.instant('GENERAL.REQUEST_ERROR')}: ${
              error.message
            }`,
            this.translateServie.instant('GENERAL.CLOSE'),
            { duration: 10000 }
          );
        },
      });
  }
}

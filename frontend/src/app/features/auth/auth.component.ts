import { Component, inject } from '@angular/core';
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
import { TranslateModule } from '@ngx-translate/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IOAuth2PasswordRequestForm } from 'src/app/entities/auth/auth-interface';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';

@Component({
  selector: 'app-auth',
  imports: [
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    MatButton,
    ReactiveFormsModule,
    TranslateModule,
    RouterLink,
  ],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
  private readonly store = inject(Store);
  public readonly form = new FormGroup<
    TInterfaceToForm<Omit<IOAuth2PasswordRequestForm, 'grant_type'>>
  >({
    username: new FormControl<string>(null, [Validators.required]),
    password: new FormControl<string>(null, [Validators.required]),
  });
  public onSubmit(): void {
    const form = this.form.value;
    this.store.dispatch(
      AuthActions.token({
        body: {
          grant_type: 'password',
          username: form.username,
          password: form.password,
        },
      })
    );
  }
}

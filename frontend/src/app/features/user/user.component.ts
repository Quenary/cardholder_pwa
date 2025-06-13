import { Component, inject, OnInit } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { IUserUpdate } from 'src/app/entities/user/user-interface';
import { UserFormComponent } from '../user-form/user-form.component';
import {
  selectUserHasChanges,
  selectUserInfo,
  selectUserIsLoading,
} from 'src/app/entities/user/state/user.selectors';
import { UserActions } from 'src/app/entities/user/state/user.actions';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-user',
  imports: [
    MatIcon,
    MatButton,
    TranslateModule,
    MatProgressSpinner,
    UserFormComponent,
    AsyncPipe,
  ],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
})
export class UserComponent implements OnInit {
  private readonly store = inject(Store);
  public readonly isLoading$ = this.store.select(selectUserIsLoading);
  public readonly hasChanges$ = this.store.select(selectUserHasChanges);
  public readonly userInfo$ = this.store.select(selectUserInfo);

  ngOnInit(): void {
    this.store.dispatch(UserActions.read());
  }

  onValueChange(form: IUserUpdate) {
    this.store.dispatch(UserActions.setForm({ form }));
  }

  onSubmit($event: IUserUpdate): void {
    this.store.dispatch(UserActions.update({ body: $event }));
  }

  onDelete(): void {
    this.store.dispatch(UserActions.deleteAttempt());
  }
}

import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButton, MatFabButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatInput, MatFormField, MatLabel } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { IAppState } from 'src/app/app.state';
import { ICardBase } from 'src/app/entities/cards/cards-interface';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  selectCardsActiveHasChanges,
  selectCardsActiveInfo,
  selectCardsIsLoading,
} from 'src/app/entities/cards/state/cards.selectors';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-card',
  imports: [
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    MatButton,
    ReactiveFormsModule,
    TranslateModule,
    MatProgressSpinner,
    RouterLink,
    AsyncPipe,
    MatFabButton,
  ],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store<IAppState>);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  public readonly isLoading$ = this.store.select(selectCardsIsLoading);
  public readonly hasChanges$ = this.store.select(selectCardsActiveHasChanges);
  public readonly form = new FormGroup<TInterfaceToForm<ICardBase>>({
    code: new FormControl<string>(null, [Validators.required]),
    code_type: new FormControl<string>(null, [Validators.required]),
    name: new FormControl<string>(null, [Validators.required]),
    description: new FormControl<string>(null),
  });

  ngOnInit(): void {
    this.activatedRoute.params
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (params) => {
          const id = Number(params['id']) || null;
          if (typeof id === 'number') {
            this.store.dispatch(CardsActions.read({ id }));
          }
        },
      });
    this.store
      .select(selectCardsActiveInfo)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (info) => {
          this.form.reset();
          this.form.patchValue(info);
        },
      });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (form) => {
        this.store.dispatch(CardsActions.setForm({ form: form as ICardBase }));
      },
    });
  }

  ngOnDestroy(): void {
    this.store.dispatch(CardsActions.exitCard());
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    this.store.dispatch(CardsActions.saveCard());
  }

  public scanCode() {}
}

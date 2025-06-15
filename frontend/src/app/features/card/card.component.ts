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
import { MatButton, MatFabButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import {
  MatInput,
  MatFormField,
  MatLabel,
  MatSuffix,
} from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { TranslateModule } from '@ngx-translate/core';
import { ICardBase } from 'src/app/entities/cards/cards-interface';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  selectCardsActiveCanDelete,
  selectCardsActiveHasChanges,
  selectCardsActiveInfo,
  selectCardsIsLoading,
} from 'src/app/entities/cards/state/cards.selectors';
import { AsyncPipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import type { ICardScannerResult } from '../card-scanner/card-scanner.component';
import { CardCodeViewerComponent } from '../../shared/components/card-code-viewer/card-code-viewer.component';
import { EBarcodeFormat } from 'src/app/entities/cards/cards-const';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { map, Observable, startWith } from 'rxjs';
import { IsValidCardPipe } from 'src/app/shared/pipes/is-valid-card.pipe';
import { ERegexp } from 'src/app/app.consts';

@Component({
  selector: 'app-card',
  imports: [
    MatInput,
    MatIcon,
    MatFormField,
    MatLabel,
    MatButton,
    MatIconButton,
    ReactiveFormsModule,
    TranslateModule,
    MatProgressSpinner,
    RouterLink,
    AsyncPipe,
    MatFabButton,
    CardCodeViewerComponent,
    MatAutocomplete,
    MatOption,
    MatAutocompleteTrigger,
    IsValidCardPipe,
    MatSuffix,
  ],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly matDialog = inject(MatDialog);

  public readonly isLoading$ = this.store.select(selectCardsIsLoading);
  public readonly canDelete$ = this.store.select(selectCardsActiveCanDelete);
  public readonly hasChanges$ = this.store.select(selectCardsActiveHasChanges);
  public readonly form = new FormGroup<TInterfaceToForm<ICardBase>>({
    code: new FormControl<string>(null, [Validators.required]),
    code_type: new FormControl<string>(null, [Validators.required]),
    name: new FormControl<string>(null, [Validators.required]),
    description: new FormControl<string>(null),
    color: new FormControl<string>(null, [Validators.pattern(ERegexp.color)]),
  });
  private readonly codeTypeAutocompleteList: string[] =
    Object.values(EBarcodeFormat);
  public readonly codeTypeAutocompleteList$: Observable<string[]> =
    this.form.controls.code_type.valueChanges.pipe(
      startWith(null),
      map((value) => {
        if (!value) {
          return this.codeTypeAutocompleteList;
        }
        value = value.toUpperCase();
        return this.codeTypeAutocompleteList.filter((c) => c.includes(value));
      })
    );

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

  public onDelete(): void {
    this.store.dispatch(CardsActions.deleteAttempt());
  }

  public scanCode() {
    import('../card-scanner/card-scanner.component').then((c) => {
      this.matDialog
        .open(c.CardScannerComponent, {
          width: 'calc(100% - 50px)',
          height: 'calc(100% - 50px)',
        })
        .afterClosed()
        .subscribe({
          next: (res: ICardScannerResult) => {
            if (res) {
              this.form.patchValue({
                code: res.text,
                code_type: res.format,
              });
            }
          },
        });
    });
  }
}

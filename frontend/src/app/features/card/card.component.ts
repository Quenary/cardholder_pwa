import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  MatButton,
  MatFabButton,
  MatIconButton,
} from '@angular/material/button';
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
import { TranslatePipe } from '@ngx-translate/core';
import { ICardBase } from 'src/app/entities/cards/cards-interface';
import { CardsActions } from 'src/app/entities/cards/state/cards.actions';
import { TInterfaceToForm } from 'src/app/shared/types/interface-to-form';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  selectCardsActiveCanDelete,
  selectCardsActiveHasChanges,
  selectCardsActiveInfo,
  selectCardsIsLoading,
} from 'src/app/entities/cards/state/cards.selectors';
import { MatDialog } from '@angular/material/dialog';
import type { ICardScannerResult } from '../card-scanner/card-scanner.component';
import { CardCodeViewerComponent } from '../../shared/components/card-code-viewer/card-code-viewer.component';
import { EBwipBcid } from 'src/app/entities/cards/cards-const';
import {
  MatAutocomplete,
  MatAutocompleteTrigger,
  MatOption,
} from '@angular/material/autocomplete';
import { IsValidCardPipe } from 'src/app/shared/pipes/is-valid-card.pipe';
import { ERegexp } from 'src/app/app.consts';
import { IsOldCodeType } from 'src/app/shared/pipes/is-old-code-type.pipe';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Actions, ofType } from '@ngrx/effects';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';

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
    TranslatePipe,
    MatProgressSpinner,
    RouterLink,
    MatFabButton,
    CardCodeViewerComponent,
    MatAutocomplete,
    MatOption,
    MatAutocompleteTrigger,
    IsValidCardPipe,
    MatSuffix,
    IsOldCodeType,
  ],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss',
})
export class CardComponent implements OnInit, OnDestroy {
  private readonly store = inject(Store);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly matDialog = inject(MatDialog);
  private readonly domSanitizer = inject(DomSanitizer);
  private readonly actions$ = inject(Actions);
  private readonly cardsApiService = inject(CardApiService);

  protected readonly card = this.store.selectSignal(selectCardsActiveInfo);
  /** Local preview of the logo; the image itself never goes through the form. */
  protected readonly logoUrl = signal<SafeUrl | null>(null);
  protected readonly isLoading = this.store.selectSignal(selectCardsIsLoading);
  protected readonly canDelete = this.store.selectSignal(
    selectCardsActiveCanDelete,
  );
  protected readonly hasChanges = this.store.selectSignal(
    selectCardsActiveHasChanges,
  );
  protected readonly form = new FormGroup<TInterfaceToForm<ICardBase>>({
    code: new FormControl<string>(null, [Validators.required]),
    code_type: new FormControl<string>(null, [Validators.required]),
    name: new FormControl<string>(null, [Validators.required]),
    description: new FormControl<string>(null),
    color: new FormControl<string>(null, [Validators.pattern(ERegexp.color)]),
  });
  protected readonly codeTypeAutocompleteList = computed(() => {
    let codeType = this.codeType();
    if (!codeType) {
      return this._codeTypeAutocompleteList;
    }
    codeType = codeType.toLowerCase();
    return this._codeTypeAutocompleteList.filter((c) => c.includes(codeType));
  });

  private readonly _codeTypeAutocompleteList: string[] =
    Object.values(EBwipBcid);
  private readonly codeType = toSignal(
    this.form.controls.code_type.valueChanges,
    { initialValue: null },
  );
  /** Object URL currently held, kept so it can be revoked before being replaced. */
  private objectUrl: string | null = null;
  /** Card whose logo is already displayed, to avoid refetching on every save. */
  private loadedLogoCardId: number | null = null;

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
          this.syncLogo(info);
        },
      });
    // The upload happens outside the form, so the preview is refreshed from the
    // action stream rather than from the card in the store.
    this.actions$
      .pipe(
        ofType(CardsActions.setLogoSuccess, CardsActions.removeLogoSuccess),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (action) => {
          this.loadedLogoCardId = action.info.id;
          if (action.info.has_logo) {
            this.fetchLogo(action.info.id, action.info.updated_at);
          } else {
            this.setLogoPreview(null);
          }
        },
      });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (form) => {
        this.store.dispatch(CardsActions.setForm({ form: form as ICardBase }));
      },
    });
  }

  ngOnDestroy(): void {
    this.setLogoPreview(null);
    this.store.dispatch(CardsActions.exitCard());
  }

  protected onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset the input so picking the very same file again still fires `change`.
    input.value = '';
    const id = this.card()?.id;
    if (file && id) {
      this.store.dispatch(CardsActions.setLogo({ id, file }));
    }
  }

  protected onRemoveLogo(): void {
    const id = this.card()?.id;
    if (id) {
      this.store.dispatch(CardsActions.removeLogo({ id }));
    }
  }

  private syncLogo(
    info: { id?: number; has_logo?: boolean; updated_at?: string } | null,
  ): void {
    if (!info?.id) {
      this.loadedLogoCardId = null;
      this.setLogoPreview(null);
      return;
    }
    if (this.loadedLogoCardId === info.id) {
      return;
    }
    this.loadedLogoCardId = info.id;
    if (info.has_logo) {
      this.fetchLogo(info.id, info.updated_at);
    } else {
      this.setLogoPreview(null);
    }
  }

  private fetchLogo(id: number, updatedAt?: string): void {
    this.cardsApiService
      .getLogoBlob(id, updatedAt ?? '')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => this.setLogoPreview(blob),
        // A logo that cannot be loaded simply shows the placeholder.
        error: () => this.setLogoPreview(null),
      });
  }

  private setLogoPreview(blob: Blob | null): void {
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    if (!blob) {
      this.logoUrl.set(null);
      return;
    }
    this.objectUrl = URL.createObjectURL(blob);
    this.logoUrl.set(this.domSanitizer.bypassSecurityTrustUrl(this.objectUrl));
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    this.store.dispatch(CardsActions.saveCard());
  }

  protected onDelete(): void {
    this.store.dispatch(CardsActions.deleteAttempt());
  }

  protected scanCode() {
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

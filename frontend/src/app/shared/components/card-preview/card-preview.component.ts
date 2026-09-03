import { AsyncPipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { isValidCodeType } from 'src/app/entities/cards/cards-const';
import { ICard } from 'src/app/entities/cards/cards-interface';
import {
  CardCodeViewerComponent,
  CardCodeViewerDialogComponent,
} from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { CardLogoPipe } from 'src/app/shared/pipes/card-logo.pipe';
import { GetOnColorPipe } from 'src/app/shared/pipes/get-on-color.pipe';
import { IsValidCardPipe } from 'src/app/shared/pipes/is-valid-card.pipe';

@Component({
  selector: 'app-card-preview',
  imports: [
    AsyncPipe,
    MatIcon,
    CardLogoPipe,
    IsValidCardPipe,
    GetOnColorPipe,
    CardCodeViewerComponent,
  ],
  templateUrl: './card-preview.component.html',
  styleUrl: './card-preview.component.scss',
  host: {
    '[class.interactive]': 'interactive()',
    '[class.non-interactive]': '!interactive()',
    '[class.mini]': "size() === 'mini'",
    '[attr.role]': "interactive() ? 'button' : null",
    '[attr.tabindex]': 'interactive() ? 0 : null',
    '[attr.aria-label]': 'interactive() ? (card()?.name ?? null) : null',
    '(click)': 'handlePreviewClick($event)',
    '(keydown.enter)': 'handleKeydown($event)',
    '(keydown.space)': 'handleKeydown($event)',
  },
})
export class CardPreviewComponent {
  private readonly matDialog = inject(MatDialog);

  public readonly card = input<ICard | null | undefined>(null);
  public readonly size = input<'default' | 'mini'>('default');
  public readonly interactive = input<boolean>(false);
  public readonly scale = input<number>(3);

  public readonly previewClick = output<ICard>();

  protected handlePreviewClick(event: MouseEvent | Event): void {
    if (this.interactive()) {
      event.stopPropagation();
    }
    const card = this.card();
    if (!card) return;

    this.previewClick.emit(card);
    if (this.interactive() && card.has_logo) {
      this.openCodeDialog(card);
    }
  }

  protected handleKeydown(event: KeyboardEvent | Event): void {
    if (!this.interactive()) return;
    event.preventDefault();
    event.stopPropagation();
    const card = this.card();
    if (!card) return;

    this.previewClick.emit(card);
    if (card.has_logo || (card.code && isValidCodeType(card.code_type))) {
      this.openCodeDialog(card);
    }
  }

  private openCodeDialog(card: ICard): void {
    this.matDialog.open(CardCodeViewerDialogComponent, {
      width: 'calc(100% - 50px)',
      height: 'calc(100% - 50px)',
      data: {
        card,
        scale: 6,
      },
    });
  }
}

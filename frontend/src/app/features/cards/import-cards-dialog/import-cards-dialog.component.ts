import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { ICard, ICardBase } from 'src/app/entities/cards/cards-interface';
import { CardPreviewComponent } from 'src/app/shared/components/card-preview/card-preview.component';

export interface IImportCardsDialogData {
  cards: ICardBase[];
}

@Component({
  selector: 'app-import-cards-dialog',
  imports: [
    MatDialogModule,
    MatButtonModule,
    TranslatePipe,
    CardPreviewComponent,
  ],
  templateUrl: './import-cards-dialog.component.html',
  styleUrl: './import-cards-dialog.component.scss',
})
export class ImportCardsDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<ImportCardsDialogComponent>);
  protected readonly data: IImportCardsDialogData = inject(MAT_DIALOG_DATA);

  protected readonly cards = computed<ICard[]>(() =>
    this.data.cards.map((c, index) => ({
      ...c,
      id: index,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      has_logo: false,
    })),
  );

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}

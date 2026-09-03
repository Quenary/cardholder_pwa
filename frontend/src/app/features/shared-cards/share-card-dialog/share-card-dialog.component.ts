import { Component, computed, inject, resource } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { ICard } from 'src/app/entities/cards/cards-interface';
import { CardShareApiService } from '../services/card-share-api.service';
import { IShareUser } from '../shared-cards.interface';

export type ShareDialogMode = 'ADD_SINGLE' | 'EDIT_SINGLE' | 'SHARE_ALL';

export interface IShareCardDialogData {
  mode: ShareDialogMode;
  card?: ICard;
  sharedWithUserIds?: number[];
  availableCards?: ICard[];
}

export interface IShareCardDialogResult {
  cardId?: number;
  userIds: number[];
}

@Component({
  selector: 'app-share-card-dialog',
  imports: [
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    TranslatePipe,
  ],
  templateUrl: './share-card-dialog.component.html',
  styleUrl: './share-card-dialog.component.scss',
})
export class ShareCardDialogComponent {
  protected readonly data: IShareCardDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ShareCardDialogComponent>);
  private readonly apiService = inject(CardShareApiService);

  private readonly usersResource = resource({
    loader: () => firstValueFrom(this.apiService.getAvailableUsers()),
  });

  protected readonly availableUsers = computed<IShareUser[]>(() => {
    if (this.usersResource.error()) {
      return [];
    }
    return this.usersResource.value() ?? [];
  });
  protected readonly isLoadingUsers = this.usersResource.isLoading;

  protected readonly form = new FormGroup({
    cardId: new FormControl<number | null>(
      this.data.card?.id ?? null,
      this.data.mode === 'ADD_SINGLE' ? [Validators.required] : [],
    ),
    userIds: new FormControl<number[]>(this.data.sharedWithUserIds ?? [], [
      Validators.required,
      Validators.minLength(1),
    ]),
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.value;
    const result: IShareCardDialogResult = {
      cardId:
        this.data.mode === 'ADD_SINGLE' ? value.cardId! : this.data.card?.id,
      userIds: value.userIds ?? [],
    };
    this.dialogRef.close(result);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}

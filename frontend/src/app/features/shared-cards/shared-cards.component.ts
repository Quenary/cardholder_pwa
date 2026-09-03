import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, resource, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { TranslatePipe } from '@ngx-translate/core';
import { finalize, firstValueFrom } from 'rxjs';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { CardCodeViewerComponent } from 'src/app/shared/components/card-code-viewer/card-code-viewer.component';
import { CardLogoPipe } from 'src/app/shared/pipes/card-logo.pipe';
import { GetOnColorPipe } from 'src/app/shared/pipes/get-on-color.pipe';
import { IsValidCardPipe } from 'src/app/shared/pipes/is-valid-card.pipe';
import { CardShareApiService } from './services/card-share-api.service';
import {
  IShareCardDialogData,
  IShareCardDialogResult,
  ShareCardDialogComponent,
} from './share-card-dialog/share-card-dialog.component';
import { ISharedCardItem, ISharedWithMeItem } from './shared-cards.interface';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-shared-cards',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    TranslatePipe,
    CardCodeViewerComponent,
    CardLogoPipe,
    GetOnColorPipe,
    IsValidCardPipe,
    AsyncPipe,
  ],
  templateUrl: './shared-cards.component.html',
  styleUrl: './shared-cards.component.scss',
})
export class SharedCardsComponent {
  private readonly cardShareApiService = inject(CardShareApiService);
  private readonly cardApiService = inject(CardApiService);
  private readonly matDialog = inject(MatDialog);

  private readonly isMutating = signal<boolean>(false);

  protected readonly sharedCardsResource = resource({
    loader: () => firstValueFrom(this.cardShareApiService.getSharedCards()),
  });

  protected readonly myCardsResource = resource({
    loader: () => firstValueFrom(this.cardApiService.list()),
  });

  protected readonly youShare = computed<ISharedCardItem[]>(() => {
    if (this.sharedCardsResource.error()) {
      return [];
    }
    return this.sharedCardsResource.value()?.you_share ?? [];
  });
  protected readonly sharedWithYou = computed<ISharedWithMeItem[]>(() => {
    if (this.sharedCardsResource.error()) {
      return [];
    }
    return this.sharedCardsResource.value()?.shared_with_you ?? [];
  });
  protected readonly isLoading = computed(
    () => this.sharedCardsResource.isLoading() || this.isMutating(),
  );

  protected openShareSingleDialog(): void {
    const dialogData: IShareCardDialogData = {
      mode: 'ADD_SINGLE',
      availableCards: this.myCardsResource.error()
        ? []
        : (this.myCardsResource.value() ?? []),
    };

    this.matDialog
      .open(ShareCardDialogComponent, {
        data: dialogData,
        width: 'calc(100% - 40px)',
        maxWidth: '500px',
      })
      .afterClosed()
      .subscribe((result: IShareCardDialogResult | undefined) => {
        if (result?.cardId && result.userIds) {
          this.isMutating.set(true);
          this.cardShareApiService
            .shareCard({
              card_id: result.cardId,
              user_ids: result.userIds,
            })
            .pipe(finalize(() => this.isMutating.set(false)))
            .subscribe(() => {
              this.sharedCardsResource.reload();
            });
        }
      });
  }

  protected openShareAllDialog(): void {
    const dialogData: IShareCardDialogData = {
      mode: 'SHARE_ALL',
    };

    this.matDialog
      .open(ShareCardDialogComponent, {
        data: dialogData,
        width: 'calc(100% - 40px)',
        maxWidth: '500px',
      })
      .afterClosed()
      .subscribe((result: IShareCardDialogResult | undefined) => {
        if (result?.userIds) {
          this.isMutating.set(true);
          this.cardShareApiService
            .shareAllCards({
              user_ids: result.userIds,
            })
            .pipe(finalize(() => this.isMutating.set(false)))
            .subscribe(() => {
              this.sharedCardsResource.reload();
            });
        }
      });
  }

  protected openEditShareDialog(item: ISharedCardItem): void {
    const dialogData: IShareCardDialogData = {
      mode: 'EDIT_SINGLE',
      card: item.card,
      sharedWithUserIds: item.shared_with_users.map((u) => u.id),
    };

    this.matDialog
      .open(ShareCardDialogComponent, {
        data: dialogData,
        width: 'calc(100% - 40px)',
        maxWidth: '500px',
      })
      .afterClosed()
      .subscribe((result: IShareCardDialogResult | undefined) => {
        if (result?.userIds) {
          this.isMutating.set(true);
          this.cardShareApiService
            .updateCardShare(item.card.id, {
              user_ids: result.userIds,
            })
            .pipe(finalize(() => this.isMutating.set(false)))
            .subscribe(() => {
              this.sharedCardsResource.reload();
            });
        }
      });
  }

  protected deleteOwnShare(item: ISharedCardItem): void {
    const dialogData: IConfirmDialogData = {
      title: 'SHARED_CARDS.CONFIRM_DELETE_OWN.TITLE',
      subtitle: 'SHARED_CARDS.CONFIRM_DELETE_OWN.SUBTITLE',
      confirmText: 'GENERAL.DELETE',
    };

    this.matDialog
      .open(ConfirmDialogComponent, {
        data: dialogData,
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.isMutating.set(true);
          this.cardShareApiService
            .deleteCardShare(item.card.id)
            .pipe(finalize(() => this.isMutating.set(false)))
            .subscribe(() => {
              this.sharedCardsResource.reload();
            });
        }
      });
  }

  protected deleteSharedWithMe(item: ISharedWithMeItem): void {
    const dialogData: IConfirmDialogData = {
      title: 'SHARED_CARDS.CONFIRM_DELETE_SHARED.TITLE',
      subtitle: 'SHARED_CARDS.CONFIRM_DELETE_SHARED.SUBTITLE',
      confirmText: 'GENERAL.DELETE',
    };

    this.matDialog
      .open(ConfirmDialogComponent, {
        data: dialogData,
      })
      .afterClosed()
      .subscribe((confirmed: boolean) => {
        if (confirmed) {
          this.isMutating.set(true);
          this.cardShareApiService
            .deleteCardSharedWithMe(item.card.id)
            .pipe(finalize(() => this.isMutating.set(false)))
            .subscribe(() => {
              this.sharedCardsResource.reload();
            });
        }
      });
  }
}

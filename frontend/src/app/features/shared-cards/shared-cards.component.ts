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
import { CardShareApiService } from './services/card-share-api.service';
import { PendingSharesService } from './services/pending-shares.service';
import {
  IShareCardDialogData,
  IShareCardDialogResult,
  ShareCardDialogComponent,
} from './share-card-dialog/share-card-dialog.component';
import {
  ISharedCardItem,
  ISharedWithMeItem,
  TShareStatus,
} from './shared-cards.interface';
import {
  ConfirmDialogComponent,
  IConfirmDialogData,
} from 'src/app/shared/components/confirm-dialog/confirm-dialog.component';
import { CardPreviewComponent } from 'src/app/shared/components/card-preview/card-preview.component';

@Component({
  selector: 'app-shared-cards',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    TranslatePipe,
    CardPreviewComponent,
  ],
  templateUrl: './shared-cards.component.html',
  styleUrl: './shared-cards.component.scss',
})
export class SharedCardsComponent {
  private readonly cardShareApiService = inject(CardShareApiService);
  private readonly cardApiService = inject(CardApiService);
  private readonly matDialog = inject(MatDialog);
  private readonly pendingShares = inject(PendingSharesService);

  /**
   * Translation keys of what a recipient decided, for the owner's list.
   */
  protected readonly statusLabels: Record<TShareStatus, string> = {
    pending: 'SHARED_CARDS.STATUS.PENDING',
    accepted: 'SHARED_CARDS.STATUS.ACCEPTED',
    declined: 'SHARED_CARDS.STATUS.DECLINED',
  };

  private readonly isMutating = signal<boolean>(false);

  protected readonly sharedCardsResource = resource({
    loader: () => firstValueFrom(this.cardShareApiService.getSharedCards()),
  });

  protected readonly pendingResource = resource({
    loader: () =>
      firstValueFrom(this.cardShareApiService.getCardsSharedWithMe('pending')),
  });

  protected readonly declinedResource = resource({
    loader: () =>
      firstValueFrom(this.cardShareApiService.getCardsSharedWithMe('declined')),
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
  protected readonly pending = computed<ISharedWithMeItem[]>(() =>
    this.pendingResource.error() ? [] : (this.pendingResource.value() ?? []),
  );
  protected readonly declined = computed<ISharedWithMeItem[]>(() =>
    this.declinedResource.error() ? [] : (this.declinedResource.value() ?? []),
  );
  protected readonly isLoading = computed(
    () => this.sharedCardsResource.isLoading() || this.isMutating(),
  );

  /**
   * Accept or decline a share. Either one moves the card between the lists,
   * so all of them are read again, and so is the count on the navigation.
   */
  protected respond(
    item: ISharedWithMeItem,
    answer: Extract<TShareStatus, 'accepted' | 'declined'>,
  ): void {
    const request =
      answer === 'accepted'
        ? this.cardShareApiService.acceptCardSharedWithMe(item.card.id)
        : this.cardShareApiService.declineCardSharedWithMe(item.card.id);
    this.isMutating.set(true);
    request.pipe(finalize(() => this.isMutating.set(false))).subscribe(() => {
      this.reloadAll();
    });
  }

  private reloadAll(): void {
    this.sharedCardsResource.reload();
    this.pendingResource.reload();
    this.declinedResource.reload();
    this.pendingShares.refresh();
  }

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
              this.reloadAll();
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
              this.reloadAll();
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
              this.reloadAll();
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
              this.reloadAll();
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
              this.reloadAll();
            });
        }
      });
  }
}

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { PendingSharesService } from './services/pending-shares.service';
import { ISharedWithMeItem } from './shared-cards.interface';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { CardShareApiService } from './services/card-share-api.service';
import { SharedCardsComponent } from './shared-cards.component';

const shared = (
  id: number,
  status: ISharedWithMeItem['status'],
): ISharedWithMeItem =>
  ({
    card: { id, name: `card ${id}`, code: '1', code_type: 'ean13' },
    owner: { id: 9, username: 'alice' },
    status,
  }) as ISharedWithMeItem;

describe('SharedCardsComponent', () => {
  let component: SharedCardsComponent;
  let fixture: ComponentFixture<SharedCardsComponent>;
  let withMe: Record<string, ISharedWithMeItem[]>;
  const acceptCardSharedWithMe = vi.fn(() => of({ detail: 'OK' }));
  const declineCardSharedWithMe = vi.fn(() => of({ detail: 'OK' }));
  const refresh = vi.fn();

  const text = () => (fixture.nativeElement as HTMLElement).textContent;
  const button = (label: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      `button[aria-label="${label}"]`,
    );

  beforeEach(async () => {
    withMe = { pending: [], declined: [] };
    acceptCardSharedWithMe.mockClear();
    declineCardSharedWithMe.mockClear();
    refresh.mockClear();
    await TestBed.configureTestingModule({
      imports: [SharedCardsComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: PendingSharesService, useValue: { refresh } },
        {
          provide: CardShareApiService,
          useValue: {
            getSharedCards: () => of({ you_share: [], shared_with_you: [] }),
            getAvailableUsers: () => of([]),
            getCardsSharedWithMe: (status: string) => of(withMe[status] ?? []),
            acceptCardSharedWithMe,
            declineCardSharedWithMe,
            shareCard: () => of({ card: {}, shared_with_users: [] }),
            updateCardShare: () => of({ card: {}, shared_with_users: [] }),
            shareAllCards: () => of({ detail: 'OK' }),
            deleteCardShare: () => of({ detail: 'OK' }),
            deleteCardSharedWithMe: () => of({ detail: 'OK' }),
          },
        },
        {
          provide: CardApiService,
          useValue: {
            list: () => of([]),
          },
        },
      ],
    }).compileComponents();
  });

  const create = async () => {
    fixture = TestBed.createComponent(SharedCardsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('should create', async () => {
    await create();
    expect(component).toBeTruthy();
  });

  it('shows nothing to answer when no share is waiting', async () => {
    await create();

    expect(text()).not.toContain('SHARED_CARDS.SECTION_PENDING');
    expect(text()).not.toContain('SHARED_CARDS.SECTION_DECLINED');
  });

  it('lists the shares waiting for an answer', async () => {
    withMe['pending'] = [shared(1, 'pending')];
    await create();

    expect(text()).toContain('SHARED_CARDS.SECTION_PENDING');
    expect(text()).toContain('card 1');
    expect(text()).toContain('alice');
  });

  it('accepts a share and reads the lists again', async () => {
    withMe['pending'] = [shared(1, 'pending')];
    await create();

    button('SHARED_CARDS.ACTION_ACCEPT').click();

    expect(acceptCardSharedWithMe).toHaveBeenCalledWith(1);
    expect(refresh).toHaveBeenCalled();
  });

  it('declines a share and reads the lists again', async () => {
    withMe['pending'] = [shared(1, 'pending')];
    await create();

    button('SHARED_CARDS.ACTION_DECLINE').click();

    expect(declineCardSharedWithMe).toHaveBeenCalledWith(1);
    expect(refresh).toHaveBeenCalled();
  });

  it('lets a declined share be accepted after all', async () => {
    withMe['declined'] = [shared(2, 'declined')];
    await create();

    expect(text()).toContain('SHARED_CARDS.SECTION_DECLINED');
    button('SHARED_CARDS.ACTION_ACCEPT').click();

    expect(acceptCardSharedWithMe).toHaveBeenCalledWith(2);
  });
});

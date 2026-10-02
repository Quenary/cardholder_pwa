import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import {
  createCardApiServiceMock,
  createCardShareApiServiceMock,
} from 'src/testing';
import { PendingSharesService } from './services/pending-shares.service';
import { ISharedWithMeItem } from './shared-cards.interface';
import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { CardShareApiService } from './services/card-share-api.service';
import { SharedCardsComponent } from './shared-cards.component';
import { Mocked } from 'vitest';

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
  let cardShareApiMock: Mocked<CardShareApiService>;
  const refresh = vi.fn();

  const text = () => (fixture.nativeElement as HTMLElement).textContent;
  const button = (label: string) =>
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      `button[aria-label="${label}"]`,
    );

  beforeEach(async () => {
    withMe = { pending: [], declined: [] };
    refresh.mockClear();
    cardShareApiMock = createCardShareApiServiceMock();
    cardShareApiMock.getCardsSharedWithMe.mockImplementation((status) =>
      of(withMe[status] ?? []),
    );

    await TestBed.configureTestingModule({
      imports: [SharedCardsComponent],
      providers: [
        provideRouter([]),
        provideTranslateService(),
        { provide: PendingSharesService, useValue: { refresh } },
        {
          provide: CardShareApiService,
          useValue: cardShareApiMock,
        },
        {
          provide: CardApiService,
          useValue: createCardApiServiceMock(),
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

  describe('pending section', () => {
    it('hides when empty', async () => {
      await create();

      expect(text()).not.toContain('SHARED_CARDS.SECTION_PENDING');
      expect(text()).not.toContain('SHARED_CARDS.SECTION_DECLINED');
    });

    it('lists waiting shares', async () => {
      withMe['pending'] = [shared(1, 'pending')];
      await create();

      expect(text()).toContain('SHARED_CARDS.SECTION_PENDING');
      expect(text()).toContain('card 1');
      expect(text()).toContain('alice');
    });
  });

  describe('acceptCardSharedWithMe', () => {
    it('refreshes lists', async () => {
      withMe['pending'] = [shared(1, 'pending')];
      await create();

      button('SHARED_CARDS.ACTION_ACCEPT').click();

      expect(cardShareApiMock.acceptCardSharedWithMe).toHaveBeenCalledWith(1);
      expect(refresh).toHaveBeenCalled();
    });

    it('works for a previously declined share', async () => {
      withMe['declined'] = [shared(2, 'declined')];
      await create();

      expect(text()).toContain('SHARED_CARDS.SECTION_DECLINED');
      button('SHARED_CARDS.ACTION_ACCEPT').click();

      expect(cardShareApiMock.acceptCardSharedWithMe).toHaveBeenCalledWith(2);
    });
  });

  describe('declineCardSharedWithMe', () => {
    it('refreshes lists', async () => {
      withMe['pending'] = [shared(1, 'pending')];
      await create();

      button('SHARED_CARDS.ACTION_DECLINE').click();

      expect(cardShareApiMock.declineCardSharedWithMe).toHaveBeenCalledWith(1);
      expect(refresh).toHaveBeenCalled();
    });
  });
});

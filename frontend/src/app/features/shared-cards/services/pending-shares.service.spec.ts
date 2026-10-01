import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CardShareApiService } from './card-share-api.service';
import { PendingSharesService } from './pending-shares.service';
import { ISharedWithMeItem } from '../shared-cards.interface';

const item = (id: number) => ({ card: { id } }) as ISharedWithMeItem;

describe('PendingSharesService', () => {
  let service: PendingSharesService;
  const getCardsSharedWithMe = vi.fn();

  beforeEach(() => {
    getCardsSharedWithMe.mockReset();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CardShareApiService,
          useValue: { getCardsSharedWithMe },
        },
      ],
    });
    service = TestBed.inject(PendingSharesService);
  });

  it('counts the shares waiting for an answer', () => {
    getCardsSharedWithMe.mockReturnValue(of([item(1), item(2)]));

    service.refresh();

    expect(getCardsSharedWithMe).toHaveBeenCalledWith('pending');
    expect(service.count()).toBe(2);
  });

  it('keeps the last count when the request fails', () => {
    getCardsSharedWithMe.mockReturnValue(of([item(1)]));
    service.refresh();
    getCardsSharedWithMe.mockReturnValue(
      throwError(() => new Error('offline')),
    );

    service.refresh();

    expect(service.count()).toBe(1);
  });

  it('can be cleared', () => {
    getCardsSharedWithMe.mockReturnValue(of([item(1)]));
    service.refresh();

    service.clear();

    expect(service.count()).toBe(0);
  });
});

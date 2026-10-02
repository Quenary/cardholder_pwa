import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';
import {
  createCardShareApiServiceMock,
  ITestAppState,
  testAppState,
} from 'src/testing';
import { CardShareApiService } from './card-share-api.service';
import { PendingSharesService } from './pending-shares.service';
import { Mocked } from 'vitest';

describe('PendingSharesService', () => {
  let storeMock: MockStore;
  let initialState: ITestAppState;
  let cardShareApiMock: Mocked<CardShareApiService>;

  const create = async (): Promise<PendingSharesService> => {
    const service = TestBed.inject(PendingSharesService);
    await TestBed.inject(ApplicationRef).whenStable();
    return service;
  };

  beforeEach(() => {
    initialState = { ...testAppState };
    cardShareApiMock = createCardShareApiServiceMock();
    cardShareApiMock.getCardsSharedWithMeCount.mockReturnValue(
      of({ count: 0 }),
    );
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideMockStore({ initialState }),
        {
          provide: CardShareApiService,
          useValue: cardShareApiMock,
        },
      ],
    });
    storeMock = TestBed.inject(MockStore);
  });

  describe('count', () => {
    it('stays zero when logged out', async () => {
      storeMock.setState({ ...initialState, auth: { init: true } });

      const service = await create();

      expect(cardShareApiMock.getCardsSharedWithMeCount).not.toHaveBeenCalled();
      expect(service.count()).toBe(0);
    });

    it('loads pending shares when logged in', async () => {
      cardShareApiMock.getCardsSharedWithMeCount.mockReturnValue(
        of({ count: 2 }),
      );

      const service = await create();

      expect(cardShareApiMock.getCardsSharedWithMeCount).toHaveBeenCalledWith(
        'pending',
      );
      expect(service.count()).toBe(2);
    });

    it('stays zero on request error', async () => {
      cardShareApiMock.getCardsSharedWithMeCount.mockReturnValue(
        throwError(() => new Error('offline')),
      );

      const service = await create();

      expect(service.count()).toBe(0);
    });
  });

  describe('refresh', () => {
    it('reloads the count', async () => {
      cardShareApiMock.getCardsSharedWithMeCount.mockReturnValue(
        of({ count: 1 }),
      );
      const service = await create();
      expect(service.count()).toBe(1);

      cardShareApiMock.getCardsSharedWithMeCount.mockReturnValue(
        of({ count: 3 }),
      );
      service.refresh();
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.count()).toBe(3);
    });
  });

  describe('visibilitychange', () => {
    it('reloads when the tab becomes visible', async () => {
      cardShareApiMock.getCardsSharedWithMeCount.mockReturnValue(
        of({ count: 1 }),
      );
      const service = await create();
      expect(service.count()).toBe(1);

      cardShareApiMock.getCardsSharedWithMeCount.mockReturnValue(
        of({ count: 5 }),
      );
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        configurable: true,
      });
      document.dispatchEvent(new Event('visibilitychange'));
      await TestBed.inject(ApplicationRef).whenStable();

      expect(service.count()).toBe(5);
    });
  });
});

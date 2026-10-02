import { ApplicationRef, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { of, throwError } from 'rxjs';
import { ITestAppState, testAppState } from 'src/testing';
import { CardShareApiService } from './card-share-api.service';
import { PendingSharesService } from './pending-shares.service';

describe('PendingSharesService', () => {
  let storeMock: MockStore;
  let initialState: ITestAppState;
  const getCardsSharedWithMeCount = vi.fn();

  const create = async (): Promise<PendingSharesService> => {
    const service = TestBed.inject(PendingSharesService);
    await TestBed.inject(ApplicationRef).whenStable();
    return service;
  };

  beforeEach(() => {
    getCardsSharedWithMeCount.mockReset();
    getCardsSharedWithMeCount.mockReturnValue(of({ count: 0 }));
    initialState = { ...testAppState };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideMockStore({ initialState }),
        {
          provide: CardShareApiService,
          useValue: { getCardsSharedWithMeCount },
        },
      ],
    });
    storeMock = TestBed.inject(MockStore);
  });

  it('does not ask while logged out', async () => {
    storeMock.setState({ ...initialState, auth: { init: true } });

    const service = await create();

    expect(getCardsSharedWithMeCount).not.toHaveBeenCalled();
    expect(service.count()).toBe(0);
  });

  it('counts the shares waiting for an answer once logged in', async () => {
    getCardsSharedWithMeCount.mockReturnValue(of({ count: 2 }));

    const service = await create();

    expect(getCardsSharedWithMeCount).toHaveBeenCalledWith('pending');
    expect(service.count()).toBe(2);
  });

  it('shows no badge when the request fails', async () => {
    getCardsSharedWithMeCount.mockReturnValue(
      throwError(() => new Error('offline')),
    );

    const service = await create();

    expect(service.count()).toBe(0);
  });

  it('refresh() asks again', async () => {
    getCardsSharedWithMeCount.mockReturnValue(of({ count: 1 }));
    const service = await create();
    expect(service.count()).toBe(1);

    getCardsSharedWithMeCount.mockReturnValue(of({ count: 3 }));
    service.refresh();
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.count()).toBe(3);
  });

  it('asks again when the tab regains focus', async () => {
    getCardsSharedWithMeCount.mockReturnValue(of({ count: 1 }));
    const service = await create();
    expect(service.count()).toBe(1);

    getCardsSharedWithMeCount.mockReturnValue(of({ count: 5 }));
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
    await TestBed.inject(ApplicationRef).whenStable();

    expect(service.count()).toBe(5);
  });
});

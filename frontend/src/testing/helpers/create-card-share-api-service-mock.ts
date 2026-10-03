import { CardShareApiService } from 'src/app/features/shared-cards/services/card-share-api.service';
import { of } from 'rxjs';
import { Mocked, vi } from 'vitest';

export function createCardShareApiServiceMock(
  overrides: Partial<Mocked<CardShareApiService>> = {},
): Mocked<CardShareApiService> {
  const mock: Partial<Mocked<CardShareApiService>> = {
    getSharedCards: vi
      .fn()
      .mockReturnValue(of({ you_share: [], shared_with_you: [] })),
    getAvailableUsers: vi
      .fn()
      .mockReturnValue(of({ items: [], total: 0, limit: 50, offset: 0 })),
    getCardsSharedWithMe: vi.fn().mockReturnValue(of([])),
    getCardsSharedWithMeCount: vi.fn().mockReturnValue(of({ count: 0 })),
    acceptCardSharedWithMe: vi.fn().mockReturnValue(of({ detail: 'OK' })),
    declineCardSharedWithMe: vi.fn().mockReturnValue(of({ detail: 'OK' })),
    shareCard: vi
      .fn()
      .mockReturnValue(of({ card: {}, shared_with_users: [] } as never)),
    updateCardShare: vi
      .fn()
      .mockReturnValue(of({ card: {}, shared_with_users: [] } as never)),
    shareAllCards: vi.fn().mockReturnValue(of({ detail: 'OK' })),
    deleteCardShare: vi.fn().mockReturnValue(of({ detail: 'OK' })),
    deleteCardSharedWithMe: vi.fn().mockReturnValue(of({ detail: 'OK' })),
    ...overrides,
  };
  return mock as Mocked<CardShareApiService>;
}

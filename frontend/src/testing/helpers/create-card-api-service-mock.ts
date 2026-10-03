import { CardApiService } from 'src/app/entities/cards/cards-api.service';
import { of } from 'rxjs';
import { Mocked, vi } from 'vitest';

export function createCardApiServiceMock(): Mocked<CardApiService> {
  const mock: Partial<Mocked<CardApiService>> = {
    getLogoBlob: vi
      .fn()
      .mockReturnValue(of(new Blob([''], { type: 'image/png' }))),
    list: vi.fn().mockReturnValue(of([])),
  };
  return mock as Mocked<CardApiService>;
}

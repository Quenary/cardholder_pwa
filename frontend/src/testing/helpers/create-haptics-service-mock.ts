import { HapticsService } from 'src/app/core/services/haptics.service';
import { Mocked, vi } from 'vitest';

export function createHapticsServiceMock(): Mocked<HapticsService> {
  const mock: Partial<Mocked<HapticsService>> = {
    confirm: vi.fn(),
  };
  return mock as Mocked<HapticsService>;
}

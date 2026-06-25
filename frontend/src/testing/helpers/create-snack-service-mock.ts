import { SnackService } from 'src/app/core/services/snack.service';
import { Mocked, vi } from 'vitest';

export function createSnackServiceMock(): Mocked<SnackService> {
  const mock: Partial<SnackService> = {
    error: vi.fn(),
    success: vi.fn(),
  };
  return mock as Mocked<SnackService>;
}

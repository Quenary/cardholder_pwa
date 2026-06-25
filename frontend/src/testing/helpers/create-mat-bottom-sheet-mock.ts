import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { Mocked, vi } from 'vitest';

export function createMatBottomSheetMock(): Mocked<MatBottomSheet> {
  const mock: Partial<MatBottomSheet> = {
    open: vi.fn(),
    dismiss: vi.fn(),
  };
  return mock as Mocked<MatBottomSheet>;
}

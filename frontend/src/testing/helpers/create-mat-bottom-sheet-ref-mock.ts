import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { Mocked, vi } from 'vitest';

export function createMatBottomSheetRefMock(): Mocked<MatBottomSheetRef> {
  const mock: Partial<MatBottomSheetRef> = {
    dismiss: vi.fn(),
  };
  return mock as Mocked<MatBottomSheetRef>;
}

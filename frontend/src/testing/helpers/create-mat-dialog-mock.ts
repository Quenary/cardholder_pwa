import { MatDialog } from '@angular/material/dialog';
import { Mocked, vi } from 'vitest';

export function createMatDialogMock(): Mocked<MatDialog> {
  const mock: Partial<MatDialog> = {
    open: vi.fn(),
  };
  return mock as Mocked<MatDialog>;
}

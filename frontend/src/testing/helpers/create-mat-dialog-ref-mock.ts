import { MatDialogRef } from '@angular/material/dialog';
import { Mocked } from 'vitest';

export function createMatDialogRefMock<T = unknown>(): Mocked<MatDialogRef<T>> {
  const mock: Partial<MatDialogRef<T>> = {
    afterClosed: vi.fn(),
    close: vi.fn(),
  };
  return mock as Mocked<MatDialogRef<T>>;
}

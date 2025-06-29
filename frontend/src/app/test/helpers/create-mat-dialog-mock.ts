import { MatDialog } from '@angular/material/dialog';

export function createMatDialogMock(): jasmine.SpyObj<MatDialog> {
  return jasmine.createSpyObj('MatDialog', ['open']);
}

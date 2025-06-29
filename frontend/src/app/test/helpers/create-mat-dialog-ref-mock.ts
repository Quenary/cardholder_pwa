import { MatDialogRef } from '@angular/material/dialog';

export function createMatDialogRefMock<T = any>(): jasmine.SpyObj<
  MatDialogRef<T>
> {
  return jasmine.createSpyObj('MatDialogRef', ['afterClosed', 'close']);
}

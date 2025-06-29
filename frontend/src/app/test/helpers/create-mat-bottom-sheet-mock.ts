import { MatBottomSheet } from '@angular/material/bottom-sheet';

export function createMatBottomSheetMock(): jasmine.SpyObj<MatBottomSheet> {
  return jasmine.createSpyObj('MatBottomSheet', ['open', 'dismiss']);
}

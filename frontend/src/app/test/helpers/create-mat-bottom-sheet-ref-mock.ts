import { MatBottomSheetRef } from '@angular/material/bottom-sheet';

export function createMatBottomSheetRefMock(): jasmine.SpyObj<MatBottomSheetRef> {
  return jasmine.createSpyObj('MatBottomSheet', ['dismiss']);
}

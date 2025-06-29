import { SnackService } from 'src/app/core/services/snack.service';

export function createSnackServiceMock(): jasmine.SpyObj<SnackService> {
  return jasmine.createSpyObj('SnackService', ['error', 'success']);
}

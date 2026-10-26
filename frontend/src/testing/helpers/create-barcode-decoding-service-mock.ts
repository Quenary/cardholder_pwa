import { BarcodeDecodingService } from 'src/app/features/card-scanner/decoders/barcode-decoding.service';
import { Mocked, vi } from 'vitest';

export function createBarcodeDecodingServiceMock(): Mocked<BarcodeDecodingService> {
  const mock: Partial<Mocked<BarcodeDecodingService>> = {
    createDecoders: vi.fn().mockResolvedValue([]),
    decodeAll: vi.fn().mockResolvedValue(null),
  };
  return mock as Mocked<BarcodeDecodingService>;
}

import { BarcodeDetectorService } from 'src/app/core/services/barcode-detector.service';
import { Mocked, vi } from 'vitest';

export function createBarcodeDetectorServiceMock(): Mocked<BarcodeDetectorService> {
  const mock: Partial<Mocked<BarcodeDetectorService>> = {
    isSupported: vi.fn().mockReturnValue(false),
    getSupportedFormats: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockReturnValue({ detect: vi.fn() }),
  };
  return mock as Mocked<BarcodeDetectorService>;
}

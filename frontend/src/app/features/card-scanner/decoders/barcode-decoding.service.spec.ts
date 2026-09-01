import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { Mocked } from 'vitest';
import { BarcodeDetectorService } from 'src/app/core/services/barcode-detector.service';
import { EBwipBcid } from 'src/app/entities/cards/cards-const';
import { BarcodeDecodingService } from './barcode-decoding.service';
import { IBarcodeDecoder } from './barcode-decoder';

const createDecoder = (name: string, code?: string) =>
  ({
    name,
    decode: vi
      .fn()
      .mockResolvedValue(code ? { code, type: EBwipBcid.code128 } : null),
  }) as unknown as IBarcodeDecoder & { decode: ReturnType<typeof vi.fn> };

describe('BarcodeDecodingService', () => {
  let service: BarcodeDecodingService;
  let barcodeDetectorServiceMock: Partial<Mocked<BarcodeDetectorService>>;

  beforeEach(() => {
    barcodeDetectorServiceMock = {
      isSupported: vi.fn().mockReturnValue(false),
      getSupportedFormats: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockReturnValue({ detect: vi.fn() }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: BarcodeDetectorService,
          useValue: barcodeDetectorServiceMock,
        },
      ],
    });
    service = TestBed.inject(BarcodeDecodingService);
  });

  it('should always offer both libraries', async () => {
    const decoders = await service.createDecoders();

    expect(decoders.map((decoder) => decoder.name)).toEqual([
      'zxing',
      'quagga2',
    ]);
  });

  it('should try the browser detector before the libraries', async () => {
    barcodeDetectorServiceMock.isSupported.mockReturnValue(true);
    barcodeDetectorServiceMock.getSupportedFormats.mockResolvedValue([
      'qr_code',
      'ean_13',
    ]);

    const decoders = await service.createDecoders();

    expect(decoders.map((decoder) => decoder.name)).toEqual([
      'native',
      'zxing',
      'quagga2',
    ]);
  });

  it('should ask the browser detector only for formats a card can render', async () => {
    barcodeDetectorServiceMock.isSupported.mockReturnValue(true);
    barcodeDetectorServiceMock.getSupportedFormats.mockResolvedValue([
      'qr_code',
      'unknown',
    ]);

    await service.createDecoders();

    expect(barcodeDetectorServiceMock.create).toHaveBeenCalledWith(['qr_code']);
  });

  it('should skip the browser detector when it knows no usable format', async () => {
    barcodeDetectorServiceMock.isSupported.mockReturnValue(true);
    barcodeDetectorServiceMock.getSupportedFormats.mockResolvedValue([
      'unknown',
    ]);

    const decoders = await service.createDecoders();

    expect(decoders.map((decoder) => decoder.name)).toEqual([
      'zxing',
      'quagga2',
    ]);
    expect(barcodeDetectorServiceMock.create).not.toHaveBeenCalled();
  });

  it('should return the first code read when spending every decoder', async () => {
    const frame = document.createElement('canvas');
    const empty = createDecoder('empty');
    const reader = createDecoder('reader', '12345');
    const later = createDecoder('later', '67890');

    const result = await service.decodeAll(frame, [empty, reader, later]);

    expect(result).toEqual({ code: '12345', type: EBwipBcid.code128 });
    expect(empty.decode).toHaveBeenCalledWith(frame);
    // Nothing runs after a hit.
    expect(later.decode).not.toHaveBeenCalled();
  });

  it('should keep going when a decoder throws', async () => {
    const frame = document.createElement('canvas');
    const broken = createDecoder('broken');
    broken.decode.mockRejectedValue(new Error('boom'));
    const reader = createDecoder('reader', '12345');

    const result = await service.decodeAll(frame, [broken, reader]);

    expect(result).toEqual({ code: '12345', type: EBwipBcid.code128 });
  });
});

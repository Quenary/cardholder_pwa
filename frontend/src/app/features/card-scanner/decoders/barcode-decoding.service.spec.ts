import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { BarcodeDetectorService } from 'src/app/core/services/barcode-detector.service';
import {
  createBarcodeDecoderMock,
  createBarcodeDetectorServiceMock,
} from 'src/testing';
import { BarcodeDecodingService } from './barcode-decoding.service';
import { EBwipBcid } from 'src/app/entities/cards/cards-const';
import { Mocked } from 'vitest';

describe('BarcodeDecodingService', () => {
  let service: BarcodeDecodingService;
  let barcodeDetectorServiceMock: Mocked<BarcodeDetectorService>;

  beforeEach(() => {
    barcodeDetectorServiceMock = createBarcodeDetectorServiceMock();
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

  describe('createDecoders', () => {
    it('always includes zxing and quagga2', async () => {
      const decoders = await service.createDecoders();

      expect(decoders.map((decoder) => decoder.name)).toEqual([
        'zxing',
        'quagga2',
      ]);
    });

    it('prepends native when supported', async () => {
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

    it('filters native formats to renderable types', async () => {
      barcodeDetectorServiceMock.isSupported.mockReturnValue(true);
      barcodeDetectorServiceMock.getSupportedFormats.mockResolvedValue([
        'qr_code',
        'unknown',
      ]);

      await service.createDecoders();

      expect(barcodeDetectorServiceMock.create).toHaveBeenCalledWith([
        'qr_code',
      ]);
    });

    it('omits native when no renderable format', async () => {
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
  });

  describe('decodeAll', () => {
    it('returns the first successful decode', async () => {
      const frame = document.createElement('canvas');
      const empty = createBarcodeDecoderMock('empty');
      const reader = createBarcodeDecoderMock('reader', '12345');
      const later = createBarcodeDecoderMock('later', '67890');

      const result = await service.decodeAll(frame, [empty, reader, later]);

      expect(result).toEqual({ code: '12345', type: EBwipBcid.code128 });
      expect(empty.decode).toHaveBeenCalledWith(frame);
      expect(later.decode).not.toHaveBeenCalled();
    });

    it('continues after a decoder throws', async () => {
      const frame = document.createElement('canvas');
      const broken = createBarcodeDecoderMock('broken');
      broken.decode.mockRejectedValue(new Error('boom'));
      const reader = createBarcodeDecoderMock('reader', '12345');

      const result = await service.decodeAll(frame, [broken, reader]);

      expect(result).toEqual({ code: '12345', type: EBwipBcid.code128 });
    });
  });
});

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
    it('always includes tapirscan, zxing and quagga2', async () => {
      const decoders = await service.createDecoders();

      expect(decoders.map((decoder) => decoder.name)).toEqual([
        'tapirscan',
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
        'tapirscan',
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
        'tapirscan',
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

    it('tries a decoder still loading last, waiting for it', async () => {
      const frame = document.createElement('canvas');
      const loading = {
        ...createBarcodeDecoderMock('loading'),
        available: false,
      };
      loading.decode.mockImplementation((_frame, waitMs) =>
        Promise.resolve(
          waitMs ? { code: '12345', type: EBwipBcid.code128 } : null,
        ),
      );
      const empty = createBarcodeDecoderMock('empty');

      const result = await service.decodeAll(frame, [loading, empty], 500);

      expect(result).toEqual({ code: '12345', type: EBwipBcid.code128 });
      expect(empty.decode).toHaveBeenCalledWith(frame);
      expect(loading.decode).toHaveBeenLastCalledWith(frame, 500);
    });

    it('retries a decoder that finished loading meanwhile', async () => {
      const frame = document.createElement('canvas');
      const loading = {
        ...createBarcodeDecoderMock('loading'),
        available: false,
      };
      loading.decode.mockResolvedValueOnce(null).mockResolvedValue({
        code: '12345',
        type: EBwipBcid.code128,
      });
      const empty = createBarcodeDecoderMock('empty');
      empty.decode.mockImplementation(async () => {
        loading.available = true;
        return null;
      });

      const result = await service.decodeAll(frame, [loading, empty], 500);

      expect(result).toEqual({ code: '12345', type: EBwipBcid.code128 });
    });
  });
});

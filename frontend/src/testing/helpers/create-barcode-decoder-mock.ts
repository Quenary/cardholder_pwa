import { EBwipBcid } from 'src/app/entities/cards/cards-const';
import { IBarcodeDecoder } from 'src/app/features/card-scanner/decoders/barcode-decoder';
import { vi } from 'vitest';

export type BarcodeDecoderMock = IBarcodeDecoder & {
  decode: ReturnType<typeof vi.fn>;
};

/** Decoder stub that resolves to a code or null. */
export function createBarcodeDecoderMock(
  name: string,
  code?: string,
): BarcodeDecoderMock {
  return {
    name,
    decode: vi
      .fn()
      .mockResolvedValue(code ? { code, type: EBwipBcid.code128 } : null),
  } as BarcodeDecoderMock;
}

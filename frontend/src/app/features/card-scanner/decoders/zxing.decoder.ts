import { BarcodeFormat, BrowserMultiFormatReader } from '@zxing/browser';
import type { Result } from '@zxing/library';
import { ZxingToBwipMap } from 'src/app/entities/cards/cards-const';
import {
  IBarcodeDecoder,
  IScannerResult,
  toScannerResult,
} from './barcode-decoder';

/**
 * Carries the 2D formats (QR, DataMatrix, Aztec, PDF417) and the common 1D
 * ones.
 */
export class ZxingDecoder implements IBarcodeDecoder {
  public readonly name = 'zxing';

  private readonly reader = new BrowserMultiFormatReader();

  public async decode(
    frame: HTMLCanvasElement,
  ): Promise<IScannerResult | null> {
    try {
      // Synchronous, and throws rather than returning empty on a frame
      // without a code, which is most frames.
      return this.prepareResult(this.reader.decodeFromCanvas(frame));
    } catch {
      return null;
    }
  }

  private prepareResult(result: Result): IScannerResult | null {
    const format = Object.entries(BarcodeFormat).find(
      ([, value]) => value === result.getBarcodeFormat(),
    )?.[0];
    return toScannerResult(
      result.getText(),
      format ? ZxingToBwipMap[format] : null,
    );
  }
}

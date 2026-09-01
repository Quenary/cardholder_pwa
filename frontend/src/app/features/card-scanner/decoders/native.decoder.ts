import {
  NativeToBwipMap,
  TNativeBarcodeFormat,
} from 'src/app/entities/cards/cards-const';
import { INativeBarcodeDetector } from 'src/app/core/services/barcode-detector.service';
import {
  IBarcodeDecoder,
  IScannerResult,
  toScannerResult,
} from './barcode-decoder';

/**
 * The browser's own detector.
 *
 * Where it exists it decodes on the platform's image pipeline rather than in
 * javascript, so it is both quicker and steadier on a moving camera than
 * either library. It does not cover every format, which is why the two
 * libraries stay in the rotation behind it.
 */
export class NativeDecoder implements IBarcodeDecoder {
  public readonly name = 'native';

  constructor(private readonly detector: INativeBarcodeDetector) {}

  public async decode(
    frame: HTMLCanvasElement,
  ): Promise<IScannerResult | null> {
    const codes = await this.detector.detect(frame).catch(() => []);
    for (const code of codes) {
      const result = toScannerResult(
        code.rawValue,
        NativeToBwipMap[code.format as TNativeBarcodeFormat],
      );
      // A frame may hold several codes, of which only some are renderable.
      if (result) {
        return result;
      }
    }
    return null;
  }
}

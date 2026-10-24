import type { Format, Scanner } from 'tapirscan/browser/medium';
import { browserSupported } from 'tapirscan/support';
import { TapirscanToBwipMap } from 'src/app/entities/cards/cards-const';
import {
  IBarcodeDecoder,
  IScannerResult,
  toScannerResult,
} from './barcode-decoder';

const FORMATS = Object.keys(TapirscanToBwipMap) as Format[];

/** Decodes in a worker of its own. */
export class TapirscanDecoder implements IBarcodeDecoder {
  public readonly name = 'tapirscan';

  private constructor(private readonly scanner: Scanner) {}

  /**
   * Fetches the scanner and resolves once it can decode, or to null when the
   * browser lacks WebAssembly SIMD or the files cannot be fetched.
   */
  public static async load(): Promise<TapirscanDecoder | null> {
    if (!browserSupported()) {
      return null;
    }
    try {
      const { Scanner } = await import('tapirscan/browser/medium');
      const scanner = new Scanner({
        formats: FORMATS,
        // Copied there by angular.json from node_modules/tapirscan/wasm.
        wasmBaseUrl: new URL('tapirscan/', document.baseURI),
        worker: () =>
          new Worker(new URL('./tapirscan.worker', import.meta.url), {
            type: 'module',
          }),
      });
      await scanner.ready;
      return new TapirscanDecoder(scanner);
    } catch (error) {
      console.warn('Tapirscan is unavailable, scanning without it', error);
      return null;
    }
  }

  public async decode(
    frame: HTMLCanvasElement,
  ): Promise<IScannerResult | null> {
    const { barcodes } = await this.scanner.scan(frame);
    for (const barcode of barcodes) {
      // Tapirscan reports Codabar's start and stop letters apart from its text.
      const [start = '', stop = ''] = barcode.codabarStartStop ?? '';
      const result = toScannerResult(
        start + barcode.text + stop,
        TapirscanToBwipMap[barcode.format] ?? null,
      );
      if (result) {
        return result;
      }
    }
    return null;
  }

  public dispose(): void {
    this.scanner.dispose();
  }
}

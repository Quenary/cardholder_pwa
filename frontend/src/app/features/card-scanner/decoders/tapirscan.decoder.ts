import type { Format, Scanner } from 'tapirscan/browser/medium';
import { browserSupported } from 'tapirscan/support';
import { TapirscanToBwipMap } from 'src/app/entities/cards/cards-const';
import {
  IBarcodeDecoder,
  IScannerResult,
  toScannerResult,
} from './barcode-decoder';

const FORMATS = Object.keys(TapirscanToBwipMap) as Format[];

/** Fetches tapirscan's code and WebAssembly and starts its worker. */
async function createScanner(): Promise<Scanner> {
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
  return scanner;
}

/**
 * Loads tapirscan once prepared, and is unavailable until then. After a
 * failed load or a scan error it is unavailable until prepared again, which
 * the dialog does when it opens. Where the browser lacks WebAssembly SIMD it
 * never loads.
 */
export class TapirscanDecoder implements IBarcodeDecoder {
  public readonly name = 'tapirscan';
  private loading?: Promise<void>;
  private scanner: Scanner | null = null;
  private readonly unsupported = !browserSupported();

  constructor(private readonly create = createScanner) {}

  public get available(): boolean {
    return !!this.scanner;
  }

  public prepare(): void {
    if (this.unsupported) {
      return;
    }
    this.loading ??= this.create().then(
      (scanner) => {
        this.scanner = scanner;
      },
      (error) => {
        console.warn('Tapirscan could not load, scanning without it', error);
        this.loading = undefined;
      },
    );
  }

  public async decode(
    frame: HTMLCanvasElement,
    waitMs = 0,
  ): Promise<IScannerResult | null> {
    if (!this.scanner && this.loading && waitMs) {
      let timer: ReturnType<typeof setTimeout>;
      await Promise.race([
        this.loading,
        new Promise((resolve) => (timer = setTimeout(resolve, waitMs))),
      ]);
      clearTimeout(timer);
    }
    const scanner = this.scanner;
    if (!scanner) {
      return null;
    }
    try {
      const { barcodes } = await scanner.scan(frame);
      for (const barcode of barcodes) {
        // Tapirscan reports Codabar's start and stop letters separately.
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
    } catch (error) {
      console.warn('Tapirscan stopped, scanning without it', error);
      if (this.scanner === scanner) {
        this.scanner = null;
        this.loading = undefined;
      }
      scanner.dispose();
      return null;
    }
  }
}

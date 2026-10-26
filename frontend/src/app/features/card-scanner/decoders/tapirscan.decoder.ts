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
 * Loads tapirscan once prepared or asked to decode, and is unavailable until
 * then. It stays unavailable where the browser lacks WebAssembly SIMD, and
 * after its first error.
 */
export class TapirscanDecoder implements IBarcodeDecoder {
  public readonly name = 'tapirscan';
  private loading?: Promise<void>;
  private scanner: Scanner | null = null;
  private failed = !browserSupported();

  constructor(private readonly create = createScanner) {}

  public get available(): boolean {
    return !this.failed && !!this.scanner;
  }

  public prepare(): void {
    if (this.failed) {
      return;
    }
    this.loading ??= this.create().then(
      (scanner) => {
        if (this.failed) {
          scanner.dispose();
        } else {
          this.scanner = scanner;
        }
      },
      (error) => this.fail(error),
    );
  }

  public async decode(
    frame: HTMLCanvasElement,
    waitMs = 0,
  ): Promise<IScannerResult | null> {
    this.prepare();
    if (this.failed) {
      return null;
    }
    if (!this.scanner && waitMs) {
      let timer: ReturnType<typeof setTimeout>;
      await Promise.race([
        this.loading,
        new Promise((resolve) => (timer = setTimeout(resolve, waitMs))),
      ]);
      clearTimeout(timer);
    }
    if (!this.scanner) {
      return null;
    }
    try {
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
    } catch (error) {
      this.fail(error);
      return null;
    }
  }

  public dispose(): void {
    this.failed = true;
    this.scanner?.dispose();
    this.scanner = null;
  }

  private fail(error: unknown): void {
    if (!this.failed) {
      console.warn('Tapirscan stopped, scanning without it', error);
    }
    this.dispose();
  }
}

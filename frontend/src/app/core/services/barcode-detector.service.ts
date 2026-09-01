import { Injectable } from '@angular/core';

/** A code the browser's own detector found in an image. */
export interface INativeBarcode {
  rawValue: string;
  format: string;
}

export interface INativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<INativeBarcode[]>;
}

interface INativeBarcodeDetectorCtor {
  new (options?: { formats?: string[] }): INativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

/**
 * Wrapper for the BarcodeDetector api, which TypeScript does not yet declare
 * and which a good half of browsers still do not ship.
 *
 * Same shape as MediaDevicesService: it reports whether the api is there and
 * otherwise stays out of the way.
 */
@Injectable({
  providedIn: 'root',
})
export class BarcodeDetectorService {
  isSupported(): boolean {
    return !!this.getCtor();
  }

  /**
   * Formats this browser will actually look for. Support varies by platform
   * even where the api exists, so asking beats assuming.
   */
  async getSupportedFormats(): Promise<string[]> {
    const ctor = this.getCtor();
    if (typeof ctor?.getSupportedFormats !== 'function') {
      return [];
    }
    return (await ctor.getSupportedFormats().catch(() => [])) ?? [];
  }

  create(formats: string[]): INativeBarcodeDetector | null {
    const ctor = this.getCtor();
    return ctor ? new ctor({ formats }) : null;
  }

  private getCtor(): INativeBarcodeDetectorCtor | null {
    const ctor = (
      globalThis as {
        BarcodeDetector?: INativeBarcodeDetectorCtor;
      }
    ).BarcodeDetector;
    return typeof ctor === 'function' ? ctor : null;
  }
}

import { inject, Injectable } from '@angular/core';
import { BarcodeDetectorService } from 'src/app/core/services/barcode-detector.service';
import { NativeToBwipMap } from 'src/app/entities/cards/cards-const';
import { IBarcodeDecoder, IScannerResult } from './barcode-decoder';
import { NativeDecoder } from './native.decoder';
import { Quagga2Decoder } from './quagga2.decoder';
import { TapirscanDecoder } from './tapirscan.decoder';
import { ZxingDecoder } from './zxing.decoder';

/**
 * Assembles the decoders and runs them.
 *
 * Which one reads a given code is an implementation detail: the caller gets
 * a code or nothing, and never has to choose an engine on the user's behalf.
 */
@Injectable({
  providedIn: 'root',
})
export class BarcodeDecodingService {
  private readonly barcodeDetectorService = inject(BarcodeDetectorService);
  /** Shared by every scanner dialog, so it loads once per page. */
  private readonly tapirscan = new TapirscanDecoder();

  /**
   * Builds the decoders available in this browser, best first.
   *
   * The two libraries are always present and complement each other: zxing
   * carries the 2D formats, quagga2 the long tail of 1D ones. Tapirscan,
   * between native and them, joins once it has loaded.
   */
  public async createDecoders(): Promise<IBarcodeDecoder[]> {
    const decoders: IBarcodeDecoder[] = [];
    const native = await this.createNativeDecoder();
    if (native) {
      decoders.push(native);
    }
    decoders.push(this.tapirscan, new ZxingDecoder(), new Quagga2Decoder());
    return decoders;
  }

  /**
   * Runs every decoder against one frame and returns the first code read.
   *
   * For a picked file, where there is a single image and no next frame to
   * fall back on, it is worth spending all of them. Decoders still loading
   * are tried last, waiting up to waitMs for them.
   */
  public async decodeAll(
    frame: HTMLCanvasElement,
    decoders: IBarcodeDecoder[],
    waitMs = 0,
  ): Promise<IScannerResult | null> {
    // Taken first: one may finish loading while the others decode.
    const loading = decoders.filter((d) => d.available === false);
    for (const decoder of decoders) {
      const result = await decoder.decode(frame).catch(() => null);
      if (result) {
        return result;
      }
    }
    for (const decoder of loading) {
      const result = await decoder.decode(frame, waitMs).catch(() => null);
      if (result) {
        return result;
      }
    }
    return null;
  }

  private async createNativeDecoder(): Promise<IBarcodeDecoder | null> {
    if (!this.barcodeDetectorService.isSupported()) {
      return null;
    }
    const supported = await this.barcodeDetectorService.getSupportedFormats();
    const formats = supported.filter((format) => format in NativeToBwipMap);
    // A detector asked for no format at all falls back to looking for every
    // format it knows, including ones the card form cannot render back.
    if (!formats.length) {
      return null;
    }
    const detector = this.barcodeDetectorService.create(formats);
    return detector ? new NativeDecoder(detector) : null;
  }
}

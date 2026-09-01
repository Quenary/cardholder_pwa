import Quagga2, {
  QuaggaJSCodeReader,
  QuaggaJSResultObject_CodeResult,
} from '@ericblade/quagga2';
import { Quagga2ToBwipMap } from 'src/app/entities/cards/cards-const';
import {
  IBarcodeDecoder,
  IScannerResult,
  toScannerResult,
} from './barcode-decoder';

/**
 * The 1D formats worth attempting, including several that zxing does not
 * cover at all.
 */
const READERS: QuaggaJSCodeReader[] = [
  'code_128_reader',
  'ean_reader',
  'ean_5_reader',
  'ean_2_reader',
  'ean_8_reader',
  'code_39_reader',
  'code_39_vin_reader',
  'codabar_reader',
  'upc_reader',
  'upc_e_reader',
  'i2of5_reader',
  '2of5_reader',
  'code_93_reader',
  'code_32_reader',
  'pharmacode_reader',
];

/**
 * Carries the long tail of 1D formats, and is more forgiving than zxing on
 * the worn or curved codes that loyalty cards tend to have.
 */
export class Quagga2Decoder implements IBarcodeDecoder {
  public readonly name = 'quagga2';

  public async decode(
    frame: HTMLCanvasElement,
  ): Promise<IScannerResult | null> {
    // decodeSingle loads its input through an Image, so the frame has to be
    // handed over as a data url rather than as the canvas itself.
    const data = await Quagga2.decodeSingle({
      decoder: { readers: READERS },
      locate: true,
      src: frame.toDataURL('image/png'),
    }).catch(() => null);
    return data?.codeResult ? this.prepareResult(data.codeResult) : null;
  }

  private prepareResult(
    result: QuaggaJSResultObject_CodeResult,
  ): IScannerResult | null {
    return toScannerResult(result.code, Quagga2ToBwipMap[result.format]);
  }
}

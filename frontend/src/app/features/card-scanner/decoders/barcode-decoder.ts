import { EBwipBcid } from 'src/app/entities/cards/cards-const';

/**
 * A code read out of an image, in the vocabulary the card form expects.
 */
export interface IScannerResult {
  code: string;
  type: EBwipBcid;
}

/**
 * One way of reading a barcode out of a still frame.
 *
 * Several of these run against the same camera, so which one produced a
 * result is of no interest to anyone outside this folder: the name below is
 * for logs and tests only, never for display.
 */
export interface IBarcodeDecoder {
  readonly name: string;
  /**
   * Reads the frame.
   *
   * Resolves to null when the frame holds no code this decoder understands,
   * which is the ordinary outcome on most frames and not an error.
   */
  decode(frame: HTMLCanvasElement): Promise<IScannerResult | null>;
}

/**
 * Turns a decoder's own output into a result the card form can take.
 *
 * The format maps in cards-const name bcid values as plain strings while the
 * form works in EBwipBcid, whose members carry those very strings. They also
 * map a few formats to null, meaning bwip cannot render the code back: such a
 * read is dropped here rather than filling the form with a type that fails on
 * save.
 */
export const toScannerResult = (
  code: string,
  bcid: string | null,
): IScannerResult | null =>
  code && bcid ? { code, type: bcid as EBwipBcid } : null;

import { BarcodeFormat } from '@zxing/browser';

/**
 * Key-key mapping for zxing codes.
 * Use as main enum of codes of application.
 */
export const EBarcodeFormat: { [K in keyof typeof BarcodeFormat & string]: K } =
  {
    /** Aztec 2D barcode format. */
    AZTEC: 'AZTEC',
    /** CODABAR 1D format. */
    CODABAR: 'CODABAR',
    /** Code 39 1D format. */
    CODE_39: 'CODE_39',
    /** Code 93 1D format. */
    CODE_93: 'CODE_93',
    /** Code 128 1D format. */
    CODE_128: 'CODE_128',
    /** Data Matrix 2D barcode format. */
    DATA_MATRIX: 'DATA_MATRIX',
    /** EAN-8 1D format. */
    EAN_8: 'EAN_8',
    /** EAN-13 1D format. */
    EAN_13: 'EAN_13',
    /** ITF (Interleaved Two of Five) 1D format. */
    ITF: 'ITF',
    /** MaxiCode 2D barcode format. */
    MAXICODE: 'MAXICODE',
    /** PDF417 format. */
    PDF_417: 'PDF_417',
    /** QR Code 2D barcode format. */
    QR_CODE: 'QR_CODE',
    /** RSS 14 */
    RSS_14: 'RSS_14',
    /** RSS EXPANDED */
    RSS_EXPANDED: 'RSS_EXPANDED',
    /** UPC-A 1D format. */
    UPC_A: 'UPC_A',
    /** UPC-E 1D format. */
    UPC_E: 'UPC_E',
    /** UPC/EAN extension format. Not a stand-alone format. */
    UPC_EAN_EXTENSION: 'UPC_EAN_EXTENSION',
  };
/**
 * Zxing to bwip codes map.
 * Null values is not supported in bwip.
 */
export const ZxingToBwipMap: Record<keyof typeof BarcodeFormat, string | null> =
  {
    // 2D barcodes
    AZTEC: 'azteccode',
    DATA_MATRIX: 'datamatrix',
    MAXICODE: null,
    PDF_417: 'pdf417',
    QR_CODE: 'qrcode',
    // 1D barcodes
    CODABAR: 'rationalizedCodabar',
    CODE_39: 'code39',
    CODE_93: 'code93',
    CODE_128: 'code128',
    EAN_8: 'ean8',
    EAN_13: 'ean13',
    ITF: 'interleaved2of5',
    UPC_A: 'upca',
    UPC_E: 'upce',
    UPC_EAN_EXTENSION: null,
    // RSS formats
    RSS_14: 'rss14',
    RSS_EXPANDED: 'rssexpanded',
  };

/**
 * Check if code type is supported
 * @param code_type code type
 * @returns
 */
export const isValidCodeType = (code_type: string): boolean => {
  return (
    !!code_type && !!ZxingToBwipMap[code_type as keyof typeof BarcodeFormat]
  );
};

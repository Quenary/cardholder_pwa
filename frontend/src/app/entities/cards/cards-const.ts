import type { BarcodeFormat } from '@zxing/browser';
import type bwip from '@bwip-js/browser';
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
export const ZxingToBwipMap: Record<
  keyof typeof BarcodeFormat,
  (keyof typeof EBwipBcid & keyof typeof bwip) | null
> = {
  // 2D barcodes
  AZTEC: 'azteccode',
  DATA_MATRIX: 'datamatrix',
  MAXICODE: 'maxicode',
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
  RSS_14: null,
  RSS_EXPANDED: null,
};

/**
 * Check if code type is supported
 * @param code_type code type
 * @returns
 */
export const isValidCodeType = (code_type: string): boolean => {
  return !!code_type && (code_type in EBwipBcid || code_type in ZxingToBwipMap);
};

/**
 * Enum of bwip-js supported codes.
 * It is also the
 */
export enum EBwipBcid {
  auspost = 'auspost',
  azteccode = 'azteccode',
  azteccodecompact = 'azteccodecompact',
  aztecrune = 'aztecrune',
  bc412 = 'bc412',
  channelcode = 'channelcode',
  codablockf = 'codablockf',
  code11 = 'code11',
  code128 = 'code128',
  code16k = 'code16k',
  code2of5 = 'code2of5',
  code32 = 'code32',
  code39 = 'code39',
  code39ext = 'code39ext',
  code49 = 'code49',
  code93 = 'code93',
  code93ext = 'code93ext',
  codeone = 'codeone',
  coop2of5 = 'coop2of5',
  daft = 'daft',
  databarexpanded = 'databarexpanded',
  databarexpandedcomposite = 'databarexpandedcomposite',
  databarexpandedstacked = 'databarexpandedstacked',
  databarexpandedstackedcomposite = 'databarexpandedstackedcomposite',
  databarlimited = 'databarlimited',
  databarlimitedcomposite = 'databarlimitedcomposite',
  databaromni = 'databaromni',
  databaromnicomposite = 'databaromnicomposite',
  databarstacked = 'databarstacked',
  databarstackedcomposite = 'databarstackedcomposite',
  databarstackedomni = 'databarstackedomni',
  databarstackedomnicomposite = 'databarstackedomnicomposite',
  databartruncated = 'databartruncated',
  databartruncatedcomposite = 'databartruncatedcomposite',
  datalogic2of5 = 'datalogic2of5',
  datamatrix = 'datamatrix',
  datamatrixrectangular = 'datamatrixrectangular',
  datamatrixrectangularextension = 'datamatrixrectangularextension',
  dotcode = 'dotcode',
  ean13 = 'ean13',
  ean13composite = 'ean13composite',
  ean14 = 'ean14',
  ean2 = 'ean2',
  ean5 = 'ean5',
  ean8 = 'ean8',
  ean8composite = 'ean8composite',
  flattermarken = 'flattermarken',
  'gs1-128' = 'gs1-128',
  'gs1-128composite' = 'gs1-128composite',
  'gs1-cc' = 'gs1-cc',
  gs1datamatrix = 'gs1datamatrix',
  gs1datamatrixrectangular = 'gs1datamatrixrectangular',
  gs1dldatamatrix = 'gs1dldatamatrix',
  gs1dlqrcode = 'gs1dlqrcode',
  gs1dotcode = 'gs1dotcode',
  gs1northamericancoupon = 'gs1northamericancoupon',
  gs1qrcode = 'gs1qrcode',
  hanxin = 'hanxin',
  hibcazteccode = 'hibcazteccode',
  hibccodablockf = 'hibccodablockf',
  hibccode128 = 'hibccode128',
  hibccode39 = 'hibccode39',
  hibcdatamatrix = 'hibcdatamatrix',
  hibcdatamatrixrectangular = 'hibcdatamatrixrectangular',
  hibcmicropdf417 = 'hibcmicropdf417',
  hibcpdf417 = 'hibcpdf417',
  hibcqrcode = 'hibcqrcode',
  iata2of5 = 'iata2of5',
  identcode = 'identcode',
  industrial2of5 = 'industrial2of5',
  interleaved2of5 = 'interleaved2of5',
  isbn = 'isbn',
  ismn = 'ismn',
  issn = 'issn',
  itf14 = 'itf14',
  japanpost = 'japanpost',
  kix = 'kix',
  leitcode = 'leitcode',
  mailmark = 'mailmark',
  mands = 'mands',
  matrix2of5 = 'matrix2of5',
  maxicode = 'maxicode',
  micropdf417 = 'micropdf417',
  microqrcode = 'microqrcode',
  msi = 'msi',
  onecode = 'onecode',
  pdf417 = 'pdf417',
  pdf417compact = 'pdf417compact',
  pharmacode = 'pharmacode',
  pharmacode2 = 'pharmacode2',
  planet = 'planet',
  plessey = 'plessey',
  posicode = 'posicode',
  postnet = 'postnet',
  pzn = 'pzn',
  qrcode = 'qrcode',
  rationalizedCodabar = 'rationalizedCodabar',
  raw = 'raw',
  rectangularmicroqrcode = 'rectangularmicroqrcode',
  royalmail = 'royalmail',
  sscc18 = 'sscc18',
  swissqrcode = 'swissqrcode',
  symbol = 'symbol',
  telepen = 'telepen',
  telepennumeric = 'telepennumeric',
  ultracode = 'ultracode',
  upca = 'upca',
  upcacomposite = 'upcacomposite',
  upce = 'upce',
  upcecomposite = 'upcecomposite',
}

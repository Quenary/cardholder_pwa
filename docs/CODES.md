# Supported codes

The app reads and shows the common 2D codes (for example QR) and 1D codes (for example barcodes).

## Scanning

- [zxing-js/browser](https://github.com/zxing-js/browser) and [quagga2](https://github.com/ericblade/quagga2) decode the camera image.
- [tapirscan](https://github.com/kleinicke/tapirscan) decodes codes that are rotated or seen at an angle. Its WebAssembly is downloaded the first time the scanner is used, so a first use without a network falls back to the other decoders.

## Display

[bwip-js](https://github.com/metafloor/bwip-js) draws the code. A value and type entered by hand are drawn when bwip-js supports that type.

## Format lists

- [zxing-js](https://github.com/zxing-js/library?tab=readme-ov-file#supported-formats)
- [quagga2](https://github.com/ericblade/quagga2/tree/master/src/reader)
- [tapirscan](https://github.com/kleinicke/tapirscan/blob/main/docs/FORMATS.md)
- [bwip-js](https://github.com/metafloor/bwip-js/wiki/BWIPP-Barcode-Types)

zxing often misses a light code on a dark background. The other decoders can have the same trouble.

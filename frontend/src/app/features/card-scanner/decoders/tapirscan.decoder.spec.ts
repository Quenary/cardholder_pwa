import type { Scanner } from 'tapirscan/browser/medium';
import { browserSupported } from 'tapirscan/support';
import { EBwipBcid } from 'src/app/entities/cards/cards-const';
import { TapirscanDecoder } from './tapirscan.decoder';

vi.mock('tapirscan/support', () => ({ browserSupported: vi.fn(() => true) }));

function createScannerMock(barcodes: object[] = []) {
  return {
    scan: vi.fn().mockResolvedValue({ barcodes }),
    dispose: vi.fn(),
  };
}

/** A decoder whose scanner has loaded. */
async function loaded(scanner: ReturnType<typeof createScannerMock>) {
  const decoder = new TapirscanDecoder(() =>
    Promise.resolve(scanner as unknown as Scanner),
  );
  await decoder.decode(frame);
  return decoder;
}

const frame = document.createElement('canvas');

describe('TapirscanDecoder', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('loads once prepared and is unavailable until loaded', async () => {
    let resolve: (scanner: Scanner) => void;
    const create = vi.fn(() => new Promise<Scanner>((r) => (resolve = r)));
    const decoder = new TapirscanDecoder(create);
    expect(create).not.toHaveBeenCalled();

    decoder.prepare();
    decoder.prepare();
    expect(decoder.available).toBe(false);
    expect(await decoder.decode(frame)).toBeNull();

    const scanner = createScannerMock([
      { format: 'EAN13', text: '4006381333931' },
    ]);
    resolve(scanner as unknown as Scanner);
    await Promise.resolve();

    expect(decoder.available).toBe(true);
    expect(await decoder.decode(frame)).toEqual({
      code: '4006381333931',
      type: EBwipBcid.ean13,
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('adds back the Codabar start and stop letters', async () => {
    const decoder = await loaded(
      createScannerMock([
        { format: 'Codabar', text: '40156', codabarStartStop: 'AB' },
      ]),
    );

    expect(await decoder.decode(frame)).toEqual({
      code: 'A40156B',
      type: EBwipBcid.rationalizedCodabar,
    });
  });

  it('drops a format it does not map', async () => {
    const decoder = await loaded(
      createScannerMock([{ format: 'DataBar', text: '0112345678901231' }]),
    );

    expect(await decoder.decode(frame)).toBeNull();
  });

  it('returns the first mapped barcode of several', async () => {
    const decoder = await loaded(
      createScannerMock([
        { format: 'DataBar', text: '0112345678901231' },
        { format: 'QRCode', text: 'first' },
        { format: 'Code128', text: 'second' },
      ]),
    );

    expect(await decoder.decode(frame)).toEqual({
      code: 'first',
      type: EBwipBcid.qrcode,
    });
  });

  it('stays unavailable when it cannot load', async () => {
    const create = vi.fn().mockRejectedValue(new Error('offline'));
    const decoder = new TapirscanDecoder(create);

    await decoder.decode(frame);
    await Promise.resolve();

    expect(decoder.available).toBe(false);
    expect(await decoder.decode(frame)).toBeNull();
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('never loads where the browser cannot run it', async () => {
    vi.mocked(browserSupported).mockReturnValueOnce(false);
    const create = vi.fn();
    const decoder = new TapirscanDecoder(create);

    decoder.prepare();
    expect(decoder.available).toBe(false);
    expect(await decoder.decode(frame)).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it('is dead after its first scan error', async () => {
    const scanner = createScannerMock();
    scanner.scan.mockRejectedValue(new Error('worker died'));
    const decoder = await loaded(scanner);

    expect(await decoder.decode(frame)).toBeNull();
    expect(await decoder.decode(frame)).toBeNull();

    expect(decoder.available).toBe(false);
    expect(scanner.scan).toHaveBeenCalledTimes(1);
    expect(scanner.dispose).toHaveBeenCalledTimes(1);
  });

  it('disposes its scanner, also one that loads after dispose', async () => {
    const scanner = createScannerMock();
    const decoder = await loaded(scanner);
    decoder.dispose();
    expect(scanner.dispose).toHaveBeenCalledTimes(1);

    let resolve: (scanner: Scanner) => void;
    const late = createScannerMock();
    const loading = new TapirscanDecoder(
      () => new Promise<Scanner>((r) => (resolve = r)),
    );
    await loading.decode(frame);
    loading.dispose();
    resolve(late as unknown as Scanner);
    await Promise.resolve();

    expect(late.dispose).toHaveBeenCalledTimes(1);
  });

  describe('waitMs', () => {
    afterEach(() => vi.useRealTimers());

    it('waits for the scanner to load', async () => {
      const scanner = createScannerMock([{ format: 'QRCode', text: 'late' }]);
      const decoder = new TapirscanDecoder(
        () =>
          new Promise<Scanner>((r) =>
            setTimeout(() => r(scanner as unknown as Scanner), 10),
          ),
      );

      expect(await decoder.decode(frame, 1000)).toEqual({
        code: 'late',
        type: EBwipBcid.qrcode,
      });
    });

    it('gives up after waitMs', async () => {
      vi.useFakeTimers();
      const decoder = new TapirscanDecoder(
        () => new Promise<Scanner>(() => undefined),
      );

      const result = decoder.decode(frame, 1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(await result).toBeNull();
    });
  });
});

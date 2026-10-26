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

/** Lets pending promises settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

/** A decoder whose scanner has loaded. */
async function loaded(scanner: ReturnType<typeof createScannerMock>) {
  const decoder = new TapirscanDecoder(() =>
    Promise.resolve(scanner as unknown as Scanner),
  );
  decoder.prepare();
  await settle();
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
    await settle();

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

  it('is unavailable after a failed load and retries when prepared', async () => {
    const scanner = createScannerMock([{ format: 'QRCode', text: 'online' }]);
    const create = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(scanner);
    const decoder = new TapirscanDecoder(create);

    decoder.prepare();
    decoder.prepare();
    await settle();
    expect(decoder.available).toBe(false);
    expect(create).toHaveBeenCalledTimes(1);

    decoder.prepare();
    await settle();

    expect(create).toHaveBeenCalledTimes(2);
    expect(await decoder.decode(frame)).toEqual({
      code: 'online',
      type: EBwipBcid.qrcode,
    });
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

  it('is unavailable after a scan error until prepared again', async () => {
    const dead = createScannerMock();
    dead.scan.mockRejectedValue(new Error('worker died'));
    const fresh = createScannerMock([{ format: 'QRCode', text: 'again' }]);
    const create = vi.fn().mockResolvedValueOnce(dead).mockResolvedValue(fresh);
    const decoder = new TapirscanDecoder(create);
    decoder.prepare();
    await settle();

    expect(await decoder.decode(frame)).toBeNull();
    expect(await decoder.decode(frame)).toBeNull();
    expect(decoder.available).toBe(false);
    expect(dead.scan).toHaveBeenCalledTimes(1);
    expect(dead.dispose).toHaveBeenCalledTimes(1);

    decoder.prepare();
    await settle();

    expect(await decoder.decode(frame)).toEqual({
      code: 'again',
      type: EBwipBcid.qrcode,
    });
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
      decoder.prepare();

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
      decoder.prepare();

      const result = decoder.decode(frame, 1000);
      await vi.advanceTimersByTimeAsync(1000);

      expect(await result).toBeNull();
    });
  });
});

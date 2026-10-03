import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardScannerComponent, ECameraError } from './card-scanner.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import {
  createBarcodeDecoderMock,
  createBarcodeDecodingServiceMock,
  createHapticsServiceMock,
  createMatBottomSheetMock,
  createMatDialogRefMock,
  createMediaDevicesServiceMock,
  createMediaStreamMock,
  createSnackServiceMock,
  ITestAppState,
  samsungDevices,
  testAppState,
  testMediaDevices,
} from 'src/testing';
import { SnackService } from 'src/app/core/services/snack.service';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { MediaDevicesService } from 'src/app/core/services/media-devices.service';
import { Mocked } from 'vitest';
import { provideTranslateService } from '@ngx-translate/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { of } from 'rxjs';
import { BarcodeDecodingService } from './decoders/barcode-decoding.service';
import { HapticsService } from 'src/app/core/services/haptics.service';
import { EBwipBcid } from 'src/app/entities/cards/cards-const';

describe('CardScannerComponent', () => {
  let component: CardScannerComponent;
  let fixture: ComponentFixture<CardScannerComponent>;

  let matDialogRefMock: ReturnType<typeof createMatDialogRefMock>;
  let matBottomSheetMock: ReturnType<typeof createMatBottomSheetMock>;
  let snackServiceMock: ReturnType<typeof createSnackServiceMock>;
  let mediaDevicesServiceMock: Partial<Mocked<MediaDevicesService>>;
  let decodingServiceMock: Partial<Mocked<BarcodeDecodingService>>;
  let hapticsServiceMock: Partial<Mocked<HapticsService>>;
  let initialState: ITestAppState;

  beforeEach(async () => {
    // The scanner remembers the camera that worked, so a test that opened one
    // would otherwise decide what the next test opens.
    localStorage.clear();
    initialState = { ...testAppState };
    matDialogRefMock = createMatDialogRefMock();
    matBottomSheetMock = createMatBottomSheetMock();
    snackServiceMock = createSnackServiceMock();
    mediaDevicesServiceMock = createMediaDevicesServiceMock();
    decodingServiceMock = createBarcodeDecodingServiceMock();
    hapticsServiceMock = createHapticsServiceMock();

    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([]),
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MatBottomSheet, useValue: matBottomSheetMock },
        { provide: SnackService, useValue: snackServiceMock },
        { provide: MediaDevicesService, useValue: mediaDevicesServiceMock },
        { provide: BarcodeDecodingService, useValue: decodingServiceMock },
        { provide: HapticsService, useValue: hapticsServiceMock },
        provideTranslateService(),
        provideZonelessChangeDetection(),
      ],
      imports: [CardScannerComponent],
    }).compileComponents();
  });

  /** Serves a camera and a device list, then brings the component up. */
  const create = async (deviceId?: string, torch = false) => {
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
      createMediaStreamMock(deviceId, torch).stream,
    );
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
      testMediaDevices,
    );
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenRenderingDone();
    TestBed.tick();
  };

  it('should create', async () => {
    await create('backcamera2');
    expect(component).toBeTruthy();
  });

  /** Brings the component up against a camera that refuses to open. */
  const createWithError = async (name: string) => {
    mediaDevicesServiceMock.getUserMedia.mockRejectedValue({ name });
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue([]);
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.tick();
    fixture.detectChanges();
  };

  describe('camera errors', () => {
    it('maps NotAllowedError to DENIED and NotFoundError to UNAVAILABLE', async () => {
      await createWithError('NotAllowedError');
      expect(component['cameraError']()).toEqual(ECameraError.DENIED);

      await createWithError('NotFoundError');
      expect(component['cameraError']()).toEqual(ECameraError.UNAVAILABLE);
    });

    it('stops starting and shows an error', async () => {
      await createWithError('NotAllowedError');

      expect(component['isStarting']()).toEqual(false);
      expect(
        fixture.nativeElement.querySelector('.mat-dialog-content-error'),
      ).toBeTruthy();
    });

    it('still offers picking from a file', async () => {
      await createWithError('NotAllowedError');

      const fromFile = [
        ...fixture.nativeElement.querySelectorAll('mat-dialog-actions button'),
      ].find((button: HTMLButtonElement) =>
        button.classList.contains('accent-color'),
      ) as HTMLButtonElement;
      expect(fromFile).toBeTruthy();
      expect(fromFile.disabled).toEqual(false);
    });

    describe('onRetry', () => {
      it('clears the error after a successful open', async () => {
        await createWithError('NotAllowedError');
        mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
          createMediaStreamMock('backcamera2').stream,
        );
        mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
          testMediaDevices,
        );

        component['onRetry']();
        await fixture.whenStable();

        expect(component['cameraError']()).toBeNull();
      });
    });
  });

  describe('first open', () => {
    it('lets the platform pick facingMode environment', async () => {
      await create('backcamera2');

      const constraints = mediaDevicesServiceMock.getUserMedia.mock.calls[0][0];
      const video = constraints.video as MediaTrackConstraints;
      expect(video.facingMode).toEqual({ ideal: 'environment' });
      expect(video.deviceId).toBeUndefined();
    });

    it('applies ideal resolution after open, not in getUserMedia', async () => {
      const { stream, track } = createMediaStreamMock('backcamera2');
      mediaDevicesServiceMock.getUserMedia.mockResolvedValue(stream);
      mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
        testMediaDevices,
      );
      fixture = TestBed.createComponent(CardScannerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      TestBed.tick();

      // An "ideal" width in the request is a term in the fitness distance the
      // browser ranks cameras by, so it belongs after the camera is chosen.
      const video = mediaDevicesServiceMock.getUserMedia.mock.calls[0][0]
        .video as MediaTrackConstraints;
      expect(video.width).toBeUndefined();
      expect(video.height).toBeUndefined();
      expect(track.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }),
      );
    });

    it('resolves selectedDevice from granted device id', async () => {
      await create('backcamera2');

      expect(component['selectedDevice']()).toEqual(testMediaDevices[3]);
    });

    it('falls back to label when device id is missing', async () => {
      await create(undefined);

      expect(component['selectedDevice']()).toEqual(testMediaDevices[2]);
    });
  });

  describe('camera picker', () => {
    it('lists only videoinput devices', async () => {
      await create('backcamera2');

      expect(
        component['cameras']().map((camera) => camera.device.deviceId),
      ).toEqual(['frontcamera1', 'backcamera1', 'backcamera2']);
    });

    it('labels the running camera', async () => {
      await create('backcamera2');

      expect(component['selectedLabel']()).toEqual('Back camera');
    });

    it('keeps the stream when the same device is picked', async () => {
      await create('backcamera2');
      matBottomSheetMock.open.mockReturnValue({
        afterDismissed: () => of({ device: testMediaDevices[3] }),
      } as never);

      component['onClickSelectDevice']();
      await fixture.whenStable();

      expect(mediaDevicesServiceMock.getUserMedia).toHaveBeenCalledTimes(1);
    });

    it('stops the track before switching device', async () => {
      const first = createMediaStreamMock('backcamera2');
      mediaDevicesServiceMock.getUserMedia.mockResolvedValue(first.stream);
      mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
        testMediaDevices,
      );
      fixture = TestBed.createComponent(CardScannerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      TestBed.tick();

      matBottomSheetMock.open.mockReturnValue({
        afterDismissed: () => of({ device: testMediaDevices[0] }),
      } as never);
      mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
        createMediaStreamMock('frontcamera1').stream,
      );

      component['onClickSelectDevice']();
      await fixture.whenStable();

      expect(first.track.stop).toHaveBeenCalled();
      expect(mediaDevicesServiceMock.getUserMedia).toHaveBeenCalledTimes(2);
      const constraints = mediaDevicesServiceMock.getUserMedia.mock.calls[1][0];
      expect((constraints.video as MediaTrackConstraints).deviceId).toEqual({
        exact: 'frontcamera1',
      });
    });
  });

  describe('decodeNextFrame', () => {
    it('rotates through decoders', async () => {
      const first = createBarcodeDecoderMock('first');
      const second = createBarcodeDecoderMock('second');
      decodingServiceMock.createDecoders.mockResolvedValue([first, second]);
      await create('backcamera2');
      // Stands in for the live camera, which delivers no frame under test.
      vi.spyOn(
        component as unknown as { grabFrame: () => HTMLCanvasElement },
        'grabFrame',
      ).mockReturnValue(document.createElement('canvas'));

      await component['decodeNextFrame']();
      await component['decodeNextFrame']();
      await component['decodeNextFrame']();

      expect(first.decode).toHaveBeenCalledTimes(2);
      expect(second.decode).toHaveBeenCalledTimes(1);
    });
  });

  describe('onResult', () => {
    it('closes the dialog with the code', async () => {
      await create('backcamera2');

      component['onResult']({ code: '12345', type: EBwipBcid.code128 });

      expect(matDialogRefMock.close).toHaveBeenCalledWith({
        text: '12345',
        format: EBwipBcid.code128,
      });
    });

    it('triggers haptic confirm', async () => {
      await create('backcamera2');

      component['onResult']({ code: '12345', type: EBwipBcid.code128 });

      expect(hapticsServiceMock.confirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('decodeFromFile', () => {
    it('shows an error when no code is found', async () => {
      await create('backcamera2');
      vi.spyOn(
        component as unknown as {
          drawImage: () => Promise<HTMLCanvasElement>;
        },
        'drawImage',
      ).mockResolvedValue(document.createElement('canvas'));
      decodingServiceMock.decodeAll.mockResolvedValue(null);

      const input = { files: [new File([], 'card.png')], value: 'card.png' };
      await component['decodeFromFile']({
        target: input,
      } as unknown as Event & { target: HTMLInputElement });

      expect(snackServiceMock.error).toHaveBeenCalledTimes(1);
      expect(matDialogRefMock.close).not.toHaveBeenCalled();
      // Reset so picking the very same file again still fires change.
      expect(input.value).toEqual('');
    });

    it('closes with a decoded code', async () => {
      await create('backcamera2');
      vi.spyOn(
        component as unknown as {
          drawImage: () => Promise<HTMLCanvasElement>;
        },
        'drawImage',
      ).mockResolvedValue(document.createElement('canvas'));
      decodingServiceMock.decodeAll.mockResolvedValue({
        code: '67890',
        type: EBwipBcid.ean13,
      });

      await component['decodeFromFile']({
        target: { files: [new File([], 'card.png')], value: 'card.png' },
      } as unknown as Event & { target: HTMLInputElement });

      expect(matDialogRefMock.close).toHaveBeenCalledWith({
        text: '67890',
        format: EBwipBcid.ean13,
      });
    });
  });

  describe('onVideoPlaying', () => {
    it('shows the viewfinder frame', async () => {
      await create('backcamera2');
      const frame = () =>
        fixture.nativeElement.querySelector(
          '.mat-dialog-content-viewfinder-frame',
        );

      expect(component['isStarting']()).toEqual(true);
      expect(frame()).toBeFalsy();

      component['onVideoPlaying']();
      fixture.detectChanges();

      expect(frame()).toBeTruthy();
    });
  });

  describe('torch', () => {
    it('hides control when unsupported', async () => {
      await create('backcamera2');

      expect(component['hasTorch']()).toEqual(false);
      expect(
        fixture.nativeElement.querySelector(
          'mat-dialog-actions button[mat-icon-button]',
        ),
      ).toBeFalsy();
    });

    it('shows control when supported', async () => {
      await create('backcamera2', true);

      expect(component['hasTorch']()).toEqual(true);
      expect(
        fixture.nativeElement.querySelector(
          'mat-dialog-actions button[mat-icon-button]',
        ),
      ).toBeTruthy();
    });

    describe('toggleTorch', () => {
      it('toggles torch constraints', async () => {
        const { stream, track } = createMediaStreamMock('backcamera2', true);
        mediaDevicesServiceMock.getUserMedia.mockResolvedValue(stream);
        mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
          testMediaDevices,
        );
        fixture = TestBed.createComponent(CardScannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        TestBed.tick();

        await component['toggleTorch']();
        expect(track.applyConstraints).toHaveBeenCalledWith({
          advanced: [{ torch: true }],
        });
        expect(component['isTorchOn']()).toEqual(true);

        await component['toggleTorch']();
        expect(track.applyConstraints).toHaveBeenLastCalledWith({
          advanced: [{ torch: false }],
        });
        expect(component['isTorchOn']()).toEqual(false);
      });

      it('disables torch when constraints fail', async () => {
        const { stream, track } = createMediaStreamMock('backcamera2', true);
        track.applyConstraints.mockRejectedValue(new Error('unsupported'));
        mediaDevicesServiceMock.getUserMedia.mockResolvedValue(stream);
        mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
          testMediaDevices,
        );
        fixture = TestBed.createComponent(CardScannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        TestBed.tick();

        await component['toggleTorch']();

        expect(component['hasTorch']()).toEqual(false);
        expect(component['isTorchOn']()).toEqual(false);
      });
    });

    it('re-reads torch after switching camera', async () => {
      await create('backcamera2', true);
      expect(component['hasTorch']()).toEqual(true);

      matBottomSheetMock.open.mockReturnValue({
        afterDismissed: () => of({ device: testMediaDevices[0] }),
      } as never);
      // Front cameras rarely have a lamp.
      mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
        createMediaStreamMock('frontcamera1', false).stream,
      );

      component['onClickSelectDevice']();
      await fixture.whenStable();

      expect(component['hasTorch']()).toEqual(false);
    });
  });

  describe('autofocus camera selection', () => {
    /**
     * Serves the Samsung camera set: the granted rear camera reports manual
     * focus alone, the other rear one reports continuous.
     */
    const givenSamsung = () => {
      const fixed = createMediaStreamMock('back-fixed', false, ['manual']);
      const main = createMediaStreamMock('back-main', true, [
        'manual',
        'single-shot',
        'continuous',
      ]);
      mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
        samsungDevices,
      );
      mediaDevicesServiceMock.getUserMedia.mockImplementation(
        (constraints: MediaStreamConstraints) => {
          const video = constraints.video as MediaTrackConstraints;
          const wanted = (video?.deviceId as ConstrainDOMStringParameters)
            ?.exact;
          if (wanted === 'back-main') {
            return Promise.resolve(main.stream);
          }
          if (wanted && wanted !== 'back-fixed') {
            return Promise.reject({ name: 'NotFoundError' });
          }
          // No device id asked for: the platform grants the fixed one.
          return Promise.resolve(fixed.stream);
        },
      );
      return { fixed, main };
    };

    const bring = async () => {
      fixture = TestBed.createComponent(CardScannerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      TestBed.tick();
    };

    it('switches away from a fixed-focus grant', async () => {
      givenSamsung();

      await bring();

      expect(component['getStreamDeviceId']()).toEqual('back-main');
    });

    it('keeps the grant when it already supports continuous focus', async () => {
      mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
        samsungDevices,
      );
      mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
        createMediaStreamMock('back-fixed', false, ['manual', 'continuous'])
          .stream,
      );

      await bring();

      expect(component['getStreamDeviceId']()).toEqual('back-fixed');
      // No probing was needed, so only the first open happened.
      expect(mediaDevicesServiceMock.getUserMedia).toHaveBeenCalledTimes(1);
    });

    it('requests continuous focus on the main sensor', async () => {
      const { main } = givenSamsung();

      await bring();

      expect(main.track.applyConstraints).toHaveBeenCalledWith(
        expect.objectContaining({
          advanced: [{ focusMode: 'continuous' }],
        }),
      );
    });

    it('exposes torch from the camera it moved to', async () => {
      givenSamsung();

      await bring();

      // The fixed focus camera has no lamp; the main one does.
      expect(component['hasTorch']()).toEqual(true);
    });

    it('reopens the remembered device on the next visit', async () => {
      givenSamsung();
      await bring();
      expect(component['getStreamDeviceId']()).toEqual('back-main');
      const firstRun = mediaDevicesServiceMock.getUserMedia.mock.calls.length;

      // Second visit, same phone, storage kept.
      await bring();

      expect(component['getStreamDeviceId']()).toEqual('back-main');
      const secondRun =
        mediaDevicesServiceMock.getUserMedia.mock.calls.length - firstRun;
      expect(secondRun).toEqual(1);
      const constraints =
        mediaDevicesServiceMock.getUserMedia.mock.calls[firstRun][0];
      expect((constraints.video as MediaTrackConstraints).deviceId).toEqual({
        exact: 'back-main',
      });
    });

    it('stays on the grant when no better camera exists', async () => {
      mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
        samsungDevices,
      );
      mediaDevicesServiceMock.getUserMedia.mockImplementation(() =>
        Promise.resolve(
          createMediaStreamMock('back-fixed', false, ['manual']).stream,
        ),
      );

      await bring();

      expect(component['getStreamDeviceId']()).toEqual('back-fixed');
      expect(component['cameraError']()).toBeNull();
    });
  });

  describe('ngOnDestroy', () => {
    it('stops the camera track', async () => {
      const { stream, track } = createMediaStreamMock('backcamera2');
      mediaDevicesServiceMock.getUserMedia.mockResolvedValue(stream);
      mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
        testMediaDevices,
      );
      fixture = TestBed.createComponent(CardScannerComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
      await fixture.whenStable();
      TestBed.tick();

      fixture.destroy();

      expect(track.stop).toHaveBeenCalled();
    });
  });
});

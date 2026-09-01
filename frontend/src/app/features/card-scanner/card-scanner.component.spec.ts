import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CardScannerComponent } from './card-scanner.component';
import { MatDialogRef } from '@angular/material/dialog';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import {
  createMatBottomSheetMock,
  createMatDialogRefMock,
  createSnackServiceMock,
  ITestAppState,
  testAppState,
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
import { IBarcodeDecoder } from './decoders/barcode-decoder';
import { EBwipBcid } from 'src/app/entities/cards/cards-const';

const testMediaDevices: MediaDeviceInfo[] = [
  {
    deviceId: 'frontcamera1',
    groupId: null,
    kind: 'videoinput',
    label: 'Front camera',
    toJSON: null,
  },
  {
    deviceId: 'somemicrophone',
    groupId: null,
    kind: 'audioinput',
    label: 'Some microphone',
    toJSON: null,
  },
  {
    deviceId: 'backcamera1',
    groupId: null,
    kind: 'videoinput',
    label: 'Back triple camera',
    toJSON: null,
  },
  {
    deviceId: 'backcamera2',
    groupId: null,
    kind: 'videoinput',
    label: 'Back camera',
    toJSON: null,
  },
  {
    deviceId: 'somespeaker',
    groupId: null,
    kind: 'audiooutput',
    label: 'Some speaker',
    toJSON: null,
  },
];

/** Stream stub reporting the camera the platform granted, and its stop calls. */
const createStream = (deviceId?: string, torch = false) => {
  const track = {
    getSettings: () => ({ deviceId }),
    getCapabilities: () => (torch ? { torch: true } : {}),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  } as unknown as MediaStreamTrack & {
    stop: ReturnType<typeof vi.fn>;
    applyConstraints: ReturnType<typeof vi.fn>;
  };
  const stream = {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track };
};

/** Decoder stub reading the given code, or nothing at all. */
const createDecoder = (name: string, code?: string) =>
  ({
    name,
    decode: vi
      .fn()
      .mockResolvedValue(code ? { code, type: EBwipBcid.code128 } : null),
  }) as unknown as IBarcodeDecoder & { decode: ReturnType<typeof vi.fn> };

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
    initialState = { ...testAppState };
    matDialogRefMock = createMatDialogRefMock();
    matBottomSheetMock = createMatBottomSheetMock();
    snackServiceMock = createSnackServiceMock();
    mediaDevicesServiceMock = {
      getUserMedia: vi.fn(),
      enumerateDevices: vi.fn(),
    };
    decodingServiceMock = {
      createDecoders: vi.fn().mockResolvedValue([]),
      decodeAll: vi.fn().mockResolvedValue(null),
    };
    hapticsServiceMock = { confirm: vi.fn() };

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
      createStream(deviceId, torch).stream,
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

  it('should show an error on denied permission', async () => {
    mediaDevicesServiceMock.getUserMedia.mockRejectedValue(null);
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue([]);
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    TestBed.tick();

    expect(mediaDevicesServiceMock.getUserMedia).toHaveBeenCalledTimes(1);
    expect(snackServiceMock.error).toHaveBeenCalledTimes(1);
  });

  it('should let the platform pick the camera on the first open', async () => {
    await create('backcamera2');

    const constraints = mediaDevicesServiceMock.getUserMedia.mock.calls[0][0];
    const video = constraints.video as MediaTrackConstraints;
    expect(video.facingMode).toEqual({ ideal: 'environment' });
    expect(video.deviceId).toBeUndefined();
  });

  it('should name the camera granted by the platform', async () => {
    await create('backcamera2');

    expect(component['selectedDevice']()).toEqual(testMediaDevices[3]);
  });

  it('should fall back to the label when no device id is reported', async () => {
    await create(undefined);

    expect(component['selectedDevice']()).toEqual(testMediaDevices[2]);
  });

  it('should offer only the cameras in the picker', async () => {
    await create('backcamera2');

    expect(component['devices']().map((device) => device.deviceId)).toEqual([
      'frontcamera1',
      'backcamera1',
      'backcamera2',
    ]);
  });

  it('should keep the stream when the picker returns the running camera', async () => {
    await create('backcamera2');
    matBottomSheetMock.open.mockReturnValue({
      afterDismissed: () => of({ device: testMediaDevices[3] }),
    } as never);

    component['onClickSelectDevice']();
    await fixture.whenStable();

    expect(mediaDevicesServiceMock.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('should release the running camera before opening another', async () => {
    const first = createStream('backcamera2');
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
      createStream('frontcamera1').stream,
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

  it('should take the decoders in turn on successive frames', async () => {
    const first = createDecoder('first');
    const second = createDecoder('second');
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

  it('should close with the code once a decoder reads one', async () => {
    await create('backcamera2');

    component['onResult']({ code: '12345', type: EBwipBcid.code128 });

    expect(matDialogRefMock.close).toHaveBeenCalledWith({
      text: '12345',
      format: EBwipBcid.code128,
    });
  });

  it('should report a picked image that holds no code', async () => {
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

  it('should close with the code read from a picked image', async () => {
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

  it('should confirm a read code by touch', async () => {
    await create('backcamera2');

    component['onResult']({ code: '12345', type: EBwipBcid.code128 });

    expect(hapticsServiceMock.confirm).toHaveBeenCalledTimes(1);
  });

  it('should show the viewfinder once the camera is running', async () => {
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

  it('should offer no light when the camera reports none', async () => {
    await create('backcamera2');

    expect(component['hasTorch']()).toEqual(false);
    expect(
      fixture.nativeElement.querySelector(
        'mat-dialog-actions button[mat-icon-button]',
      ),
    ).toBeFalsy();
  });

  it('should offer the light when the camera reports one', async () => {
    await create('backcamera2', true);

    expect(component['hasTorch']()).toEqual(true);
    expect(
      fixture.nativeElement.querySelector(
        'mat-dialog-actions button[mat-icon-button]',
      ),
    ).toBeTruthy();
  });

  it('should switch the light on and back off', async () => {
    const { stream, track } = createStream('backcamera2', true);
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

  it('should withdraw the light when the camera refuses it', async () => {
    const { stream, track } = createStream('backcamera2', true);
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

  it('should read the light again when another camera is picked', async () => {
    await create('backcamera2', true);
    expect(component['hasTorch']()).toEqual(true);

    matBottomSheetMock.open.mockReturnValue({
      afterDismissed: () => of({ device: testMediaDevices[0] }),
    } as never);
    // Front cameras rarely have a lamp.
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
      createStream('frontcamera1', false).stream,
    );

    component['onClickSelectDevice']();
    await fixture.whenStable();

    expect(component['hasTorch']()).toEqual(false);
  });

  it('should release the camera when the dialog is destroyed', async () => {
    const { stream, track } = createStream('backcamera2');
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

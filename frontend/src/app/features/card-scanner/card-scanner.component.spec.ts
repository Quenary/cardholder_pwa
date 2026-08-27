import {
  ComponentFixture,
  DeferBlockState,
  TestBed,
} from '@angular/core/testing';
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
import { NEVER, of } from 'rxjs';

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

/** Stream stub exposing the camera the platform granted. */
const grantedStream = (deviceId: string) => {
  const track = {
    getSettings: () => ({ deviceId }),
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
  return {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
};

describe('CardScannerComponent', () => {
  let component: CardScannerComponent;
  let fixture: ComponentFixture<CardScannerComponent>;

  let matDialogRefMock: ReturnType<typeof createMatDialogRefMock>;
  let matBottomSheetMock: ReturnType<typeof createMatBottomSheetMock>;
  let snackServiceMock: ReturnType<typeof createSnackServiceMock>;
  let mediaDevicesServiceMock: Partial<Mocked<MediaDevicesService>>;
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

    await TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState }),
        provideRouter([]),
        { provide: MatDialogRef, useValue: matDialogRefMock },
        { provide: MatBottomSheet, useValue: matBottomSheetMock },
        { provide: SnackService, useValue: snackServiceMock },
        { provide: MediaDevicesService, useValue: mediaDevicesServiceMock },
        provideTranslateService(),
        provideZonelessChangeDetection(),
      ],
      imports: [CardScannerComponent],
    }).compileComponents();
  });

  it('should create', () => {
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(null);
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
      testMediaDevices,
    );
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show an error on denied permission', async () => {
    mediaDevicesServiceMock.getUserMedia.mockRejectedValue(null);
    mediaDevicesServiceMock.enumerateDevices.mockRejectedValue(null);
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(mediaDevicesServiceMock.getUserMedia).toHaveBeenCalledTimes(1);
    expect(mediaDevicesServiceMock.enumerateDevices).toHaveBeenCalledTimes(0);
    expect(snackServiceMock.error).toHaveBeenCalledTimes(1);
  });

  it('should default to the camera granted by the platform', async () => {
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
      grantedStream('backcamera2'),
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

    expect(component['selectedDevice']()).toEqual(testMediaDevices[3]);
  });

  it('should fall back to the label when no device id is reported', async () => {
    if (typeof globalThis.MediaStream === 'undefined') {
      globalThis.MediaStream = class {} as typeof MediaStream;
    }
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
      new globalThis.MediaStream(),
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

    expect(component['selectedDevice']()).toEqual(testMediaDevices[2]);
  });

  /** Brings the component up with a camera selected and timers frozen. */
  const withRunningScanner = async () => {
    vi.useFakeTimers();
    if (typeof globalThis.MediaStream === 'undefined') {
      globalThis.MediaStream = class {} as typeof MediaStream;
    }
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
      new globalThis.MediaStream(),
    );
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
      testMediaDevices,
    );
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    TestBed.tick();
  };

  it('should not start the countdown before the scanner is running', async () => {
    await withRunningScanner();

    const first = component['selectedScanner']();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']()).toEqual(first);
    vi.useRealTimers();
  });

  it('should hand over to the other scanner when nothing is read', async () => {
    await withRunningScanner();

    const first = component['selectedScanner']();
    component['onScannerStarted']();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']().code).not.toEqual(first.code);
    vi.useRealTimers();
  });

  it('should hand over only once', async () => {
    await withRunningScanner();

    component['onScannerStarted']();
    await vi.advanceTimersByTimeAsync(6000);
    const afterFirst = component['selectedScanner']();

    component['onScannerStarted']();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']()).toEqual(afterFirst);
    vi.useRealTimers();
  });

  it('should leave a manual scanner choice alone', async () => {
    await withRunningScanner();

    const chosen = component['scanners'][1];
    component['onSelectScanner'](chosen);
    component['onScannerStarted']();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']()).toEqual(chosen);
    vi.useRealTimers();
  });

  it('should keep the active scanner when its toggle is clicked', async () => {
    await withRunningScanner();
    component['onScannerStarted']();

    const active = component['selectedScanner']();
    const toggle: HTMLElement = fixture.nativeElement.querySelector(
      'mat-button-toggle-group mat-button-toggle button',
    );
    expect(toggle).toBeTruthy();
    toggle.click();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']()).toEqual(active);
    vi.useRealTimers();
  });

  it('should hold the countdown while the file picker is open', async () => {
    await withRunningScanner();
    component['onScannerStarted']();

    const first = component['selectedScanner']();
    component['onPickFile']();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']()).toEqual(first);
    vi.useRealTimers();
  });

  it('should hold the countdown while the camera sheet is open', async () => {
    await withRunningScanner();
    component['onScannerStarted']();

    // sheet stays open: afterDismissed never emits
    matBottomSheetMock.open.mockReturnValue({
      afterDismissed: () => NEVER,
    } as never);

    const first = component['selectedScanner']();
    component['onClickSelectDevice']();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']()).toEqual(first);
    vi.useRealTimers();
  });

  it('should resume the countdown once the camera sheet closes', async () => {
    await withRunningScanner();
    component['onScannerStarted']();

    matBottomSheetMock.open.mockReturnValue({
      afterDismissed: () => of(undefined),
    } as never);

    const first = component['selectedScanner']();
    component['onClickSelectDevice']();
    await vi.advanceTimersByTimeAsync(6000);

    expect(component['selectedScanner']().code).not.toEqual(first.code);
    vi.useRealTimers();
  });

  it('should display scanner if permission granted', async () => {
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(null);
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
      testMediaDevices,
    );
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.whenRenderingDone();
    TestBed.tick();

    const deferBlocks = await fixture.getDeferBlocks();
    expect(deferBlocks.length).toEqual(1);

    await deferBlocks[0].render(DeferBlockState.Complete);
    expect(
      fixture.nativeElement.querySelector('app-card-scanner-zxing'),
    ).toBeTruthy();
  });
});

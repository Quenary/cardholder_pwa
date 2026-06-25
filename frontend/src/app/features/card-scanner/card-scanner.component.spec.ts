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
    deviceId: 'somespeaker',
    groupId: null,
    kind: 'audiooutput',
    label: 'Some speaker',
    toJSON: null,
  },
];

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

  it('should select first environment camera as default', async () => {
    if (typeof globalThis.MediaStream === 'undefined') {
      globalThis.MediaStream = class {} as any;
    }
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(
      new globalThis.MediaStream(),
    );
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
      testMediaDevices,
    );
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
    await fixture.whenStable();
    expect(component['selectedDevice']()).toEqual(testMediaDevices[2]);
  });

  it('should display scanner if permission granted', async () => {
    mediaDevicesServiceMock.getUserMedia.mockResolvedValue(null);
    mediaDevicesServiceMock.enumerateDevices.mockResolvedValue(
      testMediaDevices,
    );
    fixture = TestBed.createComponent(CardScannerComponent);
    component = fixture.componentInstance;
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const deferBlocks = await fixture.getDeferBlocks();
    expect(deferBlocks.length).toEqual(1);
    await deferBlocks[0].render(DeferBlockState.Complete);
    expect(
      fixture.nativeElement.querySelector('app-card-scanner-zxing'),
    ).toBeTruthy();
  });
});

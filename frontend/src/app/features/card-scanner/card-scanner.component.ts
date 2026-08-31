import {
  Component,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  PendingTasks,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { exhaustMap, filter, from, interval, Subscription, take } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import {
  MatListItem,
  MatListItemTitle,
  MatActionList,
} from '@angular/material/list';
import {
  MatBottomSheet,
  MAT_BOTTOM_SHEET_DATA,
  MatBottomSheetRef,
} from '@angular/material/bottom-sheet';
import { SnackService } from 'src/app/core/services/snack.service';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MediaDevicesService } from 'src/app/core/services/media-devices.service';
import { BarcodeDecodingService } from './decoders/barcode-decoding.service';
import { IBarcodeDecoder, IScannerResult } from './decoders/barcode-decoder';

export interface ICardScannerResult {
  text: string;
  format: string;
}

@Component({
  selector: 'app-card-scanner-device-sheet',
  imports: [MatListItem, MatListItemTitle, MatActionList],
  template: `
    <mat-action-list>
      @for (device of devices; track device.deviceId) {
      <mat-list-item (click)="onSelectDevice(device)">
        <span matListItemTitle>
          {{ device.label }}
        </span>
      </mat-list-item>
      }
    </mat-action-list>
  `,
})
export class CardScannerDeviceSheetComponent {
  private readonly matBottomSheetRef = inject(MatBottomSheetRef);
  private readonly data = inject(MAT_BOTTOM_SHEET_DATA);

  protected readonly devices: MediaDeviceInfo[] = this.data.devices ?? [];

  protected onSelectDevice(device: MediaDeviceInfo): void {
    this.matBottomSheetRef.dismiss({ device });
  }
}

/**
 * How often a frame is taken off the camera and handed to a decoder.
 *
 * Frames arriving faster than they can be decoded are dropped rather than
 * queued, so this is an upper bound on the attempt rate and not a promise.
 */
const FRAME_INTERVAL_MS = 120;

/**
 * Longest edge of the image handed to the decoders.
 *
 * Above this, the extra pixels cost more time than they buy accuracy: the
 * bars of a code held in front of the camera are already several pixels wide.
 */
const FRAME_MAX_EDGE = 1280;

/** A picked photo is decoded once, so it can afford more detail than a frame. */
const FILE_MAX_EDGE = 2048;

/**
 * Resolution asked of the camera.
 *
 * A default stream is often 640x480, which is thin for the narrow bars of a
 * 1D code. Both values are wishes: a camera that cannot honour them still
 * opens at whatever it does have.
 */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

@Component({
  selector: 'app-card-scanner',
  imports: [
    MatButton,
    TranslatePipe,
    MatIcon,
    MatDialogActions,
    MatDialogContent,
    MatProgressSpinner,
  ],
  templateUrl: './card-scanner.component.html',
  styleUrl: './card-scanner.component.scss',
})
export class CardScannerComponent implements OnDestroy {
  private readonly matDialogRef = inject(MatDialogRef);
  private readonly matBottomSheet = inject(MatBottomSheet);
  private readonly snackService = inject(SnackService);
  private readonly translateService = inject(TranslateService);
  private readonly mediaDevicesService = inject(MediaDevicesService);
  private readonly decodingService = inject(BarcodeDecodingService);
  private readonly pendingTasks = inject(PendingTasks);

  private readonly videoRef = viewChild<unknown, ElementRef<HTMLVideoElement>>(
    'video',
    { read: ElementRef },
  );

  /** Cameras offered in the picker. Only populated once permission is given. */
  protected readonly devices = signal<MediaDeviceInfo[]>([]);
  protected readonly selectedDevice = signal<MediaDeviceInfo>(null);
  /** The camera is open but not yet showing frames. */
  protected readonly isStarting = signal<boolean>(true);
  /** A picked photo is being decoded, which holds the live camera. */
  protected readonly isDecodingFile = signal<boolean>(false);

  private readonly stream = signal<MediaStream>(null);

  private decoders: IBarcodeDecoder[] = [];
  /** Rotates through the decoders, one per frame, see decodeNextFrame. */
  private decoderIndex = 0;
  private loopSubscription: Subscription = null;
  private frameCanvas: HTMLCanvasElement = null;
  /** Discards a camera that finished opening after a later one was asked for. */
  private openToken = 0;

  constructor() {
    // The video element and the stream become available in either order, so
    // the pairing waits here for both rather than happening where the camera
    // opens.
    effect(() => {
      const stream = this.stream();
      const video = this.videoRef()?.nativeElement;
      if (stream && video && video.srcObject !== stream) {
        this.attachStream(video, stream);
      }
    });
    void this.whileUnstable(() => this.start());
  }

  ngOnDestroy(): void {
    this.stopLoop();
    this.releaseStream();
    this.matBottomSheet.dismiss();
  }

  /**
   * The camera is delivering frames. Until this fires the loop is already
   * running but grabbing nothing, which is why the spinner is tied to the
   * event rather than to the stream.
   */
  protected onVideoPlaying(): void {
    this.isStarting.set(false);
  }

  protected close($event?: ICardScannerResult): void {
    this.matDialogRef.close($event);
  }

  protected onClickSelectDevice(): void {
    this.matBottomSheet
      .open(CardScannerDeviceSheetComponent, {
        data: {
          devices: this.devices(),
        },
      })
      .afterDismissed()
      .subscribe((data?: { device: MediaDeviceInfo }) => {
        const device = data?.device;
        if (device && device.deviceId !== this.selectedDevice()?.deviceId) {
          this.selectedDevice.set(device);
          void this.whileUnstable(() => this.openCamera(device.deviceId));
        }
      });
  }

  /**
   * Decodes a picked photo, spending every decoder on it: there is no next
   * frame to fall back on.
   */
  protected async decodeFromFile(
    $event: Event & { target: HTMLInputElement },
  ): Promise<void> {
    const file = $event.target.files?.[0];
    // Reset the input so picking the very same file again still fires change.
    $event.target.value = '';
    if (!file) {
      return;
    }
    this.isDecodingFile.set(true);
    this.stopLoop();
    try {
      const frame = await this.drawImage(file);
      const result = frame
        ? await this.decodingService.decodeAll(frame, this.decoders)
        : null;
      if (result) {
        this.onResult(result);
        return;
      }
      this.snackService.error(
        this.translateService.instant('CARDS.CARD.SCAN.FILE_NO_CODE'),
      );
    } finally {
      this.isDecodingFile.set(false);
      this.startLoop();
    }
  }

  private async start(): Promise<void> {
    this.decoders = await this.decodingService.createDecoders();
    await this.openCamera(null);
    await this.listDevices();
  }

  /**
   * Runs work while holding the application unstable.
   *
   * Opening a camera is asynchronous but is started from the constructor and
   * from a subscription, so without this it happens outside anything Angular
   * knows about, leaving tests and server side rendering nothing to wait on.
   */
  private async whileUnstable(work: () => Promise<void>): Promise<void> {
    const done = this.pendingTasks.add();
    try {
      await work();
    } finally {
      done();
    }
  }

  /**
   * Shows the stream and asks the element to play.
   *
   * play() is missing outside a browser and rejects where autoplay is
   * blocked. Neither is worth taking the dialog down for: the decode loop
   * reads whatever frames the element ends up holding.
   */
  private attachStream(video: HTMLVideoElement, stream: MediaStream): void {
    try {
      video.srcObject = stream;
      void Promise.resolve(video.play?.()).catch(() => undefined);
    } catch {
      this.isStarting.set(false);
    }
  }

  /**
   * Opens a camera and keeps its stream for as long as the dialog lives.
   *
   * Passing no device id on the first call lets the platform choose the rear
   * camera itself, which it does better than a label match can: a phone
   * exposes several rear cameras and the ultra wide one, often first in the
   * list, cannot focus close enough to read a barcode.
   */
  private async openCamera(deviceId: string | null): Promise<void> {
    const token = ++this.openToken;
    this.isStarting.set(true);
    this.stopLoop();
    // Released before the next request: some phones refuse to hand out a
    // second camera while the first is still held.
    this.releaseStream();
    try {
      const stream = await this.mediaDevicesService.getUserMedia({
        video: deviceId
          ? { ...VIDEO_CONSTRAINTS, deviceId: { exact: deviceId } }
          : { ...VIDEO_CONSTRAINTS, facingMode: { ideal: 'environment' } },
      });
      if (token !== this.openToken) {
        stream?.getTracks?.().forEach((track) => track.stop());
        return;
      }
      this.stream.set(stream);
      this.startLoop();
    } catch {
      if (token === this.openToken) {
        this.snackService.error(
          this.translateService.instant('CARDS.CARD.SCAN.PERMISSION_ERROR'),
        );
      }
    }
  }

  /**
   * Lists the cameras, and marks the one the platform actually granted as
   * selected. Labels are only readable once permission has been given, which
   * is why this runs after the camera is open.
   */
  private async listDevices(): Promise<void> {
    const devices = await this.mediaDevicesService
      .enumerateDevices()
      .catch(() => [] as MediaDeviceInfo[]);
    const cameras = (devices || []).filter(
      (device) => !device.kind || device.kind.includes('video'),
    );
    this.devices.set(cameras);
    this.selectedDevice.set(this.resolveGrantedDevice(cameras));
  }

  /**
   * Names the camera now running, for the picker button.
   *
   * Matching on the label alone is not enough on Android: phones expose
   * several rear cameras and they all carry "back" in their label, so the
   * granted device id is the only reliable answer. The label match stays for
   * browsers that report no id at all.
   */
  private resolveGrantedDevice(cameras: MediaDeviceInfo[]): MediaDeviceInfo {
    if (!cameras.length) {
      return null;
    }
    const grantedId = this.getStreamDeviceId();
    return (
      (grantedId && cameras.find((device) => device.deviceId === grantedId)) ||
      cameras.find((device) => /back|rear|environment/i.test(device.label)) ||
      cameras[0]
    );
  }

  private startLoop(): void {
    this.stopLoop();
    if (!this.decoders.length) {
      return;
    }
    this.loopSubscription = interval(FRAME_INTERVAL_MS)
      .pipe(
        // exhaustMap rather than concatMap: a decode slower than the interval
        // should cost a dropped frame, not build a queue of stale ones.
        exhaustMap(() => from(this.decodeNextFrame())),
        filter((result): result is IScannerResult => !!result),
        take(1),
      )
      .subscribe((result) => this.onResult(result));
  }

  private stopLoop(): void {
    this.loopSubscription?.unsubscribe();
    this.loopSubscription = null;
  }

  /**
   * Hands one frame to one decoder, taking them in turn.
   *
   * Running them all on every frame would triple the work for a result that
   * arrives one frame later at worst, and at this rate a frame is a tenth of
   * a second.
   */
  private async decodeNextFrame(): Promise<IScannerResult | null> {
    if (!this.decoders.length) {
      return null;
    }
    const frame = this.grabFrame();
    if (!frame) {
      return null;
    }
    const decoder = this.decoders[this.decoderIndex % this.decoders.length];
    this.decoderIndex++;
    return decoder.decode(frame).catch(() => null);
  }

  /** Copies the current video frame onto the reused canvas. */
  private grabFrame(): HTMLCanvasElement | null {
    const video = this.videoRef()?.nativeElement;
    // HAVE_CURRENT_DATA. Below it the element holds no frame to copy.
    if (!video || video.readyState < 2 || !video.videoWidth) {
      return null;
    }
    this.frameCanvas ??= document.createElement('canvas');
    return this.drawToCanvas(
      this.frameCanvas,
      video,
      video.videoWidth,
      video.videoHeight,
      FRAME_MAX_EDGE,
    );
  }

  private drawImage(file: File): Promise<HTMLCanvasElement | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(
          this.drawToCanvas(
            document.createElement('canvas'),
            image,
            image.naturalWidth,
            image.naturalHeight,
            FILE_MAX_EDGE,
          ),
        );
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      image.src = url;
    });
  }

  private drawToCanvas(
    canvas: HTMLCanvasElement,
    source: CanvasImageSource,
    width: number,
    height: number,
    maxEdge: number,
  ): HTMLCanvasElement | null {
    if (!width || !height) {
      return null;
    }
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      return null;
    }
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  private onResult(result: IScannerResult): void {
    this.stopLoop();
    this.close({
      text: result.code,
      format: result.type,
    });
  }

  private getStreamDeviceId(): string | null {
    return (
      this.stream()?.getVideoTracks?.()?.[0]?.getSettings?.()?.deviceId || null
    );
  }

  private releaseStream(): void {
    const stream = this.stream();
    stream?.getTracks?.().forEach((track) => track.stop());
    this.stream.set(null);
    const video = this.videoRef()?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }
}

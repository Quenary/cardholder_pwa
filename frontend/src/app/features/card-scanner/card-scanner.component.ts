import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  PendingTasks,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
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
import { HapticsService } from 'src/app/core/services/haptics.service';
import { BarcodeDecodingService } from './decoders/barcode-decoding.service';
import { IBarcodeDecoder, IScannerResult } from './decoders/barcode-decoder';
import { describeCameras, ICameraOption } from './camera-label';
import { ELocalStorageKey } from 'src/app/app.consts';
import {
  storageGetItemJson,
  storageSetItemJson,
} from 'src/app/shared/functions/storage.function';

export interface ICardScannerResult {
  text: string;
  format: string;
}

/** Why no camera is running, when none is. */
export enum ECameraError {
  /** Permission was refused, and is given back in the browser's settings. */
  DENIED = 'denied',
  /** No camera at all, or one already held by something else. */
  UNAVAILABLE = 'unavailable',
}

@Component({
  selector: 'app-card-scanner-device-sheet',
  imports: [MatListItem, MatListItemTitle, MatActionList],
  template: `
    <mat-action-list>
      @for (camera of cameras; track camera.device.deviceId) {
      <mat-list-item (click)="onSelectDevice(camera)">
        <span matListItemTitle>
          {{ camera.label }}
        </span>
      </mat-list-item>
      }
    </mat-action-list>
  `,
})
export class CardScannerDeviceSheetComponent {
  private readonly matBottomSheetRef = inject(MatBottomSheetRef);
  private readonly data = inject(MAT_BOTTOM_SHEET_DATA);

  protected readonly cameras: ICameraOption[] = this.data.cameras ?? [];

  protected onSelectDevice(camera: ICameraOption): void {
    this.matBottomSheetRef.dismiss({ device: camera.device });
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
 * Resolution asked of the camera, once it is open.
 *
 * A default stream is often 640x480, which is thin for the narrow bars of a
 * 1D code. Both values are wishes: a camera that cannot honour them keeps
 * whatever it does have.
 *
 * Deliberately not part of the getUserMedia request. An "ideal" value there
 * is not a preference the browser applies afterwards, it is a term in the
 * fitness distance it uses to rank cameras, so asking for a resolution while
 * opening can change which camera is handed over. Asking once the camera is
 * chosen keeps that choice out of it.
 */
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

/** The focus mode that keeps refocusing as the card moves. */
const CONTINUOUS_FOCUS = 'continuous';

/** Labels a rear camera gives itself, across platforms. */
const REAR_LABEL = /back|rear|environment/i;

@Component({
  selector: 'app-card-scanner',
  imports: [
    MatButton,
    MatIconButton,
    MatTooltip,
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
  private readonly hapticsService = inject(HapticsService);
  private readonly pendingTasks = inject(PendingTasks);

  private readonly videoRef = viewChild<unknown, ElementRef<HTMLVideoElement>>(
    'video',
    { read: ElementRef },
  );

  protected readonly ECameraError = ECameraError;

  /** Cameras offered in the picker. Only populated once permission is given. */
  protected readonly cameras = signal<ICameraOption[]>([]);
  protected readonly selectedDevice = signal<MediaDeviceInfo>(null);
  /** Name of the running camera, as shown on the picker button. */
  protected readonly selectedLabel = computed(
    () =>
      this.cameras().find(
        (camera) => camera.device.deviceId === this.selectedDevice()?.deviceId,
      )?.label ?? null,
  );
  /** The camera is open but not yet showing frames. */
  protected readonly isStarting = signal<boolean>(true);
  /**
   * Why there is no camera, when there is none. The dialog stays useful
   * either way: a photo of the card still works.
   */
  protected readonly cameraError = signal<ECameraError>(null);
  /** A picked photo is being decoded, which holds the live camera. */
  protected readonly isDecodingFile = signal<boolean>(false);
  /** The running camera reports a lamp it will let us switch on. */
  protected readonly hasTorch = signal<boolean>(false);
  protected readonly isTorchOn = signal<boolean>(false);

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

  /** Asks for the camera again, after the browser prompt was dismissed. */
  protected onRetry(): void {
    void this.whileUnstable(() => this.start());
  }

  protected onClickSelectDevice(): void {
    this.matBottomSheet
      .open(CardScannerDeviceSheetComponent, {
        data: {
          cameras: this.cameras(),
        },
      })
      .afterDismissed()
      .subscribe((data?: { device: MediaDeviceInfo }) => {
        const device = data?.device;
        if (device && device.deviceId !== this.selectedDevice()?.deviceId) {
          this.selectedDevice.set(device);
          // A camera picked by hand is the one to come back to, whatever the
          // platform would have granted.
          this.rememberCamera(device.deviceId);
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
    const remembered = storageGetItemJson<string>(
      ELocalStorageKey.SCANNER_CAMERA,
    );
    await this.openCamera(remembered ?? null);
    await this.listDevices();
    // A remembered camera was already proved to focus, so the search is only
    // worth running the first time, or if that camera has since gone.
    if (!remembered || this.getStreamDeviceId() !== remembered) {
      await this.ensureFocusableCamera();
    }
  }

  /**
   * Moves off a camera that cannot focus.
   *
   * Asking for the rear camera leaves the choice to the platform, and the one
   * it grants is not always able to focus. A Samsung tested here offers four
   * cameras: the granted one reports `focusMode: ["manual"]` alone and a
   * focus range stopping at 0.78, while another rear camera reports
   * `["manual","single-shot","continuous"]` over a range of 0.1 to 4.05. A
   * card held at arm's length is a blur on the first and sharp on the second,
   * and no constraint fixes the first because the hardware has no autofocus
   * at all.
   *
   * So the granted camera is checked, and only if it cannot focus are the
   * other rear cameras tried. The winner is remembered, which also spares the
   * search on later scans.
   */
  private async ensureFocusableCamera(): Promise<void> {
    const track = this.getVideoTrack();
    if (!track) {
      return;
    }
    const currentId = this.getStreamDeviceId();
    if (this.supportsContinuousFocus(track)) {
      this.rememberCamera(currentId);
      return;
    }
    // Probing opens cameras one at a time, and some phones refuse a second
    // camera while the first is held. Nothing is lost by letting go: we are
    // leaving this camera either way.
    this.releaseStream();
    const focusable = await this.findFocusableCamera(currentId);
    await this.openCamera(focusable ?? currentId);
    if (focusable) {
      this.rememberCamera(focusable);
      this.selectedDevice.set(
        this.cameras().find((camera) => camera.device.deviceId === focusable)
          ?.device ?? this.selectedDevice(),
      );
    }
  }

  /**
   * Opens each remaining rear camera just long enough to read what it can do.
   *
   * Capabilities are only legible on a live track, so there is no way to ask
   * this of a device without opening it.
   */
  private async findFocusableCamera(excludeId: string): Promise<string | null> {
    const candidates = this.cameras()
      .map((camera) => camera.device)
      .filter((device) => device.deviceId && device.deviceId !== excludeId)
      // An empty label says nothing either way, so such a device stays in.
      .filter((device) => !device.label || REAR_LABEL.test(device.label));
    for (const device of candidates) {
      let probe: MediaStream = null;
      try {
        probe = await this.mediaDevicesService.getUserMedia({
          video: { deviceId: { exact: device.deviceId } },
        });
        const focusable = this.supportsContinuousFocus(
          probe?.getVideoTracks?.()?.[0],
        );
        if (focusable) {
          return device.deviceId;
        }
      } catch {
        // A camera that will not open is simply not a candidate.
      } finally {
        probe?.getTracks?.().forEach((track) => track.stop());
      }
    }
    return null;
  }

  private supportsContinuousFocus(track: MediaStreamTrack): boolean {
    const capabilities = track?.getCapabilities?.() as
      | { focusMode?: string[] }
      | undefined;
    return !!capabilities?.focusMode?.includes(CONTINUOUS_FOCUS);
  }

  /**
   * Asks the open camera for the resolution and the focus behaviour wanted.
   *
   * Both are asked here rather than while opening, so that neither has a say
   * in which camera is opened. A camera able to focus does not necessarily
   * start out doing it continuously, and a card is rarely still.
   */
  private async applyTrackSettings(): Promise<void> {
    const track = this.getVideoTrack();
    if (!track?.applyConstraints) {
      return;
    }
    const constraints: MediaTrackConstraints = { ...VIDEO_CONSTRAINTS };
    if (this.supportsContinuousFocus(track)) {
      constraints.advanced = [
        { focusMode: CONTINUOUS_FOCUS } as MediaTrackConstraintSet,
      ];
    }
    // A camera that refuses keeps the settings it opened with, which is the
    // same place the previous release left it.
    await track.applyConstraints(constraints).catch(() => undefined);
  }

  private rememberCamera(deviceId: string): void {
    if (deviceId) {
      storageSetItemJson(ELocalStorageKey.SCANNER_CAMERA, deviceId);
    }
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
   * Passing no device id lets the platform choose the rear camera, which is
   * only a starting point: see ensureFocusableCamera for why its choice
   * cannot be trusted on its own.
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
        // Nothing here beyond which camera is wanted, see VIDEO_CONSTRAINTS.
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { ideal: 'environment' } },
      });
      if (token !== this.openToken) {
        stream?.getTracks?.().forEach((track) => track.stop());
        return;
      }
      this.stream.set(stream);
      this.cameraError.set(null);
      await this.applyTrackSettings();
      this.readTorchCapability();
      this.startLoop();
    } catch (error) {
      if (token === this.openToken) {
        this.isStarting.set(false);
        this.cameraError.set(this.describeCameraError(error));
      }
    }
  }

  /**
   * Tells apart the reasons a camera does not open, because what to do about
   * them differs: a refusal is undone in the browser's own settings, while a
   * camera that is missing or already in use is not.
   */
  private describeCameraError(error: unknown): ECameraError {
    const name = (error as { name?: string })?.name;
    return name === 'NotAllowedError' || name === 'SecurityError'
      ? ECameraError.DENIED
      : ECameraError.UNAVAILABLE;
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
    this.cameras.set(
      describeCameras(cameras, {
        back: this.translateService.instant('CARDS.CARD.SCAN.CAMERA_BACK'),
        front: this.translateService.instant('CARDS.CARD.SCAN.CAMERA_FRONT'),
        camera: this.translateService.instant('CARDS.CARD.SCAN.CAMERA'),
      }),
    );
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
      cameras.find((device) => REAR_LABEL.test(device.label)) ||
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
    // The eyes are on the card, not on the screen, so the confirmation has
    // to be felt. Without it the dialog simply vanishes and it takes a
    // moment to work out whether that was the scan or a misplaced tap.
    this.hapticsService.confirm();
    this.close({
      text: result.code,
      format: result.type,
    });
  }

  /**
   * Switches the camera lamp.
   *
   * A card is often read where the light is poor: a wallet at a till, a
   * drawer, a bag. Without this the only way through is to carry the card
   * to a window or to light it from another phone.
   */
  protected async toggleTorch(): Promise<void> {
    const track = this.getVideoTrack();
    if (!track) {
      return;
    }
    const next = !this.isTorchOn();
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as MediaTrackConstraintSet],
      });
      this.isTorchOn.set(next);
    } catch {
      // Some drivers advertise the lamp and then refuse the constraint.
      // Hiding the button is more honest than a control that does nothing.
      this.hasTorch.set(false);
      this.isTorchOn.set(false);
    }
  }

  /**
   * Asks the camera now running whether it has a lamp.
   *
   * Cameras differ on this, front ones almost never having one, so it is
   * read again on every open rather than once for the device.
   */
  private readTorchCapability(): void {
    const capabilities = this.getVideoTrack()?.getCapabilities?.() as
      | { torch?: boolean }
      | undefined;
    this.hasTorch.set(!!capabilities?.torch);
    this.isTorchOn.set(false);
  }

  private getVideoTrack(): MediaStreamTrack | null {
    return this.stream()?.getVideoTracks?.()?.[0] ?? null;
  }

  private getStreamDeviceId(): string | null {
    return this.getVideoTrack()?.getSettings?.()?.deviceId || null;
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

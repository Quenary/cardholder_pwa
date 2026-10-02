import { vi } from 'vitest';

export const testMediaDevices: MediaDeviceInfo[] = [
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

/** Samsung-style device list used in autofocus selection tests. */
export const samsungDevices: MediaDeviceInfo[] = [
  {
    deviceId: 'front-1',
    groupId: null,
    kind: 'videoinput',
    label: 'camera 1, facing front',
    toJSON: null,
  },
  {
    deviceId: 'front-3',
    groupId: null,
    kind: 'videoinput',
    label: 'camera 3, facing front',
    toJSON: null,
  },
  {
    deviceId: 'back-fixed',
    groupId: null,
    kind: 'videoinput',
    label: 'camera 2, facing back',
    toJSON: null,
  },
  {
    deviceId: 'back-main',
    groupId: null,
    kind: 'videoinput',
    label: 'camera 0, facing back',
    toJSON: null,
  },
];

export interface MediaStreamMock {
  stream: MediaStream;
  track: MediaStreamTrack & {
    stop: ReturnType<typeof vi.fn>;
    applyConstraints: ReturnType<typeof vi.fn>;
  };
}

/** Stream stub reporting the camera the platform granted, and its stop calls. */
export function createMediaStreamMock(
  deviceId?: string,
  torch = false,
  focusModes: string[] = ['manual', 'single-shot', 'continuous'],
): MediaStreamMock {
  const track = {
    getSettings: () => ({ deviceId }),
    getCapabilities: () => ({
      ...(torch ? { torch: true } : {}),
      ...(focusModes.length ? { focusMode: focusModes } : {}),
    }),
    applyConstraints: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
  } as unknown as MediaStreamMock['track'];
  const stream = {
    getVideoTracks: () => [track],
    getTracks: () => [track],
  } as unknown as MediaStream;
  return { stream, track };
}

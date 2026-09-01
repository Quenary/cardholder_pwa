/** A camera as offered in the picker, under a name worth reading. */
export interface ICameraOption {
  device: MediaDeviceInfo;
  label: string;
}

export interface ICameraLabels {
  back: string;
  front: string;
  camera: string;
}

/**
 * Android reports labels like "camera2 0, facing back": an internal api name
 * and an index before anything a person would recognise. Desktop browsers
 * report the make and model, which is already fine and is left alone.
 */
const ANDROID_FACING = /^camera\d*\s+\d+,\s*facing\s+(back|front)$/i;

const describeCamera = (
  label: string,
  index: number,
  labels: ICameraLabels,
): string => {
  const clean = (label || '').trim();
  // Labels are empty until permission is granted, and on browsers that
  // withhold them entirely.
  if (!clean) {
    return `${labels.camera} ${index + 1}`;
  }
  const facing = ANDROID_FACING.exec(clean);
  if (!facing) {
    return clean;
  }
  return facing[1].toLowerCase() === 'back' ? labels.back : labels.front;
};

/**
 * Names every camera in the list, keeping the platform's own order.
 *
 * A phone exposes several rear cameras that all describe themselves the same
 * way, so names that end up shared are numbered to stay tellable apart.
 */
export const describeCameras = (
  devices: MediaDeviceInfo[],
  labels: ICameraLabels,
): ICameraOption[] => {
  const named = (devices || []).map((device, index) => ({
    device,
    label: describeCamera(device.label, index, labels),
  }));
  const totals = new Map<string, number>();
  named.forEach((option) =>
    totals.set(option.label, (totals.get(option.label) ?? 0) + 1),
  );
  const seen = new Map<string, number>();
  return named.map((option) => {
    if (totals.get(option.label) === 1) {
      return option;
    }
    const position = (seen.get(option.label) ?? 0) + 1;
    seen.set(option.label, position);
    return { ...option, label: `${option.label} ${position}` };
  });
};

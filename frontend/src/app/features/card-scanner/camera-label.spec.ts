import { describeCameras, ICameraLabels } from './camera-label';

const labels: ICameraLabels = {
  back: 'Back camera',
  front: 'Front camera',
  camera: 'Camera',
};

const device = (deviceId: string, label: string) =>
  ({ deviceId, label }) as MediaDeviceInfo;

describe('describeCameras', () => {
  it('should read android labels as a side of the phone', () => {
    const cameras = describeCameras(
      [
        device('a', 'camera2 0, facing back'),
        device('b', 'camera2 1, facing front'),
      ],
      labels,
    );

    expect(cameras.map((camera) => camera.label)).toEqual([
      'Back camera',
      'Front camera',
    ]);
  });

  it('should number cameras that end up sharing a name', () => {
    const cameras = describeCameras(
      [
        device('a', 'camera2 0, facing back'),
        device('b', 'camera2 2, facing back'),
        device('c', 'camera2 1, facing front'),
      ],
      labels,
    );

    expect(cameras.map((camera) => camera.label)).toEqual([
      'Back camera 1',
      'Back camera 2',
      'Front camera',
    ]);
  });

  it('should leave a label that already names the device alone', () => {
    const cameras = describeCameras(
      [device('a', 'Logitech BRIO (046d:categ)')],
      labels,
    );

    expect(cameras[0].label).toEqual('Logitech BRIO (046d:categ)');
  });

  it('should number cameras that report no label at all', () => {
    const cameras = describeCameras([device('a', ''), device('b', '')], labels);

    expect(cameras.map((camera) => camera.label)).toEqual([
      'Camera 1',
      'Camera 2',
    ]);
  });

  it('should keep each device alongside its name', () => {
    const cameras = describeCameras(
      [device('a', 'camera2 0, facing back')],
      labels,
    );

    expect(cameras[0].device.deviceId).toEqual('a');
  });
});

import { describeCameras, ICameraLabels } from './camera-label';

const labels: ICameraLabels = {
  back: 'Back camera',
  front: 'Front camera',
  camera: 'Camera',
};

const device = (deviceId: string, label: string) =>
  ({ deviceId, label }) as MediaDeviceInfo;

describe('describeCameras', () => {
  describe('android-style labels', () => {
    it('maps facing back and front', () => {
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

    it('numbers duplicate sides', () => {
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
  });

  describe('explicit device labels', () => {
    it('keeps the original text', () => {
      const cameras = describeCameras(
        [device('a', 'Logitech BRIO (046d:categ)')],
        labels,
      );

      expect(cameras[0].label).toEqual('Logitech BRIO (046d:categ)');
    });
  });

  describe('missing labels', () => {
    it('numbers unnamed cameras', () => {
      const cameras = describeCameras(
        [device('a', ''), device('b', '')],
        labels,
      );

      expect(cameras.map((camera) => camera.label)).toEqual([
        'Camera 1',
        'Camera 2',
      ]);
    });
  });

  describe('output shape', () => {
    it('keeps device refs on each entry', () => {
      const cameras = describeCameras(
        [device('a', 'camera2 0, facing back')],
        labels,
      );

      expect(cameras[0].device.deviceId).toEqual('a');
    });
  });
});

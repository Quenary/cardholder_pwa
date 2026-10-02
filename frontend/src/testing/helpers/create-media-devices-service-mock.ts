import { MediaDevicesService } from 'src/app/core/services/media-devices.service';
import { Mocked, vi } from 'vitest';

export function createMediaDevicesServiceMock(): Mocked<MediaDevicesService> {
  const mock: Partial<Mocked<MediaDevicesService>> = {
    getUserMedia: vi.fn(),
    enumerateDevices: vi.fn(),
  };
  return mock as Mocked<MediaDevicesService>;
}

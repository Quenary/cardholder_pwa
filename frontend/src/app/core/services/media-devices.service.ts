import { Injectable } from '@angular/core';

/**
 * Wrapper for navigator media devices api.
 * Methods the availability of the api, rejects if not.
 */
@Injectable({
  providedIn: 'root',
})
export class MediaDevicesService {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    if (typeof navigator?.mediaDevices?.getUserMedia === 'function') {
      return navigator.mediaDevices.getUserMedia(constraints);
    }
    return Promise.reject();
  }
  enumerateDevices(): Promise<MediaDeviceInfo[]> {
    if (typeof navigator?.mediaDevices?.enumerateDevices === 'function') {
      return navigator.mediaDevices.enumerateDevices();
    }
    return Promise.reject();
  }
}

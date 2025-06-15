import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'getOnColor',
  pure: true,
})
export class GetOnColorPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) {
      return null;
    }
    const r = parseInt(value.slice(1, 3), 16) / 255;
    const g = parseInt(value.slice(3, 5), 16) / 255;
    const b = parseInt(value.slice(5, 7), 16) / 255;

    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
}

import { Pipe, PipeTransform } from '@angular/core';
import { ZxingToBwipMap } from 'src/app/entities/cards/cards-const';
import { ICard } from 'src/app/entities/cards/cards-interface';

/**
 * Pipe that detects old (zxing) code type.
 * @description
 * Decided to use bwip code types instead of zxing.
 * @deprecated
 * Remove it somewhere in the future.
 */
@Pipe({
  name: 'isOldCodeType',
  pure: true,
})
export class IsOldCodeType implements PipeTransform {
  transform(value: Partial<ICard>) {
    return !!value && !!value.code_type && value.code_type in ZxingToBwipMap;
  }
}

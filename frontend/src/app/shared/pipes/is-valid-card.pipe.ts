import { Pipe, PipeTransform } from '@angular/core';
import { isValidCodeType } from 'src/app/entities/cards/cards-const';
import { ICardBase } from 'src/app/entities/cards/cards-interface';

/**
 * Determines whether a card is valid for display in the code viewer.
 */
@Pipe({
  name: 'isValidCard',
  pure: true,
  standalone: true,
})
export class IsValidCardPipe implements PipeTransform {
  transform(value: Partial<ICardBase>): boolean {
    return !!value && !!value.code && isValidCodeType(value.code_type);
  }
}

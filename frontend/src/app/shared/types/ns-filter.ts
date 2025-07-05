import { Premitive } from './premitive';
import { TypeToString } from './type-to-string';

/**
 * App filters namespace
 */
export namespace Filter {
  /**
   * Criterias of filtering
   */
  export enum Criteria {
    LIKE = 'LIKE',
    EQUALS = 'EQUALS',
    NOT_EQUALS = 'NOT_EQUALS',
    NULL = 'NULL',
    NOT_NULL = 'NOT_NULL',
    GREATER = 'GREATER',
    LESS = 'LESS',
    GREATER_OR_EQUALS = 'GREATER_OR_EQUALS',
    LESS_OR_EQUALS = 'LESS_OR_EQUALS',
  }
  /**
   * Model of app filters
   */
  export interface Model<T extends unknown, K extends keyof T> {
    key: K;
    criteria: Criteria;
    value: T[K];
  }
  /**
   * Option of filtering
   */
  export interface Option<T extends unknown, K extends keyof T> {
    key: K;
    label: string;
    type: TypeToString<T[K]>;
    criterias: Criteria[];
  }
  /**
   * Filter entities
   * @param items entities
   * @param model filter model
   * @param type type of key
   * @returns
   */
  export const filterBy = <T extends unknown, K extends keyof T>(
    items: T[],
    model: Model<T, K>,
    type: Premitive,
  ): T[] => {
    try {
      switch (model.criteria) {
        case 'LIKE': {
          const value = String(model.value).toLowerCase();
          return items.filter((item) => {
            const itemValue = String(item[model.key]).toLowerCase();
            return itemValue.includes(value);
          });
        }
        case 'EQUALS':
          return items.filter((item) => item[model.key] === model.value);
        case 'NOT_EQUALS':
          return items.filter((item) => item[model.key] !== model.value);
        case 'NULL':
          return items.filter((item) =>
            [null, undefined].includes(item[model.key]),
          );
        case 'NOT_NULL':
          return items.filter(
            (item) => ![null, undefined].includes(item[model.key]),
          );
        case 'GREATER':
          switch (type) {
            case 'date':
              return items.filter(
                (item) =>
                  new Date(item[model.key] as string) >
                  new Date(model.value as string),
              );
            default:
              return items.filter((item) => item[model.key] > model.value);
          }
        case 'LESS':
          switch (type) {
            case 'date':
              return items.filter(
                (item) =>
                  new Date(item[model.key] as string) <
                  new Date(model.value as string),
              );
            default:
              return items.filter((item) => item[model.key] < model.value);
          }
        case 'GREATER_OR_EQUALS':
          switch (type) {
            case 'date':
              return items.filter(
                (item) =>
                  new Date(item[model.key] as string) >=
                  new Date(model.value as string),
              );
            default:
              return items.filter((item) => item[model.key] >= model.value);
          }
        case 'LESS_OR_EQUALS':
          switch (type) {
            case 'date':
              return items.filter(
                (item) =>
                  new Date(item[model.key] as string) <=
                  new Date(model.value as string),
              );
            default:
              return items.filter((item) => item[model.key] <= model.value);
          }
        default:
          return items;
      }
    } catch {
      return items;
    }
  };
}

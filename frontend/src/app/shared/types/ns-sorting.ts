import { Premitive } from './premitive';

/**
 * App sorting namespace
 */
export namespace Sorting {
  /**
   * Sorting direction
   */
  export type Direction = 'asc' | 'desc';
  /**
   * Model of sorting
   */
  export interface Model<T extends unknown, K extends keyof T> {
    key: K;
    direction: Direction;
  }
  /**
   * Option of sorting
   */
  export interface Option<T> {
    key: keyof T;
    label: string;
  }
  /**
   * Sort entities
   * @param items entities
   * @param model sorting model
   * @param type type of key
   * @returns
   */
  export const sortBy = <T extends unknown, K extends keyof T>(
    items: T[],
    model: Model<T, K>,
    type: Premitive,
  ): T[] => {
    try {
      let comperator: (a: any, b: any) => number;
      switch (type) {
        case 'boolean': {
          comperator = (a: boolean, b: boolean) => +a - +b;
          break;
        }
        case 'string': {
          comperator = (a: string, b: string) => a.localeCompare(b);
          break;
        }
        case 'date': {
          comperator = (a: string, b: string) => {
            const at = new Date(a).valueOf();
            const bt = new Date(b).valueOf();
            return at - bt;
          };
          break;
        }
        default: {
          comperator = (a: any, b: any) => a - b;
        }
      }
      return [...items].sort((a, b) =>
        model.direction == 'asc'
          ? comperator(a[model.key], b[model.key])
          : comperator(b[model.key], a[model.key]),
      );
    } catch {
      return items;
    }
  };
}

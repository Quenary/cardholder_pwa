/**
 * Helper type that extracts type name of {@link T}.
 */
export type TypeToString<T> = T extends string
  ? 'string' | 'date'
  : T extends number
    ? 'number'
    : T extends bigint
      ? 'bigint'
      : T extends boolean
        ? 'boolean'
        : T extends Date
          ? 'date'
          : T extends any[]
            ? 'array'
            : T extends object
              ? 'object'
              : T extends undefined
                ? 'undefined'
                : 'unknown';

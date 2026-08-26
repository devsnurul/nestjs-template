type KeysOfType<T, U> = {
  [K in keyof T]: T[K] extends U | null | undefined ? K : never;
}[keyof T];

export type QueryConfig<T> = {
  searchableFields: KeysOfType<T, string>[];
  filterableFields: (keyof T)[];
  numberFields: KeysOfType<T, number>[];
  booleanFields: KeysOfType<T, boolean>[];
  dateFields: KeysOfType<T, Date>[];
};

import { QueryOptions } from '../interfaces/index';

type FilterOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains'
  | 'startsWith'
  | 'endsWith';

const ALLOWED_OPERATORS = [
  'equals',
  'lt',
  'lte',
  'gt',
  'gte',
  'in',
  'notIn',
  'contains',
  'startsWith',
  'endsWith',
  'not',
];

function isOperatorObject(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  return (
    keys.length > 0 && keys.every((key) => ALLOWED_OPERATORS.includes(key))
  );
}

function parseValue(
  value: unknown,
  field: string,
  options: QueryOptions,
): unknown {
  if (options.booleanFields?.includes(field)) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') return true;
      if (lower === 'false' || lower === '0' || lower === 'no') return false;
    }
    return value;
  }

  if (options.numberFields?.includes(field)) {
    const num = Number(value);
    return Number.isNaN(num) ? value : num;
  }

  if (options.dateFields?.includes(field)) {
    if (value instanceof Date) return value;
    const date = new Date(String(value));
    if (!Number.isNaN(date.getTime())) return date;
    return value;
  }

  return value;
}

interface ParsedFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export function parseFilters(
  query: Record<string, unknown>,
  options: QueryOptions,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const filterableFieldsSet = new Set(options.filterableFields ?? []);
  const numberFieldsSet = new Set(options.numberFields ?? []);
  const booleanFieldsSet = new Set(options.booleanFields ?? []);
  const dateFieldsSet = new Set(options.dateFields ?? []);

  const paginationKeys = new Set([
    'page',
    'limit',
    'sort',
    'sortBy',
    'sortOrder',
    'searchTerm',
  ]);

  for (const [key, value] of Object.entries(query)) {
    if (paginationKeys.has(key) || key.startsWith('searchTerm')) {
      continue;
    }

    if (!filterableFieldsSet.has(key)) {
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (isOperatorObject(value)) {
      const parsedOperators: Record<string, unknown> = {};
      for (const op of Object.keys(value)) {
        parsedOperators[op] = parseValue(
          (value as Record<string, unknown>)[op],
          key,
          options,
        );
      }
      result[key] = parsedOperators;
      continue;
    }

    const parsedFilter = parseFieldFilter(key, value);
    if (!parsedFilter) {
      continue;
    }

    const { field, operator, value: filterValue } = parsedFilter;

    if (numberFieldsSet.has(field)) {
      result[field] = buildNumericFilter(operator, filterValue);
    } else if (booleanFieldsSet.has(field)) {
      result[field] = parseBooleanFilter(filterValue);
    } else if (dateFieldsSet.has(field)) {
      result[field] = buildDateFilter(operator, filterValue);
    } else {
      result[field] = buildStringFilter(operator, filterValue);
    }
  }

  return result;
}

function parseFieldFilter(key: string, value: unknown): ParsedFilter | null {
  const rangeMatch = key.match(/^(.+)\[(gte|gt|lte|lt)\]$/);
  if (rangeMatch) {
    return {
      field: rangeMatch[1],
      operator: rangeMatch[2] as FilterOperator,
      value: value,
    };
  }

  const arrayMatch = key.match(/^(.+)\[\]$/);
  if (arrayMatch) {
    if (Array.isArray(value)) {
      return {
        field: arrayMatch[1],
        operator: 'in',
        value: value,
      };
    }
    if (typeof value === 'string') {
      return {
        field: arrayMatch[1],
        operator: 'in',
        value: value.split(',').map((v) => v.trim()),
      };
    }
  }

  return {
    field: key,
    operator: 'eq',
    value: value,
  };
}

function buildNumericFilter(
  operator: FilterOperator,
  value: unknown,
): Record<string, unknown> {
  const numValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numValue)) {
    return { eq: value };
  }

  switch (operator) {
    case 'eq':
      return { equals: numValue };
    case 'ne':
      return { not: { equals: numValue } };
    case 'gt':
      return { gt: numValue };
    case 'gte':
      return { gte: numValue };
    case 'lt':
      return { lt: numValue };
    case 'lte':
      return { lte: numValue };
    case 'in':
      return { in: Array.isArray(value) ? value : [value] };
    default:
      return { equals: numValue };
  }
}

function parseBooleanFilter(value: unknown): Record<string, unknown> {
  if (typeof value === 'boolean') {
    return { equals: value };
  }
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return { equals: true };
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return { equals: false };
    }
  }
  return { equals: value };
}

function buildDateFilter(
  operator: FilterOperator,
  value: unknown,
): Record<string, unknown> {
  const dateValue = typeof value === 'string' ? new Date(value) : value;
  if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) {
    return { equals: value };
  }

  switch (operator) {
    case 'eq':
      return { equals: dateValue };
    case 'ne':
      return { not: { equals: dateValue } };
    case 'gt':
      return { gt: dateValue };
    case 'gte':
      return { gte: dateValue };
    case 'lt':
      return { lt: dateValue };
    case 'lte':
      return { lte: dateValue };
    case 'in':
      return { in: Array.isArray(value) ? value : [value] };
    default:
      return { equals: dateValue };
  }
}

function buildStringFilter(
  operator: FilterOperator,
  value: unknown,
): Record<string, unknown> {
  switch (operator) {
    case 'eq':
      return { equals: String(value) };
    case 'ne':
      return { not: { equals: String(value) } };
    case 'contains':
      return { contains: String(value), mode: 'insensitive' };
    case 'startsWith':
      return { startsWith: String(value) };
    case 'endsWith':
      return { endsWith: String(value) };
    case 'in':
      return { in: Array.isArray(value) ? value : [value] };
    default:
      return { equals: String(value) };
  }
}

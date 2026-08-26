import { PaginationOptions } from '../interfaces/index';

interface PaginationConfig {
  defaultLimit?: number;
  maxLimit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

export function parseSort(
  sort?: unknown,
  sortBy?: unknown,
  sortOrder?: unknown,
): Record<string, 'asc' | 'desc'>[] {
  if (sort) {
    if (typeof sort === 'string') {
      return parseSortString(sort);
    }
    if (Array.isArray(sort)) {
      return sort.map((field) => {
        const trimmed = String(field).trim();
        if (trimmed.startsWith('-')) {
          return { [trimmed.slice(1)]: 'desc' };
        }
        return { [trimmed]: 'asc' };
      });
    }
  }

  if (sortBy && typeof sortBy === 'string') {
    const sortByFields = sortBy.split(',').map((f) => f.trim());
    const sortOrderStr = typeof sortOrder === 'string' ? sortOrder : '';
    const sortOrders = sortOrderStr
      ? sortOrderStr.split(',').map((o) => o.trim().toLowerCase())
      : [];

    return sortByFields.map((field, index) => {
      const order: 'asc' | 'desc' =
        sortOrders[index] === 'desc' ? 'desc' : 'asc';
      return { [field]: order };
    });
  }

  return [];
}

function parseSortString(sort: string): Record<string, 'asc' | 'desc'>[] {
  return sort.split(',').map((field) => {
    const trimmed = field.trim();
    if (trimmed.startsWith('-')) {
      return { [trimmed.slice(1)]: 'desc' };
    }
    return { [trimmed]: 'asc' };
  });
}

export function parsePagination(
  query: Record<string, unknown>,
  config: PaginationConfig,
): PaginationOptions {
  const pageParam = query.page;
  const limitParam = query.limit;
  const sortByParam = query.sortBy;
  const sortOrderParam = query.sortOrder;

  const maxLimit = config.maxLimit ?? 100;
  const defaultLimit = config.defaultLimit ?? DEFAULT_LIMIT;

  const page = parsePositiveInteger(pageParam) ?? DEFAULT_PAGE;
  const limit = clampLimit(
    parsePositiveInteger(limitParam) ?? defaultLimit,
    defaultLimit,
    maxLimit,
  );
  const skip = (page - 1) * limit;

  let sortBy = 'id';
  if (typeof sortByParam === 'string' && sortByParam.trim()) {
    sortBy = sortByParam.trim();
  }

  let sortOrder: 'asc' | 'desc' = 'asc';
  if (typeof sortOrderParam === 'string') {
    const normalized = sortOrderParam.toLowerCase();
    if (normalized === 'desc' || normalized === 'asc') {
      sortOrder = normalized;
    }
  }

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  };
}

function parsePositiveInteger(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const num = typeof value === 'number' ? value : Number(value);

  if (!Number.isInteger(num) || num < 1) {
    return null;
  }

  return num;
}

function clampLimit(
  value: number,
  defaultLimit: number,
  maxLimit: number,
): number {
  if (value < 1) {
    return defaultLimit;
  }
  if (value > maxLimit) {
    return maxLimit;
  }
  return value;
}

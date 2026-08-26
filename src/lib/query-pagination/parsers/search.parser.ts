import { QueryOptions } from '../interfaces/index';

interface SearchCondition {
  OR: Record<string, { contains: string; mode: string }>[];
}

export function buildSearchConditions(
  searchTerm: string | undefined,
  options: QueryOptions,
): SearchCondition | null {
  if (!searchTerm || typeof searchTerm !== 'string' || !searchTerm.trim()) {
    return null;
  }

  const trimmedTerm = searchTerm.trim();
  const searchableFields = options.searchableFields ?? [];
  const searchableFieldsSet = new Set(searchableFields);

  const conditions: Record<string, { contains: string; mode: string }>[] = [];

  for (const field of searchableFields) {
    if (searchableFieldsSet.has(field)) {
      conditions.push({
        [field]: { contains: trimmedTerm, mode: 'insensitive' },
      });
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  return { OR: conditions };
}

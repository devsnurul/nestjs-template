import type { SmartQueryInterceptorOptions } from 'src/lib/query-pagination';

export const documentCategoryQueryConfig: SmartQueryInterceptorOptions = {
  searchableFields: ['name', 'slug', 'description'],
  filterableFields: ['id', 'name', 'slug', 'sortOrder'],
};

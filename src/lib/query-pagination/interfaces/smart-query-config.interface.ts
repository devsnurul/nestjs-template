/**
 * Global configuration options for SmartQueryModule.
 * Only includes system-level settings that apply to all entities.
 */
export interface SmartQueryModuleOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * Query-level options for defining entity-specific searchable and filterable fields.
 * These should be defined per-entity/controller, not globally.
 */
export interface QueryOptions {
  /** Fields to search when using the searchTerm query parameter */
  searchableFields?: string[];
  /** Fields that can be filtered via query parameters */
  filterableFields?: string[];
  /** Fields that should be parsed as numbers for range filtering */
  numberFields?: string[];
  /** Fields that should be parsed as booleans */
  booleanFields?: string[];
  /** Fields that should be parsed as dates for range filtering */
  dateFields?: string[];
}

/**
 * Full configuration interface.
 * @deprecated Define searchable/filterable fields per-entity using SmartQueryInterceptor options instead.
 */
export interface SmartQueryConfig extends QueryOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

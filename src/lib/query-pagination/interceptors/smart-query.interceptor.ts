/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  Optional,
} from '@nestjs/common';
import type {
  SmartQueryConfig,
  SmartQueryContext,
  QueryOptions,
} from '../interfaces/index';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { parseQueryString } from '../utils/index';
import { buildSearchConditions } from '../parsers/search.parser';
import { parseFilters } from '../parsers/filter.parser';
import { parsePagination, parseSort } from '../parsers/pagination.parser';
import { Request } from 'express';

export const SMART_QUERY_CONFIG = 'SMART_QUERY_CONFIG';

/**
 * Options for the SmartQueryInterceptor.
 * These should be defined per-entity/controller to specify which fields are searchable and filterable.
 *
 * @example
 * ```typescript
 * @UseInterceptors(new SmartQueryInterceptor({
 *   searchableFields: ['name', 'email'],
 *   filterableFields: ['role', 'status', 'age'],
 *   numberFields: ['age'],
 *   booleanFields: ['isActive'],
 * }))
 * ```
 */
export interface SmartQueryInterceptorOptions extends QueryOptions {
  /** Override default limit for this specific endpoint */
  defaultLimit?: number;
  /** Override max limit for this specific endpoint */
  maxLimit?: number;
}

function mergeConfig(
  interceptorOptions: SmartQueryInterceptorOptions | undefined,
  globalConfig: SmartQueryConfig | undefined,
): SmartQueryConfig {
  const global: SmartQueryConfig = {
    searchableFields: globalConfig?.searchableFields ?? [],
    filterableFields: globalConfig?.filterableFields ?? [],
    numberFields: globalConfig?.numberFields ?? [],
    booleanFields: globalConfig?.booleanFields ?? [],
    dateFields: globalConfig?.dateFields ?? [],
    defaultLimit: globalConfig?.defaultLimit ?? 10,
    maxLimit: globalConfig?.maxLimit ?? 100,
  };

  if (!interceptorOptions) {
    return global;
  }

  return {
    searchableFields:
      interceptorOptions.searchableFields ?? global.searchableFields,
    filterableFields:
      interceptorOptions.filterableFields ?? global.filterableFields,
    numberFields: interceptorOptions.numberFields ?? global.numberFields,
    booleanFields: interceptorOptions.booleanFields ?? global.booleanFields,
    dateFields: interceptorOptions.dateFields ?? global.dateFields,
    defaultLimit: interceptorOptions.defaultLimit ?? global.defaultLimit,
    maxLimit: interceptorOptions.maxLimit ?? global.maxLimit,
  };
}

@Injectable()
/**
 * NestJS interceptor that parses query parameters for search, filter, pagination, and sorting.
 *
 * Define searchable and filterable fields per-entity using the options parameter.
 *
 * @example
 * ```typescript
 * @UseInterceptors(new SmartQueryInterceptor({
 *   searchableFields: ['name', 'email'],
 *   filterableFields: ['name', 'email', 'status', 'role'],
 * }))
 * ```
 */
export class SmartQueryInterceptor implements NestInterceptor {
  private readonly config: SmartQueryConfig;

  constructor(
    @Optional() interceptorOptions?: SmartQueryInterceptorOptions,
    @Optional() @Inject(SMART_QUERY_CONFIG) globalConfig?: SmartQueryConfig,
  ) {
    this.config = mergeConfig(interceptorOptions, globalConfig);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const queryString = request.url.split('?')[1] || '';

    const parsedQuery = parseQueryString(queryString);

    const searchTerm = parsedQuery.searchTerm as string | undefined;
    const filters = parseFilters(parsedQuery, this.config);
    const searchConditions = buildSearchConditions(searchTerm, this.config);
    const pagination = parsePagination(parsedQuery, this.config);
    const orderBy = parseSort(
      parsedQuery.sort,
      parsedQuery.sortBy,
      parsedQuery.sortOrder,
    );

    const where: Record<string, unknown> = {};

    if (Object.keys(filters).length > 0) {
      Object.assign(where, filters);
    }

    if (searchConditions) {
      Object.assign(where, searchConditions);
    }

    const smartQueryContext: SmartQueryContext = {
      where,
      orderBy,
      skip: pagination.skip,
      take: pagination.limit,
      page: pagination.page,
      limit: pagination.limit,
    };

    request.smartQuery = smartQueryContext;

    return next.handle().pipe(
      map((data) => {
        if (
          data &&
          typeof data === 'object' &&
          'data' in data &&
          'total' in data
        ) {
          return {
            ...data,
            pagination: {
              limit: pagination.limit,
              total: data.total,
              totalPages: Math.ceil(data.total / pagination.limit),
            },
          };
        }
        return data;
      }),
    );
  }
}

/**
 * Factory function to create a SmartQueryInterceptor with specific options.
 * Use this when you need to create the interceptor programmatically.
 *
 * @param config - Entity-specific query options
 * @returns Configured SmartQueryInterceptor instance
 *
 * @example
 * ```typescript
 * const interceptor = createSmartQueryInterceptor({
 *   searchableFields: ['title', 'description'],
 *   filterableFields: ['category', 'price', 'status'],
 *   numberFields: ['price'],
 * });
 * ```
 */
export function createSmartQueryInterceptor(
  config: SmartQueryInterceptorOptions,
): SmartQueryInterceptor {
  return new SmartQueryInterceptor(config);
}

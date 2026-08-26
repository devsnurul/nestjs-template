import { SmartQueryResult } from '../types/index';

export interface BuildSmartQueryOptions<TWhere = any> {
  where?: TWhere;
  orderBy?: Record<string, 'asc' | 'desc'>[];
  skip?: number;
  take?: number;
  page?: number;
  limit?: number;
}

export interface BuiltSmartQuery<TWhere = any> {
  where: TWhere;
  orderBy?: Record<string, 'asc' | 'desc'>[];
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export function buildSmartQuery<TWhere = any>(
  query: SmartQueryResult<TWhere>,
  ...extraConditions: Partial<TWhere>[]
): BuiltSmartQuery<TWhere> {
  const { where, orderBy, skip, take, page, limit } = query;

  let finalWhere: TWhere;

  if (extraConditions.length === 0) {
    finalWhere = where;
  } else if (extraConditions.length === 1) {
    finalWhere = {
      AND: [where, extraConditions[0]],
    } as TWhere;
  } else {
    finalWhere = {
      AND: [where, ...extraConditions],
    } as TWhere;
  }

  const finalOrderBy = orderBy?.length ? orderBy : [];

  return {
    where: finalWhere,
    orderBy: finalOrderBy,
    skip: skip ?? 0,
    take: take ?? 10,
    page: page ?? 1,
    limit: limit ?? 10,
  };
}

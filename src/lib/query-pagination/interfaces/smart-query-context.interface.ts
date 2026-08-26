import { SmartQueryMeta, PrismaQuery } from '../types/index';

export type SmartQueryContext<TWhere = any> = PrismaQuery<TWhere> &
  SmartQueryMeta;

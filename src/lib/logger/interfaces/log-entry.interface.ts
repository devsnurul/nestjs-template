import type { LogLevel } from '../../../generated/prisma/client';

export interface WriteLogMeta {
  model?: string;
  action?: string;
  entityId?: string;
  affectedCount?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  source?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  meta?: WriteLogMeta;
}

export interface LogOptions {
  source?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  meta?: WriteLogMeta;
}

export interface LogBatchPayload {
  entries: LogEntry[];
}

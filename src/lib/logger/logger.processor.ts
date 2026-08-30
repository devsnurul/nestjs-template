import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '../../generated/prisma/client';
import { LOG_QUEUE, LogEntry, LogBatchPayload } from './logger.types';
import { env } from '../../config/env/index';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.databaseUrl }),
});

@Processor(LOG_QUEUE)
export class LogProcessor extends WorkerHost {
  private readonly logger = new Logger(LogProcessor.name);

  async process(job: Job<LogBatchPayload | LogEntry>): Promise<void> {
    const entries = this.resolveEntries(job.data);

    if (entries.length === 0) {
      return;
    }

    try {
      await prisma.log.createMany({
        data: entries.map((entry) => ({
          level: entry.level,
          message: entry.message,
          source: entry.source,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          userId: entry.userId,
          meta: entry.meta as Prisma.InputJsonValue | undefined,
        })),
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist ${entries.length} log entries: ${error}`,
      );
      throw error;
    }
  }

  private resolveEntries(data: LogBatchPayload | LogEntry): LogEntry[] {
    if (data && Array.isArray((data as LogBatchPayload).entries)) {
      return (data as LogBatchPayload).entries.filter(
        (entry) => entry && entry.message,
      );
    }

    const single = data as LogEntry;
    return single && single.message ? [single] : [];
  }
}

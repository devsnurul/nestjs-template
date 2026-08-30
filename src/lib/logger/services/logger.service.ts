import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LogEntry, LogOptions, LogBatchPayload } from '../interfaces/index';
import { LOG_QUEUE } from '../constants/index';
import { LogLevel } from '../../../generated/prisma/client';
import { env } from '../../../config/env/index';

@Injectable()
export class LogService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(LogService.name);
  private buffer: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(@InjectQueue(LOG_QUEUE) private readonly logQueue: Queue) {}

  onModuleInit(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, env.log.flushIntervalMs);
    this.flushTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  debug(message: string, options: LogOptions = {}): void {
    this.enqueue(LogLevel.DEBUG, message, options);
  }

  info(message: string, options: LogOptions = {}): void {
    this.enqueue(LogLevel.INFO, message, options);
  }

  warn(message: string, options: LogOptions = {}): void {
    this.enqueue(LogLevel.WARN, message, options);
  }

  error(message: string, options: LogOptions = {}): void {
    this.enqueue(LogLevel.ERROR, message, options);
  }

  log(entry: LogEntry): void {
    this.enqueue(entry.level, entry.message, {
      source: entry.source,
      userId: entry.userId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      meta: entry.meta,
    });
  }

  private enqueue(level: LogLevel, message: string, options: LogOptions): void {
    this.buffer.push({
      level,
      message,
      source: options.source,
      userId: options.userId,
      action: options.action,
      entityType: options.entityType,
      entityId: options.entityId,
      meta: options.meta,
    });

    if (this.buffer.length >= env.log.batchSize) {
      this.flush();
    }
  }

  private flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = this.buffer;
    this.buffer = [];

    const payload: LogBatchPayload = { entries };

    void this.logQueue
      .add('log', payload, {
        removeOnComplete: { age: env.log.queueTtl },
        attempts: 3,
      })
      .catch((error) => {
        this.logger.error(
          `Failed to enqueue ${entries.length} log entries: ${error}`,
        );
      });
  }
}

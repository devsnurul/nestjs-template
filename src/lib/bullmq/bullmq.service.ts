import { Injectable, Logger } from '@nestjs/common';
import { Queue, Job, QueueOptions } from 'bullmq';
import { env } from '../../config/env/index';

@Injectable()
export class BullService {
  private readonly logger = new Logger(BullService.name);

  async add(
    queue: Queue,
    name: string,
    data?: unknown,
    opts?: {
      delay?: number;
      priority?: number;
      ttl?: number;
      attempts?: number;
      jobId?: string;
    },
  ): Promise<Job | undefined> {
    try {
      const job = await queue.add(name, data, {
        delay: opts?.delay,
        priority: opts?.priority,
        removeOnComplete: opts?.ttl ? { age: opts.ttl } : undefined,
        attempts: opts?.attempts,
        jobId: opts?.jobId,
      });
      this.logger.debug(`Job ${name} added to ${queue.name}`);
      return job;
    } catch (err) {
      this.logger.error(`Failed to add job ${name} to ${queue.name}: ${err}`);
      throw err;
    }
  }

  async addBulk(
    queue: Queue,
    jobs: {
      name: string;
      data?: unknown;
      opts?: {
        delay?: number;
        priority?: number;
        attempts?: number;
        jobId?: string;
      };
    }[],
  ): Promise<Job[]> {
    try {
      const result = await queue.addBulk(
        jobs.map((j) => ({
          name: j.name,
          data: j.data,
          opts: {
            delay: j.opts?.delay,
            priority: j.opts?.priority,
            attempts: j.opts?.attempts,
            jobId: j.opts?.jobId,
          },
        })),
      );
      this.logger.debug(`${jobs.length} jobs added to ${queue.name}`);
      return result;
    } catch (err) {
      this.logger.error(`Failed to add bulk jobs to ${queue.name}: ${err}`);
      throw err;
    }
  }

  async schedule(
    queue: Queue,
    name: string,
    data: unknown,
    pattern: string,
    opts?: { ttl?: number; attempts?: number; jobId?: string },
  ): Promise<Job | undefined> {
    try {
      const job = await queue.add(name, data, {
        repeat: { pattern },
        removeOnComplete: opts?.ttl ? { age: opts.ttl } : undefined,
        attempts: opts?.attempts,
        jobId: opts?.jobId,
      });
      this.logger.log(
        `Scheduled job ${name} on ${queue.name} with pattern ${pattern}`,
      );
      return job;
    } catch (err) {
      this.logger.error(
        `Failed to schedule job ${name} on ${queue.name}: ${err}`,
      );
      throw err;
    }
  }

  async scheduleCron(
    queue: Queue,
    name: string,
    data: unknown,
    cron: string,
    timezone?: string,
    opts?: { ttl?: number; attempts?: number; jobId?: string },
  ): Promise<Job | undefined> {
    try {
      const job = await queue.add(name, data, {
        repeat: { pattern: cron, tz: timezone },
        removeOnComplete: opts?.ttl ? { age: opts.ttl } : undefined,
        attempts: opts?.attempts,
        jobId: opts?.jobId,
      });
      this.logger.log(`Scheduled cron job ${name} on ${queue.name}: ${cron}`);
      return job;
    } catch (err) {
      this.logger.error(
        `Failed to schedule cron job ${name} on ${queue.name}: ${err}`,
      );
      throw err;
    }
  }

  async scheduleOnce(
    queue: Queue,
    name: string,
    data: unknown,
    date: Date,
    opts?: { ttl?: number; attempts?: number; jobId?: string },
  ): Promise<Job | undefined> {
    const delay = date.getTime() - Date.now();
    if (delay <= 0) {
      return this.add(queue, name, data, opts);
    }
    return this.add(queue, name, data, { ...opts, delay });
  }

  async getJob(queue: Queue, jobId: string): Promise<Job | undefined> {
    try {
      return await queue.getJob(jobId);
    } catch (err) {
      this.logger.error(
        `Failed to get job ${jobId} from ${queue.name}: ${err}`,
      );
      return undefined;
    }
  }

  async getJobs(
    queue: Queue,
    status:
      'completed' | 'waiting' | 'active' | 'delayed' | 'failed' | 'paused',
    start?: number,
    end?: number,
  ): Promise<Job[]> {
    try {
      return await queue.getJobs(status, start, end);
    } catch (err) {
      this.logger.error(
        `Failed to get ${status} jobs from ${queue.name}: ${err}`,
      );
      return [];
    }
  }

  async removeJob(queue: Queue, jobId: string): Promise<void> {
    try {
      const job = await queue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.debug(`Job ${jobId} removed from ${queue.name}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to remove job ${jobId} from ${queue.name}: ${err}`,
      );
    }
  }

  async pauseQueue(queue: Queue): Promise<void> {
    await queue.pause();
    this.logger.log(`Queue ${queue.name} paused`);
  }

  async resumeQueue(queue: Queue): Promise<void> {
    await queue.resume();
    this.logger.log(`Queue ${queue.name} resumed`);
  }

  async getQueueStatus(queue: Queue): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    paused: boolean;
  }> {
    const [waiting, active, completed, failed, delayed, isPaused] =
      await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused(),
      ]);
    return { waiting, active, completed, failed, delayed, paused: isPaused };
  }

  async getRepeatableJobs(
    queue: Queue,
    start?: number,
    end?: number,
  ): Promise<{ name: string; key: string; pattern: string; next: number }[]> {
    const jobs = await queue.getRepeatableJobs(start, end);
    return jobs.map((j) => ({
      name: j.name,
      key: j.key,
      pattern: j.pattern ?? '',
      next: j.next ?? 0,
    }));
  }

  async removeRepeatableJob(
    queue: Queue,
    name: string,
    pattern: string,
  ): Promise<void> {
    try {
      await queue.removeRepeatable(name, { pattern });
      this.logger.log(`Repeatable job ${name} removed from ${queue.name}`);
    } catch (err) {
      this.logger.error(`Failed to remove repeatable job ${name}: ${err}`);
    }
  }

  async drainQueue(queue: Queue): Promise<void> {
    await queue.drain();
    this.logger.log(`Queue ${queue.name} drained`);
  }

  async cleanQueue(
    queue: Queue,
    grace: number,
    limit: number,
    type?: 'completed' | 'wait' | 'active' | 'delayed' | 'failed',
  ): Promise<string[]> {
    const jobIds = await queue.clean(grace, limit, type);
    this.logger.log(`Cleaned ${jobIds.length} jobs from ${queue.name}`);
    return jobIds;
  }

  getQueue(name: string, opts?: Partial<QueueOptions>): Queue {
    return new Queue(name, {
      connection: {
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password || undefined,
        db: env.redis.db,
      },
      prefix: env.bull.prefix,
      ...opts,
    });
  }
}

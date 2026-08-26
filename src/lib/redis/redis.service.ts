/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import Redis, { ChainableCommander } from 'ioredis';
import { env } from '../../config/env/index';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client!: Redis;

  async onModuleInit() {
    this.client = new Redis({
      host: env.redis.host,
      port: env.redis.port,
      password: env.redis.password || undefined,
      db: env.redis.db,
      keyPrefix: env.redis.keyPrefix,
      retryStrategy: (times) => {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });

    this.client.on('connect', () => {
      this.logger.log('Connected to Redis');
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    try {
      await this.client.connect();
    } catch (_err) {
      this.logger.warn(
        `Failed to connect to Redis at ${env.redis.host}:${env.redis.port}. Caching disabled.`,
      );
    }
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.log('Disconnected from Redis');
    }
  }

  getClient(): Redis {
    return this.client;
  }

  async ping(): Promise<string> {
    return this.client.ping();
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl?: number): Promise<'OK'> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    if (ttl !== undefined) {
      return this.client.set(key, serialized, 'EX', ttl);
    }
    return this.client.set(key, serialized);
  }

  async setNx(key: string, value: unknown, ttl?: number): Promise<boolean> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    const result = ttl
      ? await this.client.set(key, serialized, 'EX', ttl, 'NX')
      : await this.client.set(key, serialized, 'NX');
    return result === 'OK';
  }

  async delete(...keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    return this.client.del(keys);
  }

  async delByPattern(pattern: string): Promise<number> {
    const stream = this.client.scanStream({
      match: pattern,
      count: 100,
    });
    let deleted = 0;
    for await (const rawKeys of stream) {
      const keys = rawKeys as string[];
      if (keys.length > 0) {
        deleted += await this.client.del(...keys);
      }
    }
    return deleted;
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    const result = await this.client.expire(key, ttl);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async decr(key: string): Promise<number> {
    return this.client.decr(key);
  }

  async incrBy(key: string, amount: number): Promise<number> {
    return this.client.incrby(key, amount);
  }

  async decrBy(key: string, amount: number): Promise<number> {
    return this.client.decrby(key, amount);
  }

  async mget<T = unknown>(...keys: string[]): Promise<(T | null)[]> {
    const values = await this.client.mget(keys);
    return values.map((v) => {
      if (v === null) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async mset(items: Record<string, unknown>, ttl?: number): Promise<void> {
    const pipeline = this.client.pipeline();
    for (const [key, value] of Object.entries(items)) {
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);
      if (ttl !== undefined) {
        pipeline.set(key, serialized, 'EX', ttl);
      } else {
        pipeline.set(key, serialized);
      }
    }
    await pipeline.exec();
  }

  async hget<T = unknown>(key: string, field: string): Promise<T | null> {
    const value = await this.client.hget(key, field);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async hset(key: string, field: string, value: unknown): Promise<number> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    return this.client.hset(key, field, serialized);
  }

  async hmset(key: string, data: Record<string, unknown>): Promise<'OK'> {
    const entries: Record<string, string> = {};
    for (const [field, value] of Object.entries(data)) {
      entries[field] =
        typeof value === 'string' ? value : JSON.stringify(value);
    }
    return this.client.hmset(key, entries);
  }

  async hmget<T = unknown>(
    key: string,
    ...fields: string[]
  ): Promise<(T | null)[]> {
    const values = await this.client.hmget(key, ...fields);
    return values.map((v) => {
      if (v === null) return null;
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async hgetall<T = Record<string, unknown>>(
    key: string,
  ): Promise<T | Record<string, unknown>> {
    const entries = await this.client.hgetall(key);
    const result: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(entries)) {
      try {
        result[field] = JSON.parse(value);
      } catch {
        result[field] = value;
      }
    }
    return result;
  }

  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.client.hdel(key, ...fields);
  }

  async hexists(key: string, field: string): Promise<boolean> {
    const result = await this.client.hexists(key, field);
    return result === 1;
  }

  async hlen(key: string): Promise<number> {
    return this.client.hlen(key);
  }

  async hkeys(key: string): Promise<string[]> {
    return this.client.hkeys(key);
  }

  async hvals<T = unknown>(key: string): Promise<T[]> {
    const values = await this.client.hvals(key);
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async lpush(key: string, ...values: unknown[]): Promise<number> {
    const serialized = values.map((v) =>
      typeof v === 'string' ? v : JSON.stringify(v),
    );
    return this.client.lpush(key, ...serialized);
  }

  async rpush(key: string, ...values: unknown[]): Promise<number> {
    const serialized = values.map((v) =>
      typeof v === 'string' ? v : JSON.stringify(v),
    );
    return this.client.rpush(key, ...serialized);
  }

  async lpop<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.lpop(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async rpop<T = unknown>(key: string): Promise<T | null> {
    const value = await this.client.rpop(key);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async lrange<T = unknown>(
    key: string,
    start: number,
    stop: number,
  ): Promise<T[]> {
    const values = await this.client.lrange(key, start, stop);
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async llen(key: string): Promise<number> {
    return this.client.llen(key);
  }

  async lrem(key: string, count: number, value: unknown): Promise<number> {
    const serialized =
      typeof value === 'string' ? value : JSON.stringify(value);
    return this.client.lrem(key, count, serialized);
  }

  async lindex<T = unknown>(key: string, index: number): Promise<T | null> {
    const value = await this.client.lindex(key, index);
    if (value === null) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return value as unknown as T;
    }
  }

  async ltrim(key: string, start: number, stop: number): Promise<'OK'> {
    return this.client.ltrim(key, start, stop);
  }

  async sadd(key: string, ...members: unknown[]): Promise<number> {
    const serialized = members.map((m) =>
      typeof m === 'string' ? m : JSON.stringify(m),
    );
    return this.client.sadd(key, ...serialized);
  }

  async srem(key: string, ...members: unknown[]): Promise<number> {
    const serialized = members.map((m) =>
      typeof m === 'string' ? m : JSON.stringify(m),
    );
    return this.client.srem(key, ...serialized);
  }

  async smembers<T = unknown>(key: string): Promise<T[]> {
    const values = await this.client.smembers(key);
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async sismember(key: string, member: unknown): Promise<boolean> {
    const serialized =
      typeof member === 'string' ? member : JSON.stringify(member);
    const result = await this.client.sismember(key, serialized);
    return result === 1;
  }

  async scard(key: string): Promise<number> {
    return this.client.scard(key);
  }

  async zadd(key: string, score: number, member: unknown): Promise<number> {
    const serialized =
      typeof member === 'string' ? member : JSON.stringify(member);
    return this.client.zadd(key, score, serialized);
  }

  async zrem(key: string, ...members: unknown[]): Promise<number> {
    const serialized = members.map((m) =>
      typeof m === 'string' ? m : JSON.stringify(m),
    );
    return this.client.zrem(key, ...serialized);
  }

  async zrange<T = unknown>(
    key: string,
    start: number,
    stop: number,
    withScores?: boolean,
  ): Promise<T[]> {
    let values: string[];
    if (withScores) {
      values = await this.client.zrange(key, start, stop, 'WITHSCORES');
    } else {
      values = await this.client.zrange(key, start, stop);
    }
    if (withScores) {
      const result: T[] = [];
      for (let i = 0; i < values.length; i += 2) {
        try {
          result.push(JSON.parse(values[i]) as T);
        } catch {
          result.push(values[i] as unknown as T);
        }
      }
      return result;
    }
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async zrevrange<T = unknown>(
    key: string,
    start: number,
    stop: number,
    withScores?: boolean,
  ): Promise<T[]> {
    let values: string[];
    if (withScores) {
      values = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
    } else {
      values = await this.client.zrevrange(key, start, stop);
    }
    if (withScores) {
      const result: T[] = [];
      for (let i = 0; i < values.length; i += 2) {
        try {
          result.push(JSON.parse(values[i]) as T);
        } catch {
          result.push(values[i] as unknown as T);
        }
      }
      return result;
    }
    return values.map((v) => {
      try {
        return JSON.parse(v) as T;
      } catch {
        return v as unknown as T;
      }
    });
  }

  async zrank(key: string, member: unknown): Promise<number | null> {
    const serialized =
      typeof member === 'string' ? member : JSON.stringify(member);
    const rank = await this.client.zrank(key, serialized);
    return rank;
  }

  async zrevrank(key: string, member: unknown): Promise<number | null> {
    const serialized =
      typeof member === 'string' ? member : JSON.stringify(member);
    const rank = await this.client.zrevrank(key, serialized);
    return rank;
  }

  async zscore(key: string, member: unknown): Promise<number | null> {
    const serialized =
      typeof member === 'string' ? member : JSON.stringify(member);
    const score = await this.client.zscore(key, serialized);
    return score ? parseFloat(score) : null;
  }

  async zcard(key: string): Promise<number> {
    return this.client.zcard(key);
  }

  async zincrby(
    key: string,
    increment: number,
    member: unknown,
  ): Promise<number> {
    const serialized =
      typeof member === 'string' ? member : JSON.stringify(member);
    const result = await this.client.zincrby(key, increment, serialized);
    return parseFloat(result);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async flushall(): Promise<'OK'> {
    return this.client.flushall();
  }

  async flushdb(): Promise<'OK'> {
    return this.client.flushdb();
  }

  pipeline(): ChainableCommander {
    return this.client.pipeline();
  }

  multi(): ChainableCommander {
    return this.client.multi();
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }
    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}

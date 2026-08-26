import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../lib/redis/redis.service';

const CACHE_PREFIX = 'permission:rules:';
const CACHE_TTL_SEC = 300;

@Injectable()
export class PermissionCacheService {
  private readonly logger = new Logger(PermissionCacheService.name);

  constructor(private readonly redis: RedisService) {}

  async get(userId: string): Promise<string[] | undefined> {
    try {
      const rules = await this.redis.get<string[]>(`${CACHE_PREFIX}${userId}`);
      return rules ?? undefined;
    } catch (err) {
      this.logger.warn(`Cache read failed for user ${userId}: ${err}`);
      return undefined;
    }
  }

  async set(userId: string, rules: string[]): Promise<void> {
    try {
      await this.redis.set(`${CACHE_PREFIX}${userId}`, rules, CACHE_TTL_SEC);
    } catch (err) {
      this.logger.warn(`Cache write failed for user ${userId}: ${err}`);
    }
  }

  async invalidate(userId?: string): Promise<void> {
    try {
      if (userId) {
        await this.redis.delete(`${CACHE_PREFIX}${userId}`);
      } else {
        await this.redis.delByPattern(`${CACHE_PREFIX}*`);
      }
    } catch (err) {
      this.logger.warn(`Cache invalidation failed: ${err}`);
    }
  }
}

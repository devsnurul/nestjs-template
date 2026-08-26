import { Injectable } from '@nestjs/common';
import { PrismaService } from './lib/prisma/prisma.service';
import { RedisService } from './lib/redis/redis.service';

@Injectable()
export class AppService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  getApiInfo() {
    return {
      name: 'VisaPrime API',
      version: '1.0.0',
      description: 'Backend API for VisaPrime Malaysian Government',
    };
  }

  async getHealth() {
    const dbConnected = await this.checkDatabase();
    const redisConnected = await this.checkRedis();
    const allHealthy = dbConnected && redisConnected;
    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      database: dbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected',
    };
  }

  async getReady() {
    const dbConnected = await this.checkDatabase();
    const redisConnected = await this.checkRedis();
    const allReady = dbConnected && redisConnected;
    return {
      status: allReady ? 'ready' : 'not ready',
      database: dbConnected ? 'connected' : 'disconnected',
      redis: redisConnected ? 'connected' : 'disconnected',
    };
  }

  getLive() {
    return { status: 'alive', uptime: process.uptime() };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return await this.redis.isConnected();
    } catch {
      return false;
    }
  }
}

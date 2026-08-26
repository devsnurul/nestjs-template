import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { env } from '../../config/env/index';
import { BullService } from './bullmq.service';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: env.redis.host,
          port: env.redis.port,
          password: env.redis.password || undefined,
          db: env.redis.db,
        },
        prefix: env.bull.prefix,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { age: 86400, count: 1000 },
          removeOnFail: { age: 604800, count: 500 },
        },
      }),
    }),
  ],
  providers: [BullService],
  exports: [BullModule, BullService],
})
export class BullmqModule {}

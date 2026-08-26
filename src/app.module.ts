import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './lib/prisma/prisma.module';
import { TokenModule } from './lib/token/token.module';
import { AuthGuardModule } from './guards/auth/auth-guard.module';
import { RbacGuardModule } from './guards/rbac/rbac-guard.module';
import { env } from './config/env/index';
import { Modules } from './modules/index';
import { S3StorageModule } from './lib/s3-api';
import { FileReaderModule } from './lib/file-reader/file-reader.module';
import { ObjectManagerModule } from './helper/object-manager';
import { RedisModule } from './lib/redis/redis.module';
import { BullmqModule } from './lib/bullmq/bullmq.module';

@Module({
  imports: [
    // external
    ThrottlerModule.forRoot([
      {
        ttl: env.throttle.ttl * 1000,
        limit: env.throttle.limit,
      },
    ]),
    PrismaModule,
    S3StorageModule.forRoot({
      endpoint: env.storage.endpoint,
      accessKeyId: env.storage.accessKeyId,
      secretAccessKey: env.storage.secretAccessKey,
      bucketName: env.storage.bucket,
      region: env.storage.region,
      publicUrlBase: env.storage.publicUrlBase,
      signedUrlExpiry: env.storage.signedUrlExpiry,
      accessMode: env.storage.accessMode,
    }),
    // global
    RedisModule,
    BullmqModule,
    TokenModule,
    ObjectManagerModule,
    FileReaderModule,
    // guards
    AuthGuardModule,
    RbacGuardModule,
    // business logic modules
    Modules,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}

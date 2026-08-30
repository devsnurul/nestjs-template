import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { LOG_QUEUE } from './logger.types';
import { LogService } from './logger.service';
import { LogProcessor } from './logger.processor';
import { WriteLogInterceptor } from './write-log.interceptor';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: LOG_QUEUE })],
  providers: [
    LogService,
    LogProcessor,
    {
      provide: APP_INTERCEPTOR,
      useClass: WriteLogInterceptor,
    },
  ],
  exports: [LogService],
})
export class LoggerModule {}

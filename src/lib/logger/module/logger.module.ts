import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { LOG_QUEUE } from '../constants/index';
import { LogService } from '../services/index';
import { LogProcessor } from '../processors/index';
import { WriteLogInterceptor } from '../interceptors/index';

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

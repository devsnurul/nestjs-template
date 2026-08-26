import { DynamicModule, Module } from '@nestjs/common';
import { ExceptionHandlerService } from '../services/exception-handler.service';
import { GlobalExceptionFilter } from '../filter/global-exception.filter';
import { ExceptionHandlerConfig } from '../interfaces/exception-handler-config.interface';
import { PrismaExceptionFormatter } from '../formatters/prisma-exception.formatter';
import { DtoExceptionFormatter } from '../formatters/dto-exception.formatter';
import { HttpExceptionFormatter } from '../formatters/http-exception.formatter';
import { UnknownExceptionFormatter } from '../formatters/unknown-exception.formatter';

@Module({})
export class ExceptionHandlerModule {
  static forRoot(config?: ExceptionHandlerConfig): DynamicModule {
    const providers = [
      ExceptionHandlerService,
      {
        provide: GlobalExceptionFilter,
        useFactory: (service: ExceptionHandlerService) => {
          return new GlobalExceptionFilter(service, config);
        },
        inject: [ExceptionHandlerService],
      },
    ];

    return {
      module: ExceptionHandlerModule,
      providers,
      exports: [ExceptionHandlerService, GlobalExceptionFilter],
      global: true,
    };
  }

  static forFeature(config?: ExceptionHandlerConfig): DynamicModule {
    return this.forRoot(config);
  }
}

// Initialize formatters
export function initializeFormatters(service: ExceptionHandlerService): void {
  service.registerFormatter(new PrismaExceptionFormatter());
  service.registerFormatter(new DtoExceptionFormatter());
  service.registerFormatter(new HttpExceptionFormatter());
  service.registerFormatter(new UnknownExceptionFormatter());
}

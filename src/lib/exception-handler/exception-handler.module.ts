import { Module } from '@nestjs/common';
import { GlobalExceptionFilter } from './exception-filter/global-exception.filter';
import { PrismaExceptionFormatter } from './formatters/prisma-exception.formatter';
import { DtoValidationFormatter } from './formatters/dto-validation.formatter';
import { OtherExceptionFormatter } from './formatters/other-exception.formatter';

@Module({
  providers: [
    GlobalExceptionFilter,
    PrismaExceptionFormatter,
    DtoValidationFormatter,
    OtherExceptionFormatter,
  ],
  exports: [GlobalExceptionFilter],
})
export class ExceptionHandlerModule {}

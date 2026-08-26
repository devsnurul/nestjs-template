import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { PrismaExceptionFormatter } from '../formatters/prisma-exception.formatter';
import { DtoValidationFormatter } from '../formatters/dto-validation.formatter';
import { OtherExceptionFormatter } from '../formatters/other-exception.formatter';
import { ErrorMessage } from '../interfaces/error-message.interface';
import {
  PrismaClientKnownRequestError,
  PrismaClientInitializationError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/client';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly prismaExceptionFormatter: PrismaExceptionFormatter,
    private readonly dtoValidationFormatter: DtoValidationFormatter,
    private readonly otherValidationFormatter: OtherExceptionFormatter,
  ) {}

  private readonly logger = new Logger(GlobalExceptionFilter.name);

  private getErrorMessage(exception: unknown): string {
    if (
      exception instanceof PrismaClientKnownRequestError ||
      exception instanceof PrismaClientValidationError ||
      exception instanceof PrismaClientRustPanicError ||
      exception instanceof PrismaClientUnknownRequestError ||
      exception instanceof PrismaClientInitializationError
    ) {
      return 'Database error';
    }

    if (exception instanceof HttpException) {
      return exception.message || 'HTTP error';
    }

    return 'Internal server error';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorMessages: ErrorMessage[] = [
      { path: 'unknown', message: ['Internal server error'] },
    ];

    if (
      exception instanceof PrismaClientKnownRequestError ||
      exception instanceof PrismaClientValidationError ||
      exception instanceof PrismaClientRustPanicError ||
      exception instanceof PrismaClientUnknownRequestError ||
      exception instanceof PrismaClientInitializationError
    ) {
      errorMessages = this.prismaExceptionFormatter.formatError(exception);
    } else if (exception instanceof HttpException) {
      errorMessages =
        this.dtoValidationFormatter.formatDtoValidationException(exception);
    } else {
      errorMessages = this.otherValidationFormatter.formatOtherError(exception);
    }

    this.logger.error(
      `${request.method} ${request.url}`,
      JSON.stringify(errorMessages),
      'ExceptionFilter',
    );

    response.status(status).json({
      success: false,
      message: this.getErrorMessage(exception),
      errorMessages,
    });
  }
}

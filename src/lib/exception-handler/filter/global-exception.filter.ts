import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ExceptionHandlerService } from '../services/exception-handler.service';
import {
  ErrorResponse,
  ErrorMessage,
} from '../interfaces/error-message.interface';
import type { ExceptionHandlerConfig } from '../interfaces/exception-handler-config.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private config: ExceptionHandlerConfig;

  constructor(
    private exceptionHandlerService?: ExceptionHandlerService,
    config?: ExceptionHandlerConfig,
  ) {
    this.config = config || { enableLogging: true, hideStackTrace: false };
  }

  private getService(): ExceptionHandlerService {
    if (!this.exceptionHandlerService) {
      this.exceptionHandlerService = new ExceptionHandlerService();
    }
    return this.exceptionHandlerService;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { errors, message } = this.getService().formatException(exception);
    let status = this.getStatusCode(exception);

    let finalErrors = errors;
    let finalMessage = message;

    if (exception instanceof NotFoundException) {
      const exceptionResponse = exception.getResponse();
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        const msg = exceptionResponse.message;
        if (typeof msg === 'string' && msg.includes('Cannot')) {
          status = HttpStatus.NOT_FOUND;
          finalMessage = 'Route Not Found';
          finalErrors = [
            {
              path: 'route',
              message: [msg],
            },
          ];
        }
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      message: finalMessage,
      errorMessages: finalErrors,
    };

    if (this.config.enableLogging) {
      this.logError(request, status, finalErrors, exception);
    }

    response.status(status).json(errorResponse);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private logError(
    request: Request,
    status: number,
    errorMessages: ErrorMessage[],
    exception: unknown,
  ): void {
    const { method, url } = request;
    const timestamp = new Date().toISOString();

    const logData = {
      timestamp,
      method,
      url,
      status,
      errorMessages,
      stack: this.config.hideStackTrace
        ? undefined
        : (exception as Error)?.stack,
    };

    this.logger.error(`${method} ${url} - ${status}`, JSON.stringify(logData));
  }
}

import { HttpException } from '@nestjs/common';
import { ExceptionFormatter } from '../interfaces/exception-formatter.interface';
import { ErrorMessage } from '../interfaces/error-message.interface';

export class HttpExceptionFormatter implements ExceptionFormatter {
  supports(exception: unknown): boolean {
    return exception instanceof HttpException;
  }

  format(exception: unknown): ErrorMessage[] {
    const httpException = exception as HttpException;
    const response = httpException.getResponse();

    if (typeof response === 'string') {
      return [{ path: 'http_error', message: [response] }];
    }

    if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;

      if (responseObj.message && Array.isArray(responseObj.message)) {
        return [
          {
            path: 'http_error',
            message: responseObj.message as string[],
          },
        ];
      }

      if (responseObj.message && typeof responseObj.message === 'string') {
        return [{ path: 'http_error', message: [responseObj.message] }];
      }

      if (responseObj.error && typeof responseObj.error === 'string') {
        return [{ path: 'http_error', message: [responseObj.error] }];
      }
    }

    return [{ path: 'http_error', message: ['An error occurred'] }];
  }

  message(exception: unknown): string {
    const httpException = exception as HttpException;
    const response = httpException.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;

      if (responseObj.message && typeof responseObj.message === 'string') {
        return responseObj.message;
      }

      if (responseObj.error && typeof responseObj.error === 'string') {
        return responseObj.error;
      }
    }

    return 'An error occurred';
  }
}

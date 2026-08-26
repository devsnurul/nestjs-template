import { HttpException } from '@nestjs/common';
import { ErrorMessage } from '../interfaces/error-message.interface';

export class HttpErrorFormatter {
  formatHttpException(exception: HttpException): ErrorMessage[] {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return [{ path: 'http_error', message: [response] }];
    }

    if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;

      if (Array.isArray(responseObj.message)) {
        return [
          {
            path: 'http_error',
            message: responseObj.message as string[],
          },
        ];
      }

      if (typeof responseObj.message === 'string') {
        return [{ path: 'http_error', message: [responseObj.message] }];
      }

      if (responseObj.error && typeof responseObj.error === 'string') {
        return [{ path: 'http_error', message: [responseObj.error] }];
      }
    }

    return [{ path: 'http_error', message: ['An error occurred'] }];
  }

  getMessage(exception: HttpException): string {
    const response = exception.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;

      if (typeof responseObj.message === 'string') {
        return responseObj.message;
      }

      if (responseObj.error && typeof responseObj.error === 'string') {
        return responseObj.error;
      }
    }

    return 'An error occurred';
  }
}

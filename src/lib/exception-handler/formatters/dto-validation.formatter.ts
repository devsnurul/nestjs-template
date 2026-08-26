import { Injectable } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { ErrorMessage } from '../interfaces/error-message.interface';

interface ValidationError {
  property: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

@Injectable()
export class DtoValidationFormatter {
  formatDtoValidationException(exception: HttpException): ErrorMessage[] {
    const responseBody: unknown = exception.getResponse();

    if (
      typeof responseBody === 'object' &&
      responseBody !== null &&
      'message' in responseBody &&
      Array.isArray((responseBody as Record<string, unknown>).message)
    ) {
      const messages = (responseBody as Record<string, unknown>)
        .message as unknown[];
      const firstMessage = messages[0];

      if (
        firstMessage &&
        typeof firstMessage === 'object' &&
        firstMessage !== null &&
        'property' in firstMessage
      ) {
        const validationErrors = messages as ValidationError[];
        return validationErrors.map((error: ValidationError) => ({
          path: error.property,
          message: error.constraints
            ? Object.values(error.constraints)
            : ['Validation error'],
        }));
      }

      if (typeof firstMessage === 'string') {
        return [
          {
            path: 'http_error',
            message: messages as string[],
          },
        ];
      }
    }

    return [
      {
        path: 'http_error',
        message:
          typeof responseBody === 'object' &&
          responseBody !== null &&
          'message' in responseBody
            ? [(responseBody as Record<string, unknown>).message as string]
            : ['An HTTP error occurred'],
      },
    ];
  }
}

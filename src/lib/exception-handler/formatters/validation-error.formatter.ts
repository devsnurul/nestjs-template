import { HttpException, ValidationError } from '@nestjs/common';
import { ErrorMessage } from '../interfaces/error-message.interface';

export class ValidationErrorFormatter {
  formatValidationErrors(exception: HttpException): ErrorMessage[] {
    const response = exception.getResponse();

    if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;

      if (Array.isArray(responseObj.message)) {
        const messages = responseObj.message;

        if (
          messages.length > 0 &&
          typeof messages[0] === 'object' &&
          'property' in messages[0]
        ) {
          return this.formatNestedValidationErrors(
            messages as ValidationError[],
          );
        }

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
        message: ['Validation failed'],
      },
    ];
  }

  private formatNestedValidationErrors(
    errors: ValidationError[],
  ): ErrorMessage[] {
    return errors.map((error) => ({
      path: error.property,
      message: error.constraints
        ? Object.values(error.constraints)
        : ['Validation error'],
    }));
  }
}

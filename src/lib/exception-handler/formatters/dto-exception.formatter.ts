import { ValidationError } from '@nestjs/common';
import { ExceptionFormatter } from '../interfaces/exception-formatter.interface';
import { ErrorMessage } from '../interfaces/error-message.interface';

export class DtoExceptionFormatter implements ExceptionFormatter {
  supports(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const error = exception as Record<string, unknown>;
    return (
      Array.isArray(error.validationErrors) ||
      (Array.isArray(error.children) && error.constraints !== undefined)
    );
  }

  format(exception: unknown): ErrorMessage[] {
    const error = exception as Record<string, unknown>;
    const validationErrors = error.validationErrors as
      ValidationError[] | undefined;
    const children = error.children as ValidationError[] | undefined;

    if (validationErrors) {
      return this.formatValidationErrors(validationErrors);
    }

    if (children) {
      return this.formatChildrenErrors(children);
    }

    return [{ path: 'unknown', message: ['Validation failed'] }];
  }

  message(exception: unknown): string {
    const error = exception as Record<string, unknown>;
    const validationErrors = error.validationErrors as
      ValidationError[] | undefined;
    const children = error.children as ValidationError[] | undefined;

    if (validationErrors && validationErrors.length > 0) {
      const firstError = validationErrors[0];
      const constraints = firstError.constraints;
      if (constraints) {
        return Object.values(constraints)[0];
      }
    }

    if (children && children.length > 0) {
      return 'Validation failed for nested fields';
    }

    return 'Validation failed';
  }

  private formatValidationErrors(errors: ValidationError[]): ErrorMessage[] {
    return errors.flatMap((error) => {
      const constraints = error.constraints;
      if (constraints) {
        return [
          {
            path: error.property,
            message: Object.values(constraints),
          },
        ];
      }
      return [];
    });
  }

  private formatChildrenErrors(children: ValidationError[]): ErrorMessage[] {
    return children.flatMap((child) => {
      const constraints = child.constraints;
      if (constraints) {
        return [
          {
            path: child.property,
            message: Object.values(constraints),
          },
        ];
      }
      return [];
    });
  }
}

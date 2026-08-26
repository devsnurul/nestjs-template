import { Injectable } from '@nestjs/common';
import { ErrorMessage } from '../interfaces/error-message.interface';
import { ExceptionFormatter } from '../interfaces/exception-formatter.interface';

interface PrismaError {
  code?: string;
  meta?: Record<string, unknown>;
  message?: string;
  clientVersion?: string;
}

@Injectable()
export class PrismaExceptionFormatter implements ExceptionFormatter {
  supports(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const error = exception as Record<string, unknown>;
    const hasErrorCode = typeof error.code === 'string';
    const hasClientVersion = typeof error.clientVersion === 'string';
    const hasMeta = typeof error.meta === 'object';

    return hasErrorCode || (hasClientVersion && hasMeta);
  }

  format(exception: unknown): ErrorMessage[] {
    return this.formatError(exception as PrismaError);
  }

  message(_exception: unknown): string {
    return 'Database error';
  }

  formatError(exception: PrismaError): ErrorMessage[] {
    const code = exception.code;

    if (code) {
      return this.formatPrismaError(exception);
    }

    const message = exception.message || '';
    if (
      message.includes('validation') ||
      message.includes('Rust') ||
      message.includes('panic')
    ) {
      return this.formatQueryError(exception);
    }

    if (message.includes('initialization') || message.includes('connect')) {
      return this.formatInitializationError(exception);
    }

    return this.formatUnknownError(exception);
  }

  private formatPrismaError(exception: PrismaError): ErrorMessage[] {
    const code = exception.code;
    const meta = exception.meta;

    switch (code) {
      case 'P2002': {
        const target = meta?.target as string[] | undefined;
        const field = target?.[0] || 'field';
        return [
          {
            path: field,
            message: [`A record with this ${field} already exists.`],
          },
        ];
      }
      case 'P2003': {
        const fieldName = meta?.field_name as string | undefined;
        return [
          {
            path: fieldName || 'field',
            message: [
              `The referenced ${fieldName || 'record'} does not exist.`,
            ],
          },
        ];
      }
      case 'P2005': {
        const fieldName = meta?.field_name as string | undefined;
        return [
          {
            path: fieldName || 'field',
            message: [`The value for ${fieldName || 'field'} is invalid.`],
          },
        ];
      }
      case 'P2006': {
        const fieldName = meta?.field_name as string | undefined;
        return [
          {
            path: fieldName || 'field',
            message: [`The ${fieldName || 'field'} field is required.`],
          },
        ];
      }
      case 'P2025': {
        return [
          {
            path: 'record',
            message: ['The requested record does not exist.'],
          },
        ];
      }
      default:
        return [
          {
            path: 'database',
            message: ['Database operation failed.'],
          },
        ];
    }
  }

  private formatQueryError(exception: PrismaError): ErrorMessage[] {
    const message = exception.message || '';
    let errorMessage = 'Invalid database query.';

    if (message.includes('panic')) {
      errorMessage = 'Database engine panic occurred.';
    }

    return [
      {
        path: 'database',
        message: [errorMessage],
      },
    ];
  }

  private formatInitializationError(exception: PrismaError): ErrorMessage[] {
    return [
      {
        path: 'database',
        message: [
          `Database initialization error: ${exception.message || 'Unknown error'}`,
        ],
      },
    ];
  }

  private formatUnknownError(exception: unknown): ErrorMessage[] {
    return [
      {
        path: 'unknown',
        message:
          exception instanceof Error
            ? [exception.message]
            : ['An unexpected database error occurred.'],
      },
    ];
  }
}

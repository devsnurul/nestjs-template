import { Injectable } from '@nestjs/common';
import { ErrorMessage } from '../interfaces/error-message.interface';

@Injectable()
export class OtherExceptionFormatter {
  formatOtherError(exception: unknown): ErrorMessage[] {
    if (
      exception &&
      typeof exception === 'object' &&
      'path' in exception &&
      'message' in exception
    ) {
      const msg = (exception as Record<string, unknown>).message;
      return [
        {
          path: String((exception as Record<string, unknown>).path),
          message: Array.isArray(msg) ? msg : [String(msg)],
        },
      ];
    }

    const message =
      exception && typeof exception === 'object' && 'message' in exception
        ? String((exception as Record<string, unknown>).message)
        : 'An unexpected error occurred';

    return [
      {
        path: 'unknown',
        message: [message],
      },
    ];
  }
}

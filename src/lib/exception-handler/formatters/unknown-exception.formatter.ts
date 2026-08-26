import { ExceptionFormatter } from '../interfaces/exception-formatter.interface';
import { ErrorMessage } from '../interfaces/error-message.interface';
import { DEFAULT_PATH } from '../constants/default-messages';

export class UnknownExceptionFormatter implements ExceptionFormatter {
  supports(_exception: unknown): boolean {
    return true;
  }

  format(_exception: unknown): ErrorMessage[] {
    return [
      {
        path: DEFAULT_PATH,
        message: ['Something went wrong'],
      },
    ];
  }

  message(_exception: unknown): string {
    return 'Internal Server Error';
  }
}

import { ErrorMessage } from './error-message.interface';

export interface ExceptionFormatter {
  supports(exception: unknown): boolean;
  format(exception: unknown): ErrorMessage[];
  message(exception: unknown): string;
}

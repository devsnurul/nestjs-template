import { Injectable } from '@nestjs/common';
import { ExceptionFormatter } from '../interfaces/exception-formatter.interface';
import { ErrorMessage } from '../interfaces/error-message.interface';
import { PrismaExceptionFormatter } from '../formatters/prisma-exception.formatter';
import { HttpExceptionFormatter } from '../formatters/http-exception.formatter';
import { DtoExceptionFormatter } from '../formatters/dto-exception.formatter';
import { UnknownExceptionFormatter } from '../formatters/unknown-exception.formatter';

@Injectable()
export class ExceptionHandlerService {
  private formatters: ExceptionFormatter[] = [];
  private defaultFormatter: ExceptionFormatter;

  constructor() {
    this.defaultFormatter = new UnknownExceptionFormatter();
    this.registerFormatters();
  }

  private registerFormatters(): void {
    this.formatters = [
      new PrismaExceptionFormatter(),
      new HttpExceptionFormatter(),
      new DtoExceptionFormatter(),
    ];
  }

  registerFormatter(formatter: ExceptionFormatter): void {
    this.formatters.push(formatter);
  }

  getFormatter(exception: unknown): ExceptionFormatter {
    for (const formatter of this.formatters) {
      if (formatter.supports(exception)) {
        return formatter;
      }
    }
    return this.defaultFormatter;
  }

  formatException(exception: unknown): {
    errors: ErrorMessage[];
    message: string;
  } {
    const formatter = this.getFormatter(exception);
    const errors = formatter.format(exception);
    const message = formatter.message(exception);

    return { errors, message };
  }

  formatErrors(exception: unknown): ErrorMessage[] {
    const formatter = this.getFormatter(exception);
    return formatter.format(exception);
  }

  getErrorMessage(exception: unknown): string {
    const formatter = this.getFormatter(exception);
    return formatter.message(exception);
  }

  getAllFormatters(): ExceptionFormatter[] {
    return [...this.formatters];
  }
}

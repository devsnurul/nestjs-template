import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { Request, Response } from 'express';
import { LogService } from './logger.service';
import { TokenPayload } from '../token/token.service';
import { LogLevel } from '../../generated/prisma/client';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const METHOD_ACTION: Record<string, string> = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

@Injectable()
export class WriteLogInterceptor implements NestInterceptor {
  constructor(private readonly logService: LogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & { user?: TokenPayload }>();
    const response = http.getResponse<Response>();
    const method = request.method.toUpperCase();

    if (!WRITE_METHODS.has(method)) {
      return next.handle();
    }

    const startedAt = Date.now();
    const user = request.user as TokenPayload | undefined;
    const userId = user?.sub;
    const entityType = this.resolveEntityType(request.path);
    const action = METHOD_ACTION[method];

    return next.handle().pipe(
      tap(() => {
        const status = response.statusCode;
        this.logService.info(`${method} ${request.originalUrl} ${status}`, {
          userId,
          action,
          entityType,
          source: 'http',
          meta: {
            method,
            path: request.originalUrl,
            statusCode: status,
            durationMs: Date.now() - startedAt,
            userAgent: request.get('user-agent'),
            ip: request.ip,
          },
        });
      }),
      catchError((error: unknown) => {
        const status = this.extractStatus(error);
        const level = this.levelForStatus(status);
        this.logService.log({
          level,
          message: `${method} ${request.originalUrl} ${status}`,
          source: 'http',
          userId,
          action,
          entityType,
          meta: {
            method,
            path: request.originalUrl,
            statusCode: status,
            durationMs: Date.now() - startedAt,
            userAgent: request.get('user-agent'),
            ip: request.ip,
            error: this.sanitizeError(error),
          },
        });
        return throwError(() => error);
      }),
    );
  }

  private resolveEntityType(path: string): string | undefined {
    const segments = path.split('/').filter(Boolean);
    const resource = segments.find(
      (s) => s !== 'api' && s !== 'v1' && !/^\d/.test(s),
    );
    return resource ? this.toPascalCase(resource) : undefined;
  }

  private toPascalCase(value: string): string {
    return value
      .split(/[-_]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
  }

  private extractStatus(error: unknown): number {
    if (error && typeof error === 'object' && 'status' in error) {
      return (error as { status: number }).status;
    }
    return 500;
  }

  private levelForStatus(status: number): LogLevel {
    if (status >= 500) return LogLevel.ERROR;
    if (status >= 400) return LogLevel.WARN;
    return LogLevel.INFO;
  }

  private sanitizeError(error: unknown): unknown {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
      };
    }
    return error;
  }
}

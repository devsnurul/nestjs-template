import { PrismaExceptionFormatter } from './prisma-exception.formatter';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

describe('PrismaExceptionFormatter', () => {
  let formatter: PrismaExceptionFormatter;

  beforeEach(() => {
    formatter = new PrismaExceptionFormatter();
  });

  it('should format P2002 error correctly', () => {
    const prismaError = new PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['email'] },
      },
    );

    const result = formatter.formatError(prismaError);
    expect(result).toEqual([
      { path: 'email', message: ['A record with this email already exists.'] },
    ]);
  });

  it('should format P2003 error correctly', () => {
    const prismaError = new PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      {
        code: 'P2003',
        clientVersion: '5.0.0',
        meta: { field_name: 'userId' },
      },
    );

    const result = formatter.formatError(prismaError);
    expect(result).toEqual([
      { path: 'userId', message: ['The referenced userId does not exist.'] },
    ]);
  });

  it('should format P2005 error correctly', () => {
    const prismaError = new PrismaClientKnownRequestError(
      'Invalid field value',
      {
        code: 'P2005',
        clientVersion: '5.0.0',
        meta: { field_name: 'age' },
      },
    );

    const result = formatter.formatError(prismaError);
    expect(result).toEqual([
      { path: 'age', message: ['The value for age is invalid.'] },
    ]);
  });

  it('should format P2006 error correctly', () => {
    const prismaError = new PrismaClientKnownRequestError(
      'Missing required field',
      {
        code: 'P2006',
        clientVersion: '5.0.0',
        meta: { field_name: 'name' },
      },
    );

    const result = formatter.formatError(prismaError);
    expect(result).toEqual([
      { path: 'name', message: ['The name field is required.'] },
    ]);
  });

  it('should format P2025 error correctly', () => {
    const prismaError = new PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
      meta: {},
    });

    const result = formatter.formatError(prismaError);
    expect(result).toEqual([
      { path: 'record', message: ['The requested record does not exist.'] },
    ]);
  });

  it('should format unknown Prisma error code', () => {
    const prismaError = new PrismaClientKnownRequestError('Unknown error', {
      code: 'UNKNOWN',
      clientVersion: '5.0.0',
    });

    const result = formatter.formatError(prismaError);
    expect(result).toEqual([
      { path: 'database', message: ['Database operation failed.'] },
    ]);
  });
});

export const DEFAULT_ERROR_MESSAGES = {
  UNKNOWN_ERROR: 'An unexpected error occurred',
  VALIDATION_ERROR: 'Validation failed',
  DATABASE_ERROR: 'Database error',
  NOT_FOUND: 'Resource not found',
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Access forbidden',
  CONFLICT: 'Conflict occurred',
  BAD_REQUEST: 'Bad request',
};

export const PRISMA_ERROR_MESSAGES: Record<string, string> = {
  P2002: 'A record with this {field} already exists.',
  P2003: 'This {field} does not exist.',
  P2005: 'Invalid value for {field}.',
  P2006: 'Invalid format for {field}.',
  P2025: 'Record not found.',
};

export const DEFAULT_PATH = 'unknown';

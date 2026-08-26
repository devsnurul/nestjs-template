export function isPrismaError(exception: unknown): boolean {
  if (!exception || typeof exception !== 'object') {
    return false;
  }

  const error = exception as Record<string, unknown>;

  // Check for Prisma error characteristics
  const hasErrorCode = typeof error.code === 'string';
  const hasClientVersion = typeof error.clientVersion === 'string';
  const hasMeta = typeof error.meta === 'object';

  // Prisma errors typically have these properties
  return hasErrorCode && (hasClientVersion || hasMeta);
}

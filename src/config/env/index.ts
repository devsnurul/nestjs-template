import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = parseInt(value ?? '', 10);
  return isNaN(parsed) ? fallback : parsed;
}

export const env = {
  port: toInt(process.env.PORT, 5000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  cors: {
    allowedOrigins: (
      process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000'
    )
      .split(',')
      .map((s) => s.trim()),
  },

  throttle: {
    ttl: toInt(process.env.THROTTLE_TTL, 60),
    limit: toInt(process.env.THROTTLE_LIMIT, 100),
  },

  jwt: {
    secret: required('JWT_SECRET', 'dev-secret-change-in-production'),
    accessExpiry: toInt(process.env.JWT_ACCESS_EXPIRY_SEC, 900),
    refreshExpiry: toInt(process.env.JWT_REFRESH_EXPIRY_SEC, 604800),
  },

  mail: {
    host: required('MAIL_HOST', 'localhost'),
    port: toInt(process.env.MAIL_PORT, 1025),
    user: process.env.MAIL_USER ?? '',
    pass: process.env.MAIL_PASS ?? '',
    from: required('MAIL_FROM', '"VisaPrime" <noreply@visaprime.com>'),
  },

  frontendUrl: required('FRONTEND_URL', 'http://localhost:3000'),

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: toInt(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD ?? undefined,
    db: toInt(process.env.REDIS_DB, 0),
    keyPrefix: process.env.REDIS_KEY_PREFIX ?? 'visaprime:',
  },

  bull: {
    prefix: process.env.BULL_PREFIX ?? 'bull',
  },

  storage: {
    endpoint: required('STORAGE_ENDPOINT'),
    accessKeyId: required('STORAGE_ACCESS_KEY'),
    secretAccessKey: required('STORAGE_SECRET_KEY'),
    bucket: required('STORAGE_BUCKET'),
    region: process.env.STORAGE_REGION ?? 'auto',
    publicUrlBase: process.env.STORAGE_PUBLIC_URL,
    signedUrlExpiry: toInt(process.env.STORAGE_SIGNED_URL_EXPIRY, 3600),
    accessMode:
      (process.env.STORAGE_ACCESS_MODE as
        'private' | 'public-read' | 'hybrid') ?? 'private',
  },
  socket: {
    path: process.env.SOCKET_PATH ?? '/socket.io',
    namespace: process.env.SOCKET_NAMESPACE ?? '/',
    cors: {
      allowedOrigins: (
        process.env.SOCKET_CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000'
      )
        .split(',')
        .map((s) => s.trim()),
    },
    useRedisAdapter: process.env.SOCKET_REDIS_ADAPTER === 'true',
  },

  log: {
    batchSize: toInt(process.env.LOG_BATCH_SIZE, 50),
    flushIntervalMs: toInt(process.env.LOG_FLUSH_INTERVAL_MS, 2000),
    queueTtl: toInt(process.env.LOG_QUEUE_TTL, 86400),
  },
};

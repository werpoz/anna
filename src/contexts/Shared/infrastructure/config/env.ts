const numberOrDefault = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const numberOrUndefined = (value: string | undefined): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const booleanOrDefault = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined) {
    return fallback;
  }
  return value.toLowerCase() === 'true';
};

const sameSiteOrDefault = (
  value: string | undefined,
  fallback: 'Strict' | 'Lax' | 'None'
): 'Strict' | 'Lax' | 'None' => {
  if (!value) {
    return fallback;
  }

  const normalized = value.toLowerCase();
  if (normalized === 'none') {
    return 'None';
  }
  if (normalized === 'lax') {
    return 'Lax';
  }
  return 'Strict';
};

const listOrDefault = (value: string | undefined, fallback: string[]): string[] => {
  if (!value) {
    return fallback;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://anna:anna@localhost:5432/anna',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  otelServiceName: process.env.OTEL_SERVICE_NAME ?? 'anna',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  corsOrigins: listOrDefault(process.env.CORS_ORIGINS, ['http://localhost:5173']),
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendFrom: process.env.RESEND_FROM ?? '',
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? 'dev-secret-change-me',
  authAccessTokenTtlMs: numberOrDefault(process.env.AUTH_ACCESS_TOKEN_TTL_MS, 15 * 60 * 1000),
  authRefreshTokenTtlMs: numberOrDefault(process.env.AUTH_REFRESH_TOKEN_TTL_MS, 30 * 24 * 60 * 60 * 1000),
  authRefreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token',
  authCookieSecure: booleanOrDefault(process.env.AUTH_COOKIE_SECURE, false),
  authCookieSameSite: sameSiteOrDefault(process.env.AUTH_COOKIE_SAMESITE, 'Strict'),
  authPasswordResetTtlMs: numberOrDefault(process.env.AUTH_PASSWORD_RESET_TTL_MS, 60 * 60 * 1000),
  eventsStream: process.env.EVENTS_STREAM ?? 'domain-events',
  eventsGroup: process.env.EVENTS_GROUP ?? 'domain-events-group',
  eventsConsumer: process.env.EVENTS_CONSUMER ?? `consumer-${process.pid}`,
  eventsDlqStream: process.env.EVENTS_DLQ_STREAM ?? 'domain-events-dlq',
  eventsMaxAttempts: numberOrDefault(process.env.EVENTS_MAX_ATTEMPTS, 5),
  eventsBackoffMs: numberOrDefault(process.env.EVENTS_BACKOFF_MS, 1000),
  eventsBackoffMaxMs: numberOrDefault(process.env.EVENTS_BACKOFF_MAX_MS, 30000),
  eventsProcessedTtlMs: numberOrDefault(process.env.EVENTS_PROCESSED_TTL_MS, 7 * 24 * 60 * 60 * 1000),
  eventsClaimIdleMs: numberOrDefault(process.env.EVENTS_CLAIM_IDLE_MS, 5000),
  eventsClaimIntervalMs: numberOrDefault(process.env.EVENTS_CLAIM_INTERVAL_MS, 2000),
  metricsPort: numberOrUndefined(process.env.METRICS_PORT),
  outboxBatchSize: numberOrDefault(process.env.OUTBOX_BATCH_SIZE, 100),
  outboxIntervalMs: numberOrDefault(process.env.OUTBOX_INTERVAL_MS, 1000),
  sessionsQrTtlMs: numberOrDefault(process.env.SESSIONS_QR_TTL_MS, 60 * 1000),
  sessionsPrintQr: booleanOrDefault(process.env.SESSIONS_PRINT_QR, false),
  sessionsMarkOnlineOnConnect: booleanOrDefault(process.env.SESSIONS_MARK_ONLINE, false),
  sessionsBrowserName: process.env.SESSIONS_BROWSER_NAME ?? 'Anna',
  sessionsCommandStream: process.env.SESSIONS_COMMAND_STREAM ?? 'session-commands',
  sessionsCommandGroup: process.env.SESSIONS_COMMAND_GROUP ?? 'session-commands-group',
  sessionsCommandConsumer:
    process.env.SESSIONS_COMMAND_CONSUMER ?? `session-consumer-${process.pid}`,
  sessionsCommandBlockMs: numberOrDefault(process.env.SESSIONS_COMMAND_BLOCK_MS, 5000),
  sessionsCommandBatchSize: numberOrDefault(process.env.SESSIONS_COMMAND_BATCH_SIZE, 25),
  sessionsCommandDlqStream: process.env.SESSIONS_COMMAND_DLQ_STREAM ?? 'session-commands-dlq',
  s3Endpoint: process.env.S3_ENDPOINT ?? '',
  s3Region: process.env.S3_REGION ?? 'us-east-1',
  s3AccessKey: process.env.S3_ACCESS_KEY ?? '',
  s3SecretKey: process.env.S3_SECRET_KEY ?? '',
  s3Bucket: process.env.S3_BUCKET ?? '',
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL ?? '',
  s3ForcePathStyle: booleanOrDefault(process.env.S3_FORCE_PATH_STYLE, false),
};

export const envHelpers = {
  numberOrDefault,
  numberOrUndefined,
  booleanOrDefault,
  sameSiteOrDefault,
  listOrDefault,
};

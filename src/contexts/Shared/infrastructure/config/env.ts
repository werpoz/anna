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

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://anna:anna@localhost:5432/anna',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  otelServiceName: process.env.OTEL_SERVICE_NAME ?? 'anna',
  appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  resendFrom: process.env.RESEND_FROM ?? '',
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? 'dev-secret-change-me',
  authAccessTokenTtlMs: numberOrDefault(process.env.AUTH_ACCESS_TOKEN_TTL_MS, 15 * 60 * 1000),
  authRefreshTokenTtlMs: numberOrDefault(process.env.AUTH_REFRESH_TOKEN_TTL_MS, 30 * 24 * 60 * 60 * 1000),
  authRefreshCookieName: process.env.AUTH_REFRESH_COOKIE_NAME ?? 'refresh_token',
  authCookieSecure: booleanOrDefault(process.env.AUTH_COOKIE_SECURE, false),
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
};

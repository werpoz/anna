import pino from 'pino';
import { createRequire } from 'node:module';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'anna';
const logLevel = process.env.LOG_LEVEL ?? 'info';
const prettyEnabled =
  process.env.LOG_PRETTY === 'true' && (process.env.NODE_ENV ?? 'development') !== 'production';

const require = createRequire(import.meta.url);
const resolvePrettyTarget = (): string | null => {
  try {
    return require.resolve('pino-pretty');
  } catch {
    return null;
  }
};

const prettyTarget = prettyEnabled ? resolvePrettyTarget() : null;

export const logger = pino({
  level: logLevel,
  base: {
    service: serviceName,
    pid: process.pid,
    env: process.env.NODE_ENV ?? 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: prettyTarget
    ? {
        target: prettyTarget,
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          levelFirst: true,
          messageFormat: '[{service}] {msg}',
          ignore: 'pid,hostname,env',
        },
      }
    : undefined,
});

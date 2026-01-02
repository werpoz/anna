import pino from 'pino';
import { createRequire } from 'node:module';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'anna';
const logLevel = process.env.LOG_LEVEL ?? 'info';
const prettyEnabled =
  process.env.LOG_PRETTY === 'true' && (process.env.NODE_ENV ?? 'development') !== 'production';

const require = createRequire(import.meta.url);
const resolvePrettyTarget = (pkg = 'pino-pretty'): string | null => {
  try {
    return require.resolve(pkg);
  } catch { return null; }
};

type LoggerBuildOptions = {
  serviceName: string;
  logLevel: string;
  envName: string;
  prettyEnabled: boolean;
  prettyTarget?: string | null;
};

const buildLogger = (options: LoggerBuildOptions) => {
  const prettyTarget =
    options.prettyTarget ?? (options.prettyEnabled ? resolvePrettyTarget() : null);

  return pino({
    level: options.logLevel,
    base: {
      service: options.serviceName,
      pid: process.pid,
      env: options.envName,
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
};

export const logger = buildLogger({
  serviceName,
  logLevel,
  envName: process.env.NODE_ENV ?? 'development',
  prettyEnabled,
});

export const loggerHelpers = {
  resolvePrettyTarget,
  buildLogger,
};

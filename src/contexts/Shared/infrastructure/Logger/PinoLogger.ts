import type Logger from '../../domain/Logger';
import { logger } from '../observability/logger';
import { injectable } from 'tsyringe';

@injectable()
export class PinoLogger implements Logger {
  debug(message: string): void {
    logger.debug(message);
  }

  error(message: string | Error): void {
    if (message instanceof Error) {
      logger.error({ err: message }, message.message);
      return;
    }

    logger.error(message);
  }

  info(message: string): void {
    logger.info(message);
  }
}

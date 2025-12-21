import type Logger from '@/contexts/Shared/domain/Logger';
import { injectable } from 'tsyringe';


@injectable()
export class ConsoleLogger implements Logger {
  debug(message: string): void {
    console.debug(message);
  }

  error(message: string | Error): void {
    console.error(message);
  }

  info(message: string): void {
    console.info(message);
  }
}

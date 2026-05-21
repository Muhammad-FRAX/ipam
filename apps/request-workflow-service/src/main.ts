import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { logger } from '@ipam/shared-logging';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: process.env.CORS_ORIGIN || true, credentials: true });
  const port = Number(process.env.PORT) || (() => { throw new Error('PORT env var is required'); })();
  await app.listen(port, '0.0.0.0');
  logger.info('Application listening on port ' + port);
}
bootstrap();

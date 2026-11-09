import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { config } from './config/app-config.js';
import { pool } from './database/pool.js';
import { migrate } from './database/migrate.js';
import { log } from './common/logger.js';

async function bootstrap() {
  await migrate(pool);
  log('info', 'migrations_applied');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.enableCors();
  await app.listen(config.port);
  log('info', 'identity_service_started', { port: config.port });
}
bootstrap();

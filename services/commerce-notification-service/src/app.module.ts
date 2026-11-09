import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [NotificationModule, HealthModule] })
export class AppModule {}

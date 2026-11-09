import { Module } from '@nestjs/common';
import { OrderModule } from './orders/order.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [OrderModule, HealthModule] })
export class AppModule {}

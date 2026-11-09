import { Module } from '@nestjs/common';
import { FulfillmentModule } from './fulfillment/fulfillment.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [FulfillmentModule, HealthModule] })
export class AppModule {}

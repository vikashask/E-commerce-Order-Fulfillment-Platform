import { Module } from '@nestjs/common';
import { PricingModule } from './pricing/pricing.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [PricingModule, HealthModule] })
export class AppModule {}

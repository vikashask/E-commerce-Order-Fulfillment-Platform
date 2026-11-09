import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [CartModule, HealthModule] })
export class AppModule {}

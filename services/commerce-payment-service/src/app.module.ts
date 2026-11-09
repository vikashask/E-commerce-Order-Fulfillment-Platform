import { Module } from '@nestjs/common';
import { PaymentModule } from './payment/payment.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [PaymentModule, HealthModule] })
export class AppModule {}

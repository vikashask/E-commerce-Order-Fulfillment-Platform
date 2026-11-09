import { Module } from '@nestjs/common';
import { InventoryModule } from './inventory/inventory.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [InventoryModule, HealthModule] })
export class AppModule {}

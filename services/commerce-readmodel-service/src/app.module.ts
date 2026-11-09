import { Module } from '@nestjs/common';
import { ReadModelModule } from './readmodel/readmodel.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [ReadModelModule, HealthModule] })
export class AppModule {}

import { Module } from '@nestjs/common';
import { SearchModule } from './search/search.module.js';
import { HealthModule } from './health/health.module.js';
@Module({ imports: [SearchModule, HealthModule] })
export class AppModule {}

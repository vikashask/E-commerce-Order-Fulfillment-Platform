import { Module } from '@nestjs/common';
import { ReadModelController } from './readmodel.controller.js';
import { ReadModelService } from './readmodel.service.js';
@Module({ controllers: [ReadModelController], providers: [ReadModelService] })
export class ReadModelModule {}

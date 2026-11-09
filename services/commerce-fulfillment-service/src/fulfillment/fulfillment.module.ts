import { Module } from '@nestjs/common';
import { FulfillmentController } from './fulfillment.controller.js';
import { FulfillmentService } from './fulfillment.service.js';
@Module({ controllers: [FulfillmentController], providers: [FulfillmentService] })
export class FulfillmentModule {}

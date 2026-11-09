import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ReadModelService } from './readmodel.service.js';

@Controller('api/v1')
export class ReadModelController {
  constructor(private readonly readModelService: ReadModelService) {}

  @Get('orders/customer/:customerId')
  getCustomerOrders(@Param('customerId') customerId: string, @Query('limit') limit?: string) {
    return this.readModelService.getCustomerOrders(customerId, limit ? parseInt(limit) : 20);
  }

  @Get('orders/summary/:orderId')
  getOrderSummary(@Param('orderId') orderId: string) {
    return this.readModelService.getOrderSummary(orderId);
  }

  @Get('admin/operations/orders')
  getOperationsView(@Query('limit') limit?: string) {
    return this.readModelService.getOperationsView(limit ? parseInt(limit) : 50);
  }

  @Post('readmodel/project')
  project(@Body() body: { customerId: string; orderId: string; orderNumber: string; orderStatus: string; totalMinor: number }) {
    return this.readModelService.upsertOrderSummary(body);
  }
}

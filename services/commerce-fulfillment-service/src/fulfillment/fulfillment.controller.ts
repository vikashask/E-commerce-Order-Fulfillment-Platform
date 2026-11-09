import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { FulfillmentService } from './fulfillment.service.js';

@Controller('api/v1')
export class FulfillmentController {
  constructor(private readonly fulfillmentService: FulfillmentService) {}

  @Post('fulfillment/orders')
  create(@Body() body: { orderId: string; items: Array<{ variantId: string; sku: string; quantity: number }> }) {
    return this.fulfillmentService.createFulfillmentOrder(body.orderId, body.items);
  }

  @Post('fulfillment/orders/:id/pick')
  pick(@Param('id') id: string) { return this.fulfillmentService.pickItems(id); }

  @Post('fulfillment/orders/:id/pack')
  pack(@Param('id') id: string) { return this.fulfillmentService.packItems(id); }

  @Post('fulfillment/orders/:id/ship')
  ship(@Param('id') id: string) { return this.fulfillmentService.ship(id); }

  @Post('shipments/:id/delivered')
  markDelivered(@Param('id') id: string) { return this.fulfillmentService.markDelivered(id); }

  @Get('orders/:orderId/tracking')
  tracking(@Param('orderId') orderId: string) { return this.fulfillmentService.getTracking(orderId); }

  @Get('admin/fulfillment')
  list(@Query('status') status?: string) { return this.fulfillmentService.listFulfillmentOrders(status); }
}

import { Controller, Get, Post, Body, Param, Query, Headers } from '@nestjs/common';
import { OrderService } from './order.service.js';

@Controller('api/v1')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('checkout')
  createOrder(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: {
      customerId?: string;
      items: Array<{ variantId: string; sku: string; productName: string; quantity: number; unitPriceMinor: number }>;
      shippingAddress?: Record<string, unknown>;
      quoteId?: string;
    },
  ) {
    return this.orderService.createOrder({ ...body, idempotencyKey });
  }

  @Get('orders')
  listOrders(@Query('customerId') customerId?: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.orderService.listOrders(customerId, limit ? parseInt(limit) : 20, offset ? parseInt(offset) : 0);
  }

  @Get('orders/:id')
  getOrder(@Param('id') id: string) {
    return this.orderService.getOrder(id);
  }

  @Post('orders/:id/cancel')
  cancelOrder(@Param('id') id: string, @Body() body?: { reason?: string }) {
    return this.orderService.cancelOrder(id, body?.reason);
  }

  @Get('admin/orders')
  adminListOrders(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.orderService.listOrders(undefined, limit ? parseInt(limit) : 50, offset ? parseInt(offset) : 0);
  }

  @Get('admin/orders/:id/timeline')
  async getTimeline(@Param('id') id: string) {
    const { rows } = await (await import('../database/pool.js')).pool.query(
      'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at', [id],
    );
    return rows;
  }
}

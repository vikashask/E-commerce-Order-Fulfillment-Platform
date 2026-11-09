import { Controller, Get, Post, Body, Param, Headers } from '@nestjs/common';
import { PaymentService } from './payment.service.js';

@Controller('api/v1')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('payments/authorize')
  authorize(@Body() body: { orderId: string; amountMinor: number; currency?: string; idempotencyKey: string }) {
    return this.paymentService.authorize(body.orderId, body.amountMinor, body.currency || 'INR', body.idempotencyKey);
  }

  @Post('payments/:id/capture')
  capture(@Param('id') id: string) {
    return this.paymentService.capture(id);
  }

  @Post('admin/refunds')
  refund(@Body() body: { orderId: string; paymentAttemptId: string; amountMinor: number; reasonCode: string; idempotencyKey: string }) {
    return this.paymentService.refund(body.orderId, body.paymentAttemptId, body.amountMinor, body.reasonCode, body.idempotencyKey);
  }

  @Get('payments/:id')
  getPayment(@Param('id') id: string) {
    return this.paymentService.getPayment(id);
  }

  @Get('payments/order/:orderId')
  getByOrder(@Param('orderId') orderId: string) {
    return this.paymentService.getPaymentsByOrder(orderId);
  }
}

import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PricingService } from './pricing.service.js';

@Controller('api/v1')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('prices/:variantId')
  getPrice(@Param('variantId') variantId: string) {
    return this.pricingService.getPrice(variantId);
  }

  @Post('checkout/quote')
  createQuote(@Body() body: { cartId: string; cartVersion: number; items: Array<{ variantId: string; quantity: number }>; customerId?: string }) {
    return this.pricingService.createQuote(body.cartId, body.cartVersion, body.items, body.customerId);
  }

  @Get('quotes/:id')
  getQuote(@Param('id') id: string) {
    return this.pricingService.getQuote(id);
  }

  @Post('admin/price-lists')
  createPriceList(@Body() body: { name: string; currency?: string }) {
    return this.pricingService.createPriceList(body.name, body.currency);
  }

  @Post('admin/prices')
  setPrice(@Body() body: { priceListId: string; variantId: string; amountMinor: number; currency?: string }) {
    return this.pricingService.setPrice(body.priceListId, body.variantId, body.amountMinor, body.currency);
  }

  @Get('admin/price-lists')
  listPriceLists() {
    return this.pricingService.listPriceLists();
  }
}

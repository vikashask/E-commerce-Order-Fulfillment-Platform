import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { CartService } from './cart.service.js';

@Controller('api/v1')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('cart')
  getOrCreateCart(@Query('customerId') customerId?: string, @Query('sessionId') sessionId?: string) {
    return this.cartService.getOrCreateCart(customerId, sessionId);
  }

  @Get('cart/:id')
  getCart(@Param('id') id: string) {
    return this.cartService.getCart(id);
  }

  @Post('cart/:id/items')
  addItem(@Param('id') id: string, @Body() body: { variantId: string; sku: string; productName: string; quantity: number }) {
    return this.cartService.addItem(id, body.variantId, body.sku, body.productName, body.quantity);
  }

  @Patch('cart/:cartId/items/:itemId')
  updateItem(@Param('cartId') cartId: string, @Param('itemId') itemId: string, @Body() body: { quantity: number }) {
    return this.cartService.updateItemQuantity(cartId, itemId, body.quantity);
  }

  @Delete('cart/:cartId/items/:itemId')
  removeItem(@Param('cartId') cartId: string, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(cartId, itemId);
  }
}

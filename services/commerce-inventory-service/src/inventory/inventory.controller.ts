import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';

@Controller('api/v1')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory/:variantId')
  getStock(@Param('variantId') variantId: string, @Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.getStock(variantId, warehouseId);
  }

  @Get('admin/inventory')
  listStock(@Query('warehouseId') warehouseId?: string) {
    return this.inventoryService.listStock(warehouseId);
  }

  @Post('admin/inventory/stock')
  addStock(@Body() body: { variantId: string; sku: string; quantity: number; warehouseId?: string }) {
    return this.inventoryService.addStock(body.variantId, body.sku, body.quantity, body.warehouseId);
  }

  @Post('inventory/reserve')
  reserve(@Body() body: { orderId: string; items: Array<{ variantId: string; sku: string; quantity: number }>; warehouseId?: string }) {
    return this.inventoryService.reserveStock(body.orderId, body.items, body.warehouseId);
  }

  @Post('inventory/release/:reservationId')
  release(@Param('reservationId') reservationId: string) {
    return this.inventoryService.releaseReservation(reservationId);
  }

  @Post('admin/inventory/adjustments')
  adjust(@Body() body: { variantId: string; quantityDelta: number; reason: string; warehouseId?: string }) {
    return this.inventoryService.adjustStock(body.variantId, body.quantityDelta, body.reason, body.warehouseId);
  }
}

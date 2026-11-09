import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { pool } from '../database/pool.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InventoryService {
  async getStock(variantId: string, warehouseId: string = '00000000-0000-0000-0000-000000000001') {
    const { rows } = await pool.query(
      'SELECT * FROM inventory_items WHERE variant_id = $1::uuid AND warehouse_id = $2::uuid', [variantId, warehouseId],
    );
    if (!rows.length) throw new NotFoundException('Inventory item not found');
    const item = rows[0];
    return { ...item, available: item.on_hand_quantity - item.reserved_quantity - item.safety_stock_quantity };
  }

  async addStock(variantId: string, sku: string, quantity: number, warehouseId: string = '00000000-0000-0000-0000-000000000001') {
    const { rows } = await pool.query(
      `INSERT INTO inventory_items (warehouse_id, variant_id, sku, on_hand_quantity)
       VALUES ($1::uuid, $2::uuid, $3, $4)
       ON CONFLICT (warehouse_id, variant_id) DO UPDATE SET on_hand_quantity = inventory_items.on_hand_quantity + EXCLUDED.on_hand_quantity, version = inventory_items.version + 1, updated_at = now()
       RETURNING *`,
      [warehouseId, variantId, sku, quantity],
    );
    // Movement record
    await pool.query(
      `INSERT INTO inventory_movements (warehouse_id, variant_id, movement_type, quantity_delta, reason)
       VALUES ($1, $2, 'receiving', $3, 'Stock added')`,
      [warehouseId, variantId, quantity],
    );
    return rows[0];
  }

  async reserveStock(orderId: string, items: Array<{ variantId: string; sku: string; quantity: number }>, warehouseId: string = '00000000-0000-0000-0000-000000000001') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Check for duplicate reservation (idempotency)
      const { rows: existing } = await client.query(
        `SELECT id, status FROM inventory_reservations WHERE order_id = $1::uuid AND status = 'reserved'`, [orderId],
      );
      if (existing.length) {
        await client.query('COMMIT');
        return { reservationId: existing[0].id, status: 'already_reserved', duplicate: true };
      }

      // Lock and reserve all items atomically
      for (const item of items) {
        const { rowCount } = await client.query(
          `UPDATE inventory_items
           SET reserved_quantity = reserved_quantity + $1, version = version + 1, updated_at = now()
           WHERE warehouse_id = $2::uuid AND variant_id = $3::uuid
             AND on_hand_quantity - reserved_quantity - safety_stock_quantity >= $1`,
          [item.quantity, warehouseId, item.variantId],
        );
        if (!rowCount) {
          await client.query('ROLLBACK');
          return { status: 'failed', reason: `Insufficient stock for ${item.sku}` };
        }
      }

      const reservationId = uuidv4();
      await client.query(
        `INSERT INTO inventory_reservations (id, order_id, warehouse_id) VALUES ($1::uuid, $2::uuid, $3::uuid)`,
        [reservationId, orderId, warehouseId],
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO inventory_reservation_items (reservation_id, variant_id, sku, quantity)
           VALUES ($1::uuid, $2::uuid, $3, $4)`,
          [reservationId, item.variantId, item.sku, item.quantity],
        );
        await client.query(
          `INSERT INTO inventory_movements (warehouse_id, variant_id, movement_type, quantity_delta, reference_type, reference_id, reason)
           VALUES ($1::uuid, $2::uuid, 'reservation', $3, 'order', $4::uuid, 'Reserved for order')`,
          [warehouseId, item.variantId, -item.quantity, orderId],
        );
      }

      // Outbox event
      await client.query(
        `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
         VALUES ('InventoryReservation', $1::uuid, 'InventoryReserved', $2)`,
        [reservationId, JSON.stringify({ orderId, reservationId, items, warehouseId })],
      );

      await client.query('COMMIT');
      return { reservationId, status: 'reserved', duplicate: false };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async releaseReservation(reservationId: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT * FROM inventory_reservations WHERE id = $1::uuid AND status = 'reserved' FOR UPDATE`, [reservationId],
      );
      if (!rows.length) throw new NotFoundException('Reservation not found or already released');

      const { rows: items } = await client.query(
        'SELECT * FROM inventory_reservation_items WHERE reservation_id = $1::uuid', [reservationId],
      );
      for (const item of items) {
        await client.query(
          `UPDATE inventory_items SET reserved_quantity = reserved_quantity - $1, version = version + 1, updated_at = now()
           WHERE warehouse_id = $2::uuid AND variant_id = $3::uuid`,
          [item.quantity, rows[0].warehouse_id, item.variant_id],
        );
      }
      await client.query(`UPDATE inventory_reservations SET status = 'released', updated_at = now() WHERE id = $1::uuid`, [reservationId]);
      await client.query('COMMIT');
      return { reservationId, status: 'released' };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async listStock(warehouseId: string = '00000000-0000-0000-0000-000000000001') {
    const { rows } = await pool.query(
      `SELECT *, (on_hand_quantity - reserved_quantity - safety_stock_quantity) as available
       FROM inventory_items WHERE warehouse_id = $1::uuid ORDER BY sku`, [warehouseId],
    );
    return rows;
  }

  async adjustStock(variantId: string, quantityDelta: number, reason: string, warehouseId: string = '00000000-0000-0000-0000-000000000001') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE inventory_items SET on_hand_quantity = on_hand_quantity + $1, version = version + 1, updated_at = now()
         WHERE warehouse_id = $2::uuid AND variant_id = $3::uuid AND on_hand_quantity + $1 >= 0`,
        [quantityDelta, warehouseId, variantId],
      );
      await client.query(
        `INSERT INTO inventory_movements (warehouse_id, variant_id, movement_type, quantity_delta, reason)
         VALUES ($1::uuid, $2::uuid, 'adjustment', $3, $4)`,
        [warehouseId, variantId, quantityDelta, reason],
      );
      await client.query('COMMIT');
      return { adjusted: true };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

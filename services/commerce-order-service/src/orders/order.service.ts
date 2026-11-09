import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { pool } from '../database/pool.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrderService {
  private generateOrderNumber(): string {
    const now = new Date();
    const seq = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
    return `ORD-${now.getFullYear()}-${seq}`;
  }

  async createOrder(params: {
    customerId?: string;
    idempotencyKey: string;
    items: Array<{ variantId: string; sku: string; productName: string; quantity: number; unitPriceMinor: number }>;
    shippingAddress?: Record<string, unknown>;
    quoteId?: string;
    currency?: string;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Idempotency check
      const { rows: existing } = await client.query(
        `SELECT id, order_number, status FROM orders WHERE checkout_idempotency_key = $1`,
        [params.idempotencyKey],
      );
      if (existing.length) {
        await client.query('COMMIT');
        return { orderId: existing[0].id, orderNumber: existing[0].order_number, status: existing[0].status, duplicate: true };
      }

      const orderId = uuidv4();
      const orderNumber = this.generateOrderNumber();
      let subtotal = BigInt(0);
      const orderItems = params.items.map(i => {
        const lineTotal = BigInt(i.unitPriceMinor) * BigInt(i.quantity);
        subtotal += lineTotal;
        return { ...i, lineTotal: Number(lineTotal) };
      });
      const tax = Number(subtotal * BigInt(18) / BigInt(100));
      const total = Number(subtotal) + tax;

      await client.query(
        `INSERT INTO orders (id::uuid, order_number, customer_id, checkout_idempotency_key, currency,
         subtotal_minor, tax_minor, total_minor, shipping_address_snapshot, price_quote_id)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [orderId, orderNumber, params.customerId || null, params.idempotencyKey,
         params.currency || 'INR', Number(subtotal), tax, total,
         params.shippingAddress ? JSON.stringify(params.shippingAddress) : null,
         params.quoteId || null],
      );

      for (const item of orderItems) {
        await client.query(
          `INSERT INTO order_items (order_id::uuid, variant_id, sku, product_name_snapshot, quantity, unit_price_minor, line_total_minor)
           VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)`,
          [orderId, item.variantId, item.sku, item.productName, item.quantity, item.unitPriceMinor, item.lineTotal],
        );
      }

      // Create saga
      const sagaId = uuidv4();
      const correlationId = uuidv4();
      await client.query(
        `INSERT INTO order_sagas (id, order_id, correlation_id) VALUES ($1::uuid, $2::uuid, $3)`,
        [sagaId, orderId, correlationId],
      );
      await client.query(
        `INSERT INTO order_saga_steps (saga_id, step_name, status) VALUES ($1, 'inventory_reservation', 'pending'), ($1, 'payment_authorization', 'pending'), ($1, 'confirmation', 'pending')`,
        [sagaId],
      );

      // Outbox: OrderCheckoutStarted
      await client.query(
        `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, correlation_id, payload)
         VALUES ('Order', $1, 'OrderCheckoutStarted', $2, $3)`,
        [orderId, correlationId, JSON.stringify({
          orderId, orderNumber, customerId: params.customerId,
          items: orderItems.map(i => ({ variantId: i.variantId, sku: i.sku, quantity: i.quantity })),
          totalMinor: total, currency: params.currency || 'INR',
        })],
      );

      // Status history
      await client.query(
        `INSERT INTO order_status_history (order_id, to_status, correlation_id) VALUES ($1, 'pending', $2)`,
        [orderId, correlationId],
      );

      await client.query('COMMIT');
      return { orderId, orderNumber, status: 'pending', checkoutStatus: 'processing', duplicate: false };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getOrder(orderId: string) {
    const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1::uuid', [orderId]);
    if (!rows.length) throw new NotFoundException('Order not found');
    const { rows: items } = await pool.query('SELECT * FROM order_items WHERE order_id = $1::uuid', [orderId]);
    const { rows: saga } = await pool.query('SELECT * FROM order_sagas WHERE order_id = $1::uuid ORDER BY created_at DESC LIMIT 1', [orderId]);
    return { ...rows[0], items, saga: saga[0] || null };
  }

  async listOrders(customerId?: string, limit = 20, offset = 0) {
    const params: (string | number)[] = [limit, offset];
    let where = '';
    if (customerId) { where = 'WHERE customer_id = $3'; params.push(customerId); }
    const { rows } = await pool.query(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, params);
    return rows;
  }

  async updateOrderStatus(orderId: string, newStatus: string, reason?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query('SELECT status FROM orders WHERE id = $1::uuid FOR UPDATE', [orderId]);
      if (!rows.length) throw new NotFoundException('Order not found');
      const oldStatus = rows[0].status;
      await client.query(
        'UPDATE orders SET status = $1, version = version + 1, updated_at = now() WHERE id = $2',
        [newStatus, orderId],
      );
      if (newStatus === 'confirmed') {
        await client.query('UPDATE orders SET confirmed_at = now() WHERE id = $1::uuid', [orderId]);
      }
      if (newStatus === 'cancelled') {
        await client.query('UPDATE orders SET cancelled_at = now() WHERE id = $1::uuid', [orderId]);
      }
      await client.query(
        `INSERT INTO order_status_history (order_id, from_status, to_status, reason_code)
         VALUES ($1::uuid, $2::uuid, $3, $4)`,
        [orderId, oldStatus, newStatus, reason || null],
      );
      await client.query('COMMIT');
      return { orderId, oldStatus, newStatus };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async cancelOrder(orderId: string, reason: string = 'customer_request') {
    return this.updateOrderStatus(orderId, 'cancelled', reason);
  }
}

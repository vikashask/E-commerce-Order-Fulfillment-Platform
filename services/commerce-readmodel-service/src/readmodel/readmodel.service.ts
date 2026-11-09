import { Injectable, NotFoundException } from '@nestjs/common';
import { pool } from '../database/pool.js';

@Injectable()
export class ReadModelService {
  async upsertOrderSummary(data: {
    customerId: string; orderId: string; orderNumber: string;
    orderStatus: string; paymentStatus?: string; fulfillmentStatus?: string;
    totalMinor: number; currency?: string; placedAt?: string;
  }) {
    await pool.query(
      `INSERT INTO customer_order_summary (customer_id, order_id, order_number, order_status, payment_status, fulfillment_status, total_minor, currency, placed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (store_id, order_id) DO UPDATE SET
         order_status = EXCLUDED.order_status, payment_status = coalesce(EXCLUDED.payment_status, customer_order_summary.payment_status),
         fulfillment_status = coalesce(EXCLUDED.fulfillment_status, customer_order_summary.fulfillment_status),
         source_version = customer_order_summary.source_version + 1, updated_at = now()`,
      [data.customerId, data.orderId, data.orderNumber, data.orderStatus,
       data.paymentStatus || 'not_started', data.fulfillmentStatus || 'not_ready',
       data.totalMinor, data.currency || 'INR', data.placedAt || new Date().toISOString()],
    );
    // Also update operations view
    await pool.query(
      `INSERT INTO operations_order_view (customer_id, order_id, order_number, order_status, payment_status, fulfillment_status, total_minor, currency, placed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (store_id, order_id) DO UPDATE SET
         order_status = EXCLUDED.order_status, payment_status = coalesce(EXCLUDED.payment_status, operations_order_view.payment_status),
         fulfillment_status = coalesce(EXCLUDED.fulfillment_status, operations_order_view.fulfillment_status),
         source_version = operations_order_view.source_version + 1, updated_at = now()`,
      [data.customerId, data.orderId, data.orderNumber, data.orderStatus,
       data.paymentStatus || 'not_started', data.fulfillmentStatus || 'not_ready',
       data.totalMinor, data.currency || 'INR', data.placedAt || new Date().toISOString()],
    );
    return { projected: true };
  }

  async getCustomerOrders(customerId: string, limit = 20, offset = 0) {
    const { rows } = await pool.query(
      `SELECT * FROM customer_order_summary WHERE customer_id = $1 ORDER BY placed_at DESC LIMIT $2 OFFSET $3`,
      [customerId, limit, offset],
    );
    return rows;
  }

  async getOperationsView(limit = 50, offset = 0) {
    const { rows } = await pool.query(
      `SELECT * FROM operations_order_view ORDER BY updated_at DESC LIMIT $1 OFFSET $2`, [limit, offset],
    );
    return rows;
  }

  async getOrderSummary(orderId: string) {
    const { rows } = await pool.query('SELECT * FROM customer_order_summary WHERE order_id = $1', [orderId]);
    if (!rows.length) throw new NotFoundException('Order summary not found');
    return rows[0];
  }
}

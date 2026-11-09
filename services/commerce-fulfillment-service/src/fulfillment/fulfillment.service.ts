import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { pool } from '../database/pool.js';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FulfillmentService {
  async createFulfillmentOrder(orderId: string, items: Array<{ variantId: string; sku: string; quantity: number }>) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: existing } = await client.query('SELECT id FROM fulfillment_orders WHERE order_id = $1', [orderId]);
      if (existing.length) { await client.query('COMMIT'); return { fulfillmentOrderId: existing[0].id, duplicate: true }; }

      const foId = uuidv4();
      await client.query(
        `INSERT INTO fulfillment_orders (id, order_id, status) VALUES ($1, $2, 'ready_to_pick')`, [foId, orderId],
      );
      for (const item of items) {
        await client.query(
          `INSERT INTO fulfillment_items (fulfillment_order_id, variant_id, sku, quantity_ordered) VALUES ($1, $2, $3, $4)`,
          [foId, item.variantId, item.sku, item.quantity],
        );
      }
      await client.query('COMMIT');
      return { fulfillmentOrderId: foId, status: 'ready_to_pick', duplicate: false };
    } catch (e) { await client.query('ROLLBACK'); throw e; } finally { client.release(); }
  }

  async pickItems(fulfillmentOrderId: string) {
    await pool.query(`UPDATE fulfillment_items SET quantity_picked = quantity_ordered, updated_at = now() WHERE fulfillment_order_id = $1`, [fulfillmentOrderId]);
    await pool.query(`UPDATE fulfillment_orders SET status = 'picking', updated_at = now() WHERE id = $1`, [fulfillmentOrderId]);
    return { fulfillmentOrderId, status: 'picking' };
  }

  async packItems(fulfillmentOrderId: string) {
    await pool.query(`UPDATE fulfillment_items SET quantity_packed = quantity_picked, updated_at = now() WHERE fulfillment_order_id = $1`, [fulfillmentOrderId]);
    await pool.query(`UPDATE fulfillment_orders SET status = 'packed', updated_at = now() WHERE id = $1`, [fulfillmentOrderId]);
    return { fulfillmentOrderId, status: 'packed' };
  }

  async ship(fulfillmentOrderId: string) {
    const { rows: fo } = await pool.query('SELECT * FROM fulfillment_orders WHERE id = $1', [fulfillmentOrderId]);
    if (!fo.length) throw new NotFoundException('Fulfillment order not found');
    const trackingNumber = `TRK-${uuidv4().slice(0, 8).toUpperCase()}`;
    const { rows } = await pool.query(
      `INSERT INTO shipments (order_id, fulfillment_order_id, tracking_number, status, shipped_at)
       VALUES ($1, $2, $3, 'shipped', now()) RETURNING *`,
      [fo[0].order_id, fulfillmentOrderId, trackingNumber],
    );
    await pool.query(`UPDATE fulfillment_orders SET status = 'shipped', updated_at = now() WHERE id = $1`, [fulfillmentOrderId]);
    await pool.query(
      `INSERT INTO shipment_events (shipment_id, event_type, description) VALUES ($1, 'shipped', 'Package shipped')`,
      [rows[0].id],
    );
    // Outbox
    await pool.query(
      `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
       VALUES ('Shipment', $1::uuid, 'OrderShipped', $2)`,
      [rows[0].id, JSON.stringify({ orderId: fo[0].order_id, shipmentId: rows[0].id, trackingNumber })],
    );
    return { shipmentId: rows[0].id, trackingNumber, status: 'shipped' };
  }

  async markDelivered(shipmentId: string) {
    await pool.query(`UPDATE shipments SET status = 'delivered', delivered_at = now(), updated_at = now() WHERE id = $1`, [shipmentId]);
    await pool.query(`INSERT INTO shipment_events (shipment_id, event_type, description) VALUES ($1, 'delivered', 'Package delivered')`, [shipmentId]);
    return { shipmentId, status: 'delivered' };
  }

  async getTracking(orderId: string) {
    const { rows: shipments } = await pool.query('SELECT * FROM shipments WHERE order_id = $1 ORDER BY created_at', [orderId]);
    const result = [];
    for (const s of shipments) {
      const { rows: events } = await pool.query('SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY occurred_at', [s.id]);
      result.push({ ...s, events });
    }
    return result;
  }

  async listFulfillmentOrders(status?: string) {
    const q = status ? `SELECT * FROM fulfillment_orders WHERE status = $1 ORDER BY created_at` : `SELECT * FROM fulfillment_orders ORDER BY created_at`;
    const { rows } = status ? await pool.query(q, [status]) : await pool.query(q);
    return rows;
  }
}

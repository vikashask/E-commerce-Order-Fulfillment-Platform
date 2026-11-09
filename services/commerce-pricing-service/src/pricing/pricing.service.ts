import { Injectable, NotFoundException } from '@nestjs/common';
import { pool } from '../database/pool.js';

@Injectable()
export class PricingService {
  async getPrice(variantId: string) {
    const { rows } = await pool.query(
      `SELECT pp.*, pl.currency as list_currency, pl.name as list_name
       FROM product_prices pp JOIN price_lists pl ON pp.price_list_id = pl.id
       WHERE pp.variant_id = $1 AND pl.status = 'active'
         AND pp.valid_from <= now() AND (pp.valid_to IS NULL OR pp.valid_to > now())
       ORDER BY pp.valid_from DESC LIMIT 1`,
      [variantId],
    );
    if (!rows.length) throw new NotFoundException('Price not found for variant');
    return rows[0];
  }

  async createQuote(cartId: string, cartVersion: number, items: Array<{ variantId: string; quantity: number }>, customerId?: string) {
    let subtotal = BigInt(0);
    const lineItems = [];
    for (const item of items) {
      const price = await this.getPrice(item.variantId);
      const lineTotal = BigInt(price.unit_amount_minor) * BigInt(item.quantity);
      subtotal += lineTotal;
      lineItems.push({
        variantId: item.variantId,
        quantity: item.quantity,
        unitAmountMinor: Number(price.unit_amount_minor),
        lineTotalMinor: Number(lineTotal),
        currency: price.currency,
      });
    }
    const tax = subtotal * BigInt(18) / BigInt(100); // 18% GST for demo
    const total = subtotal + tax;
    const { rows } = await pool.query(
      `INSERT INTO price_quotes (customer_id, cart_id, cart_version, line_items, subtotal_minor, tax_minor, total_minor)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [customerId || null, cartId, cartVersion, JSON.stringify(lineItems), Number(subtotal), Number(tax), Number(total)],
    );
    return rows[0];
  }

  async getQuote(quoteId: string) {
    const { rows } = await pool.query('SELECT * FROM price_quotes WHERE id = $1', [quoteId]);
    if (!rows.length) throw new NotFoundException('Quote not found');
    if (new Date(rows[0].expires_at) < new Date()) throw new NotFoundException('Quote expired');
    return rows[0];
  }

  async createPriceList(name: string, currency: string = 'INR') {
    const { rows } = await pool.query(
      `INSERT INTO price_lists (name, currency) VALUES ($1, $2) RETURNING *`,
      [name, currency],
    );
    return rows[0];
  }

  async setPrice(priceListId: string, variantId: string, amountMinor: number, currency: string = 'INR') {
    const { rows } = await pool.query(
      `INSERT INTO product_prices (price_list_id, variant_id, unit_amount_minor, currency)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [priceListId, variantId, amountMinor, currency],
    );
    return rows[0];
  }

  async listPriceLists() {
    const { rows } = await pool.query('SELECT * FROM price_lists ORDER BY created_at DESC');
    return rows;
  }
}

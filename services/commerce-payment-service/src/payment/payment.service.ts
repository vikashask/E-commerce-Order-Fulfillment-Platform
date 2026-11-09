import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { pool } from '../database/pool.js';
import { v4 as uuidv4 } from 'uuid';

// Sandbox payment provider - simulates authorize/capture/refund
class SandboxProvider {
  async authorize(amount: number, currency: string, idempotencyKey: string) {
    // Simulate: amounts ending in 99 = decline, ending in 00 = timeout
    const lastTwo = amount % 100;
    if (lastTwo === 99) return { success: false, code: 'card_declined', reference: null };
    if (lastTwo === 0 && amount > 100000) return { success: false, code: 'timeout', reference: null };
    return { success: true, code: 'approved', reference: `sandbox-auth-${uuidv4().slice(0, 8)}` };
  }
  async capture(authReference: string, amount: number) {
    return { success: true, code: 'captured', reference: `sandbox-cap-${uuidv4().slice(0, 8)}` };
  }
  async refund(captureReference: string, amount: number) {
    return { success: true, code: 'refunded', reference: `sandbox-ref-${uuidv4().slice(0, 8)}` };
  }
}

@Injectable()
export class PaymentService {
  private provider = new SandboxProvider();

  async authorize(orderId: string, amountMinor: number, currency: string, idempotencyKey: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Idempotency check
      const { rows: existing } = await client.query(
        `SELECT * FROM payment_attempts WHERE idempotency_key = $1`, [idempotencyKey],
      );
      if (existing.length) {
        await client.query('COMMIT');
        return { paymentAttemptId: existing[0].id, status: existing[0].status, duplicate: true };
      }

      const result = await this.provider.authorize(amountMinor, currency, idempotencyKey);
      const status = result.success ? 'authorized' : 'failed';
      const { rows } = await client.query(
        `INSERT INTO payment_attempts (order_id, idempotency_key, amount_minor, currency, status, authorization_reference, failure_code)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [orderId, idempotencyKey, amountMinor, currency, status, result.reference, result.success ? null : result.code],
      );
      await client.query(
        `INSERT INTO payment_transactions (payment_attempt_id, transaction_type, provider_transaction_id, amount_minor, currency, status, provider_response_code)
         VALUES ($1, 'authorize', $2, $3, $4, $5, $6)`,
        [rows[0].id, result.reference, amountMinor, currency, status, result.code],
      );

      // Outbox
      const eventType = result.success ? 'PaymentAuthorized' : 'PaymentAuthorizationFailed';
      await client.query(
        `INSERT INTO outbox_events (aggregate_type, aggregate_id, event_type, payload)
         VALUES ('PaymentAttempt', $1::uuid, $2, $3)`,
        [rows[0].id, eventType, JSON.stringify({ orderId, paymentAttemptId: rows[0].id, amountMinor, currency, status, failureCode: result.code })],
      );

      await client.query('COMMIT');
      return { paymentAttemptId: rows[0].id, status, authorizationReference: result.reference, duplicate: false };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async capture(paymentAttemptId: string) {
    const { rows } = await pool.query('SELECT * FROM payment_attempts WHERE id = $1::uuid', [paymentAttemptId]);
    if (!rows.length) throw new NotFoundException('Payment attempt not found');
    if (rows[0].status !== 'authorized') throw new ConflictException('Can only capture authorized payments');
    const result = await this.provider.capture(rows[0].authorization_reference, rows[0].amount_minor);
    await pool.query(
      `UPDATE payment_attempts SET status = 'captured', capture_reference = $1, updated_at = now() WHERE id = $2`,
      [result.reference, paymentAttemptId],
    );
    await pool.query(
      `INSERT INTO payment_transactions (payment_attempt_id, transaction_type, provider_transaction_id, amount_minor, currency, status)
       VALUES ($1, 'capture', $2, $3, $4, 'captured')`,
      [paymentAttemptId, result.reference, rows[0].amount_minor, rows[0].currency],
    );
    return { paymentAttemptId, status: 'captured', captureReference: result.reference };
  }

  async refund(orderId: string, paymentAttemptId: string, amountMinor: number, reasonCode: string, idempotencyKey: string) {
    const { rows: existing } = await pool.query('SELECT * FROM refunds WHERE idempotency_key = $1', [idempotencyKey]);
    if (existing.length) return { refundId: existing[0].id, status: existing[0].status, duplicate: true };

    const { rows: pa } = await pool.query('SELECT * FROM payment_attempts WHERE id = $1::uuid', [paymentAttemptId]);
    if (!pa.length) throw new NotFoundException('Payment attempt not found');
    const result = await this.provider.refund(pa[0].capture_reference || pa[0].authorization_reference, amountMinor);
    const { rows } = await pool.query(
      `INSERT INTO refunds (order_id, payment_attempt_id, amount_minor, currency, reason_code, status, provider_refund_id, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [orderId, paymentAttemptId, amountMinor, pa[0].currency, reasonCode, 'succeeded', result.reference, idempotencyKey],
    );
    return { refundId: rows[0].id, status: 'succeeded', duplicate: false };
  }

  async getPayment(paymentAttemptId: string) {
    const { rows } = await pool.query('SELECT * FROM payment_attempts WHERE id = $1::uuid', [paymentAttemptId]);
    if (!rows.length) throw new NotFoundException('Payment attempt not found');
    const { rows: txns } = await pool.query('SELECT * FROM payment_transactions WHERE payment_attempt_id = $1 ORDER BY created_at', [paymentAttemptId]);
    return { ...rows[0], transactions: txns };
  }

  async getPaymentsByOrder(orderId: string) {
    const { rows } = await pool.query('SELECT * FROM payment_attempts WHERE order_id = $1 ORDER BY created_at', [orderId]);
    return rows;
  }
}

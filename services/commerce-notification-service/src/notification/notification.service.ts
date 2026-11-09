import { Injectable, NotFoundException } from '@nestjs/common';
import { pool } from '../database/pool.js';
import { log } from '../common/logger.js';

@Injectable()
export class NotificationService {
  async createNotification(params: { eventId?: string; recipientId?: string; channel?: string; templateKey: string; payload: Record<string, unknown> }) {
    const { rows } = await pool.query(
      `INSERT INTO notification_jobs (event_id, recipient_id, channel, template_key, payload)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [params.eventId || null, params.recipientId || null, params.channel || 'email', params.templateKey, JSON.stringify(params.payload)],
    );
    // Simulate sending via console provider
    const job = rows[0];
    const messageId = `msg-${Date.now()}`;
    await pool.query(
      `INSERT INTO notification_deliveries (notification_job_id, provider_message_id, status, sent_at)
       VALUES ($1, $2, 'sent', now())`,
      [job.id, messageId],
    );
    await pool.query(`UPDATE notification_jobs SET status = 'sent', attempt_count = 1, updated_at = now() WHERE id = $1`, [job.id]);
    log('info', 'notification_sent', { jobId: job.id, templateKey: params.templateKey, channel: params.channel || 'email' });
    return { ...job, status: 'sent', messageId };
  }

  async getNotification(id: string) {
    const { rows } = await pool.query('SELECT * FROM notification_jobs WHERE id = $1', [id]);
    if (!rows.length) throw new NotFoundException('Notification not found');
    const { rows: deliveries } = await pool.query('SELECT * FROM notification_deliveries WHERE notification_job_id = $1', [id]);
    return { ...rows[0], deliveries };
  }

  async listNotifications(recipientId?: string, limit = 20) {
    if (recipientId) {
      const { rows } = await pool.query('SELECT * FROM notification_jobs WHERE recipient_id = $1 ORDER BY created_at DESC LIMIT $2', [recipientId, limit]);
      return rows;
    }
    const { rows } = await pool.query('SELECT * FROM notification_jobs ORDER BY created_at DESC LIMIT $1', [limit]);
    return rows;
  }
}

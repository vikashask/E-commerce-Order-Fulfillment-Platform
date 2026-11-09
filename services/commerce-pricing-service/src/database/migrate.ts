import { Pool } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export async function migrate(pool: Pool): Promise<string[]> {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY, applied_at TIMESTAMPTZ DEFAULT now()
  )`);
  const { rows: done } = await pool.query('SELECT filename FROM schema_migrations ORDER BY filename');
  const applied = new Set(done.map((r: { filename: string }) => r.filename));
  const dir = join(__dirname, '../../migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const ran: string[] = [];
  for (const f of files) {
    if (applied.has(f)) continue;
    const sql = readFileSync(join(dir, f), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
      await pool.query('COMMIT');
      ran.push(f);
    } catch (e) {
      await pool.query('ROLLBACK');
      throw e;
    }
  }
  return ran;
}

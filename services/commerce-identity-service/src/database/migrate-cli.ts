import pg from 'pg';
import { migrate } from './migrate.js';
import { config } from '../config/app-config.js';
(async () => {
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  try {
    const ran = await migrate(pool);
    if (ran.length) console.log('Applied:', ran.join(', '));
    else console.log('No new migrations.');
  } finally { await pool.end(); }
})();

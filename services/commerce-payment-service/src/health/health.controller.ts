import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { pool } from '../database/pool.js';

@Controller('health')
export class HealthController {
  @Get('live')
  live() { return { status: 'ok' }; }

  @Get('ready')
  async ready(@Res() res: Response) {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok' });
    } catch {
      res.status(503).json({ status: 'not_ready' });
    }
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { pool } from '../database/pool.js';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { config } from '../config/app-config.js';

function hashPassword(password: string, salt: string): string {
  return createHmac('sha256', salt).update(password).digest('hex');
}

@Injectable()
export class AuthService {
  async register(email: string, password: string, displayName: string) {
    const salt = randomBytes(16).toString('hex');
    const hash = `${salt}:${hashPassword(password, salt)}`;
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES (lower($1), $2, $3)
       RETURNING id, email, display_name, status, created_at`,
      [email, displayName, hash],
    );
    // Assign customer role by default
    const roleRes = await pool.query(`SELECT id FROM roles WHERE name = 'customer'`);
    if (roleRes.rows.length) {
      await pool.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [rows[0].id, roleRes.rows[0].id]);
    }
    return rows[0];
  }

  async login(email: string, password: string) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.password_hash, u.status,
              array_agg(r.name) FILTER (WHERE r.name IS NOT NULL) as roles
       FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE lower(u.email) = lower($1) AND u.status = 'active'
       GROUP BY u.id`,
      [email],
    );
    if (!rows.length) throw new UnauthorizedException('Invalid credentials');
    const user = rows[0];
    const [salt, storedHash] = user.password_hash.split(':');
    const inputHash = hashPassword(password, salt);
    const a = Buffer.from(storedHash, 'hex');
    const b = Buffer.from(inputHash, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.createToken({ sub: user.id, email: user.email, roles: user.roles || [] });
    return { token, user: { id: user.id, email: user.email, displayName: user.display_name, roles: user.roles || [] } };
  }

  createToken(payload: { sub: string; email: string; roles: string[] }): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
    const sig = createHmac('sha256', config.jwtSecret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${sig}`;
  }

  verifyToken(token: string): { sub: string; email: string; roles: string[] } {
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid token');
    const sig = createHmac('sha256', config.jwtSecret).update(`${parts[0]}.${parts[1]}`).digest('base64url');
    if (sig !== parts[2]) throw new UnauthorizedException('Invalid token signature');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new UnauthorizedException('Token expired');
    return payload;
  }

  async getUserById(id: string) {
    const { rows } = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.status,
              array_agg(r.name) FILTER (WHERE r.name IS NOT NULL) as roles
       FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.id
       WHERE u.id = $1 GROUP BY u.id`,
      [id],
    );
    return rows[0] || null;
  }
}

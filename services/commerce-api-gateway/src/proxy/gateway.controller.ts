import { Controller, All, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { GatewayService } from './gateway.service.js';

@Controller('api/v1')
export class GatewayController {
  constructor(private readonly gw: GatewayService) {}

  private resolveService(path: string): { service: string; targetPath: string } | null {
    const p = path.replace(/^\/api\/v1/, '');
    if (p.startsWith('/auth')) return { service: 'identity', targetPath: `/api/v1${p}` };
    if (p.startsWith('/products') || p.startsWith('/categories')) return { service: 'catalog', targetPath: `/api/v1${p}` };
    if (p.startsWith('/search')) return { service: 'search', targetPath: `/api/v1${p}` };
    if (p.startsWith('/prices') || p.startsWith('/quotes') || p.startsWith('/checkout/quote')) return { service: 'pricing', targetPath: `/api/v1${p}` };
    if (p.startsWith('/cart')) return { service: 'cart', targetPath: `/api/v1${p}` };
    if (p.startsWith('/checkout') || p.startsWith('/orders')) return { service: 'order', targetPath: `/api/v1${p}` };
    if (p.startsWith('/inventory')) return { service: 'inventory', targetPath: `/api/v1${p}` };
    if (p.startsWith('/payments')) return { service: 'payment', targetPath: `/api/v1${p}` };
    if (p.startsWith('/fulfillment') || p.startsWith('/shipments')) return { service: 'fulfillment', targetPath: `/api/v1${p}` };
    if (p.startsWith('/notifications')) return { service: 'notification', targetPath: `/api/v1${p}` };
    if (p.startsWith('/readmodel')) return { service: 'readmodel', targetPath: `/api/v1${p}` };
    // Admin routes
    if (p.startsWith('/admin/products') || p.startsWith('/admin/categories')) return { service: 'catalog', targetPath: `/api/v1${p}` };
    if (p.startsWith('/admin/price') || p.startsWith('/admin/prices')) return { service: 'pricing', targetPath: `/api/v1${p}` };
    if (p.startsWith('/admin/inventory')) return { service: 'inventory', targetPath: `/api/v1${p}` };
    if (p.startsWith('/admin/orders') || p.startsWith('/admin/operations')) return { service: 'order', targetPath: `/api/v1${p}` };
    if (p.startsWith('/admin/refunds')) return { service: 'payment', targetPath: `/api/v1${p}` };
    if (p.startsWith('/admin/fulfillment')) return { service: 'fulfillment', targetPath: `/api/v1${p}` };
    if (p.startsWith('/admin/search')) return { service: 'search', targetPath: `/api/v1${p}` };
    return null;
  }

  @All('*')
  async proxy(@Req() req: Request, @Res() res: Response) {
    const route = this.resolveService(req.path);
    if (!route) return res.status(404).json({ error: 'Route not found' });
    const hdrs: Record<string, string> = {};
    if (req.headers['authorization']) hdrs['authorization'] = req.headers['authorization'] as string;
    if (req.headers['idempotency-key']) hdrs['idempotency-key'] = req.headers['idempotency-key'] as string;
    if (req.headers['x-request-id']) hdrs['x-request-id'] = req.headers['x-request-id'] as string;
    const result = await this.gw.proxy(route.service, route.targetPath, req.method, req.body, hdrs);
    return res.status(result.status).json(result.data);
  }
}

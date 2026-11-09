import { Injectable } from '@nestjs/common';

const env = (key: string, fallback: string) => process.env[key] || fallback;

@Injectable()
export class GatewayService {
  readonly routes: Record<string, string> = {
    catalog: env('CATALOG_URL', 'http://localhost:3001'),
    identity: env('IDENTITY_URL', 'http://localhost:3002'),
    pricing: env('PRICING_URL', 'http://localhost:3003'),
    cart: env('CART_URL', 'http://localhost:3004'),
    order: env('ORDER_URL', 'http://localhost:3005'),
    inventory: env('INVENTORY_URL', 'http://localhost:3006'),
    payment: env('PAYMENT_URL', 'http://localhost:3007'),
    fulfillment: env('FULFILLMENT_URL', 'http://localhost:3008'),
    notification: env('NOTIFICATION_URL', 'http://localhost:3009'),
    search: env('SEARCH_URL', 'http://localhost:3010'),
    readmodel: env('READMODEL_URL', 'http://localhost:3011'),
  };

  async proxy(service: string, path: string, method: string, body?: unknown, headers?: Record<string, string>): Promise<{ status: number; data: unknown }> {
    const baseUrl = this.routes[service];
    if (!baseUrl) return { status: 502, data: { error: `Unknown service: ${service}` } };
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const opts: RequestInit = {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        signal: controller.signal,
      };
      if (body && method !== 'GET' && method !== 'HEAD') opts.body = JSON.stringify(body);
      const res = await fetch(url, opts);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = text; }
      return { status: res.status, data };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'proxy_error';
      return { status: 503, data: { error: 'Service unavailable', detail: msg } };
    } finally {
      clearTimeout(timer);
    }
  }
}

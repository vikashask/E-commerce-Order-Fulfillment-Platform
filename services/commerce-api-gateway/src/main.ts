import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const port = parseInt(process.env.PORT || '3000', 10);

const env = (key: string, fallback: string) => process.env[key] || fallback;

const routes: Record<string, string> = {
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

function resolveService(path: string): { service: string; targetPath: string } | null {
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
  if (p.startsWith('/admin/products') || p.startsWith('/admin/categories')) return { service: 'catalog', targetPath: `/api/v1${p}` };
  if (p.startsWith('/admin/price') || p.startsWith('/admin/prices')) return { service: 'pricing', targetPath: `/api/v1${p}` };
  if (p.startsWith('/admin/inventory')) return { service: 'inventory', targetPath: `/api/v1${p}` };
  if (p.startsWith('/admin/orders') || p.startsWith('/admin/operations')) return { service: 'order', targetPath: `/api/v1${p}` };
  if (p.startsWith('/admin/refunds')) return { service: 'payment', targetPath: `/api/v1${p}` };
  if (p.startsWith('/admin/fulfillment')) return { service: 'fulfillment', targetPath: `/api/v1${p}` };
  if (p.startsWith('/admin/search')) return { service: 'search', targetPath: `/api/v1${p}` };
  return null;
}

const app = express();
app.use(express.json());

// CORS
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,Idempotency-Key,X-Request-Id');
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// Request ID
app.use((req, res, next) => {
  const reqId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('x-request-id', reqId);
  next();
});

// Health
app.get('/health/live', (_req, res) => { res.json({ status: 'ok' }); });

// Proxy: mount on /api/v1 - Express strips the mount prefix, so we reconstruct
app.use('/api/v1', async (req, res) => {
  const fullPath = '/api/v1' + req.url;
  const route = resolveService(fullPath);
  if (!route) { res.status(404).json({ error: 'Route not found', path: fullPath }); return; }

  const baseUrl = routes[route.service];
  if (!baseUrl) { res.status(502).json({ error: `Unknown service: ${route.service}` }); return; }

  const url = `${baseUrl}${route.targetPath}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (req.headers['authorization']) headers['authorization'] = req.headers['authorization'] as string;
    if (req.headers['idempotency-key']) headers['idempotency-key'] = req.headers['idempotency-key'] as string;
    if (req.headers['x-request-id']) headers['x-request-id'] = req.headers['x-request-id'] as string;

    const opts: RequestInit = { method: req.method, headers, signal: controller.signal };
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && Object.keys(req.body as object).length > 0) {
      opts.body = JSON.stringify(req.body);
    }

    const upstream = await fetch(url, opts);
    const text = await upstream.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch { data = text; }
    res.status(upstream.status).json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'proxy_error';
    res.status(503).json({ error: 'Service unavailable', detail: msg });
  } finally {
    clearTimeout(timer);
  }
});

app.listen(port, () => {
  console.log(JSON.stringify({ time: new Date().toISOString(), level: 'info', msg: 'gateway_started', port }));
});

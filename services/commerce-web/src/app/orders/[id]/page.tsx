'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function OrderDetail() {
  const params = useParams();
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  useEffect(() => {
    fetch(`${API}/orders/${params.id}`).then(r => r.json()).then(setOrder).catch(() => null).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p>Loading...</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
      <a href="/orders" style={{ color: '#1976d2' }}>Back to orders</a>
      <h1>Order {(order as Record<string, string>).order_number}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
        <div><strong>Status:</strong> {String(order.status)}</div>
        <div><strong>Payment:</strong> {String(order.payment_status)}</div>
        <div><strong>Fulfillment:</strong> {String(order.fulfillment_status)}</div>
        <div><strong>Total:</strong> {((order.total_minor as number) / 100).toFixed(2)} {String(order.currency)}</div>
      </div>
      {Array.isArray(order.items) && order.items.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <h3>Items</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #eee' }}>
              <th style={{ textAlign: 'left', padding: '0.5rem' }}>Product</th>
              <th style={{ textAlign: 'center', padding: '0.5rem' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '0.5rem' }}>Line Total</th>
            </tr></thead>
            <tbody>
              {(order.items as Array<Record<string, unknown>>).map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '0.5rem' }}>{String(item.product_name_snapshot)}</td>
                  <td style={{ textAlign: 'center', padding: '0.5rem' }}>{String(item.quantity)}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{((item.line_total_minor as number) / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
export default function OrdersAdmin() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  useEffect(() => { fetch(`${API}/admin/orders`).then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  return (
    <div><h1>Orders</h1>
      <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse', borderRadius: '8px' }}>
        <thead><tr style={{ borderBottom: '2px solid #eee' }}>
          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Order #</th>
          <th style={{ padding: '0.75rem' }}>Status</th><th style={{ padding: '0.75rem' }}>Payment</th>
          <th style={{ padding: '0.75rem' }}>Fulfillment</th><th style={{ padding: '0.75rem', textAlign: 'right' }}>Total</th>
        </tr></thead>
        <tbody>{orders.map((o, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '0.75rem' }}>{String(o.order_number)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(o.status)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(o.payment_status)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(o.fulfillment_status)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'right' }}>{((o.total_minor as number) / 100).toFixed(2)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

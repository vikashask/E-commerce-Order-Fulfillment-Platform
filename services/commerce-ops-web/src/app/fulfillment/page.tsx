'use client';
import { useEffect, useState } from 'react';
export default function FulfillmentAdmin() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  useEffect(() => { fetch(`${API}/admin/fulfillment`).then(r => r.json()).then(d => setOrders(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  return (
    <div><h1>Fulfillment</h1>
      <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #eee' }}>
          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Order ID</th>
          <th style={{ padding: '0.75rem' }}>Status</th><th style={{ padding: '0.75rem' }}>Priority</th>
        </tr></thead>
        <tbody>{orders.map((o, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '0.75rem' }}>{String(o.order_id)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(o.status)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(o.priority)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

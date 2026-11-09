'use client';
import { useEffect, useState } from 'react';

interface Order { id: string; order_number: string; status: string; total_minor: number; currency: string; created_at: string; }

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  useEffect(() => {
    fetch(`${API}/orders`).then(r => r.json()).then(data => {
      setOrders(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading orders...</p>;

  return (
    <div>
      <h1>My Orders</h1>
      {orders.length === 0 ? <p>No orders yet. <a href="/products">Start shopping</a></p> : (
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '2px solid #eee' }}>
              <th style={{ padding: '1rem', textAlign: 'left' }}>Order #</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Total</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Date</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '1rem' }}>{o.order_number}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}><span style={{ background: o.status === 'confirmed' ? '#e8f5e9' : '#fff3e0', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{o.status}</span></td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>{(o.total_minor / 100).toFixed(2)} {o.currency}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>{new Date(o.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}><a href={`/orders/${o.id}`} style={{ color: '#1976d2' }}>Details</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

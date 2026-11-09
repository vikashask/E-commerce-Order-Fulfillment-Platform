'use client';
import { useEffect, useState } from 'react';
export default function Dashboard() {
  const [stats, setStats] = useState<{orders: number; inventory: number; fulfillment: number}>({ orders: 0, inventory: 0, fulfillment: 0 });
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  useEffect(() => {
    Promise.all([
      fetch(`${API}/admin/orders`).then(r => r.json()).catch(() => []),
      fetch(`${API}/admin/inventory`).then(r => r.json()).catch(() => []),
      fetch(`${API}/admin/fulfillment`).then(r => r.json()).catch(() => []),
    ]).then(([o, i, f]) => setStats({ orders: Array.isArray(o) ? o.length : 0, inventory: Array.isArray(i) ? i.length : 0, fulfillment: Array.isArray(f) ? f.length : 0 }));
  }, []);
  return (
    <div>
      <h1>Operations Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
        <Stat label="Orders" value={stats.orders} href="/orders" />
        <Stat label="Inventory Items" value={stats.inventory} href="/inventory" />
        <Stat label="Fulfillment Orders" value={stats.fulfillment} href="/fulfillment" />
      </div>
    </div>
  );
}
function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <a href={href} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{value}</div>
      <div style={{ color: '#666' }}>{label}</div>
    </a>
  );
}

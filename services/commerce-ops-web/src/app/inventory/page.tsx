'use client';
import { useEffect, useState } from 'react';
export default function InventoryAdmin() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  useEffect(() => { fetch(`${API}/admin/inventory`).then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  return (
    <div><h1>Inventory</h1>
      <table style={{ width: '100%', background: 'white', borderCollapse: 'collapse' }}>
        <thead><tr style={{ borderBottom: '2px solid #eee' }}>
          <th style={{ padding: '0.75rem', textAlign: 'left' }}>SKU</th>
          <th style={{ padding: '0.75rem' }}>On Hand</th><th style={{ padding: '0.75rem' }}>Reserved</th>
          <th style={{ padding: '0.75rem' }}>Available</th>
        </tr></thead>
        <tbody>{items.map((it, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
            <td style={{ padding: '0.75rem' }}>{String(it.sku)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(it.on_hand_quantity)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(it.reserved_quantity)}</td>
            <td style={{ padding: '0.75rem', textAlign: 'center' }}>{String(it.available)}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

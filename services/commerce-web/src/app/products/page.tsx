'use client';
import { useEffect, useState } from 'react';

interface Product {
  id: string; name: string; slug: string; description: string; status: string;
  category_name?: string; media?: Array<{ alt_text: string }>;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = search ? `&search=${encodeURIComponent(search)}` : '';
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/products?status=published${q}`)
      .then(r => r.json()).then((data) => {
        setProducts(Array.isArray(data) ? data : data.data || []);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [search]);

  return (
    <div>
      <h1>Products</h1>
      <input
        type="text" placeholder="Search products..." value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ padding: '0.5rem 1rem', width: '100%', maxWidth: '400px', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ddd', fontSize: '1rem' }}
      />
      {loading ? <p>Loading...</p> : products.length === 0 ? <p>No products found.</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {products.map(p => (
            <a key={p.id} href={`/products/${p.id}`} style={{ background: 'white', padding: '1rem', borderRadius: '8px', textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 0.5rem' }}>{p.name}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '0.9rem' }}>{p.description?.slice(0, 100)}</p>
              {p.category_name && <span style={{ display: 'inline-block', marginTop: '0.5rem', background: '#e8f4fd', color: '#1976d2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{p.category_name}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

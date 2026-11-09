'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface Product { id: string; name: string; description: string; status: string; slug: string; category_name?: string; media?: Array<{ alt_text: string; object_key: string }>; }

export default function ProductDetail() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/products/${params.id}`)
      .then(r => { if (!r.ok) throw new Error('Not found'); return r.json(); })
      .then(setProduct).catch(() => setProduct(null)).finally(() => setLoading(false));
  }, [params.id]);

  const addToCart = async () => {
    if (!product) return;
    // Get or create cart
    const cartRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/cart?sessionId=demo-session`);
    const cart = await cartRes.json();
    const cartId = cart.id;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'}/cart/${cartId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId: product.id, sku: product.slug, productName: product.name, quantity: 1 }),
    });
    localStorage.setItem('cartId', cartId);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return <p>Loading...</p>;
  if (!product) return <p>Product not found.</p>;

  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
      <a href="/products" style={{ color: '#1976d2' }}>Back to products</a>
      <h1>{product.name}</h1>
      {product.category_name && <span style={{ background: '#e8f4fd', color: '#1976d2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>{product.category_name}</span>}
      <p style={{ marginTop: '1rem', lineHeight: 1.6 }}>{product.description}</p>
      <div style={{ marginTop: '2rem' }}>
        <button onClick={addToCart} style={{ background: '#1976d2', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' }}>
          {added ? 'Added to Cart!' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

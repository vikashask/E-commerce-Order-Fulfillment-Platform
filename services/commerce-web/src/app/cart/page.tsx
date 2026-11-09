'use client';
import { useEffect, useState } from 'react';

interface CartItem { id: string; variant_id: string; sku: string; product_name: string; quantity: number; }
interface Cart { id: string; version: number; items: CartItem[]; }

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

  const loadCart = async () => {
    const cartId = localStorage.getItem('cartId');
    if (!cartId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API}/cart/${cartId}`);
      if (res.ok) setCart(await res.json());
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { loadCart(); }, []);

  const removeItem = async (itemId: string) => {
    if (!cart) return;
    await fetch(`${API}/cart/${cart.id}/items/${itemId}`, { method: 'DELETE' });
    loadCart();
  };

  const checkout = async () => {
    if (!cart || !cart.items.length) return;
    const res = await fetch(`${API}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': `checkout-${cart.id}-${cart.version}` },
      body: JSON.stringify({
        items: cart.items.map(i => ({ variantId: i.variant_id, sku: i.sku, productName: i.product_name, quantity: i.quantity, unitPriceMinor: 200000 })),
        shippingAddress: { line1: '123 Demo St', city: 'Mumbai', country: 'IN' },
      }),
    });
    const order = await res.json();
    if (order.orderId) {
      localStorage.removeItem('cartId');
      window.location.href = `/orders/${order.orderId}`;
    }
  };

  if (loading) return <p>Loading cart...</p>;
  if (!cart || !cart.items?.length) return <div><h1>Shopping Cart</h1><p>Your cart is empty.</p><a href="/products">Browse products</a></div>;

  return (
    <div>
      <h1>Shopping Cart</h1>
      <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ borderBottom: '2px solid #eee' }}>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Product</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>Qty</th>
            <th style={{ padding: '1rem', textAlign: 'right' }}>Action</th>
          </tr></thead>
          <tbody>
            {cart.items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '1rem' }}>{item.product_name || item.sku}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <button onClick={() => removeItem(item.id)} style={{ background: '#e53935', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer' }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
        <button onClick={checkout} style={{ background: '#2e7d32', color: 'white', border: 'none', padding: '0.75rem 2rem', borderRadius: '4px', fontSize: '1rem', cursor: 'pointer' }}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}

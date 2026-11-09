'use client';
export default function CheckoutPage() {
  return (
    <div style={{ background: 'white', padding: '2rem', borderRadius: '8px' }}>
      <h1>Checkout</h1>
      <p>Checkout is handled automatically when you click "Proceed to Checkout" from the cart page.</p>
      <a href="/cart" style={{ color: '#1976d2' }}>Go to Cart</a>
    </div>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Commerce Platform',
  description: 'E-commerce & Order Fulfillment Platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif', background: '#f5f5f5' }}>
        <header style={{ background: '#1a1a2e', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none', fontSize: '1.5rem', fontWeight: 'bold' }}>Commerce Platform</a>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="/products" style={{ color: '#ccc', textDecoration: 'none' }}>Products</a>
            <a href="/cart" style={{ color: '#ccc', textDecoration: 'none' }}>Cart</a>
            <a href="/orders" style={{ color: '#ccc', textDecoration: 'none' }}>Orders</a>
          </nav>
        </header>
        <main style={{ maxWidth: '1200px', margin: '2rem auto', padding: '0 1rem' }}>
          {children}
        </main>
      </body>
    </html>
  );
}

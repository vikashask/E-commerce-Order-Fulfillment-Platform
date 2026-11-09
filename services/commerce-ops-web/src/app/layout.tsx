export const metadata = { title: 'Commerce Operations', description: 'Admin dashboard' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f0f0f0' }}>
      <header style={{ background: '#2d2d44', color: 'white', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Commerce Operations</span>
        <nav style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="/" style={{ color: '#ccc', textDecoration: 'none' }}>Dashboard</a>
          <a href="/orders" style={{ color: '#ccc', textDecoration: 'none' }}>Orders</a>
          <a href="/inventory" style={{ color: '#ccc', textDecoration: 'none' }}>Inventory</a>
          <a href="/fulfillment" style={{ color: '#ccc', textDecoration: 'none' }}>Fulfillment</a>
        </nav>
      </header>
      <main style={{ maxWidth: '1400px', margin: '2rem auto', padding: '0 1rem' }}>{children}</main>
    </body></html>
  );
}

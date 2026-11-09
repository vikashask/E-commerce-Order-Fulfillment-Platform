export default function Home() {
  return (
    <div>
      <h1>Welcome to Commerce Platform</h1>
      <p>An end-to-end e-commerce and order fulfillment platform built with microservices.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
        <Card title="Browse Products" href="/products" desc="View our catalog of published products" />
        <Card title="Shopping Cart" href="/cart" desc="Manage your shopping cart" />
        <Card title="My Orders" href="/orders" desc="Track your order history" />
      </div>
    </div>
  );
}

function Card({ title, href, desc }: { title: string; href: string; desc: string }) {
  return (
    <a href={href} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', textDecoration: 'none', color: 'inherit', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
      <h3 style={{ margin: '0 0 0.5rem' }}>{title}</h3>
      <p style={{ margin: 0, color: '#666' }}>{desc}</p>
    </a>
  );
}

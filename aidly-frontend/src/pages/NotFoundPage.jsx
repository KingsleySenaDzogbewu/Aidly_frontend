import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--accent)' }}>404</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>This page doesn&rsquo;t exist.</div>
      <p style={{ fontSize: 13.5, color: 'var(--text-muted)', maxWidth: 360 }}>
        Check the link, or head back to your dashboard.
      </p>
      <Link to="/"><Button style={{ marginTop: 6 }}>Go to overview</Button></Link>
    </div>
  );
}

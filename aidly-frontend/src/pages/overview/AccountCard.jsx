import { Card } from '../../components/ui';

export default function AccountCard({ user, roleLabel, delay = 0 }) {
  return (
    <Card className="fade-in-up" style={{ background: 'var(--accent-soft-bg)', border: 'none', animationDelay: `${delay}ms` }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, color: 'var(--accent-soft-text)' }}>Your access</div>
      <div style={{ fontSize: 13, color: 'var(--accent-soft-text)', lineHeight: 1.9 }}>
        <div>Signed in as <strong>{user?.email}</strong></div>
        <div>Role: <strong>{roleLabel}</strong></div>
        <div>School: <strong>{user?.schoolName || (user?.bootstrapAdmin ? 'All schools' : '—')}</strong></div>
      </div>
    </Card>
  );
}

import { useNavigate } from 'react-router-dom';
import { Card, Icons } from '../../components/ui';

export default function QuickActions({ title = 'Quick actions', items, delay = 0 }) {
  const navigate = useNavigate();
  return (
    <Card className="fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it) => (
          <button key={it.to} type="button" onClick={() => navigate(it.to)} className="overview-quick-action">
            <span className="overview-quick-action-icon"><it.icon size={15} /></span>
            <span style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}>{it.label}</span>
              {it.hint && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{it.hint}</span>}
            </span>
            <Icons.IconChevronRight size={14} style={{ color: 'var(--text-faint)', flexShrink: 0 }} />
          </button>
        ))}
      </div>
    </Card>
  );
}

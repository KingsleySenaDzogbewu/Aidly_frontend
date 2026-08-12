import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui';
import useCountUp from '../../hooks/useCountUp';
import { BADGE_ICONS, BADGE_CATALOG } from '../../utils/gamification';

export default function GamificationCard({ summary, loading, delay = 0 }) {
  const navigate = useNavigate();
  const points = useCountUp(loading ? 0 : (summary?.totalPoints || 0));
  const earned = new Set((summary?.badges || []).map((b) => b.badge));

  return (
    <Card className="fade-in-up" style={{ animationDelay: `${delay}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>Your progress &amp; badges</div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/leaderboard')}>
          View leaderboard
        </button>
      </div>

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : points}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total points</div>
        </div>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{loading ? '—' : (summary?.currentStreakWeeks ?? 0)}</div>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Week streak</div>
        </div>
        {summary?.schoolRank && (
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>#{summary.schoolRank}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>School rank</div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {BADGE_CATALOG.map((b) => {
          const has = earned.has(b.type);
          return (
            <div key={b.type} className={`badge-chip ${has ? 'badge-chip-earned' : 'badge-chip-locked'}`} title={`${b.displayName} — ${b.description}${has ? '' : ' (not yet earned)'}`}>
              <img src={BADGE_ICONS[b.type]} alt={b.displayName} width={30} height={30} />
              <span>{b.displayName}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { GamificationApi } from '../api/endpoints';
import { Avatar, Card, Input, Button, EmptyState, SkeletonList, Icons, Reveal } from '../components/ui';

const RANK_MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' };

export default function LeaderboardPage() {
  const { user, isStudent } = useAuth();
  const toast = useToast();
  const [schoolId, setSchoolId] = useState(user?.schoolId ? String(user.schoolId) : '');
  const [entries, setEntries] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const page = await GamificationApi.leaderboard(id, { size: 50 });
      setEntries(page?.content || page || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (schoolId) load(schoolId); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="fade-in">
      <h1 className="page-title">Leaderboard</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>Points and streaks across the school.</p>

      {!user?.schoolId && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <Input placeholder="School ID" value={schoolId} onChange={(e) => setSchoolId(e.target.value)} style={{ width: 160 }} />
          <Button variant="outline" onClick={() => load(schoolId)}>Load leaderboard</Button>
        </div>
      )}

      {loading || entries === null ? (
        <SkeletonList count={4} small />
      ) : entries.length === 0 ? (
        <EmptyState icon={<Icons.IconShield size={22} />} title="No leaderboard data yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 560 }}>
          {entries.map((e, i) => {
            const isMe = isStudent && user?.studentProfileId === e.studentId;
            return (
              <Reveal key={e.studentId} delay={Math.min(i, 10) * 30}>
                <Card
                  tight
                  hover
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    border: isMe ? '1px solid var(--accent)' : undefined,
                    background: isMe ? 'var(--accent-soft-bg)' : undefined,
                  }}
                >
                  <div style={{ width: 32, textAlign: 'center', fontSize: RANK_MEDALS[e.rank] ? 20 : 14, fontWeight: 800, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {RANK_MEDALS[e.rank] || `#${e.rank}`}
                  </div>
                  <Avatar src={e.profileImageUrl} name={e.studentName} size={36} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{e.studentName}{isMe ? ' (you)' : ''}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {e.currentStreakWeeks > 0 ? `${e.currentStreakWeeks}-week streak` : 'No active streak'}
                    </div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {e.totalPoints} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>pts</span>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}

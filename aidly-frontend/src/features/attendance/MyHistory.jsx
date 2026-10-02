import { Badge, Card, EmptyState, Icons, SkeletonList } from '../../components/ui';
import { fmtTime } from '../../utils/format';
import { STATUS_LABELS, LESSON_TYPE_LABELS, fmtPlainDate } from './attendanceUtils';

// Someone's own last 30 days, newest first.
export default function MyHistory({ entries, loading, title = 'Your last 30 days' }) {
  const counted = entries.filter((e) => e.status !== 'NOT_CHECKED_IN');
  const present = counted.filter((e) => e.status === 'PRESENT' || e.status === 'LATE').length;

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div className="att-card-title">{title}</div>
        {counted.length > 0 && <div className="att-muted">{present} of {counted.length} days attended</div>}
      </div>
      {loading ? (
        <SkeletonList count={3} small />
      ) : entries.length === 0 ? (
        <EmptyState icon={<Icons.IconCalendarCheck size={22} />} title="No attendance yet">
          Days you check in will show here.
        </EmptyState>
      ) : (
        <ul className="att-history">
          {entries.map((e) => (
            <li key={e.id ?? e.date} className="att-history-row">
              <div className="att-history-date">{fmtPlainDate(e.date)}</div>
              <div className="att-history-detail">
                {[
                  e.checkedInAt && `In at ${fmtTime(e.checkedInAt)}`,
                  e.lessonType && (LESSON_TYPE_LABELS[e.lessonType] || e.lessonType),
                  e.topic,
                  e.reason && `“${e.reason}”`,
                ].filter(Boolean).join(' · ')}
              </div>
              <Badge status={e.status}>{STATUS_LABELS[e.status] || e.status}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

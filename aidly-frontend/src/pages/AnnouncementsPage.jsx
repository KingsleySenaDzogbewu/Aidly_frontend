import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AnnouncementApi } from '../api/endpoints';
import { Button, Card, Field, Input, Textarea, LengthHint, Modal, SkeletonList, EmptyState, Icons, Reveal, useToast } from '../components/ui';
import { fmtDateTime } from '../utils/format';

const PAGE_SIZE = 20;

// School-wide, one-way announcements: instructors post, everyone reads.
export default function AnnouncementsPage() {
  const { user, isInstructor, isStudent } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject: '', body: '' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const load = async (nextPage = 0) => {
    const res = await AnnouncementApi.list({ page: nextPage, size: PAGE_SIZE });
    const rows = res?.content || res || [];
    setItems((prev) => (nextPage === 0 ? rows : [...(prev || []), ...rows]));
    setPage(nextPage);
    setHasMore(res && typeof res.last === 'boolean' ? !res.last : false);
  };

  useEffect(() => {
    load(0).catch((err) => { setItems([]); toast.error(err.message); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try { await load(page + 1); } catch (err) { toast.error(err.message); }
    finally { setLoadingMore(false); }
  };

  const send = async () => {
    setSending(true);
    try {
      const created = await AnnouncementApi.create(form.subject.trim(), form.body.trim());
      const count = created?.recipientCount;
      toast.success(count != null ? `Announcement sent to ${count} student${count === 1 ? '' : 's'}` : 'Announcement sent');
      setConfirmOpen(false);
      setShowForm(false);
      setForm({ subject: '', body: '' });
      await load(0);
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const canSend = form.subject.trim().length > 0 && form.body.trim().length > 0;
  const schoolName = user?.schoolName || 'your school';

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-subtitle">News and notices for everyone at the school.</p>
        </div>
        {isInstructor && (
          <Button onClick={() => setShowForm((s) => !s)}>
            <Icons.IconPlus size={14} /> {showForm ? 'Cancel' : 'New announcement'}
          </Button>
        )}
      </div>

      {isInstructor && showForm && (
        <Card className="fade-in" style={{ marginBottom: 20 }}>
          <form onSubmit={(e) => { e.preventDefault(); if (canSend) setConfirmOpen(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Subject" required hint={<LengthHint value={form.subject} max={200} />}>
              <Input required maxLength={200} value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="e.g. No lessons on Friday" />
            </Field>
            <Field label="Message" required hint={<LengthHint value={form.body} max={5000} />}>
              <Textarea rows={5} required maxLength={5000} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} />
            </Field>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Every student at {schoolName} gets this as a notification and by email. Students can’t reply here; they can message you instead.
            </div>
            <Button type="submit" disabled={!canSend} style={{ alignSelf: 'flex-start' }}>Review and send</Button>
          </form>
        </Card>
      )}

      {isStudent && (
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>
          Questions about an announcement? <Link to="/messages">Message your instructor</Link>.
        </p>
      )}

      {items === null ? (
        <SkeletonList count={3} />
      ) : items.length === 0 ? (
        <EmptyState icon={<Icons.IconBell size={22} />} title="No announcements yet">
          {isInstructor ? 'Post one to reach every student at once.' : 'When your school posts news, it appears here.'}
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((a, i) => (
            <Reveal key={a.id} delay={Math.min(i, 8) * 40}>
              <Card tight>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px 12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>{a.subject}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fmtDateTime(a.createdAt)}</div>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>From {a.instructorName || 'your school'}</div>
                <div style={{ fontSize: 14, marginTop: 10, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{a.body}</div>
              </Card>
            </Reveal>
          ))}
          {hasMore && (
            <Button variant="outline" loading={loadingMore} onClick={loadMore} style={{ alignSelf: 'center' }}>Show older announcements</Button>
          )}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Send this announcement?"
        footer={(
          <>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep editing</Button>
            <Button loading={sending} onClick={send}>Send to all students</Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 0 }}>
          <strong style={{ color: 'var(--text)' }}>{form.subject}</strong> goes to every student at {schoolName} as an in-app notification and by email. It can’t be edited or deleted after sending.
        </p>
      </Modal>
    </div>
  );
}

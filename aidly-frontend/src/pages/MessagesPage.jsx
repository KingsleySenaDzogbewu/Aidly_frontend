import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useMessages } from '../features/messages/MessagesContext';
import { ConversationApi } from '../api/endpoints';
import { Button, Input, Modal, SkeletonList, EmptyState, Icons, useToast } from '../components/ui';
import useIsMobile from '../hooks/useIsMobile';
import { fmtDayLabel, fmtShortWhen, fmtTime, humanize, initials, toDate } from '../utils/format';
import './messages.css';

const PAGE_SIZE = 30;
const THREAD_POLL_MS = 10000;
const MAX_LENGTH = 5000;

const nameParts = (name = '') => { const [first, ...rest] = name.split(' '); return [first, rest.join(' ')]; };

function Avatar({ name }) {
  const [first, last] = nameParts(name);
  return <span className="avatar msg-avatar">{initials(first, last)}</span>;
}

// Oldest -> newest, keyed by id so polls and sends merge without duplicates.
function mergeMessages(prev, incoming) {
  const byId = new Map((prev || []).map((m) => [m.id, m]));
  incoming.forEach((m) => byId.set(m.id, { ...byId.get(m.id), ...m }));
  return [...byId.values()].sort((a, b) => toDate(a.sentAt) - toDate(b.sentAt));
}

function Thread({ conversation, isMobile, onBack }) {
  const toast = useToast();
  const { reload: reloadInbox, markReadLocally } = useMessages();
  const [messages, setMessages] = useState(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);
  const stickToBottom = useRef(true);
  const keepOffsetFromBottom = useRef(null);
  const messagesRef = useRef([]);
  const id = conversation.id;

  useEffect(() => { messagesRef.current = messages || []; }, [messages]);

  const markRead = () => {
    ConversationApi.markRead(id, { silent: true }).then(() => markReadLocally(id)).catch(() => {});
  };

  // First page, then poll for new messages / read receipts while open.
  useEffect(() => {
    let cancelled = false;
    ConversationApi.messages(id, { page: 0, size: PAGE_SIZE })
      .then((res) => {
        if (cancelled) return;
        setMessages(mergeMessages([], res?.content || []));
        setHasMore(res ? !res.last : false);
        markRead();
      })
      .catch((err) => { if (!cancelled) { setMessages([]); toast.error(err.message); } });

    const poll = setInterval(async () => {
      if (document.hidden) return;
      try {
        const res = await ConversationApi.messages(id, { page: 0, size: PAGE_SIZE }, { silent: true });
        const known = new Set(messagesRef.current.map((m) => m.id));
        const gotNewFromThem = (res?.content || []).some((m) => !m.mine && !known.has(m.id));
        setMessages((prev) => mergeMessages(prev, res?.content || []));
        if (gotNewFromThem) markRead();
      } catch { /* next poll will retry */ }
    }, THREAD_POLL_MS);

    return () => { cancelled = true; clearInterval(poll); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Keep the view pinned to the newest message unless the reader scrolled up;
  // keep their place when older messages are added above.
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (keepOffsetFromBottom.current != null) {
      el.scrollTop = el.scrollHeight - keepOffsetFromBottom.current;
      keepOffsetFromBottom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const onScroll = () => {
    const el = listRef.current;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const loadOlder = async () => {
    setLoadingOlder(true);
    try {
      const next = page + 1;
      const res = await ConversationApi.messages(id, { page: next, size: PAGE_SIZE });
      const el = listRef.current;
      if (el) keepOffsetFromBottom.current = el.scrollHeight - el.scrollTop;
      setMessages((prev) => mergeMessages(prev, res?.content || []));
      setPage(next);
      setHasMore(res ? !res.last : false);
    } catch (err) { toast.error(err.message); }
    finally { setLoadingOlder(false); }
  };

  const send = async (text, retryOf) => {
    const body = (text ?? draft).trim();
    if (!body) return;
    const tempId = retryOf || `tmp-${Date.now()}`;
    const optimistic = { id: tempId, mine: true, body, sentAt: new Date().toISOString(), readAt: null, pending: true, failed: false };
    if (!retryOf) setDraft('');
    stickToBottom.current = true;
    setMessages((prev) => mergeMessages(prev, [optimistic]));
    try {
      const saved = await ConversationApi.send(id, body);
      setMessages((prev) => mergeMessages((prev || []).filter((m) => m.id !== tempId), [saved]));
      reloadInbox();
    } catch (err) {
      setMessages((prev) => (prev || []).map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
      toast.error(err.message || 'Message not sent. Check your connection and try again.');
    }
  };

  const onKeyDown = (e) => {
    // Enter sends on a computer; on phones Enter adds a new line and the button sends.
    if (e.key === 'Enter' && !e.shiftKey && !isMobile && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const lastSeenMineId = useMemo(() => {
    const mine = (messages || []).filter((m) => m.mine && !m.pending && !m.failed);
    const last = mine[mine.length - 1];
    return last?.readAt ? last.id : null;
  }, [messages]);

  let lastDay = null;

  return (
    <section className={`msg-panel ${isMobile ? 'msg-panel-fullscreen' : ''}`} aria-label={`Conversation with ${conversation.counterpartName}`}>
      <div className="msg-panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {isMobile && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onBack} aria-label="Back to inbox" style={{ padding: '4px 6px' }}>
              <Icons.IconChevronRight size={16} style={{ transform: 'rotate(180deg)' }} />
            </button>
          )}
          <Avatar name={conversation.counterpartName} />
          <div style={{ minWidth: 0 }}>
            <div className="msg-panel-title">{conversation.counterpartName}</div>
            <div className="msg-panel-sub">{humanize(conversation.counterpartRole)}</div>
          </div>
        </div>
      </div>

      <div className="msg-thread" ref={listRef} onScroll={onScroll} aria-live="polite">
        {messages === null ? (
          <SkeletonList count={3} small />
        ) : messages.length === 0 ? (
          <div className="msg-empty">
            <Icons.IconInbox size={22} />
            <div>No messages yet. Say hello to {nameParts(conversation.counterpartName)[0]}.</div>
          </div>
        ) : (
          <>
            {hasMore && (
              <Button size="sm" variant="ghost" loading={loadingOlder} onClick={loadOlder} style={{ alignSelf: 'center' }}>Load older messages</Button>
            )}
            {messages.map((m) => {
              const day = fmtDayLabel(m.sentAt);
              const showDay = day !== lastDay;
              lastDay = day;
              return (
                <div key={m.id} style={{ display: 'contents' }}>
                  {showDay && <div className="msg-day">{day}</div>}
                  <div className={`msg-bubble-row ${m.mine ? 'mine' : 'theirs'} ${m.pending ? 'msg-pending' : ''}`}>
                    <div className="msg-bubble">{m.body}</div>
                    {m.failed ? (
                      <div className="msg-meta failed">
                        Not sent ·{' '}
                        <button type="button" className="login-link-btn" style={{ margin: 0, fontSize: 11, color: 'inherit' }} onClick={() => send(m.body, m.id)}>Retry</button>
                      </div>
                    ) : (
                      <div className="msg-meta">
                        {m.pending ? 'Sending…' : fmtTime(m.sentAt)}
                        {m.id === lastSeenMineId ? ' · Seen' : ''}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      <form className="msg-composer" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <textarea
          className="textarea"
          rows={isMobile ? 1 : 2}
          maxLength={MAX_LENGTH}
          placeholder={`Message ${nameParts(conversation.counterpartName)[0]}…`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          aria-label="Write a message"
        />
        <Button type="submit" disabled={!draft.trim()}>Send</Button>
      </form>
      <div className="msg-composer-hint">
        {draft.length > MAX_LENGTH - 500 ? `${draft.length} / ${MAX_LENGTH} characters` : (isMobile ? '' : 'Enter to send · Shift+Enter for a new line')}
      </div>
    </section>
  );
}

function NewMessageModal({ open, onClose, onOpened }) {
  const toast = useToast();
  const { isStudent } = useAuth();
  const [contacts, setContacts] = useState(null);
  const [query, setQuery] = useState('');
  const [openingId, setOpeningId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setContacts(null);
    ConversationApi.contacts().then((list) => setContacts(list || [])).catch((err) => { setContacts([]); toast.error(err.message); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const filtered = (contacts || []).filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query.trim().toLowerCase()));

  const start = async (contact) => {
    setOpeningId(contact.profileId);
    try {
      const conversation = await ConversationApi.open(contact.profileId);
      onOpened(conversation);
    } catch (err) { toast.error(err.message); }
    finally { setOpeningId(null); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New message" footer={<Button variant="outline" onClick={onClose}>Cancel</Button>}>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
        {isStudent ? 'Choose one of your school’s instructors.' : 'Choose one of your school’s students.'}
      </p>
      {contacts && contacts.length > 6 && (
        <Input placeholder="Search by name" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginTop: 10 }} />
      )}
      <div className="msg-contacts">
        {contacts === null ? (
          <div style={{ padding: 12 }}><SkeletonList count={2} small /></div>
        ) : filtered.length === 0 ? (
          <div className="msg-empty" style={{ padding: 16 }}>{contacts.length === 0 ? 'No one to message yet.' : 'No one matches that name.'}</div>
        ) : filtered.map((c) => (
          <button key={c.profileId} type="button" className="msg-row" onClick={() => start(c)} disabled={openingId !== null}>
            <Avatar name={`${c.firstName} ${c.lastName}`} />
            <span className="msg-row-main"><span className="msg-row-name">{c.firstName} {c.lastName}</span></span>
            {openingId === c.profileId ? <span className="spinner" aria-hidden="true" /> : <Icons.IconChevronRight size={14} style={{ color: 'var(--text-faint)' }} />}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default function MessagesPage() {
  const isMobile = useIsMobile();
  const { conversations, reload } = useMessages();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showNew, setShowNew] = useState(false);
  // A conversation just opened from "New message" may not be in the inbox list yet.
  const [justOpened, setJustOpened] = useState(null);

  const selectedId = Number(searchParams.get('c')) || null;
  const select = (convId) => setSearchParams(convId ? { c: String(convId) } : {});
  const selected = (conversations || []).find((c) => c.id === selectedId) || (justOpened?.id === selectedId ? justOpened : null);

  useEffect(() => { reload(); /* refresh the inbox when the page opens */ }, [reload]);

  // On a computer, open the most recent conversation (the inbox is sorted by
  // latest activity) instead of an empty panel. Phones start on the inbox.
  useEffect(() => {
    if (isMobile || selectedId || !conversations?.length) return;
    setSearchParams({ c: String(conversations[0].id) }, { replace: true });
  }, [isMobile, selectedId, conversations, setSearchParams]);

  const onOpened = (conversation) => {
    setShowNew(false);
    setJustOpened(conversation);
    select(conversation.id);
    reload();
  };

  const showInbox = !isMobile || !selectedId;
  const showThread = !isMobile || !!selectedId;

  return (
    <div className="fade-in">
      {/* On a phone an open conversation gets the whole screen; its own header has Back. */}
      {!(isMobile && selectedId) && (
        <div className="page-header">
          <div>
            <h1 className="page-title">Messages</h1>
            <p className="page-subtitle">Private conversations between students and instructors.</p>
          </div>
          <Button onClick={() => setShowNew(true)}><Icons.IconPlus size={14} /> New message</Button>
        </div>
      )}

      <div className="msg-layout">
        {showInbox && (
          <section className="msg-panel" aria-label="Inbox">
            <div className="msg-panel-head"><div className="msg-panel-title">Inbox</div></div>
            <div className="msg-inbox">
              {conversations === null ? (
                <div style={{ padding: 16 }}><SkeletonList count={3} small /></div>
              ) : conversations.length === 0 ? (
                <div className="msg-empty">
                  <Icons.IconInbox size={22} />
                  <div>No conversations yet.</div>
                  <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>Start one</Button>
                </div>
              ) : conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`msg-row ${c.id === selectedId ? 'active' : ''} ${c.unreadCount > 0 ? 'unread' : ''}`}
                  onClick={() => select(c.id)}
                  aria-current={c.id === selectedId ? 'true' : undefined}
                >
                  <Avatar name={c.counterpartName} />
                  <span className="msg-row-main">
                    <span className="msg-row-top">
                      <span className="msg-row-name">{c.counterpartName}</span>
                      <span className="msg-row-time">{fmtShortWhen(c.lastMessageAt)}</span>
                    </span>
                    <span className="msg-row-preview" style={{ display: 'block' }}>{c.lastMessagePreview || 'No messages yet'}</span>
                  </span>
                  {c.unreadCount > 0 && <span className="msg-unread" aria-label={`${c.unreadCount} unread`}>{c.unreadCount}</span>}
                </button>
              ))}
            </div>
          </section>
        )}

        {showThread && (
          selected ? (
            <Thread key={selected.id} conversation={selected} isMobile={isMobile} onBack={() => select(null)} />
          ) : (
            <section className="msg-panel">
              {selectedId && conversations === null ? (
                <div style={{ padding: 16 }}><SkeletonList count={3} small /></div>
              ) : (
                <EmptyState icon={<Icons.IconInbox size={22} />} title="Select a conversation">
                  Pick someone on the left, or start a new message.
                </EmptyState>
              )}
            </section>
          )
        )}
      </div>

      <NewMessageModal open={showNew} onClose={() => setShowNew(false)} onOpened={onOpened} />
    </div>
  );
}

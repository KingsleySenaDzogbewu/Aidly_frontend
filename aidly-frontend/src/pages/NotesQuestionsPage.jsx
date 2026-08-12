import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { LessonNoteApi, LessonQuestionApi } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Textarea, Select, Tabs, SkeletonList, EmptyState, Icons, Reveal, StudentPicker } from '../components/ui';
import { fmtDateTime } from '../utils/format';

const QUESTION_STATUSES = ['PENDING', 'IN_PROGRESS', 'ANSWERED', 'CLOSED'];

const emptyNote = { studentId: '', bookingId: '', lessonSummary: '', strengths: '', weaknesses: '', recommendations: '' };
const emptyQuestion = { subject: '', questionBody: '', assignedInstructorId: '' };

function NoteAttachments({ noteId, canManage, toast }) {
  const [attachments, setAttachments] = useState(null);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try { setAttachments(await LessonNoteApi.listAttachments(noteId) || []); }
    catch (err) { toast.error(err.message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [noteId]);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are accepted'); return; }
    setUploading(true);
    try {
      await LessonNoteApi.uploadAttachment(noteId, file);
      toast.success('Attachment uploaded');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const download = async (att) => {
    try {
      const blob = await LessonNoteApi.downloadAttachment(noteId, att.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = att.fileName || 'attachment.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(err.message); }
  };

  const remove = async (id) => {
    try { await LessonNoteApi.removeAttachment(noteId, id); load(); toast.success('Attachment removed'); }
    catch (err) { toast.error(err.message); }
  };

  if (attachments === null) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading attachments…</div>;

  return (
    <div style={{ marginTop: 10 }}>
      {attachments.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>No attachments.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {attachments.map((a) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, wordBreak: 'break-all' }}>
              <Icons.IconFile size={13} style={{ flexShrink: 0 }} /> {a.fileName} <span style={{ color: 'var(--text-faint)' }}>({a.fileSizeFormatted})</span>
            </span>
            <span style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => download(a)} aria-label="Download" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', display: 'flex' }}>
                <Icons.IconDownload size={13} />
              </button>
              {canManage && (
                <button type="button" onClick={() => remove(a.id)} aria-label="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex' }}>
                  <Icons.IconTrash size={13} />
                </button>
              )}
            </span>
          </div>
        ))}
      </div>
      {canManage && (
        <label className="btn btn-ghost btn-sm" style={{ marginTop: 8, padding: '4px 0', cursor: 'pointer', display: 'inline-flex' }}>
          <Icons.IconUpload size={12} /> {uploading ? 'Uploading…' : 'Attach PDF'}
          <input ref={fileRef} type="file" accept="application/pdf" onChange={upload} style={{ display: 'none' }} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

export default function NotesQuestionsPage() {
  const { user, isAdmin, isInstructor, isStudent } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('notes');

  // Lesson notes
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [savingNote, setSavingNote] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState(null);

  const loadNotes = async () => {
    if (!user) return;
    setNotesLoading(true);
    try {
      let page;
      if (isAdmin) page = await LessonNoteApi.listAll();
      else if (isInstructor) page = await LessonNoteApi.listByInstructor(user.instructorProfileId);
      else page = await LessonNoteApi.listByStudent(user.studentProfileId);
      setNotes(page?.content || page || []);
    } catch (err) { toast.error(err.message); }
    finally { setNotesLoading(false); }
  };
  useEffect(() => { loadNotes(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const createNote = async (e) => {
    e.preventDefault();
    setSavingNote(true);
    try {
      await LessonNoteApi.create({
        bookingId: noteForm.bookingId ? Number(noteForm.bookingId) : null,
        studentId: Number(noteForm.studentId),
        lessonSummary: noteForm.lessonSummary,
        strengths: noteForm.strengths,
        weaknesses: noteForm.weaknesses,
        recommendations: noteForm.recommendations,
      });
      toast.success('Note saved');
      setShowNoteForm(false);
      setNoteForm(emptyNote);
      loadNotes();
    } catch (err) { toast.error(err.message); }
    finally { setSavingNote(false); }
  };

  // Lesson questions
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [responseTexts, setResponseTexts] = useState({});

  const loadQuestions = async () => {
    if (!user) return;
    setQuestionsLoading(true);
    try {
      let list;
      if (isStudent) list = await LessonQuestionApi.myQuestions();
      else if (isInstructor) list = await LessonQuestionApi.assigned();
      else list = await LessonQuestionApi.byStatus('PENDING');
      setQuestions(list?.content || list || []);
    } catch (err) { toast.error(err.message); }
    finally { setQuestionsLoading(false); }
  };
  useEffect(() => { loadQuestions(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  const submitQuestion = async (e) => {
    e.preventDefault();
    setSavingQuestion(true);
    try {
      await LessonQuestionApi.create({
        subject: questionForm.subject,
        questionBody: questionForm.questionBody,
        assignedInstructorId: questionForm.assignedInstructorId ? Number(questionForm.assignedInstructorId) : null,
      });
      toast.success('Question submitted');
      setShowQuestionForm(false);
      setQuestionForm(emptyQuestion);
      loadQuestions();
    } catch (err) { toast.error(err.message); }
    finally { setSavingQuestion(false); }
  };

  const respond = async (id) => {
    const text = responseTexts[id];
    if (!text) { toast.error('Enter a response first'); return; }
    try {
      await LessonQuestionApi.respond(id, text);
      toast.success('Response sent');
      loadQuestions();
    } catch (err) { toast.error(err.message); }
  };

  const setStatus = async (id, newStatus) => {
    try {
      await LessonQuestionApi.setStatus(id, newStatus);
      toast.success('Status updated');
      loadQuestions();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="fade-in">
      <h1 className="page-title">Notes &amp; questions</h1>
      <p className="page-subtitle" style={{ marginBottom: 20 }}>Lesson notes and student support questions.</p>

      <Tabs
        value={tab}
        onChange={setTab}
        options={[{ value: 'notes', label: 'Lesson notes' }, { value: 'questions', label: 'Questions' }]}
        className="fade-in"
      />
      <div style={{ height: 20 }} />

      {tab === 'notes' && (
        <div>
          {isInstructor && (
            <div style={{ marginBottom: 16 }}>
              <Button onClick={() => setShowNoteForm((s) => !s)}>
                <Icons.IconPlus size={14} /> {showNoteForm ? 'Cancel' : 'New note'}
              </Button>
            </div>
          )}

          {showNoteForm && (
            <Card className="fade-in" style={{ marginBottom: 18 }}>
              <form onSubmit={createNote}>
                <div className="form-grid respo-two-col" style={{ marginBottom: 10 }}>
                  <StudentPicker schoolId={user?.schoolId} required value={noteForm.studentId} onChange={(v) => setNoteForm((f) => ({ ...f, studentId: v }))} />
                  <Field label="Booking ID (optional)"><Input value={noteForm.bookingId} onChange={(e) => setNoteForm((f) => ({ ...f, bookingId: e.target.value }))} /></Field>
                </div>
                <Field label="Lesson summary" required hint="10–1000 characters" style={{ marginBottom: 14 }}>
                  <Textarea rows={2} required minLength={10} value={noteForm.lessonSummary} onChange={(e) => setNoteForm((f) => ({ ...f, lessonSummary: e.target.value }))} />
                </Field>
                <Field label="Strengths" required hint="10–1500 characters" style={{ marginBottom: 14 }}>
                  <Textarea rows={2} required minLength={10} value={noteForm.strengths} onChange={(e) => setNoteForm((f) => ({ ...f, strengths: e.target.value }))} />
                </Field>
                <Field label="Weaknesses" required hint="10–1500 characters" style={{ marginBottom: 14 }}>
                  <Textarea rows={2} required minLength={10} value={noteForm.weaknesses} onChange={(e) => setNoteForm((f) => ({ ...f, weaknesses: e.target.value }))} />
                </Field>
                <Field label="Recommendations" required hint="10–1500 characters" style={{ marginBottom: 14 }}>
                  <Textarea rows={2} required minLength={10} value={noteForm.recommendations} onChange={(e) => setNoteForm((f) => ({ ...f, recommendations: e.target.value }))} />
                </Field>
                <Button type="submit" loading={savingNote}>Save note</Button>
              </form>
            </Card>
          )}

          {notesLoading ? <SkeletonList count={2} /> : notes.length === 0 ? (
            <EmptyState icon={<Icons.IconNotes size={22} />} title="No lesson notes yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {notes.map((n, i) => (
                <Reveal key={n.id} delay={Math.min(i, 6) * 40}>
                  <Card tight hover>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{n.studentName} · {n.instructorName}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{fmtDateTime(n.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: 13.5, marginTop: 8 }}>{n.lessonSummary}</div>
                    <div className="respo-three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Strengths</div><div style={{ fontSize: 12.5, marginTop: 3 }}>{n.strengths}</div></div>
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Weaknesses</div><div style={{ fontSize: 12.5, marginTop: 3 }}>{n.weaknesses}</div></div>
                      <div><div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Recommendations</div><div style={{ fontSize: 12.5, marginTop: 3 }}>{n.recommendations}</div></div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 10, padding: '4px 0' }} onClick={() => setExpandedNoteId(expandedNoteId === n.id ? null : n.id)}>
                      <Icons.IconFile size={12} /> {expandedNoteId === n.id ? 'Hide attachments' : 'Attachments'}
                    </button>
                    {expandedNoteId === n.id && <NoteAttachments noteId={n.id} canManage={isAdmin || isInstructor} toast={toast} />}
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'questions' && (
        <div>
          {isStudent && (
            <div style={{ marginBottom: 16 }}>
              <Button onClick={() => setShowQuestionForm((s) => !s)}>
                <Icons.IconPlus size={14} /> {showQuestionForm ? 'Cancel' : 'Ask a question'}
              </Button>
            </div>
          )}

          {showQuestionForm && (
            <Card className="fade-in" style={{ marginBottom: 18 }}>
              <form onSubmit={submitQuestion}>
                <Field label="Subject" required style={{ marginBottom: 14 }}>
                  <Input required minLength={5} value={questionForm.subject} onChange={(e) => setQuestionForm((f) => ({ ...f, subject: e.target.value }))} />
                </Field>
                <Field label="Your question" required hint="10–3000 characters" style={{ marginBottom: 14 }}>
                  <Textarea rows={3} required minLength={10} value={questionForm.questionBody} onChange={(e) => setQuestionForm((f) => ({ ...f, questionBody: e.target.value }))} />
                </Field>
                <Field label="Instructor profile ID (optional)" style={{ marginBottom: 14 }}>
                  <Input value={questionForm.assignedInstructorId} onChange={(e) => setQuestionForm((f) => ({ ...f, assignedInstructorId: e.target.value }))} />
                </Field>
                <Button type="submit" loading={savingQuestion}>Submit question</Button>
              </form>
            </Card>
          )}

          {questionsLoading ? <SkeletonList count={2} /> : questions.length === 0 ? (
            <EmptyState icon={<Icons.IconInbox size={22} />} title="No questions yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {questions.map((q, i) => (
                <Reveal key={q.id} delay={Math.min(i, 6) * 40}>
                  <Card tight hover>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{q.subject}</div>
                      <Badge status={q.status}>{q.status}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 8px' }}>From {q.studentName} · {fmtDateTime(q.createdAt)}</div>
                    <div style={{ fontSize: 13.5 }}>{q.questionBody}</div>

                    {q.response && (
                      <div style={{ marginTop: 10, padding: 12, background: 'var(--accent-soft-bg)', borderRadius: 9 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-soft-text)', textTransform: 'uppercase', marginBottom: 4 }}>Response from {q.respondedByName}</div>
                        <div style={{ fontSize: 13 }}>{q.response}</div>
                      </div>
                    )}

                    {isInstructor && (
                      <div style={{ marginTop: 10 }}>
                        <Textarea rows={2} placeholder="Write a response…" value={responseTexts[q.id] || ''} onChange={(e) => setResponseTexts((r) => ({ ...r, [q.id]: e.target.value }))} style={{ marginBottom: 8 }} />
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <Button size="sm" onClick={() => respond(q.id)}>Send response</Button>
                          <Select size="sm" value={q.status} onChange={(e) => setStatus(q.id, e.target.value)}>
                            {QUESTION_STATUSES.map((st) => <option key={st} value={st}>{st.replace('_', ' ')}</option>)}
                          </Select>
                        </div>
                      </div>
                    )}
                  </Card>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { CourseApi, VideoLessonApi, ResourceApi, SchoolApi, InstructorApi } from '../api/endpoints';
import { Button, Card, Badge, Input, Textarea, Select, SkeletonList, EmptyState, Icons, Reveal, Modal } from '../components/ui';
import useIsMobile from '../hooks/useIsMobile';

const RESOURCE_TYPES = ['PDF', 'DOCUMENT', 'LINK', 'IMAGE', 'OTHER'];
const MAX_PDF_BYTES = 50 * 1024 * 1024;

// Same rules the backend enforces (PDF only, 50 MB max) - checked here first
// so the user gets an instant message instead of waiting on a failed upload.
function pdfError(file) {
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!isPdf) return 'Only PDF files can be uploaded.';
  if (file.size > MAX_PDF_BYTES) return 'That PDF is larger than 50 MB.';
  return null;
}

function fmtSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ProgressBar({ percent }) {
  return (
    <div style={{ height: 6, borderRadius: 100, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s ease' }} />
    </div>
  );
}

const iconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', flexShrink: 0, padding: 2 };

function ResourcesPanel({ lessonId, canManage, toast, onCountChange }) {
  const [resources, setResources] = useState(null);

  // Upload a PDF
  const [picked, setPicked] = useState(null); // { file, title }
  const [uploadPct, setUploadPct] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  // Add an external link instead
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ title: '', fileUrl: '', type: 'LINK' });
  const [busy, setBusy] = useState(false);

  // Per-item actions
  const [renaming, setRenaming] = useState(null); // { id, title }
  const [replacing, setReplacing] = useState(null); // { id, pct }
  const [deleteTarget, setDeleteTarget] = useState(null); // resource
  const [deleting, setDeleting] = useState(false);
  const replaceInputRef = useRef(null);
  const replaceTargetRef = useRef(null);

  const load = async () => {
    try {
      const list = await ResourceApi.listByLesson(lessonId) || [];
      setResources(list);
      onCountChange?.(lessonId, list.length);
    } catch (err) { toast.error(err.message); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lessonId]);

  const pickFile = (file) => {
    if (!file) return;
    const error = pdfError(file);
    if (error) { toast.error(error); return; }
    setPicked({ file, title: file.name.replace(/\.pdf$/i, '') });
  };

  const upload = async (e) => {
    e.preventDefault();
    setUploadPct(0);
    try {
      await ResourceApi.upload(lessonId, picked.title.trim(), picked.file, (evt) => {
        if (evt.total) setUploadPct(Math.round((evt.loaded / evt.total) * 100));
      });
      setPicked(null);
      toast.success('Material uploaded');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setUploadPct(null); }
  };

  const addLink = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ResourceApi.create({ lessonId, title: linkForm.title, fileUrl: linkForm.fileUrl, type: linkForm.type });
      setLinkForm({ title: '', fileUrl: '', type: 'LINK' });
      setShowLinkForm(false);
      load();
      toast.success('Link added');
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  // The tab is opened synchronously, inside the click, so popup blockers
  // allow it - the PDF is loaded into it once the authenticated fetch returns.
  const view = async (r) => {
    const win = window.open('', '_blank');
    if (win) win.document.write('<p style="font-family:system-ui,sans-serif;padding:24px;color:#555">Loading PDF…</p>');
    try {
      const blob = await ResourceApi.download(r.id, true);
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (win) win.location.href = url;
      else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      if (win) win.close();
      toast.error(err.message);
    }
  };

  const download = async (r) => {
    try {
      const blob = await ResourceApi.download(r.id, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = r.fileName || `${r.title}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (err) { toast.error(err.message); }
  };

  const saveRename = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ResourceApi.rename(renaming.id, renaming.title.trim());
      setRenaming(null);
      toast.success('Material renamed');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const startReplace = (r) => {
    replaceTargetRef.current = r.id;
    replaceInputRef.current?.click();
  };

  const replace = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const id = replaceTargetRef.current;
    if (!file || !id) return;
    const error = pdfError(file);
    if (error) { toast.error(error); return; }
    setReplacing({ id, pct: 0 });
    try {
      await ResourceApi.replaceFile(id, file, (evt) => {
        if (evt.total) setReplacing({ id, pct: Math.round((evt.loaded / evt.total) * 100) });
      });
      toast.success('File replaced — students get the new version');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setReplacing(null); }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await ResourceApi.remove(deleteTarget.id);
      setDeleteTarget(null);
      toast.success('Material deleted');
      load();
    } catch (err) { toast.error(err.message); }
    finally { setDeleting(false); }
  };

  if (resources === null) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Loading materials…</div>;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
      {resources.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>No materials attached.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {resources.map((r) => (
          <div key={r.id} style={{ fontSize: 12.5 }}>
            {renaming?.id === r.id ? (
              <form onSubmit={saveRename} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Input size="sm" required maxLength={200} autoFocus value={renaming.title} onChange={(e) => setRenaming((x) => ({ ...x, title: e.target.value }))} style={{ flex: '1 1 180px' }} />
                <Button size="sm" type="submit" loading={busy}>Save</Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setRenaming(null)}>Cancel</Button>
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                {r.uploaded ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, wordBreak: 'break-word' }}>
                    <Icons.IconFile size={13} style={{ flexShrink: 0 }} /> {r.title}
                    <span style={{ color: 'var(--text-faint)' }}>(PDF{r.fileSize ? ` · ${fmtSize(r.fileSize)}` : ''})</span>
                  </span>
                ) : (
                  <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, wordBreak: 'break-word' }}>
                    <Icons.IconFile size={13} style={{ flexShrink: 0 }} /> {r.title} <span style={{ color: 'var(--text-faint)' }}>({r.type} link ↗)</span>
                  </a>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
                  {r.uploaded && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => view(r)}><Icons.IconEye size={13} /> View</Button>
                      <Button size="sm" variant="ghost" onClick={() => download(r)}><Icons.IconDownload size={13} /> Download</Button>
                    </>
                  )}
                  {canManage && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setRenaming({ id: r.id, title: r.title })}>Rename</Button>
                      {r.uploaded && (
                        <Button size="sm" variant="ghost" loading={replacing?.id === r.id} onClick={() => startReplace(r)}>
                          <Icons.IconUpload size={13} /> Replace
                        </Button>
                      )}
                      <button type="button" onClick={() => setDeleteTarget(r)} aria-label={`Delete ${r.title}`} style={iconBtnStyle}>
                        <Icons.IconTrash size={13} />
                      </button>
                    </>
                  )}
                </span>
              </div>
            )}
            {replacing?.id === r.id && <div style={{ marginTop: 6 }}><ProgressBar percent={replacing.pct} /></div>}
          </div>
        ))}
      </div>

      {canManage && (
        <div style={{ marginTop: 12 }}>
          <input ref={replaceInputRef} type="file" accept="application/pdf" onChange={replace} style={{ display: 'none' }} />

          {picked ? (
            <form onSubmit={upload} style={{ display: 'grid', gap: 8, padding: 12, borderRadius: 10, background: 'var(--surface-muted)' }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
                <Icons.IconFile size={12} /> {picked.file.name} · {fmtSize(picked.file.size)}
              </div>
              <Input size="sm" required maxLength={200} placeholder="Title students will see" value={picked.title} onChange={(e) => setPicked((p) => ({ ...p, title: e.target.value }))} disabled={uploadPct !== null} />
              {uploadPct !== null && <ProgressBar percent={uploadPct} />}
              <div style={{ display: 'flex', gap: 6 }}>
                <Button size="sm" type="submit" loading={uploadPct !== null}>
                  {uploadPct !== null ? `Uploading… ${uploadPct}%` : 'Upload'}
                </Button>
                <Button size="sm" type="button" variant="ghost" disabled={uploadPct !== null} onClick={() => setPicked(null)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files?.[0]); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '16px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
                border: `1.5px dashed ${dragOver ? 'var(--accent)' : 'var(--border-strong)'}`,
                background: dragOver ? 'var(--accent-soft-bg)' : 'transparent',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              }}
            >
              <Icons.IconUpload size={18} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600 }}>Add material — drag a PDF here, or click to choose</span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>PDF only, up to 50 MB</span>
              <input type="file" accept="application/pdf" onChange={(e) => { pickFile(e.target.files?.[0]); e.target.value = ''; }} style={{ display: 'none' }} />
            </label>
          )}

          {showLinkForm ? (
            <form onSubmit={addLink} style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              <Input size="sm" required placeholder="Link title" value={linkForm.title} onChange={(e) => setLinkForm((f) => ({ ...f, title: e.target.value }))} />
              <Input size="sm" required type="url" placeholder="https://…" value={linkForm.fileUrl} onChange={(e) => setLinkForm((f) => ({ ...f, fileUrl: e.target.value }))} />
              <div style={{ display: 'flex', gap: 6 }}>
                <Select size="sm" value={linkForm.type} onChange={(e) => setLinkForm((f) => ({ ...f, type: e.target.value }))}>
                  {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
                <Button size="sm" type="submit" loading={busy}>Add link</Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setShowLinkForm(false)}>Cancel</Button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setShowLinkForm(true)} className="btn btn-ghost btn-sm" style={{ marginTop: 6, padding: '4px 0' }}>
              <Icons.IconPlus size={12} /> Add a link instead
            </button>
          )}
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete this material?"
        footer={(
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger-solid" loading={deleting} onClick={confirmDelete}>Delete</Button>
          </>
        )}
      >
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          &ldquo;{deleteTarget?.title}&rdquo; will be removed from this lesson{deleteTarget?.uploaded ? ' and its file deleted' : ''}. Students will no longer see it. This can&rsquo;t be undone.
        </p>
      </Modal>
    </div>
  );
}

export default function CoursesPage() {
  const { isAdmin, isInstructor } = useAuth();
  const toast = useToast();
  const canManage = isAdmin || isInstructor;
  const isMobile = useIsMobile();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', instructorId: '', schoolId: '' });
  const [creating, setCreating] = useState(false);
  const [schools, setSchools] = useState([]);
  const [instructorOptions, setInstructorOptions] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [lessonForm, setLessonForm] = useState({ title: '', description: '', videoUrl: '', lessonOrder: 1, durationSeconds: '' });
  const [addingLesson, setAddingLesson] = useState(false);
  const [expandedLessonId, setExpandedLessonId] = useState(null);
  const [materialCounts, setMaterialCounts] = useState({}); // lessonId -> number of materials

  const setMaterialCount = (lessonId, count) => setMaterialCounts((c) => ({ ...c, [lessonId]: count }));

  // The lesson list doesn't include a materials count, so fetch each lesson's
  // list once to show "Materials (n)" on the row without opening it.
  const loadMaterialCounts = async (list) => {
    const results = await Promise.allSettled(list.map((l) => ResourceApi.listByLesson(l.id)));
    const counts = {};
    results.forEach((r, i) => { if (r.status === 'fulfilled') counts[list[i].id] = (r.value || []).length; });
    setMaterialCounts((c) => ({ ...c, ...counts }));
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      // Admins oversee their school's drafts too, not just published courses.
      let list = await CourseApi.list(isAdmin ? { includeDrafts: true } : undefined);
      if (isInstructor) {
        try {
          const mine = await CourseApi.mine();
          const map = new Map();
          (list || []).forEach((c) => map.set(c.id, c));
          (mine || []).forEach((c) => map.set(c.id, c));
          list = Array.from(map.values());
        } catch { /* fall back to published-only list */ }
      }
      setCourses(list || []);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCourses(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (isAdmin && showForm) SchoolApi.list().then(setSchools).catch(() => {});
  }, [isAdmin, showForm]);

  useEffect(() => {
    if (isAdmin && form.schoolId) InstructorApi.listBySchool(form.schoolId).then(setInstructorOptions).catch(() => setInstructorOptions([]));
  }, [isAdmin, form.schoolId]);

  const createCourse = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      await CourseApi.create({
        title: form.title,
        description: form.description || null,
        instructorId: isAdmin && form.instructorId ? Number(form.instructorId) : undefined,
      });
      toast.success('Course created');
      setShowForm(false);
      setForm({ title: '', description: '', instructorId: '', schoolId: '' });
      loadCourses();
    } catch (err) { toast.error(err.message); }
    finally { setCreating(false); }
  };

  const selectCourse = async (id) => {
    setSelectedId(id);
    setExpandedLessonId(null);
    setLessonsLoading(true);
    let list = [];
    try {
      list = await VideoLessonApi.listByCourse(id) || [];
      setLessons(list);
    } catch (err) { toast.error(err.message); }
    finally { setLessonsLoading(false); }
    if (list.length > 0) loadMaterialCounts(list);
  };

  const courseAction = async (courseId, action) => {
    try {
      await CourseApi[action](courseId);
      toast.success('Course updated');
      loadCourses();
    } catch (err) { toast.error(err.message); }
  };

  const addLesson = async (e) => {
    e.preventDefault();
    setAddingLesson(true);
    try {
      const created = await VideoLessonApi.create({
        courseId: selectedId,
        title: lessonForm.title,
        description: lessonForm.description || null,
        // Optional: a lesson can be video, PDF materials, or both.
        videoUrl: lessonForm.videoUrl.trim() || null,
        lessonOrder: Number(lessonForm.lessonOrder),
        durationSeconds: lessonForm.durationSeconds ? Number(lessonForm.durationSeconds) : null,
      });
      toast.success('Lesson added — you can attach PDF materials to it now');
      setShowLessonForm(false);
      setLessonForm({ title: '', description: '', videoUrl: '', lessonOrder: lessons.length + 2, durationSeconds: '' });
      await selectCourse(selectedId);
      // Open the new lesson's materials straight away so the next step is obvious.
      if (created?.id) setExpandedLessonId(created.id);
    } catch (err) { toast.error(err.message); }
    finally { setAddingLesson(false); }
  };

  const toggleLessonPublish = async (lesson) => {
    try {
      await VideoLessonApi[lesson.published ? 'unpublish' : 'publish'](lesson.id);
      toast.success('Lesson updated');
      selectCourse(selectedId);
    } catch (err) { toast.error(err.message); }
  };

  const selectedCourse = courses.find((c) => c.id === selectedId) || null;

  const showList = !isMobile || !selectedId;
  const showDetail = !isMobile || !!selectedId;

  return (
    <div className="fade-in respo-content-split" style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>
      {showList && (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Courses</h1>
          {canManage && (
            <Button size="sm" onClick={() => setShowForm((s) => !s)}>
              <Icons.IconPlus size={13} /> New
            </Button>
          )}
        </div>

        {showForm && (
          <Card tight className="fade-in" style={{ marginBottom: 16 }}>
            <form onSubmit={createCourse} style={{ display: 'grid', gap: 8 }}>
              <Input required placeholder="Course title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              <Textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              {isAdmin && (
                <>
                  <Select value={form.schoolId} onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value, instructorId: '' }))}>
                    <option value="">Select a school…</option>
                    {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                  <Select value={form.instructorId} onChange={(e) => setForm((f) => ({ ...f, instructorId: e.target.value }))} disabled={!form.schoolId}>
                    <option value="">Assign to instructor…</option>
                    {instructorOptions.map((i) => <option key={i.id} value={i.id}>{i.firstName} {i.lastName}</option>)}
                  </Select>
                </>
              )}
              <Button type="submit" block loading={creating}>Create course</Button>
            </form>
          </Card>
        )}

        {loading ? (
          <SkeletonList count={3} small />
        ) : courses.length === 0 ? (
          <EmptyState title="No courses yet" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courses.map((c, i) => (
              <Reveal key={c.id} delay={Math.min(i, 8) * 40}>
                <button
                  onClick={() => selectCourse(c.id)}
                  style={{
                    textAlign: 'left', width: '100%', cursor: 'pointer', padding: '14px 16px', borderRadius: 12,
                    border: `1px solid ${c.id === selectedId ? 'var(--accent)' : 'var(--border)'}`,
                    background: c.id === selectedId ? 'var(--accent-soft-bg)' : 'var(--surface)',
                    transition: 'border-color 0.2s ease, background 0.2s ease, transform 0.2s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <div style={{ fontSize: 14.5, fontWeight: 700 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{c.status}</div>
                </button>
              </Reveal>
            ))}
          </div>
        )}
      </div>
      )}

      {showDetail && (
      <div>
        {isMobile && selectedCourse && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 14, padding: '4px 0' }} onClick={() => setSelectedId(null)}>
            <Icons.IconChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /> Back to courses
          </button>
        )}
        {!selectedCourse ? (
          <EmptyState icon={<Icons.IconBook size={22} />} title="Select a course">
            Pick a course on the left to see its lessons and materials.
          </EmptyState>
        ) : (
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{selectedCourse.title}</div>
                <div style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 6, maxWidth: '60ch' }}>{selectedCourse.description}</div>
              </div>
              <Badge status={selectedCourse.status}>{selectedCourse.status}</Badge>
            </div>

            {canManage && (
              <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                <Button size="sm" variant="outline" onClick={() => courseAction(selectedCourse.id, 'publish')}>Publish</Button>
                <Button size="sm" variant="outline" onClick={() => courseAction(selectedCourse.id, 'unpublish')}>Unpublish</Button>
                <Button size="sm" variant="outline" onClick={() => courseAction(selectedCourse.id, 'archive')}>Archive</Button>
              </div>
            )}

            <div className="divider" />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: canManage && lessons.length > 0 ? 4 : 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Lessons</div>
              {canManage && (
                <Button size="sm" variant="soft" onClick={() => setShowLessonForm((s) => !s)}>
                  <Icons.IconPlus size={12} /> Add lesson
                </Button>
              )}
            </div>
            {canManage && lessons.length > 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                Attach PDF materials to any lesson with its <strong>Materials</strong> button.
              </div>
            )}

            {showLessonForm && (
              <Card tight className="fade-in respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, background: 'var(--surface-muted)' }}>
                <form onSubmit={addLesson} style={{ display: 'contents' }}>
                  <Input size="sm" required placeholder="Lesson title" value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} />
                  <Input size="sm" type="url" placeholder="Video URL (optional)" title="Leave empty for a PDF-only lesson" value={lessonForm.videoUrl} onChange={(e) => setLessonForm((f) => ({ ...f, videoUrl: e.target.value }))} />
                  <Input size="sm" type="number" min={1} required placeholder="Order" value={lessonForm.lessonOrder} onChange={(e) => setLessonForm((f) => ({ ...f, lessonOrder: e.target.value }))} />
                  <Input size="sm" type="number" min={0} placeholder="Duration (sec)" value={lessonForm.durationSeconds} onChange={(e) => setLessonForm((f) => ({ ...f, durationSeconds: e.target.value }))} />
                  <Textarea rows={2} placeholder="Description" className="span-2" value={lessonForm.description} onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))} />
                  <div className="field-hint span-2">No video? Leave the video URL empty. The lesson's Materials panel opens right after, so you can attach the PDF.</div>
                  <Button type="submit" className="span-2" loading={addingLesson}>Add lesson</Button>
                </form>
              </Card>
            )}

            {lessonsLoading ? (
              <SkeletonList count={2} small />
            ) : lessons.length === 0 ? (
              <EmptyState icon={<Icons.IconBook size={22} />} title="No lessons yet">
                {canManage ? (
                  <>
                    <div>Add a lesson first — PDF materials are attached to lessons.</div>
                    {!showLessonForm && (
                      <Button size="sm" style={{ marginTop: 12 }} onClick={() => setShowLessonForm(true)}>
                        <Icons.IconPlus size={12} /> Add lesson
                      </Button>
                    )}
                  </>
                ) : 'Lessons will appear here once they’re published.'}
              </EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lessons.map((v, i) => (
                  <Reveal key={v.id} delay={Math.min(i, 8) * 40} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.lessonOrder}. {v.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {v.published ? 'Published' : 'Draft'}{v.videoUrl ? '' : ' · Materials only'}{v.durationSeconds ? ` · ${Math.round(v.durationSeconds / 60)} min` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {/* Students don't need a button for a lesson with nothing attached. */}
                        {(canManage || materialCounts[v.id] !== 0) && (
                          <Button size="sm" variant="ghost" onClick={() => setExpandedLessonId(expandedLessonId === v.id ? null : v.id)}>
                            <Icons.IconFile size={13} />
                            {expandedLessonId === v.id
                              ? 'Hide materials'
                              : `Materials${materialCounts[v.id] != null ? ` (${materialCounts[v.id]})` : ''}`}
                          </Button>
                        )}
                        {canManage && (
                          <Button size="sm" variant="outline" onClick={() => toggleLessonPublish(v)}>
                            {v.published ? 'Unpublish' : 'Publish'}
                          </Button>
                        )}
                      </div>
                    </div>
                    {v.videoUrl && expandedLessonId !== v.id && (
                      <a href={v.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 6, display: 'inline-block' }}>Watch video ↗</a>
                    )}
                    {expandedLessonId === v.id && (
                      <>
                        {v.videoUrl && <a href={v.videoUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, marginTop: 6, display: 'inline-block' }}>Watch video ↗</a>}
                        <ResourcesPanel lessonId={v.id} canManage={canManage} toast={toast} onCountChange={setMaterialCount} />
                      </>
                    )}
                  </Reveal>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
      )}
    </div>
  );
}

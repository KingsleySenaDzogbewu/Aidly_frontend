import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { CourseApi, VideoLessonApi, ResourceApi, SchoolApi, InstructorApi } from '../api/endpoints';
import { Button, Card, Badge, Input, Textarea, Select, SkeletonList, EmptyState, Icons, Reveal } from '../components/ui';
import useIsMobile from '../hooks/useIsMobile';

const RESOURCE_TYPES = ['PDF', 'DOCUMENT', 'LINK', 'IMAGE', 'OTHER'];

function ResourcesPanel({ lessonId, canManage, toast }) {
  const [resources, setResources] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', fileUrl: '', type: 'PDF' });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try { setResources(await ResourceApi.listByLesson(lessonId) || []); }
    catch (err) { toast.error(err.message); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [lessonId]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await ResourceApi.create({ lessonId, title: form.title, fileUrl: form.fileUrl, type: form.type });
      setForm({ title: '', fileUrl: '', type: 'PDF' });
      setShowForm(false);
      load();
      toast.success('Resource added');
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    try { await ResourceApi.remove(id); load(); toast.success('Resource removed'); }
    catch (err) { toast.error(err.message); }
  };

  if (resources === null) return <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>Loading resources…</div>;

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--border)' }}>
      {resources.length === 0 && !showForm && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No resources attached.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {resources.map((r) => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, gap: 8, flexWrap: 'wrap' }}>
            <a href={r.fileUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, wordBreak: 'break-word' }}>
              <Icons.IconFile size={13} style={{ flexShrink: 0 }} /> {r.title} <span style={{ color: 'var(--text-faint)' }}>({r.type})</span>
            </a>
            {canManage && (
              <button type="button" onClick={() => remove(r.id)} aria-label="Delete resource" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', display: 'flex', flexShrink: 0 }}>
                <Icons.IconTrash size={13} />
              </button>
            )}
          </div>
        ))}
      </div>
      {canManage && (
        showForm ? (
          <form onSubmit={add} style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <Input size="sm" required placeholder="Resource title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            <Input size="sm" required placeholder="File URL" value={form.fileUrl} onChange={(e) => setForm((f) => ({ ...f, fileUrl: e.target.value }))} />
            <div style={{ display: 'flex', gap: 6 }}>
              <Select size="sm" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                {RESOURCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
              <Button size="sm" type="submit" loading={busy}>Add</Button>
              <Button size="sm" type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setShowForm(true)} className="btn btn-ghost btn-sm" style={{ marginTop: 6, padding: '4px 0' }}>
            <Icons.IconPlus size={12} /> Add resource
          </button>
        )
      )}
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

  const loadCourses = async () => {
    setLoading(true);
    try {
      let list = await CourseApi.list();
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
    try { setLessons(await VideoLessonApi.listByCourse(id) || []); }
    catch (err) { toast.error(err.message); }
    finally { setLessonsLoading(false); }
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
      await VideoLessonApi.create({
        courseId: selectedId,
        title: lessonForm.title,
        description: lessonForm.description || null,
        videoUrl: lessonForm.videoUrl,
        lessonOrder: Number(lessonForm.lessonOrder),
        durationSeconds: lessonForm.durationSeconds ? Number(lessonForm.durationSeconds) : null,
      });
      toast.success('Lesson added');
      setShowLessonForm(false);
      setLessonForm({ title: '', description: '', videoUrl: '', lessonOrder: lessons.length + 2, durationSeconds: '' });
      selectCourse(selectedId);
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
            Pick a course on the left to see its lessons and resources.
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

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Video lessons</div>
              {canManage && (
                <Button size="sm" variant="soft" onClick={() => setShowLessonForm((s) => !s)}>
                  <Icons.IconPlus size={12} /> Add lesson
                </Button>
              )}
            </div>

            {showLessonForm && (
              <Card tight className="fade-in respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, background: 'var(--surface-muted)' }}>
                <form onSubmit={addLesson} style={{ display: 'contents' }}>
                  <Input size="sm" required placeholder="Lesson title" value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} />
                  <Input size="sm" required placeholder="Video URL" value={lessonForm.videoUrl} onChange={(e) => setLessonForm((f) => ({ ...f, videoUrl: e.target.value }))} />
                  <Input size="sm" type="number" min={1} required placeholder="Order" value={lessonForm.lessonOrder} onChange={(e) => setLessonForm((f) => ({ ...f, lessonOrder: e.target.value }))} />
                  <Input size="sm" type="number" min={0} placeholder="Duration (sec)" value={lessonForm.durationSeconds} onChange={(e) => setLessonForm((f) => ({ ...f, durationSeconds: e.target.value }))} />
                  <Textarea rows={2} placeholder="Description" className="span-2" value={lessonForm.description} onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))} />
                  <Button type="submit" className="span-2" loading={addingLesson}>Add lesson</Button>
                </form>
              </Card>
            )}

            {lessonsLoading ? (
              <SkeletonList count={2} small />
            ) : lessons.length === 0 ? (
              <EmptyState title="No video lessons yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {lessons.map((v, i) => (
                  <Reveal key={v.id} delay={Math.min(i, 8) * 40} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v.lessonOrder}. {v.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {v.published ? 'Published' : 'Draft'}{v.durationSeconds ? ` · ${Math.round(v.durationSeconds / 60)} min` : ''}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <Button size="sm" variant="ghost" onClick={() => setExpandedLessonId(expandedLessonId === v.id ? null : v.id)}>
                          {expandedLessonId === v.id ? 'Hide' : 'Resources'}
                        </Button>
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
                        <ResourcesPanel lessonId={v.id} canManage={canManage} toast={toast} />
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

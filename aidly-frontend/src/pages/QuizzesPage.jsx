import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/ui';
import { CourseApi, QuizApi } from '../api/endpoints';
import { Button, Card, Badge, Field, Input, Textarea, Select, SkeletonList, EmptyState, Icons } from '../components/ui';
import useIsMobile from '../hooks/useIsMobile';
import './quizzes.css';

const QUESTION_TYPES = ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'];

const CONFETTI_DOTS = [
  { angle: 0, color: 'var(--hue-green)' },
  { angle: 45, color: 'var(--hue-amber)' },
  { angle: 90, color: 'var(--hue-violet)' },
  { angle: 135, color: 'var(--hue-teal)' },
  { angle: 180, color: 'var(--hue-green)' },
  { angle: 225, color: 'var(--hue-rose)' },
  { angle: 270, color: 'var(--hue-violet)' },
  { angle: 315, color: 'var(--hue-amber)' },
].map((d, i) => ({ ...d, delay: i * 45 }));

const emptyQuiz = { title: '', description: '', passingScore: 70, timeLimitMinutes: '', maxAttempts: 3 };
const emptyQuestion = { questionText: '', questionType: 'MULTIPLE_CHOICE', options: '', correctAnswer: '', points: 1, questionOrder: 1 };

export default function QuizzesPage() {
  const { user, isAdmin, isInstructor, isStudent } = useAuth();
  const toast = useToast();
  const canManage = isAdmin || isInstructor;
  const isMobile = useIsMobile();

  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [showQuizForm, setShowQuizForm] = useState(false);
  const [quizForm, setQuizForm] = useState(emptyQuiz);
  const [creatingQuiz, setCreatingQuiz] = useState(false);

  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizLoading, setQuizLoading] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionForm, setQuestionForm] = useState(emptyQuestion);
  const [addingQuestion, setAddingQuestion] = useState(false);

  const [answers, setAnswers] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [scoreDisplay, setScoreDisplay] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let list = await CourseApi.list();
        if (isInstructor) {
          try {
            const mine = await CourseApi.mine();
            const map = new Map();
            (list || []).forEach((c) => map.set(c.id, c));
            (mine || []).forEach((c) => map.set(c.id, c));
            list = Array.from(map.values());
          } catch { /* ignore */ }
        }
        setCourses(list || []);
      } catch (err) { toast.error(err.message); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCourse = async (id) => {
    setSelectedCourseId(id);
    setSelectedQuiz(null);
    setResult(null);
    setQuizzesLoading(true);
    try { setQuizzes(await QuizApi.listByCourse(id) || []); }
    catch (err) { toast.error(err.message); }
    finally { setQuizzesLoading(false); }
  };

  const createQuiz = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) { toast.error('Select a course first'); return; }
    setCreatingQuiz(true);
    try {
      const created = await QuizApi.create({
        courseId: selectedCourseId,
        title: quizForm.title,
        description: quizForm.description || null,
        passingScore: Number(quizForm.passingScore),
        timeLimitMinutes: quizForm.timeLimitMinutes ? Number(quizForm.timeLimitMinutes) : null,
        maxAttempts: Number(quizForm.maxAttempts),
      });
      toast.success('Quiz created — add some questions next');
      setShowQuizForm(false);
      setQuizForm(emptyQuiz);
      // The published-quizzes list endpoint won't show this draft yet — keep it visible locally.
      setQuizzes((qs) => [created, ...qs]);
      openQuiz(created.id);
    } catch (err) { toast.error(err.message); }
    finally { setCreatingQuiz(false); }
  };

  const openQuiz = async (quizId) => {
    setQuizLoading(true);
    setResult(null);
    setAnswers({});
    setStepIndex(0);
    setScoreDisplay(0);
    try {
      const quiz = await QuizApi.get(quizId, isStudent);
      setSelectedQuiz(quiz);
    } catch (err) { toast.error(err.message); }
    finally { setQuizLoading(false); }
  };

  const addQuestion = async (e) => {
    e.preventDefault();
    setAddingQuestion(true);
    try {
      await QuizApi.addQuestion(selectedQuiz.id, {
        questionText: questionForm.questionText,
        questionType: questionForm.questionType,
        options: questionForm.options || null,
        correctAnswer: questionForm.correctAnswer,
        points: Number(questionForm.points),
        questionOrder: Number(questionForm.questionOrder),
      });
      toast.success('Question added');
      setShowQuestionForm(false);
      setQuestionForm({ ...emptyQuestion, questionOrder: (selectedQuiz.questions?.length || 0) + 2 });
      openQuiz(selectedQuiz.id);
    } catch (err) { toast.error(err.message); }
    finally { setAddingQuestion(false); }
  };

  const publishQuiz = async () => {
    try {
      await QuizApi.publish(selectedQuiz.id);
      toast.success('Quiz published');
      selectCourse(selectedCourseId);
      openQuiz(selectedQuiz.id);
    } catch (err) { toast.error(err.message); }
  };

  const animateScore = (target) => {
    const start = Date.now();
    const duration = 700;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      setScoreDisplay(Math.round(target * t));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const submitQuiz = async () => {
    if (!user?.studentProfileId) { toast.error('No student profile on this account'); return; }
    setSubmitting(true);
    try {
      const res = await QuizApi.submit(selectedQuiz.id, user.studentProfileId, answers);
      setResult(res);
      // Keep the attempt summary in step without refetching.
      setSelectedQuiz((q) => {
        const a = q?.myAttempts;
        if (!a || !res?.attemptNumber) return q;
        const total = a.attemptsUsed + a.attemptsRemaining;
        return {
          ...q,
          myAttempts: {
            attemptsUsed: res.attemptNumber,
            attemptsRemaining: Math.max(0, total - res.attemptNumber),
            bestScore: Math.max(a.bestScore ?? 0, res.score ?? 0),
            passed: a.passed || !!res.passed,
          },
        };
      });
      toast.success('Quiz submitted');
      animateScore(res.score || 0);
    } catch (err) { toast.error(err.message); }
    finally { setSubmitting(false); }
  };

  const questions = selectedQuiz?.questions || [];
  // Students get their own attempt summary with the quiz.
  const attempts = isStudent ? selectedQuiz?.myAttempts : null;
  const outOfAttempts = attempts?.attemptsRemaining === 0;
  const isTaking = isStudent && selectedQuiz?.published && !result && questions.length > 0 && !outOfAttempts;
  const curIdx = Math.min(stepIndex, Math.max(0, questions.length - 1));
  const currentQuestion = questions[curIdx];
  const currentOptions = useMemo(() => {
    if (!currentQuestion?.options) return [];
    return currentQuestion.options.split('|').map((s) => s.trim()).filter(Boolean);
  }, [currentQuestion]);

  return (
    <div className="fade-in">
      <h1 className="page-title">Quizzes</h1>
      <p className="page-subtitle" style={{ marginBottom: 22 }}>Pick a course to view or manage its quizzes.</p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
        {courses.map((c) => (
          <button
            key={c.id}
            onClick={() => selectCourse(c.id)}
            style={{
              padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${c.id === selectedCourseId ? 'var(--accent)' : 'var(--border)'}`,
              background: c.id === selectedCourseId ? 'var(--accent)' : 'var(--surface)',
              color: c.id === selectedCourseId ? 'var(--text-on-accent)' : 'var(--text)',
            }}
          >
            {c.title}
          </button>
        ))}
        {courses.length === 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No courses available yet.</span>}
      </div>

      {selectedCourseId && (
        <div className="respo-content-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
          {(!isMobile || !selectedQuiz) && (
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Quizzes in this course</div>
              {canManage && (
                <Button size="sm" variant="soft" onClick={() => setShowQuizForm((s) => !s)}>
                  <Icons.IconPlus size={12} /> New quiz
                </Button>
              )}
            </div>

            {showQuizForm && (
              <Card tight style={{ background: 'var(--surface-muted)', marginBottom: 14 }}>
                <form onSubmit={createQuiz} style={{ display: 'grid', gap: 8 }}>
                  <Input size="sm" required placeholder="Quiz title" value={quizForm.title} onChange={(e) => setQuizForm((f) => ({ ...f, title: e.target.value }))} />
                  <Textarea rows={2} placeholder="Description" value={quizForm.description} onChange={(e) => setQuizForm((f) => ({ ...f, description: e.target.value }))} />
                  <div className="respo-three-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <Field label="Pass %"><Input size="sm" type="number" min={0} max={100} required value={quizForm.passingScore} onChange={(e) => setQuizForm((f) => ({ ...f, passingScore: e.target.value }))} /></Field>
                    <Field label="Time (min)"><Input size="sm" type="number" min={1} value={quizForm.timeLimitMinutes} onChange={(e) => setQuizForm((f) => ({ ...f, timeLimitMinutes: e.target.value }))} /></Field>
                    <Field label="Max attempts"><Input size="sm" type="number" min={1} required value={quizForm.maxAttempts} onChange={(e) => setQuizForm((f) => ({ ...f, maxAttempts: e.target.value }))} /></Field>
                  </div>
                  <Button type="submit" loading={creatingQuiz}>Create quiz</Button>
                </form>
              </Card>
            )}

            {quizzesLoading ? (
              <SkeletonList count={2} small />
            ) : quizzes.length === 0 ? (
              <EmptyState title="No quizzes for this course yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {quizzes.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => openQuiz(q.id)}
                    style={{
                      textAlign: 'left', width: '100%', cursor: 'pointer', padding: '12px 14px', borderRadius: 10,
                      border: `1px solid ${selectedQuiz?.id === q.id ? 'var(--accent)' : 'var(--border)'}`,
                      background: selectedQuiz?.id === q.id ? 'var(--accent-soft-bg)' : 'var(--surface)',
                    }}
                  >
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{q.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {q.published ? 'Published' : 'Draft'} · Pass {q.passingScore}% · {q.maxAttempts} attempts
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>
          )}

          {(!isMobile || selectedQuiz) && (
          <div>
            {isMobile && selectedQuiz && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ marginBottom: 14, padding: '4px 0' }} onClick={() => setSelectedQuiz(null)}>
                <Icons.IconChevronRight size={13} style={{ transform: 'rotate(180deg)' }} /> Back to quizzes
              </button>
            )}
            {quizLoading ? (
              <SkeletonList count={3} small />
            ) : selectedQuiz && (
              <Card>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{selectedQuiz.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>{selectedQuiz.description}</div>
                  </div>
                  <Badge>{selectedQuiz.published ? 'Published' : 'Draft'}</Badge>
                </div>

                {attempts && (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 10 }}>
                    Attempts: {attempts.attemptsUsed} of {attempts.attemptsUsed + attempts.attemptsRemaining} used
                    {attempts.bestScore != null && <> · Best {attempts.bestScore}%</>}
                    {attempts.passed && <> · <strong style={{ color: 'var(--success)' }}>Passed</strong></>}
                  </div>
                )}
                {outOfAttempts && !result && (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--surface-muted)', fontSize: 13 }}>
                    You’ve used all your attempts for this quiz.
                  </div>
                )}

                {canManage && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                    {!selectedQuiz.published && <Button size="sm" variant="outline" onClick={publishQuiz}>Publish quiz</Button>}
                    <Button size="sm" variant="soft" onClick={() => setShowQuestionForm((s) => !s)}>
                      <Icons.IconPlus size={12} /> Add question
                    </Button>
                  </div>
                )}

                {showQuestionForm && (
                  <Card tight style={{ background: 'var(--surface-muted)', marginTop: 14 }}>
                    <form onSubmit={addQuestion} style={{ display: 'grid', gap: 8 }}>
                      <Textarea rows={2} required placeholder="Question text" value={questionForm.questionText} onChange={(e) => setQuestionForm((f) => ({ ...f, questionText: e.target.value }))} />
                      <div className="respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <Select size="sm" value={questionForm.questionType} onChange={(e) => setQuestionForm((f) => ({ ...f, questionType: e.target.value }))}>
                          {QUESTION_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                        </Select>
                        <Input size="sm" placeholder="Options, e.g. A|B|C" value={questionForm.options} onChange={(e) => setQuestionForm((f) => ({ ...f, options: e.target.value }))} disabled={questionForm.questionType === 'SHORT_ANSWER'} />
                      </div>
                      <Input size="sm" required placeholder="Correct answer" value={questionForm.correctAnswer} onChange={(e) => setQuestionForm((f) => ({ ...f, correctAnswer: e.target.value }))} />
                      <div className="respo-two-col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <Input size="sm" type="number" min={1} required placeholder="Points" value={questionForm.points} onChange={(e) => setQuestionForm((f) => ({ ...f, points: e.target.value }))} />
                        <Input size="sm" type="number" min={1} required placeholder="Order" value={questionForm.questionOrder} onChange={(e) => setQuestionForm((f) => ({ ...f, questionOrder: e.target.value }))} />
                      </div>
                      <Button type="submit" loading={addingQuestion}>Add question</Button>
                    </form>
                  </Card>
                )}

                <div className="divider" />

                {isTaking ? (
                  <div style={{ background: 'var(--surface-muted)', borderRadius: 12, padding: 22 }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                      {questions.map((_, i) => (
                        <div
                          key={i}
                          className="quiz-step-dot"
                          style={{
                            background: i <= curIdx ? 'var(--accent)' : 'var(--border)',
                            opacity: i === curIdx ? 1 : i < curIdx ? 0.6 : 1,
                            transform: i === curIdx ? 'scaleY(1.6)' : 'scaleY(1)',
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                      Question {curIdx + 1} of {questions.length}
                    </div>
                    <div key={currentQuestion.id} style={{ fontSize: 15.5, fontWeight: 600, marginBottom: 16, animation: 'aidly-slide-in 0.3s cubic-bezier(0.22, 1, 0.36, 1) both' }}>{currentQuestion.questionText}</div>

                    {currentOptions.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                        {currentOptions.map((opt) => {
                          const checked = (answers[currentQuestion.id] || '') === opt;
                          return (
                            <label
                              key={opt}
                              className={`checkbox-row quiz-option ${checked ? 'quiz-option-selected' : ''}`}
                            >
                              <input
                                type="radio"
                                name={`q-${currentQuestion.id}`}
                                checked={checked}
                                onChange={() => setAnswers((a) => ({ ...a, [currentQuestion.id]: opt }))}
                              />
                              {opt}
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <Input
                        placeholder="Your answer"
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => setAnswers((a) => ({ ...a, [currentQuestion.id]: e.target.value }))}
                        style={{ marginBottom: 18 }}
                      />
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                      <Button variant="outline" disabled={curIdx === 0} onClick={() => setStepIndex((i) => Math.max(0, i - 1))}>Back</Button>
                      {curIdx >= questions.length - 1 ? (
                        <Button loading={submitting} onClick={submitQuiz}>Submit quiz</Button>
                      ) : (
                        <Button onClick={() => setStepIndex((i) => Math.min(questions.length - 1, i + 1))}>Next</Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {questions.length === 0 ? (
                      <EmptyState title="No questions yet" />
                    ) : questions.map((qq) => (
                      <div key={qq.id} style={{ padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 10 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 600 }}>{qq.questionOrder}. {qq.questionText}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                          {qq.questionType.replace('_', ' ')} · {qq.points} pts
                          {qq.correctAnswer && <> · Answer: <strong style={{ color: 'var(--text)' }}>{qq.correctAnswer}</strong></>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result && (
                  <div
                    className={`quiz-result ${result.passed ? 'quiz-result-pass' : ''}`}
                    style={{
                      marginTop: 14, padding: 20, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 18,
                      background: result.passed ? 'var(--success-bg)' : 'var(--danger-bg)',
                    }}
                  >
                    <div
                      className="quiz-result-ring"
                      style={{ '--ring-color': result.passed ? 'var(--success)' : 'var(--danger)', '--ring-pct': `${scoreDisplay}%` }}
                    >
                      <div className="quiz-result-ring-inner" style={{ color: result.passed ? 'var(--success)' : 'var(--danger)' }}>
                        {scoreDisplay}%
                      </div>
                      {result.passed && CONFETTI_DOTS.map((d, i) => (
                        <span
                          key={i}
                          className="quiz-confetti-dot"
                          style={{ '--angle': `${d.angle}deg`, '--delay': `${d.delay}ms`, background: d.color }}
                        />
                      ))}
                      {result.passed && (
                        <span className="quiz-result-badge" aria-hidden="true">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="m5 13 4 4 10-10" stroke="var(--success-bg)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: result.passed ? 'var(--success)' : 'var(--danger)' }}>
                        {result.passed ? 'Passed' : 'Not passed'}
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: 2 }}>
                        Final score: {result.score}% · Attempt #{result.attemptNumber}
                      </div>
                      {/* Reopening reloads the quiz, which brings the updated attempt count. */}
                      {attempts && result.attemptNumber < attempts.attemptsUsed + attempts.attemptsRemaining && (
                        <Button size="sm" variant="outline" style={{ marginTop: 10 }} onClick={() => openQuiz(selectedQuiz.id)}>
                          Try again
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            )}
          </div>
          )}
        </div>
      )}
    </div>
  );
}

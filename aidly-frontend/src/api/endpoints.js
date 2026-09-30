import { http } from './client';

// ---------------------------------------------------------------------
// Every function here mirrors one endpoint from the backend's
// Frontend API Guide. Responses are already unwrapped to `data` by the
// axios interceptor in client.js (or throw ApiError on failure).
// ---------------------------------------------------------------------

export const AuthApi = {
  login: (email, password) => http.post('/auth/login', { email, password }, { noAuth: true }),
  me: () => http.get('/auth/me'),
  register: (payload) => http.post('/auth/register', payload),
  adminRegister: (payload) => http.post('/auth/admin/register', payload),
  refresh: (refreshToken) => http.post('/auth/refresh-token', { refreshToken }, { noAuth: true }),
  logout: (refreshToken) => http.post('/auth/logout', { refreshToken }),
  // One-time account verification at a new account's first login. Public:
  // the challengeId from the login response is the credential.
  sendVerification: (challengeId, channel) => http.post('/auth/verification/send', { challengeId, channel }, { noAuth: true }),
  confirmVerification: (challengeId, code) => http.post('/auth/verification/confirm', { challengeId, code }, { noAuth: true }),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }, { noAuth: true }),
  resetPassword: (token, newPassword) => http.post('/auth/reset-password', { token, newPassword }, { noAuth: true }),
  deleteMe: () => http.delete('/auth/me'),
};

export const SchoolApi = {
  // Bootstrap-admin only: creates a school AND its owning admin account together.
  create: (payload) => http.post('/schools', payload),
  get: (id) => http.get(`/schools/${id}`),
  list: () => http.get('/schools'),
  // Bootstrap-admin only: permanently deletes a school + its owning admin.
  remove: (id) => http.delete(`/schools/${id}`),
  // Regular admin: requests deletion of their own school (approval-gated, not immediate).
  requestOwnDeletion: () => http.delete('/schools/me'),
};

export const SchoolDeletionRequestApi = {
  listPending: (params) => http.get('/school-deletion-requests', { params }),
  approve: (id, reviewNotes) => http.post(`/school-deletion-requests/${id}/approve`, reviewNotes ? { reviewNotes } : {}),
  reject: (id, reviewNotes) => http.post(`/school-deletion-requests/${id}/reject`, reviewNotes ? { reviewNotes } : {}),
};

export const RoleApi = {
  list: () => http.get('/roles'),
};

export const UserApi = {
  remove: (id) => http.delete(`/users/${id}`),
};

export const InstructorApi = {
  me: () => http.get('/instructors/me'),
  updateMe: (payload) => http.put('/instructors/me', payload),
  listBySchool: (schoolId) => http.get(`/instructors/school/${schoolId}`),
  setActive: (id, active) => http.patch(`/instructors/${id}/active`, { active }),
};

export const StudentApi = {
  me: () => http.get('/students/me'),
  updateMe: (payload) => http.put('/students/me', payload),
  listBySchool: (schoolId) => http.get(`/students/school/${schoolId}`),
  setStatus: (id, status) => http.patch(`/students/${id}/status`, { status }),
};

export const VehicleApi = {
  create: (payload) => http.post('/vehicles', payload),
  get: (id) => http.get(`/vehicles/${id}`),
  listBySchool: (schoolId) => http.get(`/vehicles/school/${schoolId}`),
  update: (id, payload) => http.put(`/vehicles/${id}`, payload),
  setStatus: (id, status) => http.patch(`/vehicles/${id}/status`, { status }),
};

export const CourseApi = {
  create: (payload) => http.post('/courses', payload),
  update: (courseId, payload) => http.put(`/courses/${courseId}`, payload),
  publish: (courseId) => http.put(`/courses/${courseId}/publish`),
  unpublish: (courseId) => http.put(`/courses/${courseId}/unpublish`),
  archive: (courseId) => http.put(`/courses/${courseId}/archive`),
  get: (courseId) => http.get(`/courses/${courseId}`),
  list: () => http.get('/courses'),
  mine: () => http.get('/courses/mine'),
};

export const VideoLessonApi = {
  create: (payload) => http.post('/video-lessons', payload),
  update: (lessonId, payload) => http.put(`/video-lessons/${lessonId}`, payload),
  publish: (lessonId) => http.put(`/video-lessons/${lessonId}/publish`),
  unpublish: (lessonId) => http.put(`/video-lessons/${lessonId}/unpublish`),
  get: (lessonId) => http.get(`/video-lessons/${lessonId}`),
  listByCourse: (courseId) => http.get(`/video-lessons/course/${courseId}`),
};

export const ResourceApi = {
  // External link resource (uploaded=false, opened via fileUrl).
  create: (payload) => http.post('/resources', payload),
  remove: (resourceId) => http.delete(`/resources/${resourceId}`),
  listByLesson: (lessonId) => http.get(`/resources/lesson/${lessonId}`),

  // Uploaded PDF resources (uploaded=true) - multipart, stored by the backend.
  upload: (lessonId, title, file, onUploadProgress) => {
    const form = new FormData();
    form.append('lessonId', lessonId);
    form.append('title', title);
    form.append('file', file);
    return http.post('/resources/upload', form, onUploadProgress ? { onUploadProgress } : undefined);
  },
  rename: (resourceId, title) => http.put(`/resources/${resourceId}`, { title }),
  replaceFile: (resourceId, file, onUploadProgress) => {
    const form = new FormData();
    form.append('file', file);
    return http.put(`/resources/${resourceId}/file`, form, onUploadProgress ? { onUploadProgress } : undefined);
  },
  // Needs the auth header, so it's fetched as a blob rather than linked to directly.
  download: (resourceId, inline = false) =>
    http.get(`/resources/${resourceId}/download`, { params: { inline }, responseType: 'blob' }),
};

export const QuizApi = {
  create: (payload) => http.post('/quizzes', payload),
  addQuestion: (quizId, payload) => http.post(`/quizzes/${quizId}/questions`, payload),
  publish: (quizId) => http.put(`/quizzes/${quizId}/publish`),
  get: (quizId, forStudent = true) => http.get(`/quizzes/${quizId}`, { params: { forStudent } }),
  listByCourse: (courseId) => http.get(`/quizzes/course/${courseId}`),
  submit: (quizId, studentId, answers) => http.post(`/quizzes/${quizId}/submit`, { studentId, answers }),
};

export const BookingApi = {
  create: (payload) => http.post('/bookings', payload),
  get: (id) => http.get(`/bookings/${id}`),
  confirm: (id) => http.put(`/bookings/${id}/confirm`),
  cancel: (id) => http.put(`/bookings/${id}/cancel`),
  complete: (id) => http.put(`/bookings/${id}/complete`),
  listByStudent: (studentId) => http.get(`/bookings/student/${studentId}`),
  listByInstructor: (instructorId, from, to) =>
    http.get(`/bookings/instructor/${instructorId}`, { params: { from, to } }),
};

export const LessonRouteApi = {
  generate: (payload) => http.post('/lesson-routes/generate', payload),
  get: (id) => http.get(`/lesson-routes/${id}`),
  getByBooking: (bookingId) => http.get(`/lesson-routes/booking/${bookingId}`),
  listByInstructor: (instructorId, params) => http.get(`/lesson-routes/instructor/${instructorId}`, { params }),
  listAll: (params) => http.get('/lesson-routes', { params }),
  remove: (id) => http.delete(`/lesson-routes/${id}`),
};

export const LessonNoteApi = {
  create: (payload) => http.post('/lesson-notes', payload),
  update: (id, payload) => http.put(`/lesson-notes/${id}`, payload),
  get: (id) => http.get(`/lesson-notes/${id}`),
  listByStudent: (studentId, params) => http.get(`/lesson-notes/student/${studentId}`, { params }),
  listByInstructor: (instructorId, params) => http.get(`/lesson-notes/instructor/${instructorId}`, { params }),
  listAll: (params) => http.get('/lesson-notes', { params }),
  remove: (id) => http.delete(`/lesson-notes/${id}`),

  uploadAttachment: (lessonNoteId, file, description, onUploadProgress) => {
    const form = new FormData();
    form.append('file', file);
    if (description) form.append('description', description);
    return http.post(`/lesson-notes/${lessonNoteId}/attachments`, form, onUploadProgress ? { onUploadProgress } : undefined);
  },
  listAttachments: (lessonNoteId) => http.get(`/lesson-notes/${lessonNoteId}/attachments`),
  removeAttachment: (lessonNoteId, attachmentId) => http.delete(`/lesson-notes/${lessonNoteId}/attachments/${attachmentId}`),
  downloadAttachmentUrl: (lessonNoteId, attachmentId) => `/lesson-notes/${lessonNoteId}/attachments/${attachmentId}/download`,
  downloadAttachment: (lessonNoteId, attachmentId) =>
    http.get(`/lesson-notes/${lessonNoteId}/attachments/${attachmentId}/download`, { responseType: 'blob' }),
};

export const LessonQuestionApi = {
  create: (payload) => http.post('/lesson-questions', payload),
  respond: (id, response) => http.post(`/lesson-questions/${id}/respond`, { response }),
  setStatus: (id, newStatus, changeReason) => http.put(`/lesson-questions/${id}/status`, { newStatus, changeReason }),
  get: (id) => http.get(`/lesson-questions/${id}`),
  myQuestions: (params) => http.get('/lesson-questions/my-questions', { params }),
  assigned: (params) => http.get('/lesson-questions/assigned', { params }),
  byStatus: (status, params) => http.get(`/lesson-questions/status/${status}`, { params }),
  pending: (params) => http.get('/lesson-questions/pending', { params }),
  history: (id) => http.get(`/lesson-questions/${id}/history`),
  historyPaginated: (id, params) => http.get(`/lesson-questions/${id}/history/paginated`, { params }),
};

export const ConversationApi = {
  // Student caller: their school's ACTIVE instructors; instructor caller: their school's students.
  contacts: () => http.get('/conversations/contacts'),
};

export const LiveSessionApi = {
  create: (payload) => http.post('/live-sessions', payload),
  get: (id) => http.get(`/live-sessions/${id}`),
  setStatus: (id, status) => http.put(`/live-sessions/${id}/status`, null, { params: { status } }),
  upcomingForSchool: (schoolId) => http.get(`/live-sessions/school/${schoolId}/upcoming`),
  register: (id, studentId) => http.post(`/live-sessions/${id}/register`, { studentId }),
  markPresent: (id, studentId) => http.put(`/live-sessions/${id}/attendance/${studentId}/present`),
  attendance: (id) => http.get(`/live-sessions/${id}/attendance`),
};

export const LicenseWorkflowApi = {
  get: (studentId) => http.get(`/progress/license/students/${studentId}`),
  initialize: (studentId) => http.post(`/progress/license/students/${studentId}/initialize`),
  updateTheoryProgress: (studentId, progressPercent) =>
    http.put(`/progress/license/students/${studentId}/theory-progress`, null, { params: { progressPercent } }),
  markQuizPassed: (studentId) => http.post(`/progress/license/students/${studentId}/quiz-passed`),
  advance: (studentId, targetStage, notes) =>
    http.put(`/progress/license/students/${studentId}/advance`, { targetStage, notes }),
};

export const DrivingAssessmentApi = {
  create: (payload) => http.post('/driving-assessments', payload),
  updateFeedback: (id, feedback) => http.patch(`/driving-assessments/${id}/feedback`, { feedback }),
  get: (id) => http.get(`/driving-assessments/${id}`),
  listByStudent: (studentId) => http.get(`/driving-assessments/student/${studentId}`),
  listByInstructor: (instructorId) => http.get(`/driving-assessments/instructor/${instructorId}`),
};

export const GamificationApi = {
  me: () => http.get('/gamification/me'),
  studentSummary: (studentId) => http.get(`/gamification/students/${studentId}`),
  leaderboard: (schoolId, params) => http.get(`/gamification/leaderboard/school/${schoolId}`, { params }),
};

export const NotificationApi = {
  send: (payload) => http.post('/notifications/send', payload),

  mine: async () => {
    const result = await http.get('/notifications/me', { silent: true });
    return result.content ?? [];
  },

  markRead: (id) => http.patch(`/notifications/${id}/read`),
};
export const LICENSE_STAGES = [
  'THEORY_LEARNING',
  'THEORY_COMPLETED',
  'QUIZ_PASSED',
  'ROAD_TRAINING_STARTED',
  'ROAD_TRAINING_IN_PROGRESS',
  'ROAD_READY',
  'DVLA_PROCESSING',
  'LICENSE_APPROVED',
];

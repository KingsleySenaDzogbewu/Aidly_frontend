import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute, RequireRole } from './auth/ProtectedRoute';
import { NotificationsProvider } from './features/notifications/NotificationsContext';
import { MessagesProvider } from './features/messages/MessagesContext';
import { RealtimeProvider } from './features/realtime/RealtimeContext';
import { ToastProvider } from './components/ui';
import FloatingFeedbackButton from './components/FloatingFeedbackButton';
import AppShell from './layout/AppShell';

// The login page is the first screen for most visits, so it ships with the app.
import LoginPage from './pages/LoginPage';

// Every other page is downloaded the first time it's opened, so the first load
// is small. After a new deploy, an already-open tab may ask for a page file
// that no longer exists - reload once to pick up the new version.
function lazyPage(load) {
  return lazy(() => load().then((mod) => {
    // Loaded fine: allow a fresh reload next time a newer deploy lands.
    try { sessionStorage.removeItem('aidly-reloaded-for-new-version'); } catch { /* storage unavailable */ }
    return mod;
  }).catch((err) => {
    const key = 'aidly-reloaded-for-new-version';
    let alreadyReloaded = false;
    try { alreadyReloaded = sessionStorage.getItem(key) === '1'; } catch { /* storage unavailable */ }
    if (!alreadyReloaded) {
      try { sessionStorage.setItem(key, '1'); } catch { /* storage unavailable */ }
      window.location.reload();
      return new Promise(() => {}); // the reload takes over
    }
    throw err;
  }));
}

const ResetPasswordPage = lazyPage(() => import('./pages/ResetPasswordPage'));
const OverviewPage = lazyPage(() => import('./pages/OverviewPage'));
const LiveSessionsPage = lazyPage(() => import('./pages/LiveSessionsPage'));
const CoursesPage = lazyPage(() => import('./pages/CoursesPage'));
const QuizzesPage = lazyPage(() => import('./pages/QuizzesPage'));
const NotesQuestionsPage = lazyPage(() => import('./pages/NotesQuestionsPage'));
const NotificationsPage = lazyPage(() => import('./pages/NotificationsPage'));
const BookingsPage = lazyPage(() => import('./pages/BookingsPage'));
const ProfilePage = lazyPage(() => import('./pages/ProfilePage'));
const FleetPage = lazyPage(() => import('./pages/FleetPage'));
const AdminPage = lazyPage(() => import('./pages/AdminPage'));
const CreateStudentPage = lazyPage(() => import('./pages/CreateStudentPage'));
const SendNotificationPage = lazyPage(() => import('./pages/SendNotificationPage'));
const LeaderboardPage = lazyPage(() => import('./pages/LeaderboardPage'));
const MessagesPage = lazyPage(() => import('./pages/MessagesPage'));
const AnnouncementsPage = lazyPage(() => import('./pages/AnnouncementsPage'));
const NotFoundPage = lazyPage(() => import('./pages/NotFoundPage'));
const RoutesProgressPage = lazyPage(() => import('./pages/RoutesProgressPage'));

function AuthedApp() {
  return (
    <RealtimeProvider>
      <NotificationsProvider>
        <MessagesProvider>
          <AppShell />
        </MessagesProvider>
      </NotificationsProvider>
    </RealtimeProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <FloatingFeedbackButton />
      <BrowserRouter>
        <AuthProvider>
          {/* Pages inside the app shell show their own loading placeholder (AppShell);
              this covers the few outside it (reset password, not found). */}
          <Suspense fallback={null}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AuthedApp />}>
                <Route index element={<OverviewPage />} />
                <Route path="live" element={<LiveSessionsPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="quizzes" element={<QuizzesPage />} />
                <Route path="notes" element={<NotesQuestionsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route
                  path="messages"
                  element={<RequireRole roles={['STUDENT', 'INSTRUCTOR']}><MessagesPage /></RequireRole>}
                />
                <Route path="announcements" element={<AnnouncementsPage />} />
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="routes" element={<RoutesProgressPage />} />
                <Route path="leaderboard" element={<LeaderboardPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route
                  path="add-student"
                  element={<RequireRole roles={['INSTRUCTOR']}><CreateStudentPage /></RequireRole>}
                />
                <Route
                  path="send-notification"
                  element={<RequireRole roles={['ADMIN', 'INSTRUCTOR']}><SendNotificationPage /></RequireRole>}
                />
                <Route
                  path="fleet"
                  element={<RequireRole roles={['ADMIN']}><FleetPage /></RequireRole>}
                />
                <Route
                  path="admin"
                  element={<RequireRole roles={['ADMIN']}><AdminPage /></RequireRole>}
                />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

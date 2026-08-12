import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute, RequireRole } from './auth/ProtectedRoute';
import { NotificationsProvider } from './features/notifications/NotificationsContext';
import { ToastProvider } from './components/ui';
import AppShell from './layout/AppShell';

import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import OverviewPage from './pages/OverviewPage';
import LiveSessionsPage from './pages/LiveSessionsPage';
import CoursesPage from './pages/CoursesPage';
import QuizzesPage from './pages/QuizzesPage';
import NotesQuestionsPage from './pages/NotesQuestionsPage';
import NotificationsPage from './pages/NotificationsPage';
import BookingsPage from './pages/BookingsPage';
import ProfilePage from './pages/ProfilePage';
import FleetPage from './pages/FleetPage';
import AdminPage from './pages/AdminPage';
import CreateStudentPage from './pages/CreateStudentPage';
import SendNotificationPage from './pages/SendNotificationPage';
import LeaderboardPage from './pages/LeaderboardPage';
import NotFoundPage from './pages/NotFoundPage';

// Pulls in Leaflet (the heaviest dependency) — split into its own chunk.
const RoutesProgressPage = lazy(() => import('./pages/RoutesProgressPage'));

function AuthedApp() {
  return (
    <NotificationsProvider>
      <AppShell />
    </NotificationsProvider>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
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
                <Route path="bookings" element={<BookingsPage />} />
                <Route path="routes" element={<Suspense fallback={null}><RoutesProgressPage /></Suspense>} />
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
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
}

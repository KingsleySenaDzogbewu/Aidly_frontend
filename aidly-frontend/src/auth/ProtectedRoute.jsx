import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { isAuthenticated, initializing } = useAuth();
  const location = useLocation();

  if (initializing) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

export function RequireRole({ roles, children }) {
  const { roles: userRoles } = useAuth();
  const allowed = roles.some((r) => userRoles.includes(r));
  if (!allowed) return <Navigate to="/" replace />;
  return children;
}

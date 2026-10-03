import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import SchoolBrand from './SchoolBrand';
import { useAuth } from '../auth/AuthContext';
import { TopProgress, Icons, SkeletonList } from '../components/ui';
import useIsMobile from '../hooks/useIsMobile';
import './layout.css';

export default function AppShell() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // The browser tab names the school too.
  useEffect(() => {
    document.title = user?.schoolName ? `${user.schoolName} · Aidly` : 'Aidly — Driving School Portal';
  }, [user?.schoolName]);

  // Close the drawer automatically whenever the route changes.
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  // Lock body scroll while the mobile drawer is open, so the page behind
  // it can't be dragged/scrolled at the same time (a common mobile-nav bug).
  useEffect(() => {
    if (isMobile && sidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isMobile, sidebarOpen]);

  return (
    <div className="shell respo-shell">
      <TopProgress />

      <button type="button" className="mobile-topbar respo-mobile-topbar" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="mobile-topbar-btn"><Icons.IconMenu size={20} /></span>
          <SchoolBrand name={user?.schoolName} logoUrl={user?.schoolLogoUrl} compact />
        </span>
      </button>

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar mobile={isMobile} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} onClose={() => setSidebarOpen(false)} />

      <main className="content respo-content aurora-bg">
        <div key={location.pathname} className="route-transition">
          {/* Pages are downloaded on first visit; the menu and top bar stay put meanwhile. */}
          <Suspense fallback={<div aria-busy="true" aria-label="Loading page"><SkeletonList count={3} /></div>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

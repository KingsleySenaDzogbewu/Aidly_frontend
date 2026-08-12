import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { TopProgress, Icons } from '../components/ui';
import useIsMobile from '../hooks/useIsMobile';
import './layout.css';

export default function AppShell() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>Aidly</span>
        </span>
      </button>

      {isMobile && sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar mobile={isMobile} open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} onClose={() => setSidebarOpen(false)} />

      <main className="content respo-content aurora-bg">
        <div key={location.pathname} className="route-transition">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

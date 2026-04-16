import { AuthProvider } from "./features/auth/AuthContext";
import { useAuth } from "./features/auth/AuthContext";
import { Login } from "./features/auth/Login";
import { Dashboard } from "./Dashboard";

function AppInner() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        *, *::before, *::after { box-sizing: border-box; }
        html, body { margin:0; padding:0; -webkit-text-size-adjust:100%; overflow-x:hidden; }
        body { font-family: system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; background:#f4f6f9; }
        input, select, textarea, button { font-family: inherit; }
        /* Prevent iOS zoom on inputs */
        input, select, textarea { font-size: 16px !important; }

        /* ── Modal always perfectly centered ── */
        .modal-overlay {
          position:fixed; inset:0;
          background:rgba(15,23,42,0.55);
          display:flex; align-items:center; justify-content:center;
          z-index:1000; padding:16px;
        }

        /* ── Sidebar / nav ── */
        @media (min-width:769px) {
          .desktop-sidebar   { display:flex !important; }
          .mob-bar           { display:none !important; }
          .mobile-bottom-nav { display:none !important; }
          .mobile-drawer     { display:none !important; }
          .mobile-overlay    { display:none !important; }
          .main-content      { padding-bottom:24px !important; }
        }
        @media (max-width:768px) {
          .desktop-sidebar   { display:none !important; }
          .mob-bar           { display:flex !important; }
          .mobile-bottom-nav { display:flex !important; flex-direction:column; }
          .mobile-drawer     { display:block !important; }
          .mobile-overlay    { display:block !important; }
          .main-content      { padding:14px !important; padding-bottom:90px !important; }
        }

        /* ── Responsive grids ── */
        .stat-grid-4 { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:14px; margin-bottom:20px; }
        .stat-grid-3 { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:14px; margin-bottom:20px; }
        .stat-grid-2 { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:14px; margin-bottom:20px; }

        /* ── Tables scroll on mobile ── */
        .table-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; border-radius:12px; }
        .table-wrap table { min-width:520px; }

        /* ── Page header stacks on mobile ── */
        @media (max-width:600px) {
          .page-hdr { flex-direction:column !important; align-items:flex-start !important; gap:10px !important; }
          .page-hdr h1 { font-size:18px !important; }
          .modal-box { border-radius:14px !important; }
          .filter-row { flex-wrap:wrap !important; }
          .hide-mobile { display:none !important; }
        }


        /* ── Scrollbar styling ── */
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:#f1f5f9; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
      `}</style>
      <AppInner />
    </AuthProvider>
  );
}

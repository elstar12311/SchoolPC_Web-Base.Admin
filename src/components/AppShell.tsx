import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { initials, type LogbookData } from "../data";
import { useApiResource } from "../hooks/useApiResource";
import { useToast } from "./ToastContext";
import Icon from "./Icon";

const navigation = [
  { path: "/logbook", icon: "grid", label: "PC Logbook" },
  { path: "/history", icon: "history", label: "Logbook History" },
  { path: "/reports", icon: "alert", label: "Problem Reports" },
  { path: "/accounts", icon: "users", label: "Account Management" },
];

function displayRole(role: string) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

export default function AppShell() {
  const { user, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { data: logbook } = useApiResource<LogbookData>("/api/logbook");
  const activeNavigation = navigation.find(({ path }) => location.pathname.startsWith(path));
  const title = location.pathname.startsWith("/computers/")
    ? "Computer Detail"
    : (activeNavigation?.label ?? "PC Logbook");

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      notify("You have been logged out.");
      navigate("/login", { replace: true });
    } catch {
      notify("Logout failed. Please try again.", "error");
    } finally {
      setLoggingOut(false);
    }
  }

  const avatar = initials(user?.full_name ?? "") || user?.username.slice(0, 2).toUpperCase() || "";

  return (
    <div className="app-shell">
      {menuOpen && (
        <button
          aria-label="Close navigation"
          className="scrim"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <img
            className="brand-logo"
            src="/uic-logo-small.png"
            alt="University of the Immaculate Conception"
          />
          <div>
            <strong>University of the Immaculate Conception</strong>
          </div>
          <button
            aria-label="Close navigation"
            className="mobile-close"
            onClick={() => setMenuOpen(false)}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="campus-card">
          <img src="/uic-campus.png" alt="" />
          <div>
            <span>Connected campus</span>
          </div>
        </div>
        <nav>
          <p className="nav-label">Workspace</p>
          {navigation.map(({ path, icon, label }) => (
            <button
              key={path}
              className={activeNavigation?.path === path ? "nav-active" : ""}
              onClick={() => {
                navigate(path);
                setMenuOpen(false);
              }}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {path === "/reports" && (logbook?.summary.openReports ?? 0) > 0 && (
                <em>{logbook?.summary.openReports}</em>
              )}
            </button>
          ))}
        </nav>
        <div className="user-card">
          <div className="avatar">{avatar}</div>
          <div>
            <strong>{user?.full_name}</strong>
            <span>{user ? displayRole(user.role) : ""}</span>
          </div>
          <button aria-label="Log out" disabled={loggingOut} onClick={handleLogout} title="Log out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header>
          <button className="menu-button" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="header-copy">
            <span>Administrator portal</span>
            <strong>{title}</strong>
          </div>
          <div className="header-actions">
            <button
              aria-label="View problem reports"
              className="icon-button"
              onClick={() => navigate("/reports")}
              title="Problem reports"
            >
              <Icon name="bell" />
              {(logbook?.summary.openReports ?? 0) > 0 && <i />}
            </button>
            <div className="header-avatar">{avatar}</div>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer>UIC Admin &nbsp;·&nbsp; University of the Immaculate Conception</footer>
      </div>
    </div>
  );
}

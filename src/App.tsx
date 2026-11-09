import { useMemo, useState, type ReactNode } from "react";

type Page = "logbook" | "history" | "reports" | "accounts" | "detail";

const Icon = ({ name, size = 19 }: { name: string; size?: number }) => {
  const paths: Record<string, ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="2" />
        <rect x="14" y="3" width="7" height="7" rx="2" />
        <rect x="3" y="14" width="7" height="7" rx="2" />
        <rect x="14" y="14" width="7" height="7" rx="2" />
      </>
    ),
    history: (
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 3v5h5M12 7v5l3 2" />
      </>
    ),
    alert: (
      <>
        <path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" />
        <path d="M12 9v4m0 3h.01" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
      </>
    ),
    monitor: (
      <>
        <rect x="2.5" y="3" width="19" height="14" rx="2" />
        <path d="M8 21h8m-4-4v4" />
      </>
    ),
    activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    dots: (
      <>
        <circle cx="5" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="19" cy="12" r="1" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-4-4 4 4 4-4M4 19h16" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    arrow: <path d="m19 12-7-7m7 7-7 7m7-7H5" />,
    check: <path d="m5 12 4 4L19 6" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
};

const pcs = [
  {
    display: "Lab A · PC 1",
    machine: "DUMMY-A01",
    ip: "172.16.1.101",
    seen: "Just now",
    online: true,
    client: "dddddddd…0001",
    sessions: 38,
  },
  {
    display: "Lab A · PC 2",
    machine: "DUMMY-A02",
    ip: "172.16.1.102",
    seen: "2 min ago",
    online: true,
    client: "dddddddd…0002",
    sessions: 31,
  },
  {
    display: "Library · PC 1",
    machine: "DUMMY-B01",
    ip: "172.16.1.111",
    seen: "6 days ago",
    online: false,
    client: "dddddddd…0003",
    sessions: 24,
  },
];

const sessions = [
  [
    "Lab A · PC 2",
    "Jo-an Paula Honrada",
    "jhonrada_230000000813@uic.edu.ph",
    "230000000813",
    "Nov 4, 8:30 AM",
    "Nov 4, 10:00 AM",
    "—",
  ],
  [
    "Lab A · PC 1",
    "Nikko Angelo P. Navarro",
    "nnavarro_230000002875@uic.edu.ph",
    "230000002875",
    "Nov 4, 8:00 AM",
    "Nov 4, 9:30 AM",
    "—",
  ],
  [
    "Lab A · PC 2",
    "Ken Jonas T. Baltazar",
    "kbaltazar_230000000268@uic.edu.ph",
    "230000000268",
    "Nov 4, 2:00 PM",
    "Nov 4, 3:30 PM",
    "Windows shutdown",
  ],
  [
    "Lab A · PC 1",
    "Kurt Vincent S. Lopena",
    "klopena_240000000531@uic.edu.ph",
    "240000000531",
    "Nov 4, 11:30 AM",
    "Nov 4, 1:00 PM",
    "—",
  ],
  [
    "Library · PC 1",
    "Princess Ellein S. Ugay",
    "pugay_230000001482@uic.edu.ph",
    "230000001482",
    "Nov 3, 3:00 PM",
    "Nov 3, 4:20 PM",
    "PC offline",
  ],
  [
    "Lab A · PC 1",
    "KyzYll Gwen O. Mendoza",
    "kmendoza_230000001794@uic.edu.ph",
    "230000001794",
    "Nov 3, 1:00 PM",
    "Nov 3, 2:30 PM",
    "—",
  ],
];

const initialReports = [
  {
    pc: "DUMMY-A02",
    student: "Princess Ellein S. Ugay",
    issue: "The computer is running very slowly when opening applications.",
    time: "Nov 5, 8:30 AM",
    resolved: false,
  },
  {
    pc: "DUMMY-B01",
    student: "KyzYll Gwen O. Mendoza",
    issue: "The internet connection keeps disconnecting.",
    time: "Nov 3, 1:20 PM",
    resolved: false,
  },
  {
    pc: "DUMMY-A01",
    student: "Nikko Angelo P. Navarro",
    issue: "The application suddenly froze while I was working.",
    time: "Nov 2, 9:15 AM",
    resolved: false,
  },
  {
    pc: "DUMMY-A02",
    student: "Jo-an Paula Honrada",
    issue: "Monitor cable was replaced and tested.",
    time: "Oct 29, 10:20 AM",
    resolved: true,
  },
];

const people = [
  ["230000000813", "Jo-an Paula Honrada", "jhonrada_230000000813@uic.edu.ph", "Active"],
  ["230000000268", "Ken Jonas T. Baltazar", "kbaltazar_230000000268@uic.edu.ph", "Active"],
  ["240000000531", "Kurt Vincent S. Lopena", "klopena_240000000531@uic.edu.ph", "Active"],
  ["220000002154", "Kyle Clancy F. Tan", "ktan_220000002154@uic.edu.ph", "Active"],
  ["230000001794", "KyzYll Gwen O. Mendoza", "kmendoza_230000001794@uic.edu.ph", "Active"],
  ["230000002875", "Nikko Angelo P. Navarro", "nnavarro_230000002875@uic.edu.ph", "Active"],
];

function Sidebar({
  page,
  setPage,
  open,
  setOpen,
}: {
  page: Page;
  setPage: (p: Page) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const nav = [
    ["logbook", "grid", "PC Logbook"],
    ["history", "history", "Logbook History"],
    ["reports", "alert", "Problem Reports"],
    ["accounts", "users", "Account Management"],
  ] as const;
  return (
    <>
      {open && (
        <button aria-label="Close navigation" className="scrim" onClick={() => setOpen(false)} />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">SP</div>
          <div>
            <strong>SchoolPC</strong>
            <span>UIC Admin Portal</span>
          </div>
          <button className="mobile-close" onClick={() => setOpen(false)}>
            <Icon name="close" />
          </button>
        </div>
        <nav>
          <p className="nav-label">Workspace</p>
          {nav.map(([id, icon, label]) => (
            <button
              key={id}
              className={page === id || (page === "detail" && id === "logbook") ? "nav-active" : ""}
              onClick={() => {
                setPage(id);
                setOpen(false);
              }}
            >
              <Icon name={icon} />
              <span>{label}</span>
              {id === "reports" && <em>3</em>}
            </button>
          ))}
        </nav>
        <div className="campus-card">
          <img src="/uic-campus.png" alt="University of the Immaculate Conception campus" />
          <div>
            <span>Connected campus</span>
            <strong>3 computer units</strong>
          </div>
        </div>
        <div className="user-card">
          <div className="avatar">SA</div>
          <div>
            <strong>System Admin</strong>
            <span>Administrator</span>
          </div>
          <button title="Log out">
            <Icon name="logout" />
          </button>
        </div>
      </aside>
    </>
  );
}

function Header({ title, onMenu }: { title: string; onMenu: () => void }) {
  return (
    <header>
      <button className="menu-button" onClick={onMenu}>
        <Icon name="menu" />
      </button>
      <div className="header-copy">
        <span>Administrator portal</span>
        <strong>{title}</strong>
      </div>
      <div className="header-actions">
        <label className="global-search">
          <Icon name="search" size={17} />
          <input placeholder="Search anything…" />
        </label>
        <button className="icon-button">
          <Icon name="bell" />
          <i />
        </button>
        <div className="header-avatar">SA</div>
      </div>
    </header>
  );
}

const PageIntro = ({
  eyebrow,
  title,
  text,
  action,
}: {
  eyebrow: string;
  title: string;
  text: string;
  action?: ReactNode;
}) => (
  <div className="page-intro">
    <div>
      <span>{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
    {action}
  </div>
);

function Logbook({ openDetail }: { openDetail: () => void }) {
  const [showOffline, setShowOffline] = useState(true);
  const visible = showOffline ? pcs : pcs.filter((p) => p.online);
  return (
    <>
      <PageIntro
        eyebrow="Live overview"
        title="PC Logbook"
        text="Monitor computer activity and availability across campus labs."
        action={
          <button className="primary-button">
            <Icon name="plus" /> Register PC
          </button>
        }
      />
      <section className="stats">
        <article>
          <div className="stat-icon coral">
            <Icon name="monitor" />
          </div>
          <div>
            <span>Total computers</span>
            <strong>03</strong>
            <small>Across 2 locations</small>
          </div>
        </article>
        <article>
          <div className="stat-icon cyan">
            <Icon name="activity" />
          </div>
          <div>
            <span>Currently online</span>
            <strong>02</strong>
            <small className="positive">66% availability</small>
          </div>
          <div className="spark">
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
        </article>
        <article>
          <div className="stat-icon amber">
            <Icon name="users" />
          </div>
          <div>
            <span>Sessions today</span>
            <strong>24</strong>
            <small>+8 from yesterday</small>
          </div>
        </article>
        <article>
          <div className="stat-icon red">
            <Icon name="alert" />
          </div>
          <div>
            <span>Open reports</span>
            <strong>03</strong>
            <small>Needs attention</small>
          </div>
        </article>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Computer status</h2>
            <p>Real-time status of all registered workstations</p>
          </div>
          <div className="panel-tools">
            <label className="search-box">
              <Icon name="search" size={17} />
              <input placeholder="Search computers" />
            </label>
            <label className="switch-label">
              <input
                type="checkbox"
                checked={showOffline}
                onChange={(e) => setShowOffline(e.target.checked)}
              />
              <span className="switch" />
              <b>Show offline</b>
            </label>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Computer</th>
                <th>Machine name</th>
                <th>IP address</th>
                <th>Last seen</th>
                <th>Status</th>
                <th>Sessions</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((pc) => (
                <tr key={pc.machine} onClick={openDetail} className="clickable">
                  <td>
                    <div className="pc-name">
                      <span>
                        <Icon name="monitor" size={17} />
                      </span>
                      <div>
                        <strong>{pc.display}</strong>
                        <small>{pc.client}</small>
                      </div>
                    </div>
                  </td>
                  <td>{pc.machine}</td>
                  <td className="mono">{pc.ip}</td>
                  <td>{pc.seen}</td>
                  <td>
                    <span className={`status ${pc.online ? "online" : "offline"}`}>
                      <i />
                      {pc.online ? "Online" : "Offline"}
                    </span>
                  </td>
                  <td>{pc.sessions}</td>
                  <td>
                    <button className="row-arrow">
                      <Icon name="chevron" size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <span>
            Showing {visible.length} of {pcs.length} computers
          </span>
          <button>Refresh status</button>
        </div>
      </section>
    </>
  );
}

function History() {
  const [query, setQuery] = useState("");
  const filtered = sessions.filter((row) =>
    row.join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageIntro
        eyebrow="Activity records"
        title="Logbook History"
        text="Review and export student computer sessions."
        action={
          <button className="primary-button">
            <Icon name="download" /> Export CSV
          </button>
        }
      />
      <section className="filter-card">
        <label>
          <span>From</span>
          <div>
            <Icon name="calendar" size={17} />
            <input type="date" defaultValue="2026-10-31" />
          </div>
        </label>
        <label>
          <span>To</span>
          <div>
            <Icon name="calendar" size={17} />
            <input type="date" defaultValue="2026-11-09" />
          </div>
        </label>
        <label>
          <span>Computer</span>
          <select>
            <option>All computers</option>
            <option>Lab A · PC 1</option>
            <option>Lab A · PC 2</option>
          </select>
        </label>
        <label className="filter-search">
          <span>Search records</span>
          <div>
            <Icon name="search" size={17} />
            <input
              placeholder="Name, ID, or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </label>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Session records</h2>
            <p>{filtered.length} sessions found in the selected period</p>
          </div>
          <span className="status online">
            <i />
            Live records
          </span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Computer",
                  "Student",
                  "Email",
                  "Student ID",
                  "Time in",
                  "Time out",
                  "Remarks",
                ].map((x) => (
                  <th key={x}>{x}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>
                      {j === 6 && c !== "—" ? <span className="remark">{c}</span> : c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <span>Showing {filtered.length} session records</span>
          <div className="pagination">
            <button>1</button>
            <button>2</button>
            <button>
              <Icon name="chevron" size={15} />
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Reports() {
  const [reports, setReports] = useState(initialReports);
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<(typeof initialReports)[number] | null>(null);
  const visible = reports.filter(
    (r) =>
      r.resolved === (tab === "resolved") &&
      [r.pc, r.student, r.issue].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const resolve = (time: string) =>
    setReports((items) => items.map((r) => (r.time === time ? { ...r, resolved: true } : r)));
  const resolveSelected = () => {
    if (!selected) return;
    resolve(selected.time);
    setSelected(null);
    setTab("resolved");
  };
  return (
    <>
      <PageIntro
        eyebrow="Support center"
        title="Problem Reports"
        text="Track technical issues reported by students and staff."
      />
      <section className="panel reports-panel">
        <div className="reports-toolbar">
          <div className="tabs">
            <button className={tab === "open" ? "active" : ""} onClick={() => setTab("open")}>
              Open reports <span>{reports.filter((r) => !r.resolved).length}</span>
            </button>
            <button
              className={tab === "resolved" ? "active" : ""}
              onClick={() => setTab("resolved")}
            >
              Resolved <span>{reports.filter((r) => r.resolved).length}</span>
            </button>
          </div>
          <label className="search-box">
            <Icon name="search" size={17} />
            <input
              placeholder="Search reports…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {visible.length ? (
          <div className="table-scroll">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>Report</th>
                  <th>Computer</th>
                  <th>Reported by</th>
                  <th>Issue summary</th>
                  <th>Reported at</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((r, i) => (
                  <tr key={r.time} className="clickable" onClick={() => setSelected(r)}>
                    <td>
                      <span className="report-id">#{String(i + 1).padStart(3, "0")}</span>
                    </td>
                    <td>
                      <div className="report-pc">
                        <span>
                          <Icon name="monitor" size={15} />
                        </span>
                        <strong>{r.pc}</strong>
                      </div>
                    </td>
                    <td>
                      <div className="person">
                        <span>
                          {r.student
                            .split(" ")
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <strong>{r.student}</strong>
                      </div>
                    </td>
                    <td className="issue-summary">{r.issue}</td>
                    <td>{r.time}</td>
                    <td>
                      <span className={`report-status ${r.resolved ? "is-resolved" : "is-open"}`}>
                        <i />
                        {r.resolved ? "Resolved" : "Open"}
                      </span>
                    </td>
                    <td>
                      <button className="row-arrow" aria-label="View report details">
                        <Icon name="chevron" size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty report-empty">
            <Icon name="check" size={30} />
            <h3>{query ? "No matching reports" : "All caught up"}</h3>
            <p>
              {query
                ? "Try searching by computer, student, or issue."
                : "There are no reports in this category."}
            </p>
          </div>
        )}
        <div className="panel-foot">
          <span>
            Showing {visible.length} {tab} {visible.length === 1 ? "report" : "reports"}
          </span>
          <span>Click a row to review details</span>
        </div>
      </section>
      {selected && (
        <div className="modal-layer" role="presentation" onMouseDown={() => setSelected(null)}>
          <section
            className="report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <div className={`modal-symbol ${selected.resolved ? "resolved" : ""}`}>
                <Icon name={selected.resolved ? "check" : "alert"} size={21} />
              </div>
              <div>
                <span>Problem report</span>
                <h2 id="report-title">{selected.pc}</h2>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)} aria-label="Close">
                <Icon name="close" size={19} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-status-row">
                <span className={`report-status ${selected.resolved ? "is-resolved" : "is-open"}`}>
                  <i />
                  {selected.resolved ? "Resolved" : "Needs attention"}
                </span>
                <time>{selected.time}</time>
              </div>
              <div className="issue-detail">
                <span>Reported issue</span>
                <p>{selected.issue}</p>
              </div>
              <div className="report-detail-grid">
                <div>
                  <span>Reported by</span>
                  <strong>{selected.student}</strong>
                </div>
                <div>
                  <span>Computer</span>
                  <strong>{selected.pc}</strong>
                </div>
                <div>
                  <span>Location</span>
                  <strong>{selected.pc.includes("B01") ? "Library" : "Computer Lab A"}</strong>
                </div>
                <div>
                  <span>Machine IP</span>
                  <strong className="mono">
                    {selected.pc === "DUMMY-A01"
                      ? "172.16.1.101"
                      : selected.pc === "DUMMY-A02"
                        ? "172.16.1.102"
                        : "172.16.1.111"}
                  </strong>
                </div>
              </div>
              <div className="admin-note">
                <div>
                  <strong>Administrator review</strong>
                  <span>Add a note before resolving this report (optional)</span>
                </div>
                <textarea placeholder="Write a resolution note…" rows={3} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setSelected(null)}>
                Close
              </button>
              {!selected.resolved && (
                <button className="modal-resolve" onClick={resolveSelected}>
                  <Icon name="check" size={17} /> Mark as resolved
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function Accounts() {
  const [tab, setTab] = useState("Students");
  const [query, setQuery] = useState("");
  const filtered = people.filter((r) => r.join(" ").toLowerCase().includes(query.toLowerCase()));
  return (
    <>
      <PageIntro
        eyebrow="Access control"
        title="Account Management"
        text="Manage users, permissions, and account access."
        action={
          <button className="primary-button">
            <Icon name="plus" /> Add account
          </button>
        }
      />
      <div className="tabs account-tabs">
        {["Students", "Admins", "Banned"].map((x) => (
          <button key={x} className={tab === x ? "active" : ""} onClick={() => setTab(x)}>
            {x}
            {x === "Students" && <span>8</span>}
          </button>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{tab} directory</h2>
            <p>Manage registered {tab.toLowerCase()} and account status</p>
          </div>
          <label className="search-box">
            <Icon name="search" size={17} />
            <input
              placeholder="Search accounts…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
        {tab === "Students" ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full name</th>
                    <th>Email address</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i}>
                      <td className="mono">{r[0]}</td>
                      <td>
                        <div className="person">
                          <span>
                            {r[1]
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </span>
                          <strong>{r[1]}</strong>
                        </div>
                      </td>
                      <td>{r[2]}</td>
                      <td>
                        <span className="status online">
                          <i />
                          {r[3]}
                        </span>
                      </td>
                      <td>
                        <button className="dots-button">
                          <Icon name="dots" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-foot">
              <span>Showing {filtered.length} student accounts</span>
              <div className="pagination">
                <button>1</button>
                <button>2</button>
                <button>
                  <Icon name="chevron" size={15} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty">
            <Icon name="users" size={30} />
            <h3>{tab} accounts</h3>
            <p>No {tab.toLowerCase()} accounts to show.</p>
          </div>
        )}
      </section>
    </>
  );
}

function Detail({ goBack }: { goBack: () => void }) {
  return (
    <>
      <button className="back-button" onClick={goBack}>
        ← Back to computers
      </button>
      <section className="detail-hero">
        <div className="detail-icon">
          <Icon name="monitor" size={28} />
          <i />
        </div>
        <div>
          <span>COMPUTER DETAILS</span>
          <h1>Lab A · PC 1</h1>
          <p>DUMMY-A01 &nbsp;·&nbsp; 172.16.1.101</p>
        </div>
        <span className="status online">
          <i />
          Online now
        </span>
      </section>
      <section className="detail-stats">
        <article>
          <span>Client ID</span>
          <strong>dddddddd…0001</strong>
        </article>
        <article>
          <span>Last activity</span>
          <strong>Just now</strong>
        </article>
        <article>
          <span>Sessions this month</span>
          <strong>38</strong>
        </article>
        <article>
          <span>Current user</span>
          <strong>None</strong>
        </article>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Session activity</h2>
            <p>Thursday, November 5, 2026</p>
          </div>
          <div className="panel-tools">
            <button className="ghost-button">
              <Icon name="calendar" size={16} /> Change date
            </button>
            <button className="primary-button small">
              <Icon name="download" size={16} /> Export
            </button>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Email address</th>
                <th>Student ID</th>
                <th>Time in</th>
                <th>Time out</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {sessions.slice(0, 3).map((r, i) => (
                <tr key={i}>
                  <td>{r[1]}</td>
                  <td>{r[2]}</td>
                  <td className="mono">{r[3]}</td>
                  <td>{r[4]}</td>
                  <td>{r[5]}</td>
                  <td>{r[6]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <span>3 sessions on this day</span>
        </div>
      </section>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>("logbook");
  const [menuOpen, setMenuOpen] = useState(false);
  const titles = {
    logbook: "PC Logbook",
    history: "Logbook History",
    reports: "Problem Reports",
    accounts: "Account Management",
    detail: "Computer Detail",
  };
  const content = useMemo(() => {
    if (page === "history") return <History />;
    if (page === "reports") return <Reports />;
    if (page === "accounts") return <Accounts />;
    if (page === "detail") return <Detail goBack={() => setPage("logbook")} />;
    return <Logbook openDetail={() => setPage("detail")} />;
  }, [page]);
  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} open={menuOpen} setOpen={setMenuOpen} />
      <div className="app-main">
        <Header title={titles[page]} onMenu={() => setMenuOpen(true)} />
        <main>{content}</main>
        <footer>SchoolPC Admin &nbsp;·&nbsp; University of the Immaculate Conception</footer>
      </div>
    </div>
  );
}

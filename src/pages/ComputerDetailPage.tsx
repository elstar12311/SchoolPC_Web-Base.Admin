import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ComputerDetail, SessionRecord } from "../data";
import { formatDateTime, formatDuration, formatRelativeTime, localDateInput } from "../data";
import { useApiResource } from "../hooks/useApiResource";
import DataState from "../components/DataState";
import Icon from "../components/Icon";

export default function ComputerDetailPage() {
  const { clientGuid = "" } = useParams();
  const encodedGuid = encodeURIComponent(clientGuid);
  const [to, setTo] = useState(localDateInput(new Date()));
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 7);
  const [from, setFrom] = useState(localDateInput(fromDate));
  const computerResource = useApiResource<ComputerDetail>(`/api/computers/${encodedGuid}`);
  const sessionQuery = new URLSearchParams({ clientGuid });
  if (from) sessionQuery.set("from", from);
  if (to) sessionQuery.set("to", to);
  const sessionsResource = useApiResource<SessionRecord[]>(`/api/history?${sessionQuery}`);
  const computer = computerResource.data;
  const sessions = sessionsResource.data ?? [];

  if (computerResource.loading || computerResource.error || !computer) {
    return (
      <>
        <Link className="back-button" to="/logbook">
          ← Back to computers
        </Link>
        <DataState
          empty={!computerResource.loading && !computerResource.error && !computer}
          emptyText="This computer may have been removed from the database."
          emptyTitle="Computer not found"
          error={computerResource.error}
          loading={computerResource.loading}
          onRetry={computerResource.reload}
        />
      </>
    );
  }

  return (
    <>
      <Link className="back-button" to="/logbook">
        ← Back to computers
      </Link>
      <section className="detail-hero">
        <div className="detail-icon">
          <Icon name="monitor" size={28} />
          {computer.isOnline && <i />}
        </div>
        <div>
          <span>Computer details</span>
          <h1>{computer.displayName}</h1>
          <p>
            {computer.machineName}
            {computer.ipAddress ? ` · ${computer.ipAddress}` : ""}
          </p>
        </div>
        <span className={`status ${computer.isOnline ? "online" : "offline"}`}>
          <i />
          {computer.isOnline ? "Online" : "Offline"}
        </span>
      </section>
      <section className="detail-stats">
        <article>
          <span>Client ID</span>
          <strong className="mono client-id-value">{computer.clientGuid}</strong>
        </article>
        <article>
          <span>Last activity</span>
          <strong>{formatRelativeTime(computer.lastSeen)}</strong>
        </article>
        <article>
          <span>Sessions today</span>
          <strong>{computer.sessionsToday}</strong>
        </article>
        <article>
          <span>Current user</span>
          <strong>{computer.currentStudent || "None"}</strong>
        </article>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Session activity</h2>
            <p>{computer.firstSeen ? `Registered ${formatDateTime(computer.firstSeen)}` : "Session history"}</p>
          </div>
          <div className="detail-filter">
            <label>
              <span>From</span>
              <input onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
            </label>
            <label>
              <span>To</span>
              <input onChange={(event) => setTo(event.target.value)} type="date" value={to} />
            </label>
            <button
              aria-label="Refresh computer sessions"
              className="row-arrow refresh-button"
              onClick={sessionsResource.reload}
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        <DataState
          empty={!sessionsResource.loading && !sessionsResource.error && sessions.length === 0}
          emptyText="Logins from this computer will appear here."
          emptyTitle="No session activity"
          error={sessionsResource.error}
          loading={sessionsResource.loading}
          onRetry={sessionsResource.reload}
        />
        {!sessionsResource.loading && !sessionsResource.error && sessions.length > 0 && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Email address</th>
                    <th>Student ID</th>
                    <th>Time in</th>
                    <th>Time out</th>
                    <th>Duration</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.slice(0, 10).map((session) => (
                    <tr key={session.sessionId}>
                      <td>{session.studentName}</td>
                      <td>{session.email || "—"}</td>
                      <td className="mono">{session.studentId}</td>
                      <td>{formatDateTime(session.loginTime)}</td>
                      <td>{formatDateTime(session.logoutTime)}</td>
                      <td>{formatDuration(session.durationMinutes)}</td>
                      <td>{session.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-foot">
              <span>
                Showing {Math.min(10, sessions.length)} of {sessions.length} sessions
              </span>
            </div>
          </>
        )}
      </section>
    </>
  );
}

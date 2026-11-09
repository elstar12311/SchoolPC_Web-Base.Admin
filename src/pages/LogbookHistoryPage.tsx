import { useMemo, useState } from "react";
import type { LogbookData, SessionRecord } from "../data";
import { formatDateTime, formatDuration, localDateInput } from "../data";
import { useApiResource } from "../hooks/useApiResource";
import DataState from "../components/DataState";
import Icon from "../components/Icon";

function exportCsv(records: SessionRecord[]) {
  const columns = ["Computer", "Student", "Email", "Student ID", "Time in", "Time out", "Duration", "Remarks"];
  const cell = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`;
  const rows = records.map((record) =>
    [
      record.computer,
      record.studentName,
      record.email,
      record.studentId,
      record.loginTime,
      record.logoutTime,
      formatDuration(record.durationMinutes),
      record.remarks,
    ]
      .map(cell)
      .join(","),
  );
  const content = [columns.map(cell).join(","), ...rows].join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "schoolpc-session-history.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function LogbookHistoryPage() {
  const today = localDateInput(new Date());
  const initialFrom = new Date();
  initialFrom.setDate(initialFrom.getDate() - 7);
  const [from, setFrom] = useState(localDateInput(initialFrom));
  const [to, setTo] = useState(today);
  const [clientGuid, setClientGuid] = useState("");
  const [search, setSearch] = useState("");
  const { data: computers } = useApiResource<LogbookData>("/api/logbook");
  const query = new URLSearchParams();
  if (from) query.set("from", from);
  if (to) query.set("to", to);
  if (clientGuid) query.set("clientGuid", clientGuid);
  if (search.trim()) query.set("search", search.trim());
  const path = `/api/history?${query.toString()}`;
  const { data, loading, error, reload } = useApiResource<SessionRecord[]>(path);

  const records = data ?? [];
  const periodLabel = useMemo(() => {
    if (!from && !to) return "All available dates";
    return `${from || "Any date"} to ${to || "Any date"}`;
  }, [from, to]);

  return (
    <>
      <div className="page-intro">
        <div>
          <span>Activity records</span>
          <h1>Logbook History</h1>
          <p>Review and export student computer sessions.</p>
        </div>
        <button className="primary-button" disabled={!records.length} onClick={() => exportCsv(records)}>
          <Icon name="download" />
          Export CSV
        </button>
      </div>
      <section className="filter-card">
        <label>
          <span>From</span>
          <input onChange={(event) => setFrom(event.target.value)} type="date" value={from} />
        </label>
        <label>
          <span>To</span>
          <input onChange={(event) => setTo(event.target.value)} type="date" value={to} />
        </label>
        <label>
          <span>Computer</span>
          <select onChange={(event) => setClientGuid(event.target.value)} value={clientGuid}>
            <option value="">All computers</option>
            {(computers?.computers ?? []).map((computer) => (
              <option key={computer.clientGuid} value={computer.clientGuid}>
                {computer.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Search records</span>
          <div className="search-box">
            <Icon name="search" size={16} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, ID, or email"
              value={search}
            />
          </div>
        </label>
      </section>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Session records</h2>
            <p>
              {loading ? "Loading records…" : `${records.length} sessions · ${periodLabel}`}
            </p>
          </div>
          <div className="panel-tools">
            <button aria-label="Refresh session records" className="row-arrow refresh-button" onClick={reload}>
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        <DataState
          empty={!loading && !error && records.length === 0}
          emptyText="Try a different date range or search term."
          emptyTitle="No sessions found"
          error={error}
          loading={loading}
          onRetry={reload}
        />
        {!loading && !error && records.length > 0 && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Computer</th>
                    <th>Student</th>
                    <th>Email</th>
                    <th>Student ID</th>
                    <th>Time in</th>
                    <th>Time out</th>
                    <th>Duration</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.sessionId}>
                      <td>{record.computer}</td>
                      <td>{record.studentName}</td>
                      <td>{record.email || "—"}</td>
                      <td className="mono">{record.studentId}</td>
                      <td>{formatDateTime(record.loginTime)}</td>
                      <td>{formatDateTime(record.logoutTime)}</td>
                      <td>{formatDuration(record.durationMinutes)}</td>
                      <td>
                        {record.remarks === "—" ? "—" : <span className="remark">{record.remarks}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-foot">
              <span>Showing {records.length} session records (maximum 500)</span>
              <button className="refresh-text-button" onClick={reload}>
                <Icon name="refresh" size={17} />
                Refresh records
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

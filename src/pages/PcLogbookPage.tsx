import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatRelativeTime, type ComputerRecord, type LogbookData } from "../data";
import { useApiResource } from "../hooks/useApiResource";
import DataState from "../components/DataState";
import Icon from "../components/Icon";

function StatCard({
  icon,
  tone,
  label,
  value,
  detail,
}: {
  icon: string;
  tone: string;
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <article>
      <div className={`stat-icon ${tone}`}>
        <Icon name={icon} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </article>
  );
}

export default function PcLogbookPage() {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useApiResource<LogbookData>("/api/logbook");
  const [showOffline, setShowOffline] = useState(true);

  const computers = useMemo(() => {
    const records = data?.computers ?? [];
    return records.filter((computer) => showOffline || computer.isOnline);
  }, [data?.computers, showOffline]);

  const summary = data?.summary;

  return (
    <>
      <div className="page-intro">
        <div>
          <span>Live overview</span>
          <h1>PC Logbook</h1>
          <p>Monitor computer activity.</p>
        </div>
      </div>
      <section className="stats">
        <StatCard
          icon="monitor"
          tone="coral"
          label="Total computers"
          value={summary?.totalComputers ?? "—"}
        />
        <StatCard
          icon="activity"
          tone="cyan"
          label="Currently online PCs"
          value={summary?.onlineComputers ?? "—"}
        />
        <StatCard
          icon="users"
          tone="amber"
          label="Sessions today"
          value={summary?.sessionsToday ?? "—"}
        />
        <StatCard
          icon="alert"
          tone="red"
          label="Problem Report"
          value={summary?.openReports ?? "—"}
          detail="Needs attention"
        />
      </section>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Computer status</h2>
          </div>
          <div className="panel-tools">
            <label className="switch-label">
              <input
                checked={showOffline}
                onChange={(event) => setShowOffline(event.target.checked)}
                type="checkbox"
              />
              <span className="switch" />
              <b>Show offline</b>
            </label>
            <button
              aria-label="Refresh computer status"
              className="row-arrow refresh-button"
              onClick={reload}
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        <DataState
          empty={!loading && !error && computers.length === 0}
          emptyText={
            data?.computers.length
              ? "Try changing the online filter."
              : "Registered computers will appear when available."
          }
          emptyTitle={data?.computers.length ? "No matching computers" : "No computers registered"}
          error={error}
          loading={loading}
          onRetry={reload}
        />
        {!loading && !error && computers.length > 0 && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Computer</th>
                    <th>Machine name</th>
                    <th>IP address</th>
                    <th>Last seen</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {computers.map((computer: ComputerRecord) => (
                    <tr
                      className="clickable"
                      key={computer.clientGuid}
                      onClick={() => {
                        navigate(`/computers/${encodeURIComponent(computer.clientGuid)}`);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          navigate(`/computers/${encodeURIComponent(computer.clientGuid)}`);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>
                        <div className="pc-name">
                          <span>
                            <Icon name="monitor" size={17} />
                          </span>
                          <div>
                            <strong>{computer.displayName}</strong>
                            <small>
                              {computer.groupName || `PUID …${computer.clientGuid.slice(-4)}`}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="mono">{computer.machineName}</td>
                      <td className="mono">{computer.ipAddress || "—"}</td>
                      <td>{formatRelativeTime(computer.lastSeen)}</td>
                      <td>
                        <span className={`status ${computer.isOnline ? "online" : "offline"}`}>
                          <i />
                          {computer.isOnline ? "Online" : "Offline"}
                        </span>
                      </td>
                      <td>
                        <button
                          aria-label={`View ${computer.displayName}`}
                          className="row-arrow"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/computers/${encodeURIComponent(computer.clientGuid)}`);
                          }}
                        >
                          <Icon name="chevron" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-foot">
              <span>
                Showing {computers.length} of {data?.computers.length ?? 0} computers
              </span>
              <button className="refresh-text-button" onClick={reload}>
                <Icon name="refresh" size={17} />
                Refresh status
              </button>
            </div>
          </>
        )}
      </section>
    </>
  );
}

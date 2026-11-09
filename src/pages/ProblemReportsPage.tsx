import { useMemo, useState } from "react";
import { ApiError, apiRequest } from "../api";
import type { ProblemReport } from "../data";
import { formatDateTime } from "../data";
import { useApiResource } from "../hooks/useApiResource";
import DataState from "../components/DataState";
import Icon from "../components/Icon";
import { useToast } from "../components/ToastContext";

export default function ProblemReportsPage() {
  const { data, loading, error, reload } = useApiResource<ProblemReport[]>("/api/reports");
  const [selectedStatus, setSelectedStatus] = useState<"open" | "resolved">("open");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [working, setWorking] = useState(false);
  const { notify } = useToast();

  const allReports = data ?? [];
  const openCount = allReports.filter((report) => report.status.toLowerCase() === "open").length;
  const resolvedCount = allReports.filter(
    (report) => report.status.toLowerCase() === "resolved",
  ).length;
  const reports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allReports.filter((report) => {
      if (report.status.toLowerCase() !== selectedStatus) return false;
      if (!query) return true;
      return [
        report.reportId.toString(),
        report.computer,
        report.studentName,
        report.studentId,
        report.message,
      ].some((value) => value.toLowerCase().includes(query));
    });
  }, [allReports, search, selectedStatus]);
  const allVisibleSelected =
    reports.length > 0 && reports.every(({ reportId }) => selectedIds.includes(reportId));

  function changeStatus(status: "open" | "resolved") {
    setSelectedStatus(status);
    setSelectedIds([]);
  }

  async function updateReportStatus(report: ProblemReport) {
    setWorking(true);
    try {
      await apiRequest<void>(`/api/reports/${report.reportId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ resolved: report.status.toLowerCase() !== "resolved" }),
      });
      setSelectedReport(null);
      notify(
        report.status.toLowerCase() === "resolved"
          ? "Report reopened."
          : "Report marked as resolved.",
      );
      reload();
    } catch (cause) {
      notify(
        cause instanceof ApiError ? cause.message : "The report status could not be updated.",
        "error",
      );
    } finally {
      setWorking(false);
    }
  }

  async function deleteSelectedReports() {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.length} selected resolved report${selectedIds.length === 1 ? "" : "s"} from the active list? The records will be retained in the database.`,
      )
    ) {
      return;
    }

    setWorking(true);
    try {
      const result = await apiRequest<{ archived: number }>("/api/reports/resolved", {
        method: "DELETE",
        body: JSON.stringify({ reportIds: selectedIds }),
      });
      setSelectedIds([]);
      setSelectedReport(null);
      reload();
      if (result.archived === 0) {
        notify("No selected resolved reports were found to delete.", "error");
      } else {
        notify(
          `${result.archived} resolved report${result.archived === 1 ? "" : "s"} removed from this list. Records remain in the database.`,
        );
      }
    } catch (cause) {
      notify(
        cause instanceof ApiError ? cause.message : "Resolved reports could not be deleted.",
        "error",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <div className="page-intro">
        <div>
          <span>Support center</span>
          <h1>Problem Reports</h1>
          <p>Track technical issues reported by students.</p>
        </div>
      </div>
      <section className="panel reports-panel">
        <div className="reports-toolbar">
          <div className="tabs">
            <button
              className={selectedStatus === "open" ? "active" : ""}
              onClick={() => changeStatus("open")}
            >
              Unresolved <span>{openCount}</span>
            </button>
            <button
              className={selectedStatus === "resolved" ? "active" : ""}
              onClick={() => changeStatus("resolved")}
            >
              Resolved <span>{resolvedCount}</span>
            </button>
          </div>
          <div className="panel-tools">
            <label className="search-box">
              <Icon name="search" size={16} />
              <input
                aria-label="Search reports"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search reports…"
                value={search}
              />
            </label>
            <button
              aria-label="Refresh reports"
              className="row-arrow refresh-button"
              onClick={reload}
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        {selectedStatus === "resolved" && selectedIds.length > 0 && (
          <div className="report-bulk-actions">
            <span>{selectedIds.length} selected</span>
            <button className="danger-button" disabled={working} onClick={deleteSelectedReports}>
              Delete selected
            </button>
          </div>
        )}
        <DataState
          empty={!loading && !error && reports.length === 0}
          emptyText="Reports received from the kiosk will appear here."
          emptyTitle={`No ${selectedStatus === "open" ? "unresolved" : "resolved"} reports`}
          error={error}
          loading={loading}
          onRetry={reload}
        />
        {!loading && !error && reports.length > 0 && (
          <>
            <div className="table-scroll">
              <table className="reports-table">
                <thead>
                  <tr>
                    {selectedStatus === "resolved" && (
                      <th className="report-selection">
                        <input
                          aria-label="Select all resolved reports"
                          checked={allVisibleSelected}
                          className="selection-checkbox"
                          onChange={(event) =>
                            setSelectedIds(
                              event.target.checked
                                ? [
                                    ...new Set([
                                      ...selectedIds,
                                      ...reports.map(({ reportId }) => reportId),
                                    ]),
                                  ]
                                : selectedIds.filter(
                                    (id) => !reports.some((report) => report.reportId === id),
                                  ),
                            )
                          }
                          type="checkbox"
                        />
                      </th>
                    )}
                    <th>Computer</th>
                    <th>Reported by</th>
                    <th>Issue summary</th>
                    <th>Reported at</th>
                    {selectedStatus === "resolved" ? (
                      <>
                        <th>Resolved on</th>
                        <th>Resolved by</th>
                        <th>Status</th>
                      </>
                    ) : null}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr
                      className="clickable"
                      key={report.reportId}
                      onClick={() => setSelectedReport(report)}
                    >
                      {selectedStatus === "resolved" && (
                        <td onClick={(event) => event.stopPropagation()}>
                          <input
                            aria-label={`Select resolved report ${report.reportId}`}
                            checked={selectedIds.includes(report.reportId)}
                            className="selection-checkbox"
                            onChange={(event) =>
                              setSelectedIds((ids) =>
                                event.target.checked
                                  ? [...ids, report.reportId]
                                  : ids.filter((id) => id !== report.reportId),
                              )
                            }
                            type="checkbox"
                          />
                        </td>
                      )}
                      <td>
                        <div className="report-pc">
                          <span>
                            <Icon name="monitor" size={16} />
                          </span>
                          <strong>{report.computer}</strong>
                        </div>
                      </td>
                      <td>{report.studentName}</td>
                      <td className="issue-summary">{report.message}</td>
                      <td>{formatDateTime(report.createdAt)}</td>
                      {selectedStatus === "resolved" && (
                        <>
                          <td>{formatDateTime(report.resolvedAt)}</td>
                          <td>{report.resolvedBy || "—"}</td>
                          <td>
                            <span className="report-status is-resolved">
                              <i />
                              Resolved
                            </span>
                          </td>
                        </>
                      )}
                      <td>
                        <button
                          aria-label={`View report ${report.reportId}`}
                          className="row-arrow"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedReport(report);
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
                Showing {reports.length} {selectedStatus === "open" ? "unresolved" : "resolved"}{" "}
                reports
              </span>
              <span>Click a row to review details</span>
            </div>
          </>
        )}
      </section>
      {selectedReport && (
        <div className="modal-layer" onClick={() => setSelectedReport(null)}>
          <section
            aria-labelledby="report-detail-title"
            aria-modal="true"
            className="report-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-head">
              <div
                className={`modal-symbol ${selectedReport.status.toLowerCase() === "resolved" ? "resolved" : ""}`}
              >
                <Icon name="alert" />
              </div>
              <div>
                <span>Student report</span>
                <h2 id="report-detail-title">{selectedReport.computer}</h2>
              </div>
              <button
                aria-label="Close report details"
                className="modal-close"
                onClick={() => setSelectedReport(null)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-status-row">
                <span
                  className={`report-status ${selectedReport.status.toLowerCase() === "resolved" ? "is-resolved" : "is-open"}`}
                >
                  <i />
                  {selectedReport.status}
                </span>
                <time>{formatDateTime(selectedReport.createdAt)}</time>
              </div>
              <div className="issue-detail">
                <span>Issue description</span>
                <p>{selectedReport.message}</p>
              </div>
              <div className="report-detail-grid">
                <div>
                  <span>Reported by</span>
                  <strong>{selectedReport.studentName}</strong>
                </div>
                <div>
                  <span>Student ID</span>
                  <strong>{selectedReport.studentId}</strong>
                </div>
                <div>
                  <span>Client ID</span>
                  <strong>{selectedReport.clientGuid}</strong>
                </div>
                {selectedReport.status.toLowerCase() === "resolved" && (
                  <>
                    <div>
                      <span>Resolved on</span>
                      <strong>{formatDateTime(selectedReport.resolvedAt)}</strong>
                    </div>
                    <div>
                      <span>Resolved by</span>
                      <strong>{selectedReport.resolvedBy || "—"}</strong>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-actions">
              <button
                className="ghost-button"
                disabled={working}
                onClick={() => setSelectedReport(null)}
              >
                Close
              </button>
              <button
                className={
                  selectedReport.status.toLowerCase() === "resolved"
                    ? "ghost-button"
                    : "modal-resolve"
                }
                disabled={working}
                onClick={() => updateReportStatus(selectedReport)}
              >
                {working
                  ? "Saving…"
                  : selectedReport.status.toLowerCase() === "resolved"
                    ? "Reopen report"
                    : "Mark as resolved"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

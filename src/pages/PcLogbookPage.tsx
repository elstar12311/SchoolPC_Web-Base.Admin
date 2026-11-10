import {
  Fragment,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type MouseEvent,
} from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ApiError, apiRequest } from "../api";
import { useToast } from "../components/ToastContext";
import {
  formatRelativeTime,
  type ComputerGroup,
  type ComputerRecord,
  type LogbookData,
} from "../data";
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

function getErrorMessage(cause: unknown, fallback: string) {
  return cause instanceof ApiError ? cause.message : fallback;
}

export default function PcLogbookPage() {
  const navigate = useNavigate();
  const [groupFilter, setGroupFilter] = useState("all");
  const [showOffline, setShowOffline] = useState(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    left: number;
    top: number;
    maxHeight: number;
  } | null>(null);
  const [editingComputer, setEditingComputer] = useState<ComputerRecord | null>(null);
  const [manageGroups, setManageGroups] = useState(false);
  const [working, setWorking] = useState(false);
  const [dialogError, setDialogError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [editGroupId, setEditGroupId] = useState("");
  const [duplicateNameWarning, setDuplicateNameWarning] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [renamingGroupId, setRenamingGroupId] = useState<number | null>(null);
  const [renamedGroupName, setRenamedGroupName] = useState("");

  const query = new URLSearchParams({ groupId: groupFilter });
  const { data, loading, error, updatedAt, reload } = useApiResource<LogbookData>(
    `/api/logbook?${query.toString()}`,
  );
  const groupsResource = useApiResource<ComputerGroup[]>("/api/groups");
  const { notify } = useToast();
  const groups = groupsResource.data ?? [];
  const computers = useMemo(() => {
    const records = data?.computers ?? [];
    return records.filter((computer) => showOffline || computer.isOnline);
  }, [data?.computers, showOffline]);
  const computerSections = useMemo(() => {
    const sections: Array<{
      key: string;
      label: string;
      computers: ComputerRecord[];
    }> = [];
    for (const computer of computers) {
      const key = computer.groupId === null ? "none" : String(computer.groupId);
      let section = sections[sections.length - 1];
      if (!section || section.key !== key) {
        section = {
          key,
          label: computer.groupName ?? "No group",
          computers: [],
        };
        sections.push(section);
      }
      section.computers.push(computer);
    }
    return sections;
  }, [computers]);

  const summary = data?.summary;
  const activeMenuComputer = computers.find((computer) => computer.clientGuid === openMenu);

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-pc-action-menu], [data-pc-action-trigger]")
      ) {
        return;
      }
      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenu]);

  function handleScroll() {
    setOpenMenu(null);
  }

  function openComputerEditor(computer: ComputerRecord) {
    setOpenMenu(null);
    setEditingComputer(computer);
    setDisplayName(computer.displayName === computer.machineName ? "" : computer.displayName);
    setEditGroupId(computer.groupId === null ? "" : String(computer.groupId));
    setDialogError("");
    setDuplicateNameWarning(false);
  }

  function stopRowClick(event: MouseEvent) {
    event.stopPropagation();
  }

  function toggleActionMenu(event: MouseEvent<HTMLButtonElement>, menuId: string) {
    event.stopPropagation();
    if (openMenu === menuId) {
      setOpenMenu(null);
      return;
    }

    const buttonBounds = event.currentTarget.getBoundingClientRect();
    const menuWidth = 170;
    const menuHeight = 190;
    const viewportPadding = 8;
    const roomAbove = Math.max(0, buttonBounds.top - viewportPadding);
    const roomBelow = Math.max(0, window.innerHeight - buttonBounds.bottom - viewportPadding);
    const openUp = roomBelow < menuHeight && roomAbove > roomBelow;
    const maxHeight = Math.max(80, Math.min(320, openUp ? roomAbove : roomBelow));
    const left = Math.max(
      viewportPadding,
      Math.min(buttonBounds.right - menuWidth, window.innerWidth - menuWidth - viewportPadding),
    );
    const top = openUp
      ? Math.max(viewportPadding, buttonBounds.top - Math.min(menuHeight, maxHeight) - 4)
      : buttonBounds.bottom + 4;
    setMenuPosition({ left, top, maxHeight });
    setOpenMenu(menuId);
  }

  async function saveComputer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingComputer) return;

    setWorking(true);
    setDialogError("");
    try {
      const result = await apiRequest<{ warning: boolean; message: string | null }>(
        `/api/computers/${encodeURIComponent(editingComputer.clientGuid)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            displayName,
            groupId: editGroupId === "" ? null : Number(editGroupId),
          }),
        },
      );
      setDuplicateNameWarning(result.warning);
      if (!result.warning) setEditingComputer(null);
      reload();
      groupsResource.reload();
    } catch (cause) {
      setDialogError(getErrorMessage(cause, "The PC could not be updated."));
    } finally {
      setWorking(false);
    }
  }

  async function changeComputerActive(computer: ComputerRecord) {
    setWorking(true);
    setDialogError("");
    try {
      await apiRequest<void>(
        `/api/computers/${encodeURIComponent(computer.clientGuid)}/active`,
        {
          method: "PATCH",
          body: JSON.stringify({ isActive: !computer.isActive }),
        },
      );
      setEditingComputer(null);
      setOpenMenu(null);
      reload();
    } catch (cause) {
      const message = getErrorMessage(cause, "The PC status could not be changed.");
      if (editingComputer?.clientGuid === computer.clientGuid) setDialogError(message);
      else notify(message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function moveComputer(computer: ComputerRecord, direction: "up" | "down") {
    setOpenMenu(null);
    try {
      const result = await apiRequest<{ moved: boolean; message: string }>(
        `/api/computers/${encodeURIComponent(computer.clientGuid)}/move`,
        {
          method: "POST",
          body: JSON.stringify({ direction }),
        },
      );
      reload();
      if (!result.moved) notify(result.message, "error");
    } catch (cause) {
      notify(getErrorMessage(cause, "The PC could not be moved."), "error");
    }
  }

  function openGroupsDialog() {
    setManageGroups(true);
    setDialogError("");
    setNewGroupName("");
    groupsResource.reload();
  }

  async function createGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorking(true);
    setDialogError("");
    try {
      await apiRequest<ComputerGroup>("/api/groups", {
        method: "POST",
        body: JSON.stringify({ name: newGroupName }),
      });
      setNewGroupName("");
      groupsResource.reload();
      reload();
    } catch (cause) {
      setDialogError(getErrorMessage(cause, "The group could not be created."));
    } finally {
      setWorking(false);
    }
  }

  async function renameGroup(group: ComputerGroup) {
    setWorking(true);
    setDialogError("");
    try {
      await apiRequest<void>(`/api/groups/${group.groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: renamedGroupName }),
      });
      setRenamingGroupId(null);
      groupsResource.reload();
      reload();
    } catch (cause) {
      setDialogError(getErrorMessage(cause, "The group could not be renamed."));
    } finally {
      setWorking(false);
    }
  }

  async function deleteGroup(group: ComputerGroup) {
    if (
      !window.confirm(
        `Delete "${group.groupName}"? ${group.pcCount} ${group.pcCount === 1 ? "PC will" : "PCs will"} become ungrouped.`,
      )
    ) {
      return;
    }

    setWorking(true);
    setDialogError("");
    try {
      await apiRequest<{ affectedComputers: number }>(`/api/groups/${group.groupId}`, {
        method: "DELETE",
      });
      if (groupFilter === String(group.groupId)) setGroupFilter("all");
      groupsResource.reload();
      reload();
    } catch (cause) {
      setDialogError(getErrorMessage(cause, "The group could not be deleted."));
    } finally {
      setWorking(false);
    }
  }

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
        <div className="panel-head pc-panel-head">
          <div>
            <h2>Computer list</h2>
            {updatedAt && (
              <p>
                Last updated{" "}
                {updatedAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </p>
            )}
          </div>
          <div className="panel-tools pc-panel-tools">
            <label className="pc-filter">
              <span>Group</span>
              <select
                aria-label="Filter by PC group"
                onChange={(event) => setGroupFilter(event.target.value)}
                value={groupFilter}
              >
                <option value="all">All groups</option>
                <option value="none">No group</option>
                {groups.map((group) => (
                  <option key={group.groupId} value={group.groupId}>
                    {group.groupName}
                  </option>
                ))}
              </select>
            </label>
            <label className="switch-label">
              <input
                checked={showOffline}
                onChange={(event) => setShowOffline(event.target.checked)}
                type="checkbox"
              />
              <span className="switch" />
              <b>Show offline</b>
            </label>
            <button className="ghost-button pc-groups-button" onClick={openGroupsDialog}>
              Manage groups
            </button>
            <button
              aria-label="Refresh computer status"
              className="row-arrow refresh-button"
              onClick={reload}
              title="Refresh"
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        {error && data && (
          <div className="pc-refresh-error" role="status">
            Could not refresh the list. Showing the last loaded data.
          </div>
        )}
        {!data && (
          <DataState
            empty={false}
            error={error}
            loading={loading}
            onRetry={reload}
          />
        )}
        {data && computers.length === 0 && (
          <DataState
            empty
            emptyText={
              data.computers.length
                ? "Try changing the group or online filter."
                : "Registered computers will appear when available."
            }
            emptyTitle={data.computers.length ? "No matching computers" : "No computers registered"}
            error={false}
            loading={false}
            onRetry={reload}
          />
        )}
        {data && computers.length > 0 && (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Display name</th>
                    <th>Machine name</th>
                    <th>IP address</th>
                    <th>Last seen</th>
                    <th>Online</th>
                    <th>Group</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {computerSections.map((section) => (
                    <Fragment key={section.key}>
                      {groupFilter === "all" && (
                        <tr className="pc-group-heading">
                          <td colSpan={7}>
                            <strong>{section.label}</strong>
                            <span>
                              {section.computers.length}{" "}
                              {section.computers.length === 1 ? "PC" : "PCs"}
                            </span>
                          </td>
                        </tr>
                      )}
                      {section.computers.map((computer) => {
                        const menuId = computer.clientGuid;
                        const menuOpen = openMenu === menuId;
                        return (
                          <tr
                            className="clickable"
                            key={computer.clientGuid}
                            onClick={() => {
                              setOpenMenu(null);
                              navigate(`/computers/${encodeURIComponent(computer.clientGuid)}`);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && event.target === event.currentTarget) {
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
                                  <small>PUID …{computer.clientGuid.slice(-4)}</small>
                                </div>
                              </div>
                            </td>
                            <td className="mono">{computer.machineName}</td>
                            <td className="mono">{computer.ipAddress || "—"}</td>
                            <td title={computer.lastSeen ?? undefined}>
                              {formatRelativeTime(computer.lastSeen)}
                            </td>
                            <td>
                              <span className={`status ${computer.isOnline ? "online" : "offline"}`}>
                                <i />
                                {computer.isOnline ? "Online" : "Offline"}
                              </span>
                            </td>
                            <td>{computer.groupName || "No group"}</td>
                            <td onClick={stopRowClick}>
                              <div className={`action-wrap ${menuOpen ? "action-open" : ""}`}>
                                <button
                                  aria-expanded={menuOpen}
                                  aria-label={`Actions for ${computer.displayName}`}
                                  className="dots-button"
                                  data-pc-action-trigger
                                  onClick={(event) => toggleActionMenu(event, menuId)}
                                >
                                  <Icon name="dots" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="panel-foot">
              <span>
                Showing {computers.length} of {data.computers.length} computers
              </span>
              <button className="refresh-text-button" onClick={reload}>
                <Icon name="refresh" size={17} />
                Refresh
              </button>
            </div>
          </>
        )}
      </section>

      {activeMenuComputer &&
        menuPosition &&
        createPortal(
          <div
            className="action-menu pc-action-menu-portal"
            data-pc-action-menu
            onClick={stopRowClick}
            style={{
              left: menuPosition.left,
              top: menuPosition.top,
              maxHeight: menuPosition.maxHeight,
            }}
          >
            <button
              onClick={() => {
                setOpenMenu(null);
                navigate(
                  `/computers/${encodeURIComponent(activeMenuComputer.clientGuid)}`,
                );
              }}
            >
              Open logbook
            </button>
            <button onClick={() => openComputerEditor(activeMenuComputer)}>Edit PC</button>
            <button onClick={() => void moveComputer(activeMenuComputer, "up")}>Move up</button>
            <button onClick={() => void moveComputer(activeMenuComputer, "down")}>Move down</button>
            <button
              className={activeMenuComputer.isActive ? "danger-text" : ""}
              onClick={() => void changeComputerActive(activeMenuComputer)}
            >
              {activeMenuComputer.isActive ? "Deactivate" : "Reactivate"}
            </button>
          </div>,
          document.body,
        )}

      {editingComputer && (
        <div
          className="modal-layer"
          onClick={(event) => {
            if (event.target === event.currentTarget && !working) setEditingComputer(null);
          }}
        >
          <section aria-labelledby="edit-pc-title" aria-modal="true" className="report-modal" role="dialog">
            <div className="modal-head">
              <div className="modal-symbol">
                <Icon name="monitor" />
              </div>
              <div>
                <span>Computer settings</span>
                <h2 id="edit-pc-title">Edit PC</h2>
              </div>
              <button
                aria-label="Close dialog"
                className="modal-close"
                disabled={working}
                onClick={() => setEditingComputer(null)}
              >
                <Icon name="close" />
              </button>
            </div>
            <form onSubmit={(event) => void saveComputer(event)}>
              <div className="modal-body form-grid">
                <label>
                  Display name
                  <input
                    maxLength={150}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder={editingComputer.machineName}
                    value={displayName}
                  />
                  <small>Leave blank to follow the current Windows name.</small>
                </label>
                <label>
                  Group
                  <select
                    onChange={(event) => setEditGroupId(event.target.value)}
                    value={editGroupId}
                  >
                    <option value="">No group</option>
                    {groups.map((group) => (
                      <option key={group.groupId} value={group.groupId}>
                        {group.groupName}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Windows name
                  <input readOnly value={editingComputer.machineName} />
                </label>
                <label>
                  IP address
                  <input readOnly value={editingComputer.ipAddress ?? "—"} />
                </label>
                <label>
                  PC Unique ID
                  <input readOnly value={editingComputer.clientGuid} />
                </label>
                {dialogError && <p className="auth-error" role="alert">{dialogError}</p>}
                {duplicateNameWarning && (
                  <p className="pc-duplicate-warning" role="status">
                    Another PC already uses this display name.
                  </p>
                )}
                <button
                  className={editingComputer.isActive ? "danger-button" : "ghost-button"}
                  disabled={working}
                  onClick={() => void changeComputerActive(editingComputer)}
                  type="button"
                >
                  {editingComputer.isActive ? "Deactivate PC" : "Reactivate PC"}
                </button>
              </div>
              <div className="modal-actions">
                <button
                  className="ghost-button"
                  disabled={working}
                  onClick={() => setEditingComputer(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={working} type="submit">
                  {working ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {manageGroups && (
        <div
          className="modal-layer"
          onClick={(event) => {
            if (event.target === event.currentTarget && !working) setManageGroups(false);
          }}
        >
          <section aria-labelledby="manage-groups-title" aria-modal="true" className="report-modal" role="dialog">
            <div className="modal-head">
              <div className="modal-symbol">
                <Icon name="grid" />
              </div>
              <div>
                <span>Computer organization</span>
                <h2 id="manage-groups-title">Manage groups</h2>
              </div>
              <button
                aria-label="Close dialog"
                className="modal-close"
                disabled={working}
                onClick={() => setManageGroups(false)}
              >
                <Icon name="close" />
              </button>
            </div>
            <div className="modal-body pc-group-manager">
              <form className="pc-group-create" onSubmit={(event) => void createGroup(event)}>
                <label className="form-grid">
                  New group name
                  <input
                    maxLength={100}
                    onChange={(event) => setNewGroupName(event.target.value)}
                    placeholder="Enter a group name"
                    value={newGroupName}
                  />
                </label>
                <button className="primary-button" disabled={working} type="submit">
                  <Icon name="plus" size={17} />
                  Add group
                </button>
              </form>
              {dialogError && <p className="auth-error" role="alert">{dialogError}</p>}
              {groupsResource.loading && groups.length === 0 ? (
                <p className="pc-groups-empty">Loading groups…</p>
              ) : groupsResource.error && groups.length === 0 ? (
                <div className="pc-groups-error" role="alert">
                  Unable to load groups.
                  <button className="ghost-button" onClick={groupsResource.reload} type="button">
                    Try again
                  </button>
                </div>
              ) : groups.length === 0 ? (
                <p className="pc-groups-empty">No groups have been created.</p>
              ) : (
                <div className="pc-group-list">
                  {groups.map((group) => (
                    <div className="pc-group-item" key={group.groupId}>
                      {renamingGroupId === group.groupId ? (
                        <>
                          <input
                            aria-label={`Rename ${group.groupName}`}
                            maxLength={100}
                            onChange={(event) => setRenamedGroupName(event.target.value)}
                            value={renamedGroupName}
                          />
                          <button
                            className="primary-button small"
                            disabled={working}
                            onClick={() => void renameGroup(group)}
                            type="button"
                          >
                            Save
                          </button>
                          <button
                            className="ghost-button"
                            disabled={working}
                            onClick={() => setRenamingGroupId(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div>
                            <strong>{group.groupName}</strong>
                            <small>
                              {group.pcCount} {group.pcCount === 1 ? "PC" : "PCs"}
                            </small>
                          </div>
                          <button
                            className="ghost-button"
                            disabled={working}
                            onClick={() => {
                              setRenamingGroupId(group.groupId);
                              setRenamedGroupName(group.groupName);
                              setDialogError("");
                            }}
                            type="button"
                          >
                            Rename
                          </button>
                          <button
                            className="danger-button"
                            disabled={working}
                            onClick={() => void deleteGroup(group)}
                            type="button"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button
                className="ghost-button"
                disabled={working}
                onClick={() => setManageGroups(false)}
                type="button"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

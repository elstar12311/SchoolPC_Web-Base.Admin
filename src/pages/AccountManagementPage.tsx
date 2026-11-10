import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ApiError, apiRequest } from "../api";
import type { AccountDirectory, AdminAccount, BannedStudent, StudentAccount } from "../data";
import { initials } from "../data";
import { useApiResource } from "../hooks/useApiResource";
import DataState from "../components/DataState";
import Icon from "../components/Icon";
import { useToast } from "../components/ToastContext";

type AccountView = "students" | "admins" | "banned";
type ManagedAccount = StudentAccount | AdminAccount;

interface AccountForm {
  studentId: string;
  username: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  role: string;
  password: string;
}

const emptyForm: AccountForm = {
  studentId: "",
  username: "",
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  role: "admin",
  password: "",
};

function messageFromError(cause: unknown) {
  return cause instanceof ApiError
    ? cause.message
    : "The request could not be completed. Please try again.";
}

function studentIdFromEmail(email: string) {
  return email.match(/^[^@\s]+_(\d+)@uic\.edu\.ph$/i)?.[1] ?? null;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
  };
}

function fullNameFromForm(form: AccountForm) {
  return [form.firstName, form.middleName, form.lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
}

function passwordError(password: string, required: boolean) {
  if (!password) return required ? "Password is required." : "";
  if (password.length < 8) return "Use at least 8 characters.";
  if (!/[A-Z]/.test(password)) return "Include at least one capital letter.";
  if (new TextEncoder().encode(password).length > 72) return "Password is too long.";
  return "";
}

export default function AccountManagementPage() {
  const [selectedView, setSelectedView] = useState<AccountView>("students");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const { notify } = useToast();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"student" | "admin" | null>(null);
  const [editing, setEditing] = useState<ManagedAccount | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);
  const [banTarget, setBanTarget] = useState<StudentAccount | null>(null);
  const [banReason, setBanReason] = useState("");
  const [working, setWorking] = useState(false);
  const [validationAttempted, setValidationAttempted] = useState(false);

  const students = useApiResource<AccountDirectory>("/api/accounts?view=students");
  const admins = useApiResource<AccountDirectory>("/api/accounts?view=admins");
  const banned = useApiResource<AccountDirectory>("/api/accounts?view=banned");
  const resources = { students, admins, banned };
  const resource = resources[selectedView];
  const currentDirectory = resource.data;
  const emailStudentId = studentIdFromEmail(form.email.trim());
  const expectedStudentId =
    formMode === "student" && editing && "studentId" in editing
      ? editing.studentId
      : form.studentId;
  const emailError =
    formMode !== "student"
      ? ""
      : !form.email.trim()
        ? validationAttempted
          ? "UIC email address is required."
          : ""
        : !emailStudentId
          ? "Use a UIC email ending in @uic.edu.ph"
          : emailStudentId !== expectedStudentId
            ? "The student ID in the email does not match this account."
            : "";
  const currentPasswordError = passwordError(
    form.password,
    formMode !== null && editing === null && validationAttempted,
  );

  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Element &&
        event.target.closest("[data-account-action-menu], [data-account-action-trigger]")
      ) {
        return;
      }
      setOpenMenu(null);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenMenu(null);
    }

    function handleScroll() {
      setOpenMenu(null);
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

  function toggleActionMenu(menuId: string) {
    setOpenMenu((current) => (current === menuId ? null : menuId));
  }

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!currentDirectory || !query) return currentDirectory;
    if (selectedView === "students") {
      return {
        ...currentDirectory,
        students: currentDirectory.students.filter((student) =>
          [student.studentId, student.username, student.fullName, student.email]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(query)),
        ),
      };
    }
    if (selectedView === "admins") {
      return {
        ...currentDirectory,
        admins: currentDirectory.admins.filter((admin) =>
          [admin.username, admin.fullName, admin.role].some((value) =>
            value.toLowerCase().includes(query),
          ),
        ),
      };
    }
    return {
      ...currentDirectory,
      banned: currentDirectory.banned.filter((student) =>
        [student.studentId, student.fullName, student.email, student.reason]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query)),
      ),
    };
  }, [currentDirectory, search, selectedView]);

  const visibleCount = !filteredRows
    ? 0
    : selectedView === "students"
      ? filteredRows.students.length
      : selectedView === "admins"
        ? filteredRows.admins.length
        : filteredRows.banned.length;
  const rawCount = !currentDirectory
    ? 0
    : selectedView === "students"
      ? currentDirectory.students.length
      : selectedView === "admins"
        ? currentDirectory.admins.length
        : currentDirectory.banned.length;

  function reloadAll() {
    students.reload();
    admins.reload();
    banned.reload();
  }

  function chooseView(view: AccountView) {
    setSelectedView(view);
    setSearch("");
    setOpenMenu(null);
    setActionError("");
  }

  function startCreate(type: "student" | "admin") {
    setFormMode(type);
    setEditing(null);
    setForm(emptyForm);
    setActionError("");
    setValidationAttempted(false);
  }

  function startEdit(account: ManagedAccount, type: "student" | "admin") {
    setFormMode(type);
    setEditing(account);
    const nameParts = splitFullName(account.fullName);
    setForm({
      studentId: type === "student" ? (account as StudentAccount).studentId : "",
      username: account.username,
      ...nameParts,
      email: type === "student" ? ((account as StudentAccount).email ?? "") : "",
      role: type === "admin" ? (account as AdminAccount).role : "admin",
      password: "",
    });
    setOpenMenu(null);
    setActionError("");
    setValidationAttempted(false);
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formMode) return;
    setValidationAttempted(true);
    setActionError("");
    const creating = editing === null;
    if (
      (formMode === "admin" && !form.username.trim()) ||
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      (formMode === "student" &&
        (!form.studentId.trim() || Boolean(emailError) || !form.email.trim())) ||
      (formMode === "admin" && !["admin", "super_admin"].includes(form.role)) ||
      Boolean(passwordError(form.password, creating))
    ) {
      return;
    }

    setWorking(true);
    const payload =
      formMode === "student"
        ? {
            studentId: expectedStudentId.trim(),
            username: creating ? expectedStudentId.trim() : form.username.trim(),
            fullName: fullNameFromForm(form),
            email: form.email.trim() || null,
            password: form.password || null,
          }
        : {
            username: form.username.trim(),
            fullName: fullNameFromForm(form),
            role: form.role,
            password: form.password || null,
          };

    try {
      if (formMode === "student") {
        const path = creating
          ? "/api/accounts/students"
          : `/api/accounts/students/${encodeURIComponent((editing as StudentAccount).studentId)}`;
        await apiRequest(path, {
          method: creating ? "POST" : "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        const path = creating
          ? "/api/accounts/admins"
          : `/api/accounts/admins/${(editing as AdminAccount).adminId}`;
        await apiRequest(path, {
          method: creating ? "POST" : "PUT",
          body: JSON.stringify(payload),
        });
      }

      setFormMode(null);
      setEditing(null);
      notify(
        `${formMode === "student" ? "Student" : "Administrator"} account ${creating ? "created" : "updated"}.`,
      );
      reloadAll();
    } catch (cause) {
      const message = messageFromError(cause);
      setActionError(message);
      notify(message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function toggleActive(account: AdminAccount) {
    const active = account.isActive;
    const label = active ? "remove access" : "enable";
    if (!window.confirm(`${label[0].toUpperCase()}${label.slice(1)} for ${account.fullName}?`))
      return;
    setWorking(true);
    setActionError("");
    setOpenMenu(null);
    try {
      await apiRequest<void>(`/api/accounts/admins/${account.adminId}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !active }),
      });
      notify(`${account.fullName}'s account access is ${active ? "disabled" : "enabled"}.`);
      reloadAll();
    } catch (cause) {
      const message = messageFromError(cause);
      setActionError(message);
      notify(message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function submitBan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!banTarget) return;
    setWorking(true);
    setActionError("");
    try {
      await apiRequest<void>(
        `/api/accounts/students/${encodeURIComponent(banTarget.studentId)}/ban`,
        {
          method: "POST",
          body: JSON.stringify({ reason: banReason }),
        },
      );
      setBanTarget(null);
      setBanReason("");
      notify(`${banTarget.fullName} was banned.`);
      reloadAll();
    } catch (cause) {
      const message = messageFromError(cause);
      setActionError(message);
      notify(message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function deleteAccount(account: ManagedAccount, type: "student" | "admin") {
    if (
      !window.confirm(
        type === "student"
          ? `Permanently delete ${account.fullName}'s account? The student profile and all ban entries will be deleted. Session and report history, including the saved student ID and name, will remain.`
          : `Delete ${account.fullName}'s account? This disables sign-in but keeps the account record for historical reports.`,
      )
    ) {
      return;
    }

    if (type === "admin" && !account.isActive) {
      notify(
        `${account.fullName}'s administrator account is already disabled. Admin records are retained for history.`,
      );
      setOpenMenu(null);
      return;
    }

    setWorking(true);
    setActionError("");
    setOpenMenu(null);
    try {
      const path =
        type === "student"
          ? `/api/accounts/students/${encodeURIComponent((account as StudentAccount).studentId)}`
          : `/api/accounts/admins/${(account as AdminAccount).adminId}/active`;
      await apiRequest<void>(path, {
        method: type === "student" ? "DELETE" : "PATCH",
        ...(type === "admin" ? { body: JSON.stringify({ isActive: false }) } : {}),
      });
      notify(
        type === "student"
          ? `${account.fullName}'s account and ban entries were permanently deleted. Session and report history remain.`
          : `${account.fullName}'s account was deleted from active use.`,
      );
      reloadAll();
    } catch (cause) {
      const message = messageFromError(cause);
      setActionError(message);
      notify(message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function deleteBannedAccount(ban: BannedStudent) {
    if (
      !window.confirm(
        `Permanently delete ${ban.fullName}'s account? The student profile and all ban entries will be deleted. Session and report history, including the saved student ID and name, will remain.`,
      )
    ) {
      return;
    }

    setWorking(true);
    setActionError("");
    setOpenMenu(null);
    try {
      await apiRequest<void>(`/api/accounts/students/${encodeURIComponent(ban.studentId)}`, {
        method: "DELETE",
      });
      notify(
        `${ban.fullName}'s account and ban entries were permanently deleted. Session and report history remain.`,
      );
      reloadAll();
    } catch (cause) {
      const message = messageFromError(cause);
      setActionError(message);
      notify(message, "error");
    } finally {
      setWorking(false);
    }
  }

  async function unbanStudent(ban: BannedStudent) {
    const confirmed = window.confirm(
      `Unban ${ban.fullName}? The ban history will remain in the database.`,
    );
    if (!confirmed) return;
    setWorking(true);
    setActionError("");
    setOpenMenu(null);
    try {
      await apiRequest<void>(`/api/accounts/bans/${ban.banId}/active`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      });
      notify(`${ban.fullName} was unbanned.`);
      reloadAll();
    } catch (cause) {
      const message = messageFromError(cause);
      setActionError(message);
      notify(message, "error");
    } finally {
      setWorking(false);
    }
  }

  const pageTitle =
    selectedView === "students"
      ? "Students directory"
      : selectedView === "admins"
        ? "Administrator accounts"
        : "Banned students";

  return (
    <>
      <div className="page-intro">
        <div>
          <span>Access control</span>
          <h1>Account Management</h1>
          <p>Manage users, permissions, and account access.</p>
        </div>
        <div className="account-create-actions">
          <button className="primary-button" onClick={() => startCreate("student")}>
            <Icon name="plus" />
            Add student
          </button>
          <button className="ghost-button" onClick={() => startCreate("admin")}>
            <Icon name="plus" />
            Add administrator
          </button>
        </div>
      </div>
      <div className="tabs account-tabs">
        <button
          className={selectedView === "students" ? "active" : ""}
          onClick={() => chooseView("students")}
        >
          Students <span>{students.data?.students.length ?? "—"}</span>
        </button>
        <button
          className={selectedView === "admins" ? "active" : ""}
          onClick={() => chooseView("admins")}
        >
          Admins <span>{admins.data?.admins.length ?? "—"}</span>
        </button>
        <button
          className={selectedView === "banned" ? "active" : ""}
          onClick={() => chooseView("banned")}
        >
          Banned <span>{banned.data?.banned.length ?? "—"}</span>
        </button>
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>{pageTitle}</h2>
            <p>
              {selectedView === "students"
                ? "Registered students and account status"
                : selectedView === "admins"
                  ? "Administrator roles and account status"
                  : "Currently active ban records"}
            </p>
          </div>
          <div className="panel-tools">
            <label className="search-box">
              <Icon name="search" size={16} />
              <input
                aria-label="Search accounts"
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search accounts…"
                value={search}
              />
            </label>
            <button
              aria-label="Refresh accounts"
              className="row-arrow refresh-button"
              onClick={resource.reload}
            >
              <Icon name="refresh" />
            </button>
          </div>
        </div>
        <DataState
          empty={!resource.loading && !resource.error && visibleCount === 0}
          emptyText={
            rawCount
              ? "Try a different search term."
              : "Account records from the database will appear here."
          }
          emptyTitle={rawCount ? "No matching accounts" : "No accounts found"}
          error={resource.error}
          loading={resource.loading}
          onRetry={resource.reload}
        />
        {!resource.loading && !resource.error && visibleCount > 0 && filteredRows && (
          <>
            <div className="table-scroll">
              <table>
                {selectedView === "students" && (
                  <>
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
                      {filteredRows.students.map((student, index) => (
                        <tr key={student.studentId}>
                          <td className="mono">{student.studentId}</td>
                          <td>
                            <div className="person">
                              <span>{initials(student.fullName)}</span>
                              <strong>{student.fullName}</strong>
                            </div>
                          </td>
                          <td>{student.email || "—"}</td>
                          <td>
                            <span className={`status ${student.isActive ? "online" : "offline"}`}>
                              <i />
                              {student.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td>
                            <div
                              className={`action-wrap ${openMenu === `student-${student.studentId}` ? "action-open" : ""}`}
                            >
                              <button
                                aria-expanded={openMenu === `student-${student.studentId}`}
                                aria-label={`Actions for ${student.fullName}`}
                                className="dots-button"
                                data-account-action-trigger
                                onClick={() => toggleActionMenu(`student-${student.studentId}`)}
                              >
                                <Icon name="dots" />
                              </button>
                              {openMenu === `student-${student.studentId}` && (
                                <div
                                  className={`action-menu ${index >= filteredRows.students.length - 2 ? "action-menu-up" : ""}`}
                                  data-account-action-menu
                                >
                                  <button onClick={() => startEdit(student, "student")}>
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => {
                                      setBanTarget(student);
                                      setBanReason("");
                                      setOpenMenu(null);
                                    }}
                                  >
                                    Ban student
                                  </button>
                                  <button
                                    className="danger-text"
                                    onClick={() => void deleteAccount(student, "student")}
                                  >
                                    Delete account
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
                {selectedView === "admins" && (
                  <>
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Full name</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.admins.map((admin, index) => (
                        <tr key={admin.adminId}>
                          <td className="mono">{admin.username}</td>
                          <td>
                            <div className="person">
                              <span>{initials(admin.fullName)}</span>
                              <strong>{admin.fullName}</strong>
                            </div>
                          </td>
                          <td>{admin.role.replace(/_/g, " ")}</td>
                          <td>
                            <span className={`status ${admin.isActive ? "online" : "offline"}`}>
                              <i />
                              {admin.isActive ? "Active" : "Disabled"}
                            </span>
                          </td>
                          <td>
                            <div
                              className={`action-wrap ${openMenu === `admin-${admin.adminId}` ? "action-open" : ""}`}
                            >
                              <button
                                aria-expanded={openMenu === `admin-${admin.adminId}`}
                                aria-label={`Actions for ${admin.fullName}`}
                                className="dots-button"
                                data-account-action-trigger
                                onClick={() => toggleActionMenu(`admin-${admin.adminId}`)}
                              >
                                <Icon name="dots" />
                              </button>
                              {openMenu === `admin-${admin.adminId}` && (
                                <div
                                  className={`action-menu ${index >= filteredRows.admins.length - 2 ? "action-menu-up" : ""}`}
                                  data-account-action-menu
                                >
                                  <button onClick={() => startEdit(admin, "admin")}>Edit</button>
                                  <button onClick={() => void toggleActive(admin)}>
                                    {admin.isActive ? "Remove access" : "Enable account"}
                                  </button>
                                  <button
                                    className="danger-text"
                                    onClick={() => void deleteAccount(admin, "admin")}
                                  >
                                    Delete account
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
                {selectedView === "banned" && (
                  <>
                    <thead>
                      <tr>
                        <th>Student ID</th>
                        <th>Full name</th>
                        <th>Email address</th>
                        <th>Reason</th>
                        <th>Banned by</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.banned.map((ban, index) => (
                        <tr key={ban.banId}>
                          <td className="mono">{ban.studentId}</td>
                          <td>{ban.fullName}</td>
                          <td>{ban.email || "—"}</td>
                          <td className="issue-summary">{ban.reason || "—"}</td>
                          <td>{ban.bannedBy || "—"}</td>
                          <td>
                            <div
                              className={`action-wrap ${openMenu === `ban-${ban.banId}` ? "action-open" : ""}`}
                            >
                              <button
                                aria-expanded={openMenu === `ban-${ban.banId}`}
                                aria-label={`Actions for ban on ${ban.fullName}`}
                                className="dots-button"
                                data-account-action-trigger
                                onClick={() => toggleActionMenu(`ban-${ban.banId}`)}
                              >
                                <Icon name="dots" />
                              </button>
                              {openMenu === `ban-${ban.banId}` && (
                                <div
                                  className={`action-menu ${index >= filteredRows.banned.length - 2 ? "action-menu-up" : ""}`}
                                  data-account-action-menu
                                >
                                  <button onClick={() => void unbanStudent(ban)}>
                                    Unban student
                                  </button>
                                  <button
                                    className="danger-text"
                                    onClick={() => void deleteBannedAccount(ban)}
                                  >
                                    Delete account
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </>
                )}
              </table>
            </div>
            <div className="panel-foot">
              <span>
                Showing {visibleCount} {selectedView} records
              </span>
            </div>
          </>
        )}
      </section>

      {formMode && (
        <div className="modal-layer" onClick={() => !working && setFormMode(null)}>
          <section
            aria-labelledby="account-form-title"
            aria-modal="true"
            className="report-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-head">
              <div className="modal-symbol resolved">
                <Icon name="users" />
              </div>
              <div>
                <span>
                  {editing ? "Edit" : "Create"}{" "}
                  {formMode === "student" ? "student account" : "administrator account"}
                </span>
                <h2 id="account-form-title">
                  {editing ? "Edit" : "Add"} {formMode === "student" ? "student" : "administrator"}
                </h2>
              </div>
              <button
                aria-label="Close account form"
                className="modal-close"
                disabled={working}
                onClick={() => setFormMode(null)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <form onSubmit={submitAccount}>
              <div className="modal-body form-grid">
                <label>
                  First name
                  <input
                    autoComplete="given-name"
                    maxLength={100}
                    onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                    required
                    value={form.firstName}
                  />
                </label>
                <label>
                  Middle name (optional)
                  <input
                    autoComplete="additional-name"
                    maxLength={100}
                    onChange={(event) => setForm({ ...form, middleName: event.target.value })}
                    value={form.middleName}
                  />
                </label>
                <label>
                  Last name
                  <input
                    autoComplete="family-name"
                    maxLength={100}
                    onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                    required
                    value={form.lastName}
                  />
                </label>
                {formMode === "student" ? (
                  <label>
                    Email address
                    <input
                      autoComplete="email"
                      aria-invalid={Boolean(emailError)}
                      className={emailError ? "input-invalid" : ""}
                      maxLength={150}
                      onChange={(event) => {
                        const email = event.target.value;
                        const derivedStudentId = studentIdFromEmail(email.trim());
                        setForm((current) => ({
                          ...current,
                          email,
                          ...(editing === null
                            ? {
                                studentId: derivedStudentId ?? "",
                                username: derivedStudentId ?? "",
                              }
                            : {}),
                        }));
                      }}
                      onInvalid={() => setValidationAttempted(true)}
                      required
                      type="email"
                      value={form.email}
                    />
                    <small>Use a UIC email ending in @uic.edu.ph</small>
                    {emailError && <small className="field-error">{emailError}</small>}
                  </label>
                ) : (
                  <>
                    <label>
                      Username
                      <input
                        autoComplete="username"
                        maxLength={100}
                        onChange={(event) => setForm({ ...form, username: event.target.value })}
                        required
                        value={form.username}
                      />
                    </label>
                    <label>
                      Role
                      <select
                        onChange={(event) => setForm({ ...form, role: event.target.value })}
                        value={form.role}
                      >
                        <option value="admin">Admin</option>
                        <option value="super_admin">Super Admin</option>
                      </select>
                    </label>
                  </>
                )}
                {formMode === "student" && (
                  <label>
                    Student ID
                    <input
                      aria-invalid={Boolean(emailError)}
                      className={emailError ? "input-invalid" : ""}
                      maxLength={50}
                      readOnly
                      required
                      value={form.studentId}
                    />
                  </label>
                )}
                <label>
                  {editing ? "New password (optional)" : "Password"}
                  <input
                    aria-invalid={Boolean(currentPasswordError)}
                    autoComplete="new-password"
                    className={currentPasswordError ? "input-invalid" : ""}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                    onInvalid={() => setValidationAttempted(true)}
                    required={!editing}
                    type="password"
                    value={form.password}
                  />
                  <small className={currentPasswordError ? "field-error" : ""}>
                    {currentPasswordError || "Use at least 8 characters."}
                  </small>
                </label>
                {actionError && (
                  <p className="auth-error" role="alert">
                    {actionError}
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button
                  className="ghost-button"
                  disabled={working}
                  onClick={() => setFormMode(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={working} type="submit">
                  {working ? "Saving…" : editing ? "Save changes" : "Create account"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {banTarget && (
        <div className="modal-layer" onClick={() => !working && setBanTarget(null)}>
          <section
            aria-labelledby="ban-form-title"
            aria-modal="true"
            className="report-modal"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="modal-head">
              <div className="modal-symbol">
                <Icon name="alert" />
              </div>
              <div>
                <span>Student account</span>
                <h2 id="ban-form-title">Ban {banTarget.fullName}</h2>
              </div>
              <button
                aria-label="Close ban form"
                className="modal-close"
                onClick={() => setBanTarget(null)}
              >
                <Icon name="close" size={17} />
              </button>
            </div>
            <form onSubmit={submitBan}>
              <div className="modal-body form-grid">
                <label>
                  Reason
                  <textarea
                    maxLength={2000}
                    onChange={(event) => setBanReason(event.target.value)}
                    required
                    rows={4}
                    value={banReason}
                  />
                </label>
                {actionError && (
                  <p className="auth-error" role="alert">
                    {actionError}
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button
                  className="ghost-button"
                  disabled={working}
                  onClick={() => setBanTarget(null)}
                  type="button"
                >
                  Cancel
                </button>
                <button className="danger-button" disabled={working} type="submit">
                  {working ? "Saving…" : "Ban student"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

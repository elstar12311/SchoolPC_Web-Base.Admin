export interface LogbookSummary {
  totalComputers: number;
  onlineComputers: number;
  sessionsToday: number;
  openReports: number;
}

export interface ComputerRecord {
  clientGuid: string;
  displayName: string;
  machineName: string;
  ipAddress: string | null;
  lastSeen: string | null;
  isOnline: boolean;
  sessionCount: number;
  groupName: string | null;
}

export interface LogbookData {
  summary: LogbookSummary;
  computers: ComputerRecord[];
}

export interface ComputerDetail {
  clientGuid: string;
  displayName: string;
  machineName: string;
  ipAddress: string | null;
  lastSeen: string | null;
  firstSeen: string | null;
  isOnline: boolean;
  sessionsToday: number;
  currentStudent: string | null;
}

export interface SessionRecord {
  sessionId: number;
  clientGuid: string;
  computer: string;
  studentName: string;
  email: string | null;
  studentId: string;
  loginTime: string | null;
  logoutTime: string | null;
  durationMinutes: number | null;
  remarks: string;
}

export interface ProblemReport {
  reportId: number;
  clientGuid: string;
  computer: string;
  studentId: string;
  studentName: string;
  message: string;
  status: string;
  createdAt: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface StudentAccount {
  studentId: string;
  username: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export interface AdminAccount {
  adminId: number;
  username: string;
  fullName: string;
  role: string;
  isActive: boolean;
  createdAt: string | null;
}

export interface BannedStudent {
  banId: number;
  studentId: string;
  fullName: string;
  email: string | null;
  isActive: boolean;
  reason: string | null;
  bannedBy: string | null;
  bannedAt: string | null;
}

export interface AccountDirectory {
  view: "students" | "admins" | "banned";
  students: StudentAccount[];
  admins: AdminAccount[];
  banned: BannedStudent[];
}

export function formatDateTime(value: string | null, options: Intl.DateTimeFormatOptions = {}) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(date);
}

export function formatRelativeTime(value: string | null) {
  if (!value) return "Unknown";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Unknown";
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return "Moments ago";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDuration(minutes: number | null) {
  if (minutes === null) return "";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return remainingMinutes === 0 ? `${hours}h` : `${hours}h ${remainingMinutes}m`;
}

export function localDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function initials(value: string) {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

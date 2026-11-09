import Icon from "./Icon";

interface DataStateProps {
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  empty?: boolean;
  emptyTitle?: string;
  emptyText?: string;
}

export default function DataState({
  loading,
  error,
  onRetry,
  empty = false,
  emptyTitle = "No records found",
  emptyText = "Records from the database will appear here.",
}: DataStateProps) {
  if (!loading && !error && !empty) return null;

  const title = loading ? "Loading live data…" : error ? "Unable to load data" : emptyTitle;
  const text = loading
    ? "Connecting to the SchoolPC database."
    : error
      ? "The database request failed. Check the connection and try again."
      : emptyText;

  return (
    <div className="empty" role={error ? "alert" : "status"}>
      <Icon name={error ? "alert" : "monitor"} size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {error && (
        <button className="ghost-button" onClick={onRetry} style={{ marginTop: 14 }}>
          Try again
        </button>
      )}
    </div>
  );
}

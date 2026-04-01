type StatusType =
  | "online"
  | "offline"
  | "warning"
  | "critical"
  | "new"
  | "acknowledged"
  | "resolved"
  | "false_alarm";

type StatusBadgeProps = {
  status: StatusType;
};

const statusStyles: Record<StatusType, string> = {
  online:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  offline:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  critical:
    "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  new: "border-red-500/20 bg-red-500/10 text-red-700 dark:text-red-400",
  acknowledged:
    "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  resolved:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  false_alarm:
    "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

function formatStatusLabel(status: StatusType) {
  return status.replace("_", " ");
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        statusStyles[status],
      ].join(" ")}
    >
      {formatStatusLabel(status)}
    </span>
  );
}
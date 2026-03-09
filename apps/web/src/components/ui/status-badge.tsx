type StatusType = "online" | "offline" | "warning" | "critical";

type StatusBadgeProps = {
  status: StatusType;
};

const statusStyles: Record<StatusType, string> = {
  online:
    "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  offline:
    "border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  warning:
    "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  critical:
    "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium capitalize",
        statusStyles[status],
      ].join(" ")}
    >
      {status}
    </span>
  );
}
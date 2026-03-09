type StatusType = "online" | "offline" | "warning" | "critical";

type StatusBadgeProps = {
  status: StatusType;
};

const statusStyles: Record<StatusType, string> = {
  online: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  offline: "bg-slate-500/15 text-slate-300 border-slate-500/20",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
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
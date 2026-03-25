import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { PageEmptyState } from "@/components/ui/page-states";
export const dynamic = "force-dynamic";

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function formatTargetType(value: string): string {
  switch (value) {
    case "user":
      return "User Account";
    case "site":
      return "Site";
    case "device":
      return "Device";
    case "sensor":
      return "Sensor";
    case "event":
      return "Emergency Event";
    case "alert":
      return "Alert";
    case "profile":
      return "Profile";
    case "settings":
      return "Settings";
    default:
      return value
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function shortenId(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatActionLabel(action: string): string {
  switch (action) {
    case "login":
      return "Login";
    case "logout":
      return "Logout";
    case "update_settings":
      return "Settings Updated";
    case "create":
      return "Created";
    case "update":
      return "Updated";
    case "delete":
      return "Deleted";
    default:
      return action
        .replaceAll("_", " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function getActionBadgeClass(action: string): string {
  switch (action) {
    case "login":
      return "bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-500/20";
    case "logout":
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20";
    case "update_settings":
      return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/20";
    case "create":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/20";
    case "delete":
      return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/20";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/20";
  }
}

function formatDetails(details: unknown, actionType: string): string {
  if (!details) return "No additional details";

  if (typeof details === "string") {
    return details;
  }

  if (typeof details !== "object" || Array.isArray(details)) {
    return "No additional details";
  }

  const data = details as Record<string, unknown>;

  if (actionType === "login" && data.login_identifier_type) {
    return `Signed in with ${String(data.login_identifier_type)}`;
  }

  if (actionType === "logout") {
    return "Signed Out";
  }

  if (actionType === "update_settings" && data.kind === "password_changed") {
    return "Password changed";
  }

  const entries = Object.entries(data);
  if (entries.length === 0) {
    return "No additional details";
  }

  return entries
    .map(([key, value]) => {
      const label = key.replaceAll("_", " ");
      return `${label}: ${String(value)}`;
    })
    .join(", ");
}

export default async function AuditLogsPage() {
  let userId: string;

  try {
    userId = await requireCurrentUserId();
  } catch {
    redirect("/login");
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      user_id: userId,
    },
    orderBy: {
      created_at: "desc",
    },
    select: {
      log_id: true,
      action_type: true,
      target_type: true,
      target_id: true,
      details: true,
      created_at: true,
    },
  });

  const latestLog = logs[0];

  return (
    <div className="space-y-6 pb-24 md:pb-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Audit Logs
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Review your recent account and system activity.
        </p>
      </div>

      {logs.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Total activity
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
              {logs.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Latest activity
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900 dark:text-white">
              {latestLog ? formatActionLabel(latestLog.action_type) : "—"}
            </p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {latestLog ? formatTimestamp(latestLog.created_at) : "—"}
            </p>
          </div>
        </div>
      ) : null}

      {logs.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <PageEmptyState
            title="No audit logs yet"
            description="Your recent account activity will appear here once actions are recorded."
            className="py-12"
          />
        </section>
      ) : (
        <>
          <div className="space-y-4 md:hidden">
            {logs.map((log) => (
              <div
                key={log.log_id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={[
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                      getActionBadgeClass(log.action_type),
                    ].join(" ")}
                  >
                    {formatActionLabel(log.action_type)}
                  </span>

                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                    {formatTimestamp(log.created_at)}
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Affected Item
                    </p>
                    <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
                      {formatTargetType(log.target_type)}
                    </p>
                    <p className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {log.target_id
                        ? `ID: ${shortenId(log.target_id)}`
                        : "No specific target ID"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Details
                    </p>
                    <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                      {formatDetails(log.details, log.action_type)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 md:block">
            <table className="min-w-full">
              <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                <tr>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Action
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Affected Item
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Details
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Timestamp
                  </th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => (
                  <tr
                    key={log.log_id}
                    className="border-b border-slate-200 transition-colors hover:bg-slate-50/80 last:border-0 dark:border-slate-800 dark:hover:bg-slate-800/40"
                  >
                    <td className="whitespace-nowrap px-5 py-4">
                      <span
                        className={[
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                          getActionBadgeClass(log.action_type),
                        ].join(" ")}
                      >
                        {formatActionLabel(log.action_type)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm">
                      <div className="font-medium text-slate-900 dark:text-white">
                        {formatTargetType(log.target_type)}
                      </div>
                      {log.target_id ? (
                        <div className="mt-1 font-mono text-xs text-slate-500 dark:text-slate-400">
                          ID: {shortenId(log.target_id)}
                        </div>
                      ) : (
                        <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                          No specific target ID
                        </div>
                      )}
                    </td>

                    <td className="max-w-xl px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                      <span className="wrap-break-word">
                        {formatDetails(log.details, log.action_type)}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700 dark:text-slate-300">
                      {formatTimestamp(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
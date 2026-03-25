import { MapPinned, Router, ChevronRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { PageEmptyState } from "@/components/ui/page-states";
function formatLocation(site: {
  address_line: string | null;
  city: string | null;
  country: string | null;
}) {
  const parts = [site.address_line, site.city, site.country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "No location set";
}

function formatSiteStatus(status: "active" | "inactive") {
  return status === "active" ? "Monitoring active" : "Monitoring inactive";
}

export default async function SitesPage() {
  
  const userId = await requireCurrentUserId();

  const sites = await prisma.site.findMany({
    where: {
      site_users: {
        some: {
          user_id: userId,
        },
      },
    },
    include: {
      _count: {
        select: {
          devices: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Sites
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400 sm:text-base">
            Manage monitored locations connected to the system.
          </p>
        </div>

        <div className="inline-flex w-fit items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Total sites:{" "}
          <span className="ml-2 font-semibold text-slate-900 dark:text-white">
            {sites.length}
          </span>
        </div>
      </section>

      {sites.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <PageEmptyState
            title="No sites yet"
            description="You do not have any connected sites assigned yet."
            className="py-12"
          />
        </section>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sites.map((site) => (
            <article
              key={site.site_id}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-wide text-slate-500 dark:text-slate-500">
                    {site.site_id}
                  </p>
                  <h3 className="mt-2 truncate text-lg font-semibold text-slate-900 dark:text-white">
                    {site.name}
                  </h3>
                </div>

                <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <MapPinned className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MapPinned className="h-4 w-4 shrink-0" />
                  <span className="truncate">{formatLocation(site)}</span>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Router className="h-4 w-4 shrink-0" />
                  <span>
                    Devices connected:{" "}
                    <span className="font-semibold">{site._count.devices}</span>
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {formatSiteStatus(site.status)}
                </span>

                <Link
                  href={`/sites/${site.site_id}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  View
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
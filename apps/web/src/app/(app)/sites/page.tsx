import { MapPinned, Router, ChevronRight } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCurrentUserId } from "@/lib/auth";
import { PageEmptyState } from "@/components/ui/page-states";
import { CreateSiteForm } from "@/components/sites/create-site-form";

type SitesPageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

type SiteListItem = {
  site_id: string;
  name: string;
  address_line: string | null;
  city: string | null;
  country: string | null;
  status: "active" | "inactive";
  _count: {
    devices: number;
  };
};

const PAGE_SIZE = 9;

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

function parsePage(value?: string): number {
  const page = Number(value);

  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }

  return Math.floor(page);
}

function buildSitesPageHref(page: number): string {
  const search = new URLSearchParams();
  search.set("page", String(page));
  return `/sites?${search.toString()}`;
}

function SitesOfflineNotice() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
      Live site data could not be refreshed. You may be offline or the server
      may be temporarily unavailable.
    </section>
  );
}

export default async function SitesPage({ searchParams }: SitesPageProps) {
  const userId = await requireCurrentUserId();
  const params = (await searchParams) ?? {};
  const currentPage = parsePage(params.page);

  let sites: SiteListItem[] = [];
  let totalSites = 0;
  let hasLiveDataError = false;

  const where = {
    is_deleted: false,
    site_users: {
      some: {
        user_id: userId,
      },
    },
  } as const;

  try {
    totalSites = await prisma.site.count({
      where,
    });

    const totalPages = Math.max(1, Math.ceil(totalSites / PAGE_SIZE));
    const safePage = Math.min(currentPage, totalPages);
    const skip = (safePage - 1) * PAGE_SIZE;

    sites = await prisma.site.findMany({
      where,
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
      skip,
      take: PAGE_SIZE,
    });
  } catch (error) {
    hasLiveDataError = true;
    console.error("Sites data load failed:", error);
  }

  const totalPages = Math.max(1, Math.ceil(totalSites / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const startItem = totalSites === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safePage * PAGE_SIZE, totalSites);

  const previousPageHref = buildSitesPageHref(Math.max(1, safePage - 1));
  const nextPageHref = buildSitesPageHref(Math.min(totalPages, safePage + 1));

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
          Total sites:
          <span className="ml-2 font-semibold text-slate-900 dark:text-white">
            {hasLiveDataError ? "—" : totalSites}
          </span>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Site Actions
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Create and manage monitored locations.
          </p>
        </div>

        <div className="px-5 py-5">
          <CreateSiteForm />
        </div>
      </section>

      {hasLiveDataError ? <SitesOfflineNotice /> : null}

      {sites.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <PageEmptyState
            title={hasLiveDataError ? "Sites unavailable offline" : "No sites yet"}
            description={
              hasLiveDataError
                ? "Live site data could not be loaded right now."
                : "You do not have any connected sites assigned yet."
            }
            className="py-12"
          />
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
            Showing {startItem} ~ {endItem} of {totalSites} sites
          </section>

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

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Page {safePage} of {totalPages}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={previousPageHref}
                aria-disabled={safePage === 1}
                className={[
                  "inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition",
                  safePage === 1
                    ? "pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                Previous
              </Link>

              <form method="GET" className="flex items-center gap-2">
                <label
                  htmlFor="page"
                  className="text-sm text-slate-500 dark:text-slate-400"
                >
                  Go to
                </label>
                <input
                  id="page"
                  name="page"
                  type="number"
                  min={1}
                  max={totalPages}
                  defaultValue={safePage}
                  className="h-9 w-20 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-red-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
                <button
                  type="submit"
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  Go
                </button>
              </form>

              <Link
                href={nextPageHref}
                aria-disabled={safePage === totalPages}
                className={[
                  "inline-flex h-9 items-center justify-center rounded-lg border px-4 text-sm font-medium transition",
                  safePage === totalPages
                    ? "pointer-events-none border-slate-200 text-slate-400 dark:border-slate-800 dark:text-slate-600"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800",
                ].join(" ")}
              >
                Next
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
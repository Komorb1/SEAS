import Link from "next/link";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  BellRing,
  Flame,
  ShieldAlert,
  CloudFog,
  Waves,
  Activity,
  Building2,
  House,
  Warehouse,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const monitoringFeatures = [
  {
    title: "Smoke Detection",
    description:
      "Monitor smoke-related sensor activity and surface dangerous conditions early.",
    icon: CloudFog,
  },
  {
    title: "Gas Detection",
    description:
      "Track gas sensor readings and highlight abnormal environmental risk levels.",
    icon: Waves,
  },
  {
    title: "Flame Detection",
    description:
      "Identify possible fire presence through connected flame sensors.",
    icon: Flame,
  },
  {
    title: "Motion Detection",
    description:
      "Detect unexpected movement and suspicious activity in monitored spaces.",
    icon: Activity,
  },
];

const steps = [
  {
    title: "1. Device monitors the environment",
    description:
      "SEAS devices continuously read connected sensors installed at the site.",
  },
  {
    title: "2. Data is sent to the system",
    description:
      "Sensor readings are transmitted to the backend for evaluation and logging.",
  },
  {
    title: "3. Emergencies are detected",
    description:
      "The system analyzes incoming readings and identifies warning or critical events.",
  },
  {
    title: "4. Users are alerted immediately",
    description:
      "Authorized users can view activity in the dashboard and respond quickly.",
  },
];

const useCases = [
  {
    title: "Homes",
    description:
      "Add an extra layer of awareness for smoke, gas leaks, fire risk, and movement.",
    icon: House,
  },
  {
    title: "Warehouses",
    description:
      "Monitor larger storage areas where delayed detection can become costly or dangerous.",
    icon: Warehouse,
  },
  {
    title: "Offices",
    description:
      "Improve safety visibility across rooms, entrances, and critical equipment zones.",
    icon: Building2,
  },
];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <div className="rounded-xl bg-red-600/15 p-2">
              <BellRing className="h-5 w-5 text-red-500 dark:text-red-400" />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                SEAS
              </p>
              <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
                Smart Emergency Alert System
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <a
              href="#features"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              How it works
            </a>
            <a
              href="#use-cases"
              className="text-sm text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            >
              Use cases
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">

            <ThemeToggle />


            <Link
              href="/login"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-900 dark:hover:text-white sm:px-4"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-500 sm:px-4"
            >
              Register
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.10),transparent_35%)] dark:bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.14),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-sm text-red-600 dark:text-red-300">
              <ShieldAlert className="h-4 w-4" />
              Safety monitoring for real-world environments
            </div>

            <h1 className="mt-6 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Detect danger early and monitor your environment through one unified system.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-400">
              SEAS is a smart emergency alert platform designed to monitor
              sensor-equipped spaces for smoke, gas, flame, and motion activity.
              It helps users observe device status, review alerts, and react
              faster when something goes wrong.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4">
              <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Real-time device visibility
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Fast alert awareness
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Multi-site monitoring
              </div>
              <div className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Mobile-friendly dashboard
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-500"
              >
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-900 dark:hover:text-white"
              >
                See how it works
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  System preview
                </p>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Live monitoring concept
                </h2>
              </div>

              <span className="w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Devices online
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Active Alerts
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                  3
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Connected Devices
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                  24
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Monitored Sites
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                  8
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Status
                </p>
                <p className="mt-2 text-3xl font-semibold text-emerald-600 dark:text-emerald-400">
                  Stable
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Recent event
              </p>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">
                    Smoke detected at Main Warehouse
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    Emergency activity captured by connected device sensors.
                  </p>
                </div>

                <span className="w-fit rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-600 dark:text-red-400">
                  Critical
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            What SEAS monitors
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            The system is built around practical environmental and security
            monitoring. It focuses on detecting high-risk signals that matter in
            homes, offices, warehouses, and similar spaces.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {monitoringFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="inline-flex rounded-xl bg-slate-100 p-3 text-red-500 dark:bg-slate-800 dark:text-red-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-y border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/40"
      >
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
              How it works
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              SEAS connects hardware monitoring with a software dashboard,
              turning raw sensor readings into visible operational awareness.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {steps.map((step) => (
              <article
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Who it is for
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            SEAS is meant for people and organizations that want better
            visibility into physical safety risks and abnormal events.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {useCases.map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="inline-flex rounded-xl bg-slate-100 p-3 text-red-500 dark:bg-slate-800 dark:text-red-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {item.description}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 sm:pb-16 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Start monitoring with SEAS
          </h2>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Explore the system dashboard, register an account, and begin
            building a monitored environment with smart emergency awareness at
            its core.
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/register"
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-500"
            >
              Register
            </Link>
            <Link
              href="/login"
              className="rounded-xl border inline-flex items-center justify-center border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500 dark:hover:bg-slate-900 dark:hover:text-white sm:px-4"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 dark:text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>SEAS • Smart Emergency Alert System</p>
          <p>Graduation Project</p>
        </div>
      </footer>
    </main>
  );
}
"use client";

import { useEffect } from "react";
import { TriangleAlert } from "lucide-react";
import { PageErrorState } from "@/components/ui/page-states";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageErrorState
      title="Unable to load alerts"
      description="Something went wrong while loading this page. Please try again."
      icon={<TriangleAlert className="h-5 w-5" />}
      action={
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
        >
          Try again
        </button>
      }
    />
  );
}
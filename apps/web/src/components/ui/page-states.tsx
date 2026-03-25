import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

type BasePageStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

type PageLoadingStateProps = {
  title?: string;
  description?: string;
  className?: string;
};

function PageStateShell({
  title,
  description,
  icon,
  action,
  className = "",
}: BasePageStateProps) {
  return (
    <div
      className={`flex w-full items-center justify-center px-4 py-10 sm:px-6 sm:py-12 ${className}`}
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-4 rounded-full bg-slate-100 p-3 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {icon}
        </div>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {title}
        </h3>

        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          {description}
        </p>

        {action ? <div className="mt-5">{action}</div> : null}
      </div>
    </div>
  );
}

export function PageLoadingState({
  title = "Loading",
  description = "Please wait while we fetch the latest data.",
  className,
}: PageLoadingStateProps) {
  return (
    <PageStateShell
      title={title}
      description={description}
      className={className}
      icon={<Loader2 className="h-5 w-5 animate-spin" />}
    />
  );
}

export function PageEmptyState({
  title,
  description,
  icon,
  action,
  className,
}: BasePageStateProps) {
  return (
    <PageStateShell
      title={title}
      description={description}
      className={className}
      action={action}
      icon={icon ?? <Inbox className="h-5 w-5" />}
    />
  );
}

export function PageErrorState({
  title,
  description,
  icon,
  action,
  className,
}: BasePageStateProps) {
  return (
    <PageStateShell
      title={title}
      description={description}
      className={className}
      action={action}
      icon={icon ?? <AlertCircle className="h-5 w-5" />}
    />
  );
}
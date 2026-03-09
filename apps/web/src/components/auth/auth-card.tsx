import { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
};

export function AuthCard({
  title,
  description,
  footer,
  children,
}: AuthCardProps) {
  return (
    <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
      </div>

      {children}

      {footer ? <div className="mt-6">{footer}</div> : null}
    </div>
  );
}
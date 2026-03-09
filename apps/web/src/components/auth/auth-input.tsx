import { InputHTMLAttributes } from "react";

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function AuthInput({
  label,
  error,
  className = "",
  ...props
}: AuthInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-200">
        {label}
      </label>

      <input
        {...props}
        className={`w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-red-500 ${className}`}
      />

      {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
    </div>
  );
}
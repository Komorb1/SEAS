"use client";

import { FormEvent, useState } from "react";
import { AuthInput } from "@/components/auth/auth-input";
import { updateProfile } from "@/lib/api/profile";

type ProfileFormProps = {
  initialValues: {
    full_name: string;
    username: string;
    email: string;
    phone: string;
  };
};

export function ProfileForm({ initialValues }: ProfileFormProps) {
  const [fullName, setFullName] = useState(initialValues.full_name);
  const [email, setEmail] = useState(initialValues.email);
  const [phone, setPhone] = useState(initialValues.phone);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!fullName.trim() || !email.trim()) {
      setErrorMessage("Full name and email are required.");
      return;
    }

    try {
      setIsSubmitting(true);

      await updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });

      setSuccessMessage("Profile updated successfully.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to update profile."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
        Profile Information
      </h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Update your personal account information.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <AuthInput
          label="Full Name"
          type="text"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
        />

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
            Username
          </label>
          <input
            type="text"
            value={initialValues.username}
            disabled
            className="w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-500 outline-none dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400"
          />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
            Username cannot be changed.
          </p>
        </div>

        <AuthInput
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />

        <AuthInput
          label="Phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />

        {errorMessage ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
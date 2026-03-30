"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type SiteMember = {
  site_id: string;
  user_id: string;
  role: "owner" | "admin" | "viewer";
  created_at?: string | Date;
  user: {
    user_id: string;
    full_name: string | null;
    username: string | null;
    email: string;
    status?: string;
  };
};

type SiteMembersManagerProps = {
  siteId: string;
  currentUserId: string;
  currentUserRole: "owner" | "admin" | "viewer" | null;
  members: SiteMember[];
};

function getDisplayName(member: SiteMember) {
  return (
    member.user.full_name?.trim() ||
    member.user.username ||
    member.user.email
  );
}

function getRoleBadgeClass(role: SiteMember["role"]) {
  if (role === "owner") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300";
  }

  if (role === "admin") {
    return "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export function SiteMembersManager({
  siteId,
  currentUserId,
  currentUserRole,
  members,
}: SiteMembersManagerProps) {
  const router = useRouter();
  const canManageMembers = currentUserRole === "owner";

  const [userIdentifier, setUserIdentifier] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"admin" | "viewer">(
    "viewer"
  );
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const [isAdding, startAddTransition] = useTransition();
  const [isMutating, startMutationTransition] = useTransition();

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const rank = { owner: 0, admin: 1, viewer: 2 };
      return rank[a.role] - rank[b.role];
    });
  }, [members]);

  async function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!userIdentifier.trim()) {
      setFormError("Enter an email or username.");
      return;
    }

    startAddTransition(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/members`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_identifier: userIdentifier.trim(),
            role: newMemberRole,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to add site member.");
        }

        setFormSuccess("Member added successfully.");
        setUserIdentifier("");
        setNewMemberRole("viewer");
        router.refresh();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to add site member."
        );
      }
    });
  }

  function handleRoleChange(userId: string, role: "admin" | "viewer") {
    setFormError("");
    setFormSuccess("");
    setPendingUserId(userId);

    startMutationTransition(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/members/${userId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ role }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to update member role.");
        }

        setFormSuccess("Member role updated successfully.");
        router.refresh();
      } catch (error) {
        setFormError(
          error instanceof Error
            ? error.message
            : "Failed to update member role."
        );
      } finally {
        setPendingUserId(null);
      }
    });
  }

  function handleRemoveMember(userId: string, label: string) {
    const confirmed = window.confirm(`Remove ${label} from this site?`);
    if (!confirmed) return;

    setFormError("");
    setFormSuccess("");
    setPendingUserId(userId);

    startMutationTransition(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/members/${userId}`, {
          method: "DELETE",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to remove member.");
        }

        setFormSuccess("Member removed successfully.");
        router.refresh();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to remove member."
        );
      } finally {
        setPendingUserId(null);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Assigned Members
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Users who have access to this site.
        </p>
      </div>

      {canManageMembers ? (
        <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800">
          <form
            onSubmit={handleAddMember}
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                User
              </label>
              <input
                type="text"
                value={userIdentifier}
                onChange={(event) => setUserIdentifier(event.target.value)}
                placeholder="Enter username or email"
                disabled={isAdding}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                Role
              </label>
              <select
                value={newMemberRole}
                onChange={(event) =>
                  setNewMemberRole(event.target.value as "admin" | "viewer")
                }
                disabled={isAdding}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-red-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                <option value="viewer">viewer</option>
                <option value="admin">admin</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={isAdding}
                className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
              >
                {isAdding ? "Adding..." : "Add member"}
              </button>
            </div>
          </form>

          {formError ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {formError}
            </div>
          ) : null}

          {formSuccess ? (
            <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-300">
              {formSuccess}
            </div>
          ) : null}
        </div>
      ) : null}

      {sortedMembers.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            No members found
          </h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            No users are currently assigned to this site.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {sortedMembers.map((member) => {
            const isOwner = member.role === "owner";
            const isCurrentUser = member.user_id === currentUserId;
            const isBusy = pendingUserId === member.user_id && isMutating;

            return (
              <div
                key={`${member.site_id}-${member.user_id}`}
                className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {getDisplayName(member)}
                    {isCurrentUser ? (
                      <span className="ml-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                        (You)
                      </span>
                    ) : null}
                  </p>

                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {member.user.email}
                  </p>

                  {member.user.username ? (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      @{member.user.username}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getRoleBadgeClass(
                      member.role
                    )}`}
                  >
                    {member.role}
                  </span>

                  {canManageMembers && !isOwner ? (
                    <>
                      <select
                        value={member.role}
                        disabled={isBusy}
                        onChange={(event) =>
                          handleRoleChange(
                            member.user_id,
                            event.target.value as "admin" | "viewer"
                          )
                        }
                        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-red-500 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      >
                        <option value="viewer">viewer</option>
                        <option value="admin">admin</option>
                      </select>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          handleRemoveMember(member.user_id, getDisplayName(member))
                        }
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                      >
                        {isBusy ? "Removing..." : "Remove"}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { PasswordForm } from "@/components/profile/password-form";

export default async function ProfilePage() {
  const authUser = await getCurrentUser();

  if (!authUser) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { user_id: authUser.user_id },
    select: {
      full_name: true,
      username: true,
      email: true,
      phone: true,
    },
  });

  if (!user) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Profile
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Manage your account information and password.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <ProfileForm
          initialValues={{
            full_name: user.full_name,
            username: user.username,
            email: user.email,
            phone: user.phone ?? "",
          }}
        />
        <PasswordForm />
      </section>
    </div>
  );
}
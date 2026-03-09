import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyAuthToken } from "@/lib/jwt";
import { Prisma } from "@prisma/client";
import { z } from "zod";

export const runtime = "nodejs";

const UpdateProfileSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6).max(20).optional().or(z.literal("")),
});

async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    return null;
  }

  const payload = await verifyAuthToken(token);
  return payload?.user_id ?? null;
}

export async function GET() {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { user_id: userId },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        email: true,
        phone: true,
        created_at: true,
      },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    console.error("Profile GET error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { full_name, email, phone } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        NOT: {
          user_id: userId,
        },
      },
      select: { user_id: true },
    });

    if (existingUser) {
      return Response.json(
        { error: "This email is already in use." },
        { status: 409 }
      );
    }

    const user = await prisma.user.update({
      where: { user_id: userId },
      data: {
        full_name,
        email,
        phone: phone ? phone : null,
      },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        email: true,
        phone: true,
        created_at: true,
      },
    });

    return Response.json({ user, message: "Profile updated successfully" });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return Response.json(
          { error: "This email is already in use." },
          { status: 409 }
        );
      }
    }

    console.error("Profile PATCH error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
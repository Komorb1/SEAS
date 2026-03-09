import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SignupSchema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9._-]+$/, "Username contains invalid characters"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(6).max(20).optional().or(z.literal("")),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { full_name, username, email, phone, password } = parsed.data;

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
      select: { user_id: true },
    });

    if (existingUserByEmail) {
      return Response.json(
        { error: "This email is already in use." },
        { status: 409 }
      );
    }

    const existingUserByUsername = await prisma.user.findUnique({
      where: { username },
      select: { user_id: true },
    });

    if (existingUserByUsername) {
      return Response.json(
        { error: "This username is already in use." },
        { status: 409 }
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        full_name,
        username,
        email,
        phone: phone ? phone : null,
        password_hash,
      },
      select: {
        user_id: true,
        full_name: true,
        username: true,
        email: true,
        created_at: true,
      },
    });

    return Response.json({ user }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return Response.json(
          { error: "Username or email is already in use." },
          { status: 409 }
        );
      }
    }

    console.error("Signup error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
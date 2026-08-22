import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/api";

const loginSchema = z.object({
  identifier: z.string().min(3).max(120),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail("Invalid credentials", 400);

  const { identifier, password } = parsed.data;

  let user = null;
  try {
    user = await prisma.user.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
    });
  } catch (err) {
    // Database unreachable (e.g. paused provider project) — say so plainly
    // instead of a long-hanging generic 500. Log the cause server-side.
    console.error("[auth/login] database error:", err);
    return fail("Service temporarily unavailable. Please try again in a moment.", 503);
  }

  if (!user) return fail("Invalid email/username or password", 401);

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return fail("Invalid email/username or password", 401);

  await createSession({
    id: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role as never,
  });

  return ok({ id: user.id, name: user.name, email: user.email, username: user.username, role: user.role });
}

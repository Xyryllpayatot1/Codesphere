import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/lib/auth";
import { fail, ok } from "@/lib/api";
import { ROLES } from "@/lib/constants";

const registerSchema = z.object({
  name: z.string().min(2).max(60),
  email: z.string().email().max(120),
  username: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-zA-Z0-9_]+$/, "Username may only contain letters, numbers and underscores"),
  password: z.string().min(8).max(72),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return fail("Validation failed", 400, parsed.error.flatten().fieldErrors);
  }

  const { name, email, username, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
    select: { email: true, username: true },
  });
  if (existing) {
    const field = existing.email === email ? "email" : "username";
    return fail(`An account with this ${field} already exists`, 409);
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      passwordHash,
      role: ROLES.STUDENT,
      settings: { create: { notifications: {} } },
    },
    select: { id: true, email: true, username: true, name: true, role: true },
  });

  await createSession({ id: user.id, email: user.email, username: user.username, name: user.name, role: user.role as never });

  return ok({ id: user.id, name: user.name, email: user.email, username: user.username, role: user.role });
}

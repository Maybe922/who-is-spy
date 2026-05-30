import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  normalizeUsername,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
  SESSION_MAX_AGE_SECONDS,
  validatePassword,
  validateUsername
} from "@/lib/auth-core";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret === "replace-with-a-long-random-string") {
    return NextResponse.json({ error: "服务端 SESSION_SECRET 未配置" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const username = normalizeUsername(String(body?.username ?? ""));
  const password = String(body?.password ?? "");
  const displayName = String(body?.displayName ?? "").trim().slice(0, 24) || null;

  const usernameError = validateUsername(username);
  if (usernameError) return NextResponse.json({ error: usernameError }, { status: 400 });

  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) return NextResponse.json({ error: "用户名已存在" }, { status: 409 });

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const user = await prisma.user.create({
    data: {
      username,
      displayName,
      passwordHash: await hashPassword(password),
      sessions: {
        create: {
          tokenHash: hashSessionToken(token, secret),
          expiresAt
        }
      }
    },
    select: { id: true, username: true, displayName: true, role: true }
  });

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: SESSION_COOKIE_SECURE,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: expiresAt
  });
  return response;
}

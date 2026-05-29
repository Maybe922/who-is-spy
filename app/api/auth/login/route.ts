import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSessionToken,
  hashSessionToken,
  normalizeUsername,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  validatePassword,
  validateUsername,
  verifyPassword
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

  const usernameError = validateUsername(username);
  const passwordError = validatePassword(password);
  if (usernameError || passwordError) return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
  }

  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash: hashSessionToken(token, secret),
      expiresAt
    }
  });

  const response = NextResponse.json({
    user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role }
  });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
    expires: expiresAt
  });
  return response;
}

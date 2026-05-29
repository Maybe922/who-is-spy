import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth-core";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.SESSION_SECRET;
  const token = request.headers.get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.slice(SESSION_COOKIE_NAME.length + 1);

  if (secret && token) {
    await prisma.session.delete({ where: { tokenHash: hashSessionToken(decodeURIComponent(token), secret) } }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  return response;
}

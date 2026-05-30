import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword, validatePassword, verifyPassword } from "@/lib/auth-core";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "未登录" }, { status: 401 });

  const body = (await req.json()) as {
    displayName?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const updates: { displayName?: string | null; passwordHash?: string } = {};

  if ("displayName" in body) {
    const name = String(body.displayName ?? "").trim().slice(0, 24);
    updates.displayName = name || null;
  }

  if (body.newPassword !== undefined) {
    if (!body.currentPassword) {
      return NextResponse.json({ error: "请输入当前密码" }, { status: 400 });
    }
    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });

    const passwordError = validatePassword(body.newPassword);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

    updates.passwordHash = await hashPassword(body.newPassword);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "没有可更新的内容" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updates,
    select: { id: true, username: true, displayName: true, role: true }
  });

  return NextResponse.json({ user: updated });
}

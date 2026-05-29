import { NextRequest, NextResponse } from "next/server";
import { WordPackSource } from "@prisma/client";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { WordPair } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "只有管理员可以管理题库" }, { status: 403 });

  const body = (await req.json().catch(() => null)) as {
    name?: string;
    themePrompt?: string;
    pairs?: WordPair[];
  } | null;
  const name = normalizeText(body?.name, 40);
  const themePrompt = normalizeText(body?.themePrompt, 80);
  const pairs = normalizePairs(body?.pairs);

  if (!name) return NextResponse.json({ error: "请输入题库名称" }, { status: 400 });
  if (pairs.length < 3) return NextResponse.json({ error: "至少需要 3 组有效词对" }, { status: 400 });

  const wordPack = await prisma.wordPack.create({
    data: {
      name,
      themePrompt: themePrompt || null,
      source: WordPackSource.AI,
      enabled: true,
      ownerUserId: user.id,
      pairs: {
        createMany: {
          data: pairs.map((pair) => ({
            civilian: pair.civilian,
            spy: pair.spy,
            enabled: true
          }))
        }
      }
    },
    select: {
      id: true,
      name: true,
      _count: { select: { pairs: true } }
    }
  });

  return NextResponse.json({
    wordPack: {
      id: wordPack.id,
      name: wordPack.name,
      pairCount: wordPack._count.pairs
    }
  });
}

function normalizeText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizePairs(value: unknown): WordPair[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const pairs: WordPair[] = [];
  value.slice(0, 50).forEach((item) => {
    if (!item || typeof item !== "object") return;
    const rawPair = item as Record<string, unknown>;
    const civilian = normalizeText(rawPair.civilian, 20);
    const spy = normalizeText(rawPair.spy, 20);
    if (!civilian || !spy || civilian === spy) return;

    const key = `${civilian}:${spy}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ civilian, spy });
  });

  return pairs;
}

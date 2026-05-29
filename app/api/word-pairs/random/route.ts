import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { WordPair } from "@/lib/types";

export const runtime = "nodejs";

type RandomWordPairRow = {
  civilian: string;
  spy: string;
  pack_name: string;
};

export async function GET(req: NextRequest) {
  const countParam = req.nextUrl.searchParams.get("count");
  const count = Math.max(6, Math.min(50, Math.floor(Number(countParam ?? 20))));

  try {
    const rows = await prisma.$queryRaw<RandomWordPairRow[]>`
      SELECT word_pairs.civilian, word_pairs.spy, word_packs.name AS pack_name
      FROM word_pairs
      INNER JOIN word_packs ON word_packs.id = word_pairs.pack_id
      WHERE word_pairs.enabled = true AND word_packs.enabled = true
      ORDER BY random()
      LIMIT ${count}
    `;

    const pairs = normalizeRows(rows).slice(0, count);
    if (pairs.length < 3) {
      return NextResponse.json({ error: "数据库题库为空，或有效词对少于 3 组" }, { status: 404 });
    }

    const packNames = Array.from(new Set(rows.map((row) => row.pack_name).filter(Boolean)));
    const name = packNames.length === 1 ? packNames[0] : "数据库随机题库";

    return NextResponse.json({ name, pairs, source: "db" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "读取数据库题库失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function normalizeRows(rows: RandomWordPairRow[]): WordPair[] {
  const seen = new Set<string>();
  const pairs: WordPair[] = [];

  rows.forEach((row) => {
    const civilian = row.civilian.trim().slice(0, 20);
    const spy = row.spy.trim().slice(0, 20);
    if (!civilian || !spy || civilian === spy) return;

    const key = `${civilian}:${spy}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push({ civilian, spy });
  });

  return pairs;
}

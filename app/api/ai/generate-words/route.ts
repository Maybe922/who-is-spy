import { NextRequest, NextResponse } from "next/server";
import { parseGeneratedWordPairs } from "@/lib/aiWords";
import { callAi } from "@/lib/aiClient";
import type { AiConfig } from "@/lib/aiTypes";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { aiConfig?: AiConfig; theme?: string; count?: number } | null;
  const aiConfig = body?.aiConfig;
  const theme = String(body?.theme ?? "").trim().slice(0, 60);
  const count = Math.max(6, Math.min(50, Math.floor(Number(body?.count ?? 20))));

  if (!aiConfig) return NextResponse.json({ error: "请先配置 AI" }, { status: 400 });
  if (!theme) return NextResponse.json({ error: "请输入题库主题" }, { status: 400 });

  const systemPrompt = [
    "你是《谁是卧底》聚会游戏的题库设计师。",
    "你必须只输出合法 JSON，不要 Markdown，不要解释。",
    "JSON 格式必须是 {\"pairs\":[{\"civilian\":\"平民词\",\"spy\":\"卧底词\"}]}。",
    "词对要求：同主题、有关联、难度适中、不能完全同义、不能过于冷门、适合中文聚会。"
  ].join("\n");
  const userPrompt = `主题：${theme}\n请生成 ${count} 组词对，只返回 JSON。`;

  try {
    const content = await callAi(aiConfig, systemPrompt, userPrompt, 6000);
    const pairs = parseGeneratedWordPairs(content).slice(0, count);
    if (pairs.length < 3) {
      return NextResponse.json(
        {
          error: "AI 返回的词对太少，请换个主题或调整模型后重试",
          parsedCount: pairs.length,
          preview: content.replace(/\s+/g, " ").slice(0, 500)
        },
        { status: 422 }
      );
    }
    return NextResponse.json({ theme, pairs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 生成失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

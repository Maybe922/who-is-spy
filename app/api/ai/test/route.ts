import { NextRequest, NextResponse } from "next/server";
import { callAi } from "@/lib/aiClient";
import type { AiConfig } from "@/lib/aiTypes";

export async function POST(req: NextRequest) {
  const { aiConfig } = (await req.json()) as { aiConfig: AiConfig };
  try {
    const reply = await callAi(aiConfig, "你是一个助手。", "请回复“连接正常”这四个字，不要其他内容。", 20);
    return NextResponse.json({ ok: true, message: reply || "连接正常" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "调用失败";
    return NextResponse.json({ ok: false, message }, { status: 200 });
  }
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AI_CONFIG_KEY, type AiConfig } from "@/lib/aiTypes";
import type { WordPair } from "@/lib/types";

export function AiWordPackCreator() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [name, setName] = useState("");
  const [count, setCount] = useState(20);
  const [pairs, setPairs] = useState<WordPair[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function generatePairs() {
    const trimmedTheme = theme.trim();
    setMessage("");
    setError("");
    setPairs([]);

    if (!trimmedTheme) {
      setError("请输入主题");
      return;
    }

    const rawConfig = window.localStorage.getItem(AI_CONFIG_KEY);
    if (!rawConfig) {
      setError("请先去 AI 配置页保存模型配置");
      return;
    }

    let aiConfig: AiConfig;
    try {
      aiConfig = JSON.parse(rawConfig) as AiConfig;
    } catch {
      setError("AI 配置格式异常，请重新保存配置");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiConfig, theme: trimmedTheme, count })
      });
      const data = (await response.json()) as { theme?: string; pairs?: WordPair[]; error?: string; parsedCount?: number; preview?: string };
      if (!response.ok || !data.pairs) {
        setError(
          data.preview
            ? `${data.error ?? "生成失败"}；已解析 ${data.parsedCount ?? 0} 组。AI 返回预览：${data.preview}`
            : data.error ?? "生成失败，请稍后重试"
        );
        return;
      }

      setPairs(data.pairs);
      setName((currentName) => currentName || trimmedTheme);
      setMessage(`已生成 ${data.pairs.length} 组词对，确认后可以写入数据库。`);
    } catch {
      setError("生成请求失败，请检查 AI 配置或网络");
    } finally {
      setGenerating(false);
    }
  }

  async function saveWordPack() {
    const trimmedName = name.trim();
    setMessage("");
    setError("");

    if (!trimmedName) {
      setError("请输入题库名称");
      return;
    }
    if (pairs.length < 3) {
      setError("请先生成至少 3 组词对");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/admin/word-packs/import-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, themePrompt: theme.trim(), pairs })
      });
      const data = (await response.json()) as { wordPack?: { name: string; pairCount: number }; error?: string };
      if (!response.ok || !data.wordPack) {
        setError(data.error ?? "写入数据库失败");
        return;
      }

      setTheme("");
      setName("");
      setPairs([]);
      setCount(20);
      setMessage(`已创建「${data.wordPack.name}」，共 ${data.wordPack.pairCount} 组词对。`);
      router.refresh();
    } catch {
      setError("写入数据库失败，请检查登录状态或数据库连接");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-5 rounded-lg bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">AI 创建题库</h2>
          <p className="mt-1 text-sm text-ink/50">输入主题生成词对，确认后保存到数据库，之后可用于随机题库。</p>
        </div>
        <a className="text-sm font-semibold text-jade" href="/settings">
          AI 配置
        </a>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_120px]">
        <input
          className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
          maxLength={60}
          value={theme}
          onChange={(event) => setTheme(event.target.value)}
          placeholder="主题，例如：周末团建、经典港片、90 后童年"
        />
        <input
          className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
          maxLength={40}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="题库名称，默认使用主题"
        />
        <input
          className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
          max={50}
          min={6}
          type="number"
          value={count}
          onChange={(event) => setCount(Math.max(6, Math.min(50, Number(event.target.value) || 20)))}
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          className="h-11 rounded-md bg-saffron px-4 font-semibold text-ink disabled:cursor-not-allowed disabled:bg-ink/20"
          disabled={generating || saving}
          onClick={generatePairs}
        >
          {generating ? "生成中..." : "生成词对"}
        </button>
        <button
          className="h-11 rounded-md bg-jade px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
          disabled={generating || saving || pairs.length < 3}
          onClick={saveWordPack}
        >
          {saving ? "写入中..." : "保存为新题库"}
        </button>
      </div>

      {error ? <p className="mt-3 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}
      {message ? <p className="mt-3 rounded-md bg-jade/10 px-3 py-2 text-sm text-jade">{message}</p> : null}

      {pairs.length > 0 ? (
        <div className="mt-4 rounded-md border border-ink/10">
          <div className="grid grid-cols-[1fr_1fr] bg-paper px-3 py-2 text-sm font-bold text-ink/60">
            <span>平民词</span>
            <span>卧底词</span>
          </div>
          <div className="max-h-[260px] overflow-y-auto">
            {pairs.map((pair, index) => (
              <div key={`${pair.civilian}-${pair.spy}-${index}`} className="grid grid-cols-[1fr_1fr] border-t border-ink/10 px-3 py-2 text-sm">
                <span className="truncate font-semibold">{pair.civilian}</span>
                <span className="truncate font-semibold">{pair.spy}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

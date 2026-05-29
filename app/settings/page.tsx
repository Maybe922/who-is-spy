"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AI_CONFIG_KEY, type AiConfig, type AiProviderType } from "@/lib/aiTypes";

type Preset = { label: string; baseUrl: string; models: string[] };

const OPENAI_PRESETS: Preset[] = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"] },
  { label: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", models: ["deepseek-chat", "deepseek-reasoner"] },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "gemma2-9b-it"] },
  { label: "月之暗面", baseUrl: "https://api.moonshot.cn/v1", models: ["moonshot-v1-8k", "moonshot-v1-32k"] },
  { label: "Ollama 本地", baseUrl: "http://localhost:11434/v1", models: ["llama3.2", "qwen2.5", "gemma3"] },
  { label: "自定义", baseUrl: "", models: [] },
];

const ANTHROPIC_MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-7"];

const DEFAULT_CONFIG: AiConfig = {
  providerType: "openai-compatible",
  baseUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-4o-mini",
};

export default function SettingsPage() {
  const [config, setConfig] = useState<AiConfig>(DEFAULT_CONFIG);
  const [selectedPreset, setSelectedPreset] = useState("OpenAI");
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(AI_CONFIG_KEY);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as AiConfig;
      setConfig(stored);
      if (stored.providerType === "openai-compatible") {
        const match = OPENAI_PRESETS.find((p) => p.baseUrl === stored.baseUrl);
        setSelectedPreset(match?.label ?? "自定义");
      }
    } catch { /* ignore */ }
  }, []);

  function update(patch: Partial<AiConfig>) {
    setSaved(false);
    setTestResult(null);
    setConfig((prev) => ({ ...prev, ...patch }));
  }

  function applyPreset(preset: Preset) {
    setSelectedPreset(preset.label);
    setSaved(false);
    setTestResult(null);
    setConfig((prev) => ({ ...prev, providerType: "openai-compatible", baseUrl: preset.baseUrl, model: preset.models[0] ?? prev.model }));
  }

  function switchProvider(type: AiProviderType) {
    setSaved(false);
    setTestResult(null);
    if (type === "anthropic") {
      setConfig({ providerType: "anthropic", baseUrl: "", apiKey: "", model: ANTHROPIC_MODELS[0] });
    } else {
      setConfig({ providerType: "openai-compatible", baseUrl: "https://api.openai.com/v1", apiKey: "", model: "gpt-4o-mini" });
      setSelectedPreset("OpenAI");
    }
  }

  function save() {
    localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
    setSaved(true);
  }

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiConfig: config }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setTestResult(data);
    } catch {
      setTestResult({ ok: false, message: "网络请求失败" });
    } finally {
      setTesting(false);
    }
  }

  const currentPreset = OPENAI_PRESETS.find((p) => p.label === selectedPreset);
  const modelSuggestions = config.providerType === "anthropic" ? ANTHROPIC_MODELS : (currentPreset?.models ?? []);

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link className="text-sm text-ink/50 hover:text-ink" href="/">← 返回大厅</Link>
        <h1 className="text-2xl font-bold">AI 配置</h1>
      </div>

      <div className="space-y-6 rounded-lg bg-white p-6 shadow-soft">
        {/* Provider type */}
        <div>
          <p className="mb-3 text-sm font-semibold text-ink/75">接口类型</p>
          <div className="flex gap-2">
            {(["openai-compatible", "anthropic"] as AiProviderType[]).map((type) => (
              <button
                key={type}
                className={`flex-1 rounded-md border py-2 text-sm font-semibold transition ${
                  config.providerType === type ? "border-jade bg-jade/10 text-jade" : "border-ink/15 text-ink/60 hover:border-ink/30"
                }`}
                onClick={() => switchProvider(type)}
              >
                {type === "openai-compatible" ? "OpenAI 兼容" : "Anthropic"}
              </button>
            ))}
          </div>
          {config.providerType === "openai-compatible" && (
            <p className="mt-2 text-xs text-ink/45">覆盖 OpenAI、DeepSeek、Groq、月之暗面、Ollama 等。</p>
          )}
        </div>

        {/* Presets */}
        {config.providerType === "openai-compatible" && (
          <div>
            <p className="mb-3 text-sm font-semibold text-ink/75">快捷选择</p>
            <div className="flex flex-wrap gap-2">
              {OPENAI_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    selectedPreset === preset.label ? "border-saffron bg-saffron/20 text-ink" : "border-ink/15 text-ink/55 hover:border-ink/30"
                  }`}
                  onClick={() => applyPreset(preset)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Base URL */}
        {config.providerType === "openai-compatible" && (
          <div>
            <label className="text-sm font-semibold text-ink/75" htmlFor="baseUrl">API 地址</label>
            <input
              id="baseUrl"
              className="mt-2 h-11 w-full rounded-md border border-ink/15 px-3 font-mono text-sm outline-none focus:border-jade"
              placeholder="https://api.openai.com/v1"
              value={config.baseUrl}
              onChange={(e) => update({ baseUrl: e.target.value })}
            />
          </div>
        )}

        {/* API Key */}
        <div>
          <label className="text-sm font-semibold text-ink/75" htmlFor="apiKey">
            API Key{config.providerType === "openai-compatible" && selectedPreset === "Ollama 本地" ? "（本地可留空）" : ""}
          </label>
          <input
            id="apiKey"
            type="password"
            className="mt-2 h-11 w-full rounded-md border border-ink/15 px-3 font-mono text-sm outline-none focus:border-jade"
            placeholder="sk-..."
            value={config.apiKey}
            onChange={(e) => update({ apiKey: e.target.value })}
          />
          <p className="mt-1 text-xs text-ink/40">Key 只存在浏览器本地，请求时随数据发往本服务器处理。</p>
        </div>

        {/* Model */}
        <div>
          <label className="text-sm font-semibold text-ink/75" htmlFor="model">模型名称</label>
          <input
            id="model"
            className="mt-2 h-11 w-full rounded-md border border-ink/15 px-3 font-mono text-sm outline-none focus:border-jade"
            placeholder="gpt-4o-mini"
            value={config.model}
            onChange={(e) => update({ model: e.target.value })}
          />
          {modelSuggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {modelSuggestions.map((m) => (
                <button
                  key={m}
                  className={`rounded border px-2 py-0.5 font-mono text-xs transition ${
                    config.model === m ? "border-jade bg-jade/10 text-jade" : "border-ink/15 text-ink/50 hover:border-ink/30"
                  }`}
                  onClick={() => update({ model: m })}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            className="h-11 flex-1 rounded-md bg-jade font-semibold text-white transition hover:bg-jade/90"
            onClick={save}
          >
            {saved ? "已保存 ✓" : "保存配置"}
          </button>
          <button
            className="h-11 rounded-md border border-ink/15 px-4 text-sm font-semibold transition hover:border-ink/30 disabled:opacity-50"
            disabled={testing || !config.model}
            onClick={testConnection}
          >
            {testing ? "测试中..." : "测试连接"}
          </button>
        </div>

        {testResult && (
          <div className={`rounded-md px-3 py-2 text-sm ${testResult.ok ? "bg-jade/10 text-jade" : "bg-coral/10 text-coral"}`}>
            {testResult.ok ? `连接成功：${testResult.message}` : `失败：${testResult.message}`}
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-ink/35">AI 用于在房间内按主题生成词对，不参与实时对局。</p>
    </main>
  );
}

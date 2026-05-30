"use client";

import { FormEvent, useState } from "react";

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const response = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password })
    });
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    setSubmitting(false);

    if (!response.ok) {
      setError(data?.error ?? "请求失败，请稍后重试");
      return;
    }

    window.location.href = "/";
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={submit}>
      <label className="block">
        <span className="text-sm font-semibold text-ink/70">用户名</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-ink/15 px-4 outline-none focus:border-jade"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="例如 eric_01"
        />
      </label>

      {mode === "register" ? (
        <label className="block">
          <span className="text-sm font-semibold text-ink/70">显示名称</span>
          <input
            className="mt-2 h-12 w-full rounded-md border border-ink/15 px-4 outline-none focus:border-jade"
            autoComplete="nickname"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="游戏大厅里显示的名字"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="text-sm font-semibold text-ink/70">密码</span>
        <input
          className="mt-2 h-12 w-full rounded-md border border-ink/15 px-4 outline-none focus:border-jade"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={undefined}
        />
      </label>

      {error ? <p className="rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}

      <button
        className="h-12 w-full rounded-md bg-jade font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
        disabled={submitting}
      >
        {submitting ? "处理中..." : mode === "login" ? "登录" : "注册并进入大厅"}
      </button>
    </form>
  );
}

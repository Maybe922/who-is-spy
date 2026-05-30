"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type UserInfo = { username: string; displayName: string | null };

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [nameStatus, setNameStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [nameError, setNameError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwStatus, setPwStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data: { user?: UserInfo | null }) => {
        if (data.user) {
          setUser(data.user);
          setDisplayName(data.user.displayName ?? "");
        }
      })
      .catch(() => {});
  }, []);

  async function saveDisplayName() {
    setNameError("");
    setNameStatus("saving");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName })
      });
      const data = (await res.json()) as { user?: UserInfo; error?: string };
      if (!res.ok) { setNameError(data.error ?? "保存失败"); setNameStatus("error"); return; }
      setUser((prev) => prev ? { ...prev, displayName: data.user?.displayName ?? null } : prev);
      setNameStatus("saved");
    } catch {
      setNameError("网络请求失败"); setNameStatus("error");
    }
  }

  async function savePassword() {
    setPwError("");
    if (newPassword !== confirmPassword) { setPwError("两次输入的新密码不一致"); return; }
    setPwStatus("saving");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { setPwError(data.error ?? "修改失败"); setPwStatus("error"); return; }
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setPwStatus("saved");
    } catch {
      setPwError("网络请求失败"); setPwStatus("error");
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl px-4 py-10">
      <div className="mb-8 flex items-center gap-4">
        <Link className="text-sm text-ink/50 transition hover:text-ink" href="/">← 返回大厅</Link>
        <h1 className="text-2xl font-bold">个人设置</h1>
      </div>

      {user && (
        <p className="mb-6 text-sm text-ink/50">账号：<span className="font-semibold text-ink">{user.username}</span></p>
      )}

      {/* Display name */}
      <section className="mb-5 rounded-lg bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-base font-bold">昵称</h2>
        <label className="text-sm font-semibold text-ink/75" htmlFor="displayName">显示昵称</label>
        <input
          id="displayName"
          className="mt-2 h-11 w-full rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
          maxLength={24}
          placeholder="留空则显示用户名"
          value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); setNameStatus("idle"); }}
        />
        <p className="mt-1 text-xs text-ink/40">最多 24 字，游戏房间内会显示这个名称。</p>
        {nameError && <p className="mt-2 text-sm text-coral">{nameError}</p>}
        <button
          className="mt-4 h-11 w-full rounded-md bg-jade font-semibold text-white transition hover:bg-jade/90 disabled:opacity-50"
          disabled={nameStatus === "saving"}
          onClick={saveDisplayName}
        >
          {nameStatus === "saving" ? "保存中..." : nameStatus === "saved" ? "已保存 ✓" : "保存昵称"}
        </button>
      </section>

      {/* Password */}
      <section className="rounded-lg bg-white p-6 shadow-soft">
        <h2 className="mb-4 text-base font-bold">修改密码</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-ink/75" htmlFor="currentPassword">当前密码</label>
            <input
              id="currentPassword"
              type="password"
              className="mt-2 h-11 w-full rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setPwStatus("idle"); }}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink/75" htmlFor="newPassword">新密码</label>
            <input
              id="newPassword"
              type="password"
              className="mt-2 h-11 w-full rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
              placeholder=""
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setPwStatus("idle"); }}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink/75" htmlFor="confirmPassword">确认新密码</label>
            <input
              id="confirmPassword"
              type="password"
              className="mt-2 h-11 w-full rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus("idle"); }}
            />
          </div>
        </div>
        {pwError && <p className="mt-3 text-sm text-coral">{pwError}</p>}
        <button
          className="mt-5 h-11 w-full rounded-md bg-jade font-semibold text-white transition hover:bg-jade/90 disabled:opacity-50"
          disabled={pwStatus === "saving" || !currentPassword || !newPassword || !confirmPassword}
          onClick={savePassword}
        >
          {pwStatus === "saving" ? "修改中..." : pwStatus === "saved" ? "密码已修改 ✓" : "修改密码"}
        </button>
      </section>
    </main>
  );
}

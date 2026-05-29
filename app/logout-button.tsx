"use client";

import { useState } from "react";

export function LogoutButton() {
  const [submitting, setSubmitting] = useState(false);

  async function logout() {
    setSubmitting(true);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <button
      className="h-10 rounded-md border border-ink/15 px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      disabled={submitting}
      onClick={logout}
    >
      {submitting ? "退出中..." : "退出登录"}
    </button>
  );
}

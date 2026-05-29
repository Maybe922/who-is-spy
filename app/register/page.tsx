import Link from "next/link";
import { AuthForm } from "@/app/auth-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-lg bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold text-jade">聚会游戏大厅</p>
        <h1 className="mt-2 text-3xl font-bold">注册账号</h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">账号先用于大厅和题库管理，实时游戏房间仍保留当前轻量联机流程。</p>
        <AuthForm mode="register" />
        <p className="mt-5 text-center text-sm text-ink/55">
          已有账号？{" "}
          <Link className="font-semibold text-jade" href="/login">
            去登录
          </Link>
        </p>
      </section>
    </main>
  );
}

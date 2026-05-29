import Link from "next/link";
import { AuthForm } from "@/app/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-8">
      <section className="w-full rounded-lg bg-white p-6 shadow-soft">
        <p className="text-sm font-semibold text-jade">聚会游戏大厅</p>
        <h1 className="mt-2 text-3xl font-bold">登录</h1>
        <p className="mt-3 text-sm leading-6 text-ink/58">登录后可以进入大厅，后续题库和更多游戏都会挂在账号下。</p>
        <AuthForm mode="login" />
        <p className="mt-5 text-center text-sm text-ink/55">
          还没有账号？{" "}
          <Link className="font-semibold text-jade" href="/register">
            去注册
          </Link>
        </p>
      </section>
    </main>
  );
}

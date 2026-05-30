import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/app/logout-button";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink/55">聚会游戏平台</p>
          <h1 className="text-3xl font-bold">游戏大厅</h1>
        </div>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink/60">{user.displayName || user.username}</span>
            <Link
              href="/profile"
              className="h-9 rounded-md border border-ink/15 px-4 text-sm font-semibold leading-9 transition hover:border-ink/30"
            >
              个人设置
            </Link>
            {user.role === "ADMIN" ? (
              <Link
                href="/admin/word-packs"
                className="h-9 rounded-md border border-jade/25 px-4 text-sm font-semibold leading-9 text-jade transition hover:border-jade/45"
              >
                题库管理
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="h-9 rounded-md border border-ink/15 px-4 text-sm font-semibold leading-9 transition hover:border-ink/30"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="h-9 rounded-md bg-jade px-4 text-sm font-semibold leading-9 text-white transition hover:bg-jade/90"
            >
              注册
            </Link>
          </div>
        )}
      </header>

      {!user && (
        <div className="mb-6 rounded-lg border border-saffron/30 bg-saffron/10 px-4 py-3 text-sm text-ink/70">
          <span className="font-semibold">登录后</span>可以保存游戏记录、管理题库、跨设备恢复进度。也可以直接以访客身份进入房间。
        </div>
      )}

      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink/70">选择游戏</h2>
          <Link href="/settings" className="text-xs text-ink/40 hover:text-ink/70 transition">AI 配置 →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link
            className="group rounded-lg border border-jade/20 bg-jade/5 p-5 transition hover:border-jade/45"
            href="/play"
          >
            <p className="text-lg font-bold text-ink">谁是卧底</p>
            <p className="mt-2 text-sm leading-6 text-ink/55">
              创建房间，把房间号发给朋友。每人用手机加入，房主控制流程。至少 4 人。
            </p>
            <p className="mt-3 text-xs font-semibold text-jade">进入 →</p>
          </Link>

          <div className="rounded-lg border border-ink/10 bg-paper p-5">
            <p className="text-lg font-bold text-ink/45">更多游戏</p>
            <p className="mt-2 text-sm leading-6 text-ink/35">
              预留位置，后续可以加入你画我猜、真心话大冒险等玩法。
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

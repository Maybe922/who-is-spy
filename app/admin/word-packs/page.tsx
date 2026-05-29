import { revalidatePath } from "next/cache";
import Link from "next/link";
import { WordPackSource } from "@prisma/client";
import { AiWordPackCreator } from "@/app/admin/word-packs/ai-word-pack-creator";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function WordPacksAdminPage() {
  const user = await requireAdmin();
  const packs = await prisma.wordPack.findMany({
    orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
    include: {
      pairs: {
        orderBy: [{ enabled: "desc" }, { createdAt: "desc" }]
      },
      _count: {
        select: { pairs: true }
      }
    }
  });

  const enabledPairCount = packs.reduce((total, pack) => total + pack.pairs.filter((pair) => pair.enabled).length, 0);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink/55">后台管理</p>
          <h1 className="text-3xl font-bold">题库管理</h1>
          <p className="mt-2 text-sm text-ink/50">
            当前管理员：{user.displayName || user.username}
          </p>
        </div>
        <Link className="h-10 rounded-md border border-ink/15 px-4 text-sm font-semibold leading-10" href="/">
          返回大厅
        </Link>
      </header>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard label="题库" value={`${packs.length} 套`} />
        <StatCard label="词对" value={`${enabledPairCount} 组启用`} />
        <StatCard label="随机题库" value="从启用词对抽取" />
      </section>

      <AiWordPackCreator />

      <section className="mb-5 rounded-lg bg-white p-5 shadow-soft">
        <h2 className="text-lg font-bold">新增题库</h2>
        <form action={createWordPack} className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_150px]">
          <input
            className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
            maxLength={40}
            name="name"
            placeholder="题库名称，例如：公司团建"
            required
          />
          <input
            className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
            maxLength={80}
            name="themePrompt"
            placeholder="主题说明，可选"
          />
          <button className="h-11 rounded-md bg-jade px-4 font-semibold text-white">创建题库</button>
        </form>
      </section>

      <section className="grid gap-4">
        {packs.map((pack) => {
          const enabledPairs = pack.pairs.filter((pair) => pair.enabled).length;
          return (
            <article key={pack.id} className="rounded-lg bg-white p-5 shadow-soft">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{pack.name}</h2>
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${pack.enabled ? "bg-jade/10 text-jade" : "bg-ink/10 text-ink/45"}`}>
                      {pack.enabled ? "启用" : "停用"}
                    </span>
                    <span className="rounded-full bg-saffron/15 px-2 py-1 text-xs font-bold text-ink/60">{sourceLabel(pack.source)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink/50">
                    {enabledPairs} / {pack._count.pairs} 组词对启用{pack.themePrompt ? ` · ${pack.themePrompt}` : ""}
                  </p>
                </div>
                <form action={toggleWordPack}>
                  <input name="packId" type="hidden" value={pack.id} />
                  <input name="enabled" type="hidden" value={pack.enabled ? "false" : "true"} />
                  <button className="h-10 rounded-md border border-ink/15 px-4 text-sm font-semibold">
                    {pack.enabled ? "停用题库" : "启用题库"}
                  </button>
                </form>
              </div>

              <form action={addWordPair} className="mt-5 grid gap-2 md:grid-cols-[1fr_1fr_130px]">
                <input name="packId" type="hidden" value={pack.id} />
                <input
                  className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
                  maxLength={20}
                  name="civilian"
                  placeholder="平民词"
                  required
                />
                <input
                  className="h-11 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
                  maxLength={20}
                  name="spy"
                  placeholder="卧底词"
                  required
                />
                <button className="h-11 rounded-md bg-saffron px-4 font-semibold text-ink">添加词对</button>
              </form>

              <div className="mt-5 overflow-hidden rounded-md border border-ink/10">
                <div className="grid grid-cols-[1fr_1fr_100px] bg-paper px-3 py-2 text-sm font-bold text-ink/60">
                  <span>平民词</span>
                  <span>卧底词</span>
                  <span className="text-right">操作</span>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {pack.pairs.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-ink/45">这个题库还没有词对。</p>
                  ) : (
                    pack.pairs.map((pair) => (
                      <div
                        key={pair.id}
                        className={`grid grid-cols-[1fr_1fr_100px] items-center border-t border-ink/10 px-3 py-2 text-sm ${
                          pair.enabled ? "bg-white" : "bg-ink/5 text-ink/35"
                        }`}
                      >
                        <span className="truncate font-semibold">{pair.civilian}</span>
                        <span className="truncate font-semibold">{pair.spy}</span>
                        <form action={toggleWordPair} className="text-right">
                          <input name="pairId" type="hidden" value={pair.id} />
                          <input name="enabled" type="hidden" value={pair.enabled ? "false" : "true"} />
                          <button className="rounded-md border border-ink/15 px-2 py-1 text-xs font-semibold">
                            {pair.enabled ? "停用" : "启用"}
                          </button>
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}

async function createWordPack(formData: FormData) {
  "use server";
  await requireAdmin();

  const name = normalizeText(formData.get("name"), 40);
  const themePrompt = normalizeText(formData.get("themePrompt"), 80);
  if (!name) return;

  await prisma.wordPack.create({
    data: {
      name,
      themePrompt: themePrompt || null,
      source: WordPackSource.CUSTOM,
      enabled: true
    }
  });
  revalidatePath("/admin/word-packs");
}

async function toggleWordPack(formData: FormData) {
  "use server";
  await requireAdmin();

  const packId = normalizeId(formData.get("packId"));
  if (!packId) return;

  await prisma.wordPack.update({
    where: { id: packId },
    data: { enabled: formData.get("enabled") === "true" }
  });
  revalidatePath("/admin/word-packs");
}

async function addWordPair(formData: FormData) {
  "use server";
  await requireAdmin();

  const packId = normalizeId(formData.get("packId"));
  const civilian = normalizeText(formData.get("civilian"), 20);
  const spy = normalizeText(formData.get("spy"), 20);
  if (!packId || !civilian || !spy || civilian === spy) return;

  await prisma.wordPair.create({
    data: {
      packId,
      civilian,
      spy,
      enabled: true
    }
  });
  revalidatePath("/admin/word-packs");
}

async function toggleWordPair(formData: FormData) {
  "use server";
  await requireAdmin();

  const pairId = normalizeId(formData.get("pairId"));
  if (!pairId) return;

  await prisma.wordPair.update({
    where: { id: pairId },
    data: { enabled: formData.get("enabled") === "true" }
  });
  revalidatePath("/admin/word-packs");
}

function normalizeText(value: FormDataEntryValue | null, maxLength: number): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function normalizeId(value: FormDataEntryValue | null): string {
  const id = String(value ?? "").trim();
  return /^[a-z0-9]{10,40}$/i.test(id) ? id : "";
}

function sourceLabel(source: WordPackSource): string {
  if (source === WordPackSource.BUILTIN) return "内置";
  if (source === WordPackSource.AI) return "AI";
  return "自定义";
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-4 shadow-soft">
      <p className="text-sm text-ink/45">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

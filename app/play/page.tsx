"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { io, type Socket } from "socket.io-client";
import { AI_CONFIG_KEY, type AiConfig } from "@/lib/aiTypes";
import type { PrivateRole, Role, RoomState, WordPair } from "@/lib/types";

const roleLabel: Record<Role, string> = {
  civilian: "平民",
  spy: "卧底",
  blank: "白板"
};

const PLAYER_ID_KEY = "who-is-spy:player-id";
const ROOM_CODE_KEY = "who-is-spy:room-code";
const TEST_PLAYER_NAME_KEY = "who-is-spy:test-player-name";
const TEST_PLAYER_MODE_KEY = "who-is-spy:test-player-mode";
const NEW_PLAYER_PARAM = "newPlayer";

let socketInstance: Socket | null = null;

function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io({
      path: "/socket.io",
      transports: ["websocket"],
      upgrade: false
    });
  }
  return socketInstance;
}

function getOrCreatePlayerId(): string {
  const existingId = window.sessionStorage.getItem(PLAYER_ID_KEY);
  if (existingId) return existingId;

  const generatedId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(PLAYER_ID_KEY, generatedId);
  return generatedId;
}

function createTestPlayerName(): string {
  return `测试玩家${Math.floor(1000 + Math.random() * 9000)}`;
}

function prepareNewPlayerTab(): { roomCode: string; testName: string } | null {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(NEW_PLAYER_PARAM)) return null;

  window.sessionStorage.removeItem(PLAYER_ID_KEY);
  window.sessionStorage.removeItem(ROOM_CODE_KEY);
  window.sessionStorage.setItem(TEST_PLAYER_MODE_KEY, "1");
  const invitedRoomCode = params.get("room")?.replace(/\D/g, "").slice(0, 6) ?? "";
  const testName = createTestPlayerName();
  window.sessionStorage.setItem(TEST_PLAYER_NAME_KEY, testName);
  params.delete(NEW_PLAYER_PARAM);
  params.delete("room");
  const query = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  return { roomCode: invitedRoomCode, testName };
}

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerId, setPlayerId] = useState("");
  const [room, setRoom] = useState<RoomState | null>(null);
  const [privateRole, setPrivateRole] = useState<PrivateRole | null>(null);
  const [name, setName] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [selectedVote, setSelectedVote] = useState("");
  const [autoJoinRoomCode, setAutoJoinRoomCode] = useState("");
  const autoJoinStartedRef = useRef(false);

  useEffect(() => {
    const isNewTestPlayer = new URLSearchParams(window.location.search).has(NEW_PLAYER_PARAM);
    if (isNewTestPlayer || window.sessionStorage.getItem(TEST_PLAYER_MODE_KEY) === "1") {
      setName(window.sessionStorage.getItem(TEST_PLAYER_NAME_KEY) || createTestPlayerName());
      setLoggedIn(false);
      return;
    }

    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((data: { user?: { displayName?: string | null; username: string } | null } | null) => {
        const u = data?.user;
        if (u) { setName(u.displayName || u.username); setLoggedIn(true); }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const invited = prepareNewPlayerTab();
    if (invited) {
      setRoomCode(invited.roomCode);
      setName(invited.testName);
      setAutoJoinRoomCode(invited.roomCode);
    }

    const liveSocket = getSocket();
    const currentPlayerId = getOrCreatePlayerId();
    setSocket(liveSocket);
    setPlayerId(currentPlayerId);

    function resumeSavedRoom() {
      const savedRoomCode = window.sessionStorage.getItem(ROOM_CODE_KEY);
      if (savedRoomCode) {
        liveSocket.emit("room:resume", { code: savedRoomCode, clientId: currentPlayerId });
      }
    }

    liveSocket.on("room:state", (state: RoomState) => {
      setRoom(state);
      setSelectedVote("");
      setError("");
      if (state.phase === "lobby") setPrivateRole(null);
      if (state.players.some((player) => player.id === currentPlayerId)) {
        window.sessionStorage.setItem(ROOM_CODE_KEY, state.code);
      }
    });
    liveSocket.on("room:left", () => {
      window.sessionStorage.removeItem(ROOM_CODE_KEY);
      setRoom(null);
      setPrivateRole(null);
      setSelectedVote("");
      setError("");
    });
    liveSocket.on("room:resumeFailed", () => {
      window.sessionStorage.removeItem(ROOM_CODE_KEY);
      setRoom(null);
      setPrivateRole(null);
    });
    liveSocket.on("player:privateRole", (role: PrivateRole) => setPrivateRole(role));
    liveSocket.on("game:error", (message: string) => setError(message));
    liveSocket.on("connect", resumeSavedRoom);

    if (liveSocket.connected) resumeSavedRoom();

    return () => {
      liveSocket.off("room:state");
      liveSocket.off("room:left");
      liveSocket.off("room:resumeFailed");
      liveSocket.off("player:privateRole");
      liveSocket.off("game:error");
      liveSocket.off("connect", resumeSavedRoom);
    };
  }, []);

  useEffect(() => {
    if (!socket || !autoJoinRoomCode || !playerId || !name || room || autoJoinStartedRef.current) return;

    autoJoinStartedRef.current = true;
    socket.emit("room:join", { name, code: autoJoinRoomCode, clientId: playerId });
  }, [autoJoinRoomCode, name, playerId, room, socket]);

  const me = useMemo(() => room?.players.find((player) => player.id === playerId), [room, playerId]);
  const isHost = Boolean(me?.isHost);
  const alivePlayers = room?.players.filter((player) => player.alive) ?? [];
  const connectedPlayers = room?.players.filter((player) => player.connected) ?? [];
  const readyCount = connectedPlayers.filter((player) => player.ready).length;
  const allReady = connectedPlayers.length > 0 && readyCount === connectedPlayers.length;
  const voteTargets = room?.phase === "revote"
    ? alivePlayers.filter((player) => room.tiedPlayerIds.includes(player.id))
    : alivePlayers;
  const voteSubmitted = Boolean(room && playerId && room.votes[playerId]);

  function createRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentPlayerId = getOrCreatePlayerId();
    setPlayerId(currentPlayerId);
    socket?.emit("room:create", { name, clientId: currentPlayerId });
  }

  function joinRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentPlayerId = getOrCreatePlayerId();
    setPlayerId(currentPlayerId);
    socket?.emit("room:join", { name, code: roomCode, clientId: currentPlayerId });
  }

  function updateSetting(key: "spyCount" | "blankCount", value: string): void;
  function updateSetting(key: "showIdentity", value: boolean): void;
  function updateSetting(key: "spyCount" | "blankCount" | "showIdentity", value: string | boolean) {
    socket?.emit("room:updateSettings", { [key]: key === "showIdentity" ? value : Number(value) });
  }

  function submitVote() {
    if (!selectedVote) return;
    socket?.emit("vote:submit", { targetId: selectedVote });
  }

  if (!room) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-8">
        <section className="grid w-full gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-h-[460px] flex-col justify-between rounded-lg bg-ink p-7 text-white shadow-soft">
            <div>
              <p className="mb-3 text-sm text-saffron">多人联机聚会游戏</p>
              <h1 className="text-4xl font-bold leading-tight sm:text-6xl">谁是卧底</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-white/78">
                创建房间，把 6 位房间号发给朋友。每个人用自己的手机加入，房主控制看词、发言、投票和结算。
              </p>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
              <Stat label="身份" value="平民 / 卧底 / 白板" />
              <Stat label="流程" value="房主控场" />
              <Stat label="加入" value="昵称即可" />
            </div>
          </div>

          <div className="rounded-lg bg-white p-5 shadow-soft">
            <Link
              className="mb-5 flex h-11 w-full items-center justify-center rounded-md border border-jade/30 text-sm font-semibold text-jade"
              href="/"
            >
              ← 返回大厅
            </Link>
            <label className="text-sm font-semibold text-ink/75" htmlFor="name">
              昵称
            </label>
            <input
              id="name"
              className={`mt-2 h-12 w-full rounded-md border px-4 outline-none ${loggedIn ? "border-ink/10 bg-ink/5 text-ink/60 cursor-not-allowed" : "border-ink/15 focus:border-jade"}`}
              maxLength={14}
              value={name}
              onChange={(event) => { if (!loggedIn) setName(event.target.value); }}
              readOnly={loggedIn}
              placeholder="输入你的昵称"
            />
            {loggedIn && <p className="mt-1 text-xs text-ink/40">昵称来自你的账号，如需修改请前往个人设置。</p>}

            <form className="mt-6" onSubmit={createRoom}>
              <button className="h-12 w-full rounded-md bg-jade px-4 font-semibold text-white transition hover:bg-jade/90">
                创建房间
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-ink/45">
              <span className="h-px flex-1 bg-ink/10" />
              或
              <span className="h-px flex-1 bg-ink/10" />
            </div>

            <form onSubmit={joinRoom}>
              <label className="text-sm font-semibold text-ink/75" htmlFor="roomCode">
                房间号
              </label>
              <input
                id="roomCode"
                className="mt-2 h-12 w-full rounded-md border border-ink/15 px-4 tracking-[0.2em] outline-none focus:border-jade"
                inputMode="numeric"
                maxLength={6}
                value={roomCode}
                onChange={(event) => setRoomCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6 位数字"
              />
              <button className="mt-4 h-12 w-full rounded-md bg-coral px-4 font-semibold text-white transition hover:bg-coral/90">
                加入房间
              </button>
            </form>
            {error ? <p className="mt-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 sm:py-8">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-ink/55">房间号</p>
          <h1 className="text-3xl font-bold tracking-[0.18em] text-ink">{room.code}</h1>
        </div>
        <Pill>{phaseText(room.phase)}</Pill>
      </header>

      {error ? <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p> : null}

      <section className={`grid gap-4 ${room.phase === "lobby" ? "lg:grid-cols-[330px_1fr]" : "lg:grid-cols-[1fr_330px]"}`}>
        <div className={`${room.phase === "lobby" ? "order-2" : "order-1"} rounded-lg bg-white p-5 shadow-soft`}>
          {room.phase === "lobby" ? (
            <Lobby
              room={room}
              isHost={isHost}
              allReady={allReady}
              onSettingChange={updateSetting}
              onWordPairsSelected={(name, pairs, source) => socket?.emit("room:setWordPairs", { name, pairs, source })}
              onStart={() => socket?.emit("game:start")}
            />
          ) : null}

          {room.phase === "reveal" ? (
            <Reveal
              room={room}
              privateRole={privateRole}
              showIdentity={room.settings.showIdentity}
              isHost={isHost}
              onRerollWord={() => socket?.emit("game:rerollWord")}
              onReturnToLobby={() => socket?.emit("game:returnToLobby")}
              onAdvance={() => socket?.emit("game:advance")}
            />
          ) : null}

          {room.phase === "speaking" ? (
            <Speaking
              room={room}
              privateRole={privateRole}
              isHost={isHost}
              onAdvance={() => socket?.emit("game:advance")}
            />
          ) : null}

          {room.phase === "voting" || room.phase === "revote" ? (
            <Voting
              room={room}
              privateRole={privateRole}
              voteTargets={voteTargets}
              selectedVote={selectedVote}
              voteSubmitted={voteSubmitted}
              onSelect={setSelectedVote}
              onSubmit={submitVote}
            />
          ) : null}

          {room.phase === "result" ? (
            <Result
              room={room}
              isHost={isHost}
              onContinue={() => socket?.emit("game:continue")}
              onRestart={() => socket?.emit("game:restart")}
            />
          ) : null}
        </div>

        <aside className={`${room.phase === "lobby" ? "order-1" : "order-2"} rounded-lg bg-white p-5 shadow-soft`}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">玩家</h2>
            <span className="rounded-full bg-jade/10 px-3 py-1 text-sm font-bold text-jade">
              {room.phase === "lobby"
                ? `准备 ${readyCount} / 总 ${connectedPlayers.length}`
                : `在线 ${connectedPlayers.length} / 总 ${room.players.length}`}
            </span>
          </div>
          <div className="mt-4 space-y-2">
            {room.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 ${
                  room.phase === "lobby"
                    ? player.ready
                      ? "border-jade/20 bg-jade/10"
                      : "border-coral/20 bg-coral/10"
                    : !player.alive
                      ? "border-ink/10 bg-ink/5 text-ink/45"
                      : "border-ink/10"
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{player.name}</p>
                  <p className={`text-xs ${player.isHost ? "font-bold text-saffron" : "text-ink/45"}`}>
                    {player.isHost ? "房主" : "玩家"} · {player.connected ? "在线" : "断线"}
                  </p>
                  {player.revealedRole ? (
                    <p className="mt-1 text-xs font-bold text-coral">身份：{roleLabel[player.revealedRole]}</p>
                  ) : null}
                </div>
                <span
                  className={`text-sm font-semibold ${
                    room.phase === "lobby" ? (player.ready ? "text-jade" : "text-coral") : player.alive ? "text-jade" : "text-coral"
                  }`}
                >
                  {room.phase === "lobby" ? (player.ready ? "已准备" : "未准备") : player.alive ? "存活" : "出局"}
                </span>
              </div>
            ))}
          </div>
          {room.phase === "lobby" ? (
            <button
              className={`mt-5 h-11 w-full rounded-md text-sm font-semibold transition ${
                me?.ready ? "border border-coral bg-white text-coral" : "bg-saffron text-ink"
              }`}
              onClick={() => socket?.emit("room:setReady", { ready: !me?.ready })}
            >
              {me?.ready ? "取消准备" : "我准备好了"}
            </button>
          ) : null}
          <button
            className="mt-3 h-11 w-full rounded-md border border-ink/15 text-sm font-semibold"
            onClick={() => socket?.emit("room:leave")}
          >
            离开房间
          </button>
          {room.phase === "lobby" ? (
            <a
              className="mt-3 flex h-11 w-full items-center justify-center rounded-md border border-jade/30 text-sm font-semibold text-jade"
              href={`/play?newPlayer=1&room=${room.code}`}
              rel="noreferrer"
              target="_blank"
            >
              新标签加入测试
            </a>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function Lobby({
  room,
  isHost,
  allReady,
  onSettingChange,
  onWordPairsSelected,
  onStart
}: {
  room: RoomState;
  isHost: boolean;
  allReady: boolean;
  onSettingChange: {
    (key: "spyCount" | "blankCount", value: string): void;
    (key: "showIdentity", value: boolean): void;
  };
  onWordPairsSelected: (name: string, pairs: WordPair[], source: "ai" | "db") => void;
  onStart: () => void;
}) {
  const [theme, setTheme] = useState("");
  const [generatedPairs, setGeneratedPairs] = useState<WordPair[]>([]);
  const [generating, setGenerating] = useState(false);
  const [randomizing, setRandomizing] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const hasWordPack = Boolean(room.wordPack);

  async function generateWordPairs() {
    const trimmedTheme = theme.trim();
    setGenerateError("");
    if (!trimmedTheme) {
      setGenerateError("请输入题库主题");
      return;
    }

    const rawConfig = window.localStorage.getItem(AI_CONFIG_KEY);
    if (!rawConfig) {
      setGenerateError("请先在大厅的 AI 配置中保存模型配置");
      return;
    }

    let aiConfig: AiConfig;
    try {
      aiConfig = JSON.parse(rawConfig) as AiConfig;
    } catch {
      setGenerateError("AI 配置格式异常，请重新保存配置");
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiConfig, theme: trimmedTheme, count: 20 })
      });
      const data = (await response.json()) as { theme?: string; pairs?: WordPair[]; error?: string; parsedCount?: number; preview?: string };
      if (!response.ok || !data.pairs) {
        setGenerateError(
          data.preview
            ? `${data.error ?? "生成失败"}；已解析 ${data.parsedCount ?? 0} 组。AI 原始返回预览：${data.preview}`
            : data.error ?? "生成失败，请稍后重试"
        );
        return;
      }

      setGeneratedPairs(data.pairs);
      onWordPairsSelected(trimmedTheme, data.pairs, "ai");
    } catch {
      setGenerateError("生成请求失败，请检查 AI 配置或网络");
    } finally {
      setGenerating(false);
    }
  }

  async function useRandomDatabaseWords() {
    setGenerateError("");
    setRandomizing(true);
    try {
      const response = await fetch("/api/word-pairs/random?count=20");
      const data = (await response.json()) as { name?: string; pairs?: WordPair[]; error?: string };
      if (!response.ok || !data.pairs) {
        setGenerateError(data.error ?? "随机题库读取失败");
        return;
      }

      setTheme("");
      setGeneratedPairs(data.pairs);
      onWordPairsSelected(data.name ?? "数据库随机题库", data.pairs, "db");
    } catch {
      setGenerateError("随机题库读取失败，请检查数据库连接");
    } finally {
      setRandomizing(false);
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold">等待玩家加入</h2>
      <p className="mt-2 text-sm text-ink/58">把房间号发给朋友。至少 4 人，卧底加白板数量必须小于平民数量。</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <NumberField
          label="卧底数量"
          value={room.settings.spyCount}
          disabled={!isHost}
          onChange={(value) => onSettingChange("spyCount", value)}
        />
        <NumberField
          label="白板数量"
          value={room.settings.blankCount}
          disabled={!isHost}
          onChange={(value) => onSettingChange("blankCount", value)}
        />
      </div>
      <label className="mt-5 flex items-center justify-between gap-4 rounded-md border border-ink/10 px-4 py-3">
        <span>
          <span className="block font-semibold">知道自己的身份？</span>
          <span className="mt-1 block text-sm text-ink/50">关闭后，平民和卧底只看到词；白板仍显示白板。</span>
        </span>
        <input
          className="h-5 w-5 accent-jade"
          type="checkbox"
          checked={room.settings.showIdentity}
          disabled={!isHost}
          onChange={(event) => onSettingChange("showIdentity", event.target.checked)}
        />
      </label>
      <div className="mt-5 rounded-md border border-ink/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-semibold">题库主题</p>
            <p className="mt-1 text-sm text-ink/50">
              当前：{room.wordPack ? `${room.wordPack.name} · ${room.wordPack.pairCount} 组词对` : "未选择题库"}
            </p>
          </div>
          <Link className="text-sm font-semibold text-jade" href="/settings">
            AI 配置
          </Link>
        </div>
        {isHost ? (
          <div className="mt-4">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                className="h-11 min-w-0 flex-1 rounded-md border border-ink/15 px-3 outline-none focus:border-jade"
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                placeholder="例如：小时候的动画片"
              />
              <button
                className="h-11 rounded-md bg-saffron px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:bg-ink/20"
                disabled={generating || randomizing}
                onClick={generateWordPairs}
              >
                {generating ? "生成中..." : "生成并使用"}
              </button>
              <button
                className="h-11 rounded-md border border-jade/30 bg-white px-4 text-sm font-semibold text-jade disabled:cursor-not-allowed disabled:bg-ink/5 disabled:text-ink/35"
                disabled={generating || randomizing}
                onClick={useRandomDatabaseWords}
              >
                {randomizing ? "随机中..." : "随机题库"}
              </button>
            </div>
            {generateError ? <p className="mt-2 text-sm text-coral">{generateError}</p> : null}
            {generatedPairs.length > 0 ? (
              <div className="mt-3 rounded-md bg-paper px-3 py-2 text-xs text-ink/58">
                已准备 {generatedPairs.length} 组词对
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 rounded-md bg-paper px-3 py-2 text-sm text-ink/55">等待房主选择或生成本局题库。</p>
        )}
      </div>
      {isHost ? (
        <button
          className="mt-6 h-12 w-full rounded-md bg-jade font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
          disabled={!allReady || !hasWordPack}
          onClick={onStart}
        >
          {!hasWordPack ? "请先选择题库" : allReady ? "开始游戏" : "等待所有玩家准备"}
        </button>
      ) : (
        <p className="mt-6 rounded-md bg-ink/5 px-3 py-3 text-sm text-ink/60">准备后等待房主开始游戏。</p>
      )}
    </div>
  );
}

function Reveal({
  room,
  privateRole,
  showIdentity,
  isHost,
  onRerollWord,
  onReturnToLobby,
  onAdvance
}: {
  room: RoomState;
  privateRole: PrivateRole | null;
  showIdentity: boolean;
  isHost: boolean;
  onRerollWord: () => void;
  onReturnToLobby: () => void;
  onAdvance: () => void;
}) {
  const isBlank = privateRole?.role === "blank";
  const shouldShowIdentity = showIdentity || isBlank || !privateRole;
  const shouldShowWord = privateRole ? privateRole.role !== "blank" : true;
  const canRerollWord = room.wordPack?.source !== "builtin" && Boolean(room.wordPack && room.wordPack.pairCount > 1);

  return (
    <div>
      <h2 className="text-2xl font-bold">查看你的身份</h2>
      <div className="mt-5 rounded-lg border border-ink/10 bg-paper p-5 text-center">
        {shouldShowIdentity ? (
          <>
            <p className="text-sm text-ink/55">你的身份</p>
            <p className="mt-2 text-4xl font-bold text-coral">{privateRole ? roleLabel[privateRole.role] : "等待发牌"}</p>
          </>
        ) : null}
        {shouldShowWord ? (
          <>
            <p className={shouldShowIdentity ? "mt-5 text-sm text-ink/55" : "text-sm text-ink/55"}>你的词</p>
            <p className="mt-2 text-3xl font-bold text-ink">{privateRole?.word ?? "等待发牌"}</p>
          </>
        ) : null}
      </div>
      {isHost ? (
        <div className="mt-6 grid gap-3">
          {canRerollWord ? (
            <button className="h-12 w-full rounded-md border border-coral/30 bg-white font-semibold text-coral" onClick={onRerollWord}>
              换词
            </button>
          ) : null}
          <button className="h-12 w-full rounded-md bg-jade font-semibold text-white" onClick={onAdvance}>
            全员看完，开始发言
          </button>
          <button className="h-12 w-full rounded-md border border-ink/15 bg-white font-semibold text-ink" onClick={onReturnToLobby}>
            返回，重新输入主题
          </button>
        </div>
      ) : (
        <p className="mt-6 rounded-md bg-ink/5 px-3 py-3 text-sm text-ink/60">看完后等待房主开始发言。</p>
      )}
    </div>
  );
}

function Speaking({
  room,
  privateRole,
  isHost,
  onAdvance
}: {
  room: RoomState;
  privateRole: PrivateRole | null;
  isHost: boolean;
  onAdvance: () => void;
}) {
  const playersById = new Map(room.players.map((player) => [player.id, player]));
  const speakingPlayers = room.speakingOrder
    .map((playerId) => playersById.get(playerId))
    .filter((player): player is RoomState["players"][number] => Boolean(player?.alive));

  return (
    <div>
      <h2 className="text-2xl font-bold">发言阶段</h2>
      <p className="mt-2 text-sm text-ink/58">每位存活玩家依次描述自己的词，不能直接说出词本身。</p>
      <PrivateWordReminder privateRole={privateRole} />
      <div className="mt-5 grid gap-2">
        {speakingPlayers.map((player, index) => (
            <div key={player.id} className="flex items-center gap-3 rounded-md bg-paper px-3 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saffron font-bold">{index + 1}</span>
              <span className="font-semibold">{player.name}</span>
            </div>
          ))}
      </div>
      {isHost ? (
        <button className="mt-6 h-12 w-full rounded-md bg-coral font-semibold text-white" onClick={onAdvance}>
          发言结束，进入投票
        </button>
      ) : null}
    </div>
  );
}

function Voting({
  room,
  privateRole,
  voteTargets,
  selectedVote,
  voteSubmitted,
  onSelect,
  onSubmit
}: {
  room: RoomState;
  privateRole: PrivateRole | null;
  voteTargets: RoomState["players"];
  selectedVote: string;
  voteSubmitted: boolean;
  onSelect: (value: string) => void;
  onSubmit: () => void;
}) {
  const aliveCount = room.players.filter((player) => player.alive).length;
  const voteCount = Object.keys(room.votes).length;
  return (
    <div>
      <h2 className="text-2xl font-bold">{room.phase === "revote" ? "平票重投" : "投票阶段"}</h2>
      <p className="mt-2 text-sm text-ink/58">已投票 {voteCount} / {aliveCount}</p>
      <PrivateWordReminder privateRole={privateRole} />
      <div className="mt-5 grid gap-2">
        {voteTargets.map((player) => (
          <button
            key={player.id}
            className={`min-h-12 rounded-md border px-4 text-left font-semibold ${
              selectedVote === player.id ? "border-jade bg-jade/10 text-jade" : "border-ink/10 bg-white"
            }`}
            disabled={voteSubmitted}
            onClick={() => onSelect(player.id)}
          >
            {player.name}
          </button>
        ))}
      </div>
      <button
        className="mt-6 h-12 w-full rounded-md bg-jade font-semibold text-white disabled:cursor-not-allowed disabled:bg-ink/25"
        disabled={!selectedVote || voteSubmitted}
        onClick={onSubmit}
      >
        {voteSubmitted ? "已提交，等待其他玩家" : "提交投票"}
      </button>
    </div>
  );
}

function PrivateWordReminder({ privateRole }: { privateRole: PrivateRole | null }) {
  return (
    <div className="mt-5 flex items-center justify-between rounded-md border border-jade/20 bg-jade/5 px-4 py-3">
      <span className="text-sm font-semibold text-ink/55">{privateRole?.role === "blank" ? "我的身份" : "我的词"}</span>
      <span className="text-xl font-bold text-jade">
        {privateRole ? privateRole.word ?? "白板" : "等待发牌"}
      </span>
    </div>
  );
}

function Result({
  room,
  isHost,
  onContinue,
  onRestart
}: {
  room: RoomState;
  isHost: boolean;
  onContinue: () => void;
  onRestart: () => void;
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold">游戏结束</h2>
      <p className="mt-3 rounded-md bg-saffron/20 px-3 py-3 font-semibold">
        {room.result?.winner === "civilians" ? "平民胜利" : "卧底和白板胜利"}：{room.result?.reason}
      </p>
      <div className="mt-5 grid gap-2">
        {room.revealedPlayers?.map((player) => (
          <div key={player.id} className="rounded-md border border-ink/10 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{player.name}</span>
              <span className="text-sm text-coral">{roleLabel[player.role]}</span>
            </div>
            <p className="mt-1 text-sm text-ink/55">词语：{player.word ?? "白板"}</p>
          </div>
        ))}
      </div>
      {isHost ? (
        <div className="mt-6 grid gap-3">
          <button className="h-12 w-full rounded-md bg-jade font-semibold text-white" onClick={onContinue}>
            继续玩
          </button>
          <button className="h-12 w-full rounded-md border border-ink/15 font-semibold" onClick={onRestart}>
            回到大厅
          </button>
        </div>
      ) : null}
    </div>
  );
}

function NumberField({
  label,
  value,
  disabled,
  onChange
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink/75">{label}</span>
      <input
        className="mt-2 h-12 w-full rounded-md border border-ink/15 px-4 outline-none focus:border-jade disabled:bg-ink/5"
        type="number"
        min={0}
        max={10}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-white/10 p-3">
      <p className="text-xs text-white/55">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-soft">{children}</span>;
}

function phaseText(phase: RoomState["phase"]): string {
  const labels: Record<RoomState["phase"], string> = {
    lobby: "大厅",
    reveal: "看词",
    speaking: "发言",
    voting: "投票",
    revote: "重投",
    result: "结算"
  };
  return labels[phase];
}

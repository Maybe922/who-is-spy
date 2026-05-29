import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import {
  assignRoles,
  checkWinner,
  createSpeakingOrder,
  generateRoomCode,
  getPrivateRole,
  revealPlayer,
  sanitizeName,
  summarizeVotes,
  toPublicPlayer,
  validateReady,
  validateStart
} from "./lib/game";
import type { GameResult, Phase, Player, RoomState, Settings, WordPair } from "./lib/types";

type Room = {
  code: string;
  phase: Phase;
  hostId: string;
  players: Player[];
  speakingOrder: string[];
  settings: Settings;
  wordPair?: WordPair;
  customWordPairs?: WordPair[];
  wordPairIndex?: number;
  wordPackName?: string;
  wordPackSource?: "ai" | "db";
  votes: Record<string, string>;
  tiedPlayerIds: string[];
  result?: GameResult;
};

type SocketSession = {
  roomCode: string;
  playerId: string;
};

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = Number(process.env.PORT ?? 3000);
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const rooms = new Map<string, Room>();
const sessions = new Map<string, SocketSession>();

await app.prepare();

const httpServer = createServer((req, res) => handle(req, res));
const io = new Server(httpServer, {
  cors: {
    origin: "*"
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

io.on("connection", (socket) => {
  socket.on("room:create", ({ name, clientId }: { name?: string; clientId?: string }) => {
    const playerName = sanitizeName(name ?? "");
    if (!playerName) return emitError(socket.id, "请输入昵称");

    const code = generateRoomCode(new Set(rooms.keys()));
    const playerId = normalizeClientId(clientId, socket.id);
    const player: Player = {
      id: playerId,
      socketId: socket.id,
      name: playerName,
      isHost: true,
      connected: true,
      ready: false,
      alive: true
    };
    const room: Room = {
      code,
      phase: "lobby",
      hostId: player.id,
      players: [player],
      speakingOrder: [],
      settings: { spyCount: 1, blankCount: 1, showIdentity: true },
      votes: {},
      tiedPlayerIds: []
    };

    rooms.set(code, room);
    sessions.set(socket.id, { roomCode: code, playerId: player.id });
    socket.join(code);
    emitRoom(room);
  });

  socket.on("room:join", ({ code, name, clientId }: { code?: string; name?: string; clientId?: string }) => {
    const room = rooms.get(String(code ?? "").trim());
    const playerName = sanitizeName(name ?? "");
    const playerId = normalizeClientId(clientId, socket.id);
    if (!room) return emitError(socket.id, "房间不存在");
    if (!playerName) return emitError(socket.id, "请输入昵称");
    if (room.phase !== "lobby") return emitError(socket.id, "游戏已经开始，暂时不能加入");
    if (room.players.some((player) => player.id === playerId)) {
      return resumePlayer(socket.id, room, playerId);
    }
    if (room.players.some((player) => player.connected && player.name === playerName)) {
      return emitError(socket.id, "这个昵称已经在房间里");
    }

    const player: Player = {
      id: playerId,
      socketId: socket.id,
      name: playerName,
      isHost: false,
      connected: true,
      ready: false,
      alive: true
    };
    room.players.push(player);
    sessions.set(socket.id, { roomCode: room.code, playerId: player.id });
    socket.join(room.code);
    emitRoom(room);
  });

  socket.on("room:resume", ({ code, clientId }: { code?: string; clientId?: string }) => {
    const room = rooms.get(String(code ?? "").trim());
    const playerId = normalizeClientId(clientId, "");
    if (!room || !playerId) {
      socket.emit("room:resumeFailed");
      return;
    }
    resumePlayer(socket.id, room, playerId);
  });

  socket.on("room:leave", () => {
    leaveRoom(socket.id);
    socket.emit("room:left");
  });

  socket.on("room:updateSettings", (settings: Partial<Settings>) => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以修改设置");
    if (room.phase !== "lobby") return emitError(socket.id, "游戏开始后不能修改角色数量");

    room.settings = {
      spyCount: clampCount(settings.spyCount, room.settings.spyCount),
      blankCount: clampCount(settings.blankCount, room.settings.blankCount),
      showIdentity: typeof settings.showIdentity === "boolean" ? settings.showIdentity : room.settings.showIdentity
    };
    emitRoom(room);
  });

  socket.on("room:setWordPairs", ({ name, pairs, source }: { name?: string; pairs?: WordPair[]; source?: "ai" | "db" }) => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以设置题库");
    if (room.phase !== "lobby") return emitError(socket.id, "游戏开始后不能修改题库");

    const normalizedPairs = normalizeWordPairs(pairs);
    if (normalizedPairs.length < 3) return emitError(socket.id, "至少需要 3 组有效词对");

    room.customWordPairs = normalizedPairs;
    room.wordPairIndex = 0;
    room.wordPackName = sanitizeWordPackName(name);
    room.wordPackSource = source === "db" ? "db" : "ai";
    emitRoom(room);
  });

  socket.on("room:setReady", ({ ready }: { ready?: boolean }) => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.phase !== "lobby") return emitError(socket.id, "只有大厅阶段可以准备");

    player.ready = Boolean(ready);
    emitRoom(room);
  });

  socket.on("game:start", () => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以开始游戏");

    const validationError = validateStart(room.players, room.settings);
    if (validationError) return emitError(socket.id, validationError);
    const readyError = validateReady(room.players);
    if (readyError) return emitError(socket.id, readyError);

    if (!room.customWordPairs || room.customWordPairs.length === 0) return emitError(socket.id, "请先选择或生成本局题库");

    room.wordPairIndex = 0;
    room.wordPair = room.customWordPairs[room.wordPairIndex];
    room.players = assignRoles(room.players, room.settings, room.wordPair);
    room.speakingOrder = createSpeakingOrder(room.players);
    room.phase = "reveal";
    room.votes = {};
    room.tiedPlayerIds = [];
    room.result = undefined;
    emitRoom(room);
    emitPrivateRoles(room);
  });

  socket.on("game:rerollWord", () => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以换词");
    if (room.phase !== "reveal") return emitError(socket.id, "只有看词阶段可以换词");
    if (!room.customWordPairs || room.customWordPairs.length === 0) return emitError(socket.id, "当前房间没有可换的题库");

    const nextWordPairIndex = (room.wordPairIndex ?? 0) + 1;
    if (nextWordPairIndex >= room.customWordPairs.length) return emitError(socket.id, "这批题库已经全部换完了");

    room.wordPairIndex = nextWordPairIndex;
    room.wordPair = room.customWordPairs[room.wordPairIndex];
    room.players = assignRoles(room.players, room.settings, room.wordPair);
    room.speakingOrder = createSpeakingOrder(room.players);
    room.votes = {};
    room.tiedPlayerIds = [];
    room.result = undefined;
    emitRoom(room);
    emitPrivateRoles(room);
  });

  socket.on("game:returnToLobby", () => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以返回大厅");
    if (room.phase !== "reveal") return emitError(socket.id, "只有看词阶段可以返回重新设置");

    resetRoom(room);
    emitRoom(room);
  });

  socket.on("game:advance", () => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以推进流程");

    if (room.phase === "reveal") {
      room.phase = "speaking";
    } else if (room.phase === "speaking") {
      room.phase = "voting";
      room.votes = {};
      room.tiedPlayerIds = [];
    } else if (room.phase === "result") {
      resetRoom(room);
    } else {
      return emitError(socket.id, "当前阶段不能手动推进");
    }

    emitRoom(room);
  });

  socket.on("vote:submit", ({ targetId }: { targetId?: string }) => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.phase !== "voting" && room.phase !== "revote") return emitError(socket.id, "现在不是投票阶段");
    if (!player.alive) return emitError(socket.id, "已出局玩家不能投票");

    const aliveIds = room.players.filter((item) => item.alive).map((item) => item.id);
    const eligibleTargets = room.phase === "revote" ? room.tiedPlayerIds : aliveIds;
    if (!targetId || !eligibleTargets.includes(targetId)) return emitError(socket.id, "请选择可投票的玩家");

    room.votes[player.id] = targetId;
    const voters = aliveIds;
    if (voters.every((voterId) => room.votes[voterId])) {
      resolveVote(room, eligibleTargets);
    }
    emitRoom(room);
  });

  socket.on("game:restart", () => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以重新开局");
    resetRoom(room);
    emitRoom(room);
  });

  socket.on("game:continue", () => {
    const context = getRoomForSocket(socket.id);
    if (!context) return emitError(socket.id, "你还没有加入房间");
    const { room, player } = context;
    if (room.hostId !== player.id) return emitError(socket.id, "只有房主可以继续游戏");
    if (room.phase !== "result") return emitError(socket.id, "只有结算阶段可以继续游戏");
    if (!room.customWordPairs || room.customWordPairs.length === 0) return emitError(socket.id, "当前房间没有可继续使用的题库");

    const nextWordPairIndex = (room.wordPairIndex ?? 0) + 1;
    if (nextWordPairIndex >= room.customWordPairs.length) return emitError(socket.id, "这批题库已经全部玩完了，请回到大厅重新选择题库");

    const validationError = validateStart(room.players, room.settings);
    if (validationError) return emitError(socket.id, validationError);

    room.wordPairIndex = nextWordPairIndex;
    room.wordPair = room.customWordPairs[room.wordPairIndex];
    room.players = assignRoles(
      room.players.filter((item) => item.connected),
      room.settings,
      room.wordPair
    );
    room.players.forEach((item) => {
      item.isHost = item.id === room.hostId;
    });
    if (!room.players.some((item) => item.id === room.hostId)) {
      const host = room.players[0];
      room.hostId = host.id;
      host.isHost = true;
    }
    room.speakingOrder = createSpeakingOrder(room.players);
    room.phase = "reveal";
    room.votes = {};
    room.tiedPlayerIds = [];
    room.result = undefined;
    emitRoom(room);
    emitPrivateRoles(room);
  });

  socket.on("disconnect", () => {
    leaveRoom(socket.id, true);
  });
});

httpServer.listen(port, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});

function getRoomForSocket(socketId: string): { room: Room; player: Player } | null {
  const session = sessions.get(socketId);
  if (!session) return null;
  const room = rooms.get(session.roomCode);
  if (!room) return null;
  const player = room.players.find((item) => item.id === session.playerId);
  if (!player) return null;
  return { room, player };
}

function resumePlayer(socketId: string, room: Room, playerId: string): void {
  const player = room.players.find((item) => item.id === playerId);
  if (!player) {
    io.to(socketId).emit("room:resumeFailed");
    return;
  }

  if (player.socketId && player.socketId !== socketId) {
    sessions.delete(player.socketId);
    io.sockets.sockets.get(player.socketId)?.leave(room.code);
  }

  player.connected = true;
  player.socketId = socketId;
  sessions.set(socketId, { roomCode: room.code, playerId: player.id });
  io.sockets.sockets.get(socketId)?.join(room.code);
  emitRoom(room);

  const privateRole = getPrivateRole(player);
  if (privateRole) io.to(socketId).emit("player:privateRole", privateRole);
}

function leaveRoom(socketId: string, disconnected = false): void {
  const context = getRoomForSocket(socketId);
  if (!context) return;
  const { room, player } = context;

  player.connected = false;
  if (!disconnected) player.ready = false;
  player.socketId = undefined;
  sessions.delete(socketId);
  io.sockets.sockets.get(socketId)?.leave(room.code);

  if (!disconnected && room.phase === "lobby") {
    room.players = room.players.filter((item) => item.id !== player.id);
  }

  const connectedPlayers = room.players.filter((item) => item.connected);
  if (connectedPlayers.length === 0) {
    if (!disconnected) rooms.delete(room.code);
    return;
  }

  if (!disconnected && room.hostId === player.id) {
    const nextHost = connectedPlayers[0];
    nextHost.isHost = true;
    room.hostId = nextHost.id;
    player.isHost = false;
  }

  if (disconnected && room.phase !== "lobby" && player.alive) {
    emitError(room.hostId, `${player.name} 已断线，房主可继续推进或重新开局`);
  }

  emitRoom(room);
}

function resolveVote(room: Room, eligibleTargets: string[]): void {
  const summary = summarizeVotes(room.votes, eligibleTargets);
  if (!summary.eliminatedId) {
    room.phase = "revote";
    room.tiedPlayerIds = summary.tiedPlayerIds;
    room.votes = {};
    return;
  }

  const eliminated = room.players.find((player) => player.id === summary.eliminatedId);
  if (eliminated) eliminated.alive = false;

  const result = checkWinner(room.players);
  if (result) {
    room.phase = "result";
    room.result = result;
    io.to(room.code).emit("game:result", result);
  } else {
    room.phase = "speaking";
  }

  room.votes = {};
  room.tiedPlayerIds = [];
}

function resetRoom(room: Room): void {
  room.phase = "lobby";
  room.wordPair = undefined;
  room.wordPairIndex = 0;
  room.speakingOrder = [];
  room.votes = {};
  room.tiedPlayerIds = [];
  room.result = undefined;
  room.players = room.players
    .filter((player) => player.connected)
    .map((player) => ({ ...player, ready: false, alive: true, role: undefined, word: undefined }));
  if (!room.players.some((player) => player.id === room.hostId)) {
    const host = room.players[0];
    room.hostId = host.id;
    host.isHost = true;
  }
}

function emitRoom(room: Room): void {
  io.to(room.code).emit("room:state", serializeRoom(room));
}

function emitPrivateRoles(room: Room): void {
  room.players.forEach((player) => {
    if (!player.connected || !player.socketId) return;
    const privateRole = getPrivateRole(player);
    if (privateRole) io.to(player.socketId).emit("player:privateRole", privateRole);
  });
}

function emitError(socketId: string, message: string): void {
  io.to(socketId).emit("game:error", message);
}

function serializeRoom(room: Room): RoomState {
  return {
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    players: room.players.map(toPublicPlayer),
    speakingOrder: room.speakingOrder,
    settings: room.settings,
    wordPack: room.customWordPairs
      ? {
          name: room.wordPackName ?? (room.wordPackSource === "db" ? "数据库随机题库" : "AI 生成题库"),
          pairCount: room.customWordPairs.length,
          source: room.wordPackSource ?? "ai"
        }
      : { name: "经典默认题库", pairCount: 20, source: "builtin" },
    wordPair: room.phase === "result" ? room.wordPair : undefined,
    votes: room.votes,
    tiedPlayerIds: room.tiedPlayerIds,
    result: room.result,
    revealedPlayers: room.phase === "result" ? room.players.map(revealPlayer) : undefined
  };
}

function sanitizeWordPackName(name: unknown): string {
  const normalized = String(name ?? "").trim().replace(/\s+/g, " ").slice(0, 30);
  return normalized || "AI 生成题库";
}

function normalizeWordPairs(pairs: unknown): WordPair[] {
  if (!Array.isArray(pairs)) return [];

  const seen = new Set<string>();
  const normalized: WordPair[] = [];
  pairs.slice(0, 50).forEach((pair) => {
    if (!pair || typeof pair !== "object") return;
    const value = pair as Record<string, unknown>;
    const civilian = String(value.civilian ?? "").trim().slice(0, 20);
    const spy = String(value.spy ?? "").trim().slice(0, 20);
    if (!civilian || !spy || civilian === spy) return;

    const key = `${civilian}:${spy}`;
    if (seen.has(key)) return;
    seen.add(key);
    normalized.push({ civilian, spy });
  });

  return normalized;
}

function clampCount(value: unknown, fallback: number): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(10, Math.floor(numeric)));
}

function normalizeClientId(clientId: unknown, fallback: string): string {
  if (typeof clientId !== "string") return fallback;
  const trimmed = clientId.trim();
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(trimmed)) return fallback;
  return trimmed;
}

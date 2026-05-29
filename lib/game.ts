import { pickWordPair } from "./words";
import type { GameResult, Player, PrivateRole, Role, Settings, VoteSummary, WordPair } from "./types";

export function sanitizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").slice(0, 14);
}

export function generateRoomCode(existingCodes: Set<string>, random = Math.random): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = String(Math.floor(100000 + random() * 900000));
    if (!existingCodes.has(code)) return code;
  }
  throw new Error("房间号生成失败，请重试");
}

export function validateStart(players: Player[], settings: Settings): string | null {
  const activePlayers = players.filter((player) => player.connected);
  const total = activePlayers.length;
  const specialCount = settings.spyCount + settings.blankCount;
  const civilianCount = total - specialCount;

  if (total < 4) return "至少需要 4 名玩家开始游戏";
  if (!Number.isInteger(settings.spyCount) || !Number.isInteger(settings.blankCount)) return "角色数量必须是整数";
  if (settings.spyCount < 1) return "至少需要 1 名卧底";
  if (settings.blankCount < 0) return "白板数量不能小于 0";
  if (specialCount >= total) return "卧底和白板数量必须少于总人数";
  if (specialCount >= civilianCount) return "卧底和白板数量必须小于平民数量";

  return null;
}

export function validateReady(players: Player[]): string | null {
  const activePlayers = players.filter((player) => player.connected);
  if (activePlayers.some((player) => !player.ready)) return "所有玩家准备后才能开始游戏";
  return null;
}

export function assignRoles(
  players: Player[],
  settings: Settings,
  wordPair: WordPair = pickWordPair(),
  random = Math.random
): Player[] {
  const validationError = validateStart(players, settings);
  if (validationError) throw new Error(validationError);

  const activePlayers = players.filter((player) => player.connected);
  const shuffled = shuffle(activePlayers, random);
  const roles: Role[] = [
    ...Array.from({ length: settings.spyCount }, () => "spy" as const),
    ...Array.from({ length: settings.blankCount }, () => "blank" as const),
    ...Array.from({ length: activePlayers.length - settings.spyCount - settings.blankCount }, () => "civilian" as const)
  ];

  const roleById = new Map<string, Role>();
  shuffled.forEach((player, index) => roleById.set(player.id, roles[index]));

  return players.map((player) => {
    const role = roleById.get(player.id);
    if (!role) {
      return { ...player, alive: false, role: undefined, word: undefined };
    }

    return {
      ...player,
      alive: true,
      role,
      word: role === "civilian" ? wordPair.civilian : role === "spy" ? wordPair.spy : undefined
    };
  });
}

export function applyWordPairToPlayers(players: Player[], wordPair: WordPair): Player[] {
  return players.map((player) => {
    if (player.role === "civilian") return { ...player, word: wordPair.civilian };
    if (player.role === "spy") return { ...player, word: wordPair.spy };
    return { ...player, word: undefined };
  });
}

export function createSpeakingOrder(players: Player[], random = Math.random): string[] {
  return shuffle(
    players.filter((player) => player.connected).map((player) => player.id),
    random
  );
}

export function getPrivateRole(player: Player): PrivateRole | null {
  if (!player.role) return null;
  return {
    role: player.role,
    word: player.role === "blank" ? null : player.word ?? null
  };
}

export function summarizeVotes(votes: Record<string, string>, eligiblePlayerIds: string[]): VoteSummary {
  const eligible = new Set(eligiblePlayerIds);
  const counts: Record<string, number> = {};

  Object.values(votes).forEach((targetId) => {
    if (!eligible.has(targetId)) return;
    counts[targetId] = (counts[targetId] ?? 0) + 1;
  });

  const maxVotes = Math.max(0, ...Object.values(counts));
  const tiedPlayerIds = Object.entries(counts)
    .filter(([, count]) => count === maxVotes && maxVotes > 0)
    .map(([playerId]) => playerId);

  return {
    votes,
    counts,
    tiedPlayerIds,
    eliminatedId: tiedPlayerIds.length === 1 ? tiedPlayerIds[0] : undefined
  };
}

export function checkWinner(players: Player[]): GameResult | null {
  const living = players.filter((player) => player.alive);
  const livingCivilians = living.filter((player) => player.role === "civilian").length;
  const livingSpecials = living.filter((player) => player.role === "spy" || player.role === "blank").length;

  if (livingSpecials === 0) {
    return { winner: "civilians", reason: "所有卧底和白板都已出局" };
  }

  if (livingSpecials >= livingCivilians) {
    return { winner: "spies", reason: "卧底和白板人数已不少于平民人数" };
  }

  return null;
}

export function toPublicPlayer(player: Player) {
  return {
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    connected: player.connected,
    ready: player.ready,
    alive: player.alive,
    revealedRole: player.alive ? undefined : player.role
  };
}

export function revealPlayer(player: Player) {
  return {
    ...toPublicPlayer(player),
    role: player.role ?? "civilian",
    word: player.role === "blank" ? null : player.word ?? null
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

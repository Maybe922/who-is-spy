export type Role = "civilian" | "spy" | "blank";
export type Phase = "lobby" | "reveal" | "speaking" | "voting" | "revote" | "result";
export type Winner = "civilians" | "spies";

export type Player = {
  id: string;
  socketId?: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  alive: boolean;
  role?: Role;
  word?: string;
};

export type Settings = {
  spyCount: number;
  blankCount: number;
  showIdentity: boolean;
};

export type WordPair = {
  civilian: string;
  spy: string;
};

export type PublicWordPack = {
  name: string;
  pairCount: number;
  source: "builtin" | "ai" | "db";
};

export type PublicPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
  ready: boolean;
  alive: boolean;
  revealedRole?: Role;
};

export type RevealedPlayer = PublicPlayer & {
  role: Role;
  word: string | null;
};

export type VoteSummary = {
  votes: Record<string, string>;
  counts: Record<string, number>;
  tiedPlayerIds: string[];
  eliminatedId?: string;
};

export type GameResult = {
  winner: Winner;
  reason: string;
};

export type RoomState = {
  code: string;
  phase: Phase;
  hostId: string;
  players: PublicPlayer[];
  speakingOrder: string[];
  settings: Settings;
  wordPack?: PublicWordPack;
  wordPair?: WordPair;
  votes: Record<string, string>;
  tiedPlayerIds: string[];
  result?: GameResult;
  revealedPlayers?: RevealedPlayer[];
};

export type PrivateRole = {
  role: Role;
  word: string | null;
};

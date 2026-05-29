import { describe, expect, it } from "vitest";
import { createSessionToken, hashSessionToken, normalizeUsername, validatePassword, validateUsername } from "@/lib/auth-core";
import { parseGeneratedWordPairs } from "@/lib/aiWords";
import {
  applyWordPairToPlayers,
  assignRoles,
  checkWinner,
  createSpeakingOrder,
  summarizeVotes,
  validateReady,
  validateStart
} from "@/lib/game";
import type { Player } from "@/lib/types";

const settings = { spyCount: 1, blankCount: 1, showIdentity: true };

function players(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    name: `玩家${index + 1}`,
    isHost: index === 0,
    connected: true,
    ready: true,
    alive: true
  }));
}

describe("game rules", () => {
  it("validates minimum player count and role balance", () => {
    expect(validateStart(players(3), { ...settings, blankCount: 0 })).toBe("至少需要 4 名玩家开始游戏");
    expect(validateStart(players(4), { ...settings, spyCount: 2, blankCount: 0 })).toBe("卧底和白板数量必须小于平民数量");
    expect(validateStart(players(5), settings)).toBeNull();
  });

  it("requires every connected player to be ready before start", () => {
    const roomPlayers = players(5);
    expect(validateReady(roomPlayers)).toBeNull();
    expect(validateReady(roomPlayers.map((player, index) => (index === 2 ? { ...player, ready: false } : player)))).toBe(
      "所有玩家准备后才能开始游戏"
    );
  });

  it("assigns spies, blanks, and civilian words", () => {
    const assigned = assignRoles(players(5), settings, { civilian: "牛奶", spy: "豆浆" }, () => 0);
    const roles = assigned.map((player) => player.role);

    expect(roles.filter((role) => role === "spy")).toHaveLength(1);
    expect(roles.filter((role) => role === "blank")).toHaveLength(1);
    expect(roles.filter((role) => role === "civilian")).toHaveLength(3);
    expect(assigned.find((player) => player.role === "civilian")?.word).toBe("牛奶");
    expect(assigned.find((player) => player.role === "spy")?.word).toBe("豆浆");
    expect(assigned.find((player) => player.role === "blank")?.word).toBeUndefined();
  });

  it("changes words without changing assigned roles", () => {
    const assigned = assignRoles(players(5), settings, { civilian: "牛奶", spy: "豆浆" }, () => 0);
    const updated = applyWordPairToPlayers(assigned, { civilian: "喜羊羊", spy: "懒羊羊" });

    expect(updated.map((player) => player.role)).toEqual(assigned.map((player) => player.role));
    expect(updated.find((player) => player.role === "civilian")?.word).toBe("喜羊羊");
    expect(updated.find((player) => player.role === "spy")?.word).toBe("懒羊羊");
    expect(updated.find((player) => player.role === "blank")?.word).toBeUndefined();
  });

  it("randomizes speaking order for connected players when a game starts", () => {
    const roomPlayers = players(4).map((player, index) => (index === 2 ? { ...player, connected: false } : player));
    expect(createSpeakingOrder(roomPlayers, () => 0)).toEqual(["p2", "p4", "p1"]);
  });

  it("finds ties and single eliminations", () => {
    expect(summarizeVotes({ p1: "p2", p2: "p3", p3: "p2" }, ["p1", "p2", "p3"])).toMatchObject({
      eliminatedId: "p2",
      tiedPlayerIds: ["p2"]
    });

    expect(summarizeVotes({ p1: "p2", p2: "p3" }, ["p1", "p2", "p3"])).toMatchObject({
      eliminatedId: undefined,
      tiedPlayerIds: ["p2", "p3"]
    });
  });

  it("checks civilian and special-team wins", () => {
    const base = assignRoles(players(5), settings, { civilian: "牛奶", spy: "豆浆" }, () => 0);
    const civiliansWin = base.map((player) =>
      player.role === "spy" || player.role === "blank" ? { ...player, alive: false } : player
    );
    expect(checkWinner(civiliansWin)?.winner).toBe("civilians");

    let livingCivilianSeen = false;
    const specialsWin = base.map((player) => {
      if (player.role !== "civilian") return player;
      if (!livingCivilianSeen) {
        livingCivilianSeen = true;
        return player;
      }
      return { ...player, alive: false };
    });
    expect(checkWinner(specialsWin)?.winner).toBe("spies");
  });
});

describe("auth rules", () => {
  it("normalizes and validates account inputs", () => {
    expect(normalizeUsername(" Eric_01 ")).toBe("eric_01");
    expect(validateUsername("eric_01")).toBeNull();
    expect(validateUsername("er")).toBe("用户名长度需要是 3 到 24 位");
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword("123")).toBe("密码至少需要 8 位");
  });

  it("creates non-plain session token hashes", () => {
    const token = createSessionToken();
    const hash = hashSessionToken(token, "secret");

    expect(token.length).toBeGreaterThan(20);
    expect(hash).not.toBe(token);
    expect(hashSessionToken(token, "secret")).toBe(hash);
  });
});

describe("AI word generation parsing", () => {
  it("extracts valid word pairs from JSON content", () => {
    const pairs = parseGeneratedWordPairs(`
      [
        {"civilian":"葫芦娃","spy":"黑猫警长"},
        {"civilian":"数码宝贝","spy":"神奇宝贝"},
        {"civilian":"重复","spy":"重复"}
      ]
    `);

    expect(pairs).toEqual([
      { civilian: "葫芦娃", spy: "黑猫警长" },
      { civilian: "数码宝贝", spy: "神奇宝贝" }
    ]);
  });

  it("extracts valid word pairs from fenced JSON", () => {
    const pairs = parseGeneratedWordPairs('```json\n[{"civilian":"四驱兄弟","spy":"足球小将"}]\n```');
    expect(pairs).toEqual([{ civilian: "四驱兄弟", spy: "足球小将" }]);
  });

  it("extracts valid word pairs from object and Chinese keys", () => {
    const pairs = parseGeneratedWordPairs('{"pairs":[{"平民词":"喜羊羊","卧底词":"灰太狼"}]}');
    expect(pairs).toEqual([{ civilian: "喜羊羊", spy: "灰太狼" }]);
  });

  it("extracts valid word pairs from snake case keys", () => {
    const pairs = parseGeneratedWordPairs('{"word_pairs":[{"civilian_word":"大头儿子","spy_word":"小头爸爸"}]}');
    expect(pairs).toEqual([{ civilian: "大头儿子", spy: "小头爸爸" }]);
  });

  it("extracts valid word pairs from line based output", () => {
    const pairs = parseGeneratedWordPairs("1. 葫芦娃 - 黑猫警长\n2. 蓝猫淘气三千问 / 海尔兄弟");
    expect(pairs).toEqual([
      { civilian: "葫芦娃", spy: "黑猫警长" },
      { civilian: "蓝猫淘气三千问", spy: "海尔兄弟" }
    ]);
  });

  it("turns a single word JSON list into adjacent word pairs", () => {
    const pairs = parseGeneratedWordPairs('{"words":["葫芦娃","黑猫警长","数码宝贝","神奇宝贝"]}');
    expect(pairs).toEqual([
      { civilian: "葫芦娃", spy: "黑猫警长" },
      { civilian: "数码宝贝", spy: "神奇宝贝" }
    ]);
  });

  it("turns a single word line list into adjacent word pairs", () => {
    const pairs = parseGeneratedWordPairs("1. 葫芦娃\n2. 黑猫警长\n3. 数码宝贝\n4. 神奇宝贝");
    expect(pairs).toEqual([
      { civilian: "葫芦娃", spy: "黑猫警长" },
      { civilian: "数码宝贝", spy: "神奇宝贝" }
    ]);
  });

  it("salvages complete word pairs from truncated JSON", () => {
    const pairs = parseGeneratedWordPairs(
      '{"pairs":[{"civilian":"喜羊羊","spy":"懒羊羊"},{"civilian":"虹猫","spy":"蓝兔"},{"civilian":"数码宝贝","spy":"神奇宝贝"},{"civilian":"樱桃小丸'
    );
    expect(pairs).toEqual([
      { civilian: "喜羊羊", spy: "懒羊羊" },
      { civilian: "虹猫", spy: "蓝兔" },
      { civilian: "数码宝贝", spy: "神奇宝贝" }
    ]);
  });
});

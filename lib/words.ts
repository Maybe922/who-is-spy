import type { WordPair } from "./types";

export const WORD_PAIRS: WordPair[] = [
  { civilian: "牛奶", spy: "豆浆" },
  { civilian: "火锅", spy: "麻辣烫" },
  { civilian: "手机", spy: "平板" },
  { civilian: "地铁", spy: "高铁" },
  { civilian: "咖啡", spy: "奶茶" },
  { civilian: "键盘", spy: "钢琴" },
  { civilian: "医生", spy: "护士" },
  { civilian: "电影", spy: "电视剧" },
  { civilian: "西瓜", spy: "哈密瓜" },
  { civilian: "篮球", spy: "排球" },
  { civilian: "雨伞", spy: "遮阳伞" },
  { civilian: "饺子", spy: "包子" },
  { civilian: "冰箱", spy: "空调" },
  { civilian: "小说", spy: "漫画" },
  { civilian: "猫眼", spy: "门铃" },
  { civilian: "酒店", spy: "民宿" },
  { civilian: "牙刷", spy: "梳子" },
  { civilian: "书包", spy: "行李箱" },
  { civilian: "月亮", spy: "太阳" },
  { civilian: "耳机", spy: "音箱" }
];

export function pickWordPair(random = Math.random): WordPair {
  return WORD_PAIRS[Math.floor(random() * WORD_PAIRS.length)];
}

export function pickFromWordPairs(wordPairs: WordPair[], random = Math.random): WordPair {
  if (wordPairs.length === 0) return pickWordPair(random);
  return wordPairs[Math.floor(random() * wordPairs.length)];
}

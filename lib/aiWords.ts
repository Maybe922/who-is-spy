import type { WordPair } from "./types";

export function normalizeWordPair(pair: unknown): WordPair | null {
  if (!pair || typeof pair !== "object") return null;
  const value = pair as Record<string, unknown>;
  const civilian = String(
    value.civilian ??
      value.civilian_word ??
      value.civilianWord ??
      value.common ??
      value.commonWord ??
      value.common_word ??
      value.normal ??
      value.word1 ??
      value.pingmin ??
      value.pingminWord ??
      value.pingmin_word ??
      value["平民"] ??
      value["平民词"] ??
      ""
  ).trim();
  const spy = String(
    value.spy ??
      value.spy_word ??
      value.spyWord ??
      value.undercover ??
      value.undercoverWord ??
      value.undercover_word ??
      value.word2 ??
      value.wodi ??
      value.wodiWord ??
      value.wodi_word ??
      value["卧底"] ??
      value["卧底词"] ??
      ""
  ).trim();

  if (!civilian || !spy) return null;
  if (civilian === spy) return null;
  if (civilian.length > 20 || spy.length > 20) return null;

  return { civilian, spy };
}

export function parseGeneratedWordPairs(content: string): WordPair[] {
  const trimmed = content.trim();
  const candidates = [
    trimmed,
    trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]?.trim(),
    trimmed.match(/\{[\s\S]*\}/)?.[0],
    trimmed.match(/\[[\s\S]*\]/)?.[0]
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const pairs = collectWordPairs(parsed);

      if (pairs.length > 0) return pairs;

      const terms = collectSingleWords(parsed);
      if (terms.length >= 2) return pairAdjacentTerms(terms);
    } catch {
      // Try the next candidate shape.
    }
  }

  const fragmentPairs = parseObjectFragments(trimmed);
  if (fragmentPairs.length > 0) return fragmentPairs;

  const linePairs = parseLineBasedPairs(trimmed);
  if (linePairs.length > 0) return linePairs;

  return pairAdjacentTerms(parseSingleWordLines(trimmed));
}

function collectWordPairs(parsed: unknown): WordPair[] {
  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? ((parsed as Record<string, unknown>).pairs ??
          (parsed as Record<string, unknown>).wordPairs ??
          (parsed as Record<string, unknown>).word_pairs ??
          (parsed as Record<string, unknown>).words ??
          (parsed as Record<string, unknown>).terms ??
          (parsed as Record<string, unknown>).items ??
          (parsed as Record<string, unknown>)["词对"])
      : null;

  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const pairs: WordPair[] = [];
  values.forEach((item) => {
    const pair = normalizeWordPair(item);
    if (!pair) return;
    const key = `${pair.civilian}:${pair.spy}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(pair);
  });

  return pairs;
}

function parseObjectFragments(content: string): WordPair[] {
  const seen = new Set<string>();
  const pairs: WordPair[] = [];
  const objectFragments = content.match(/\{[^{}]*\}/g) ?? [];

  objectFragments.forEach((fragment) => {
    const pair = parseObjectFragment(fragment);
    if (!pair) return;

    const key = `${pair.civilian}:${pair.spy}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(pair);
  });

  return pairs;
}

function parseObjectFragment(fragment: string): WordPair | null {
  try {
    return normalizeWordPair(JSON.parse(fragment) as unknown);
  } catch {
    const civilian = extractField(fragment, [
      "civilian",
      "civilian_word",
      "civilianWord",
      "common",
      "commonWord",
      "common_word",
      "平民",
      "平民词"
    ]);
    const spy = extractField(fragment, [
      "spy",
      "spy_word",
      "spyWord",
      "undercover",
      "undercoverWord",
      "undercover_word",
      "卧底",
      "卧底词"
    ]);
    return normalizeWordPair({ civilian, spy });
  }
}

function extractField(fragment: string, keys: string[]): string {
  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = fragment.match(new RegExp(`["']${escapedKey}["']\\s*:\\s*["']([^"']+)["']`));
    if (match?.[1]) return match[1].trim();
  }

  return "";
}

function collectSingleWords(parsed: unknown): string[] {
  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object"
      ? ((parsed as Record<string, unknown>).words ??
          (parsed as Record<string, unknown>).terms ??
          (parsed as Record<string, unknown>).items ??
          (parsed as Record<string, unknown>)["词语"] ??
          (parsed as Record<string, unknown>)["词库"])
      : null;

  if (!Array.isArray(values)) return [];
  return normalizeSingleWords(values);
}

function parseLineBasedPairs(content: string): WordPair[] {
  const seen = new Set<string>();
  const pairs: WordPair[] = [];

  content.split(/\r?\n/).forEach((line) => {
    const cleaned = line
      .replace(/^\s*[-*]?\s*\d+[.)、]?\s*/, "")
      .replace(/平民词?|卧底词?/g, "")
      .replace(/[："“”"']/g, "")
      .trim();
    const parts = cleaned.split(/\s*(?:\/|,|，|、| - |-|—|=>|：|:)\s*/).filter(Boolean);
    if (parts.length < 2) return;

    const pair = normalizeWordPair({ civilian: parts[0], spy: parts[1] });
    if (!pair) return;

    const key = `${pair.civilian}:${pair.spy}`;
    if (seen.has(key)) return;
    seen.add(key);
    pairs.push(pair);
  });

  return pairs;
}

function parseSingleWordLines(content: string): string[] {
  return normalizeSingleWords(
    content
      .split(/\r?\n/)
      .map((line) =>
        line
          .replace(/^\s*[-*]?\s*\d+[.)、]?\s*/, "")
          .replace(/[："“”"']/g, "")
          .trim()
      )
      .filter(Boolean)
  );
}

function normalizeSingleWords(values: unknown[]): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];

  values.forEach((value) => {
    const term = String(value).trim();
    if (!term || term.length > 20 || seen.has(term)) return;
    seen.add(term);
    terms.push(term);
  });

  return terms;
}

function pairAdjacentTerms(terms: string[]): WordPair[] {
  const pairs: WordPair[] = [];

  for (let index = 0; index + 1 < terms.length; index += 2) {
    const pair = normalizeWordPair({ civilian: terms[index], spy: terms[index + 1] });
    if (pair) pairs.push(pair);
  }

  return pairs;
}

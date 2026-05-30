import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

const PASSWORD_KEY_LENGTH = 64;
const SESSION_TOKEN_BYTES = 32;

export const SESSION_COOKIE_NAME = "who_is_spy_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

// Secure cookies require HTTPS. Over plain HTTP (e.g. IP:port access) the browser
// drops them, breaking login. Default to the production behaviour, but allow an
// explicit COOKIE_SECURE override for HTTP-only deployments.
export const SESSION_COOKIE_SECURE =
  process.env.COOKIE_SECURE !== undefined
    ? process.env.COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  const normalized = normalizeUsername(username);
  if (normalized.length < 3 || normalized.length > 24) return "用户名长度需要是 3 到 24 位";
  if (!/^[a-z0-9_]+$/.test(normalized)) return "用户名只能包含小写字母、数字和下划线";
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length === 0) return "密码不能为空";
  if (password.length > 128) return "密码不能超过 128 位";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, PASSWORD_KEY_LENGTH)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, salt, key] = storedHash.split(":");
  if (algorithm !== "scrypt" || !salt || !key) return false;

  const storedKey = Buffer.from(key, "hex");
  const derivedKey = (await scryptAsync(password, salt, storedKey.length)) as Buffer;
  return storedKey.length === derivedKey.length && timingSafeEqual(storedKey, derivedKey);
}

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

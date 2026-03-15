const encoder = new TextEncoder();

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function parseCookies(request) {
  const header = request.headers.get("cookie") || "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function nowIso() {
  return new Date().toISOString();
}

export function futureIso(days = 14) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function validUsername(username) {
  return /^[A-Za-z0-9_]{3,20}$/.test(username);
}

export function validPassword(password) {
  return typeof password === "string" && password.length >= 8 && password.length <= 128;
}

export function validEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function randomHex(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return toHex(bytes.buffer);
}

export async function hashPassword(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: fromHex(saltHex),
      iterations: 100000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return toHex(bits);
}

export async function sha256(value) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return toHex(digest);
}

export function sessionCookie(token, requestUrl) {
  const hostname = new URL(requestUrl).hostname;
  const secure = hostname === "localhost" ? "" : "; Secure";
  return `retro_arcade_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1209600${secure}`;
}

export function clearSessionCookie(requestUrl) {
  const hostname = new URL(requestUrl).hostname;
  const secure = hostname === "localhost" ? "" : "; Secure";
  return `retro_arcade_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export async function getCurrentUser(context) {
  const cookies = parseCookies(context.request);
  const token = cookies.retro_arcade_session;
  if (!token) {
    return null;
  }
  const tokenHash = await sha256(token);
  const { results } = await context.env.DB.prepare(
    `SELECT users.id, users.username
     FROM sessions
     JOIN users ON users.id = sessions.user_id
     WHERE sessions.session_hash = ?1 AND sessions.expires_at > ?2
     LIMIT 1`
  )
    .bind(tokenHash, nowIso())
    .all();
  return results[0] || null;
}

export async function requireUser(context) {
  const user = await getCurrentUser(context);
  if (!user) {
    return { user: null, response: json({ error: "Login required." }, 401) };
  }
  return { user, response: null };
}

export function normalizeGameKey(game) {
  const allowed = [
    "snake",
    "pong",
    "breakout",
    "tetris",
    "space-invaders",
    "asteroids",
    "pac-man",
    "pinball",
    "doodle-jump",
    "helicopter",
    "crossy-road",
    "runner",
    "metro-run",
    "missile-command",
    "centipede",
    "astro-blaster",
    "tank-battle",
    "chicken-hunt",
    "head-soccer",
    "johnny-garden",
    "tower-defense",
    "doctor-mario"
  ];
  return allowed.includes(game) ? game : null;
}








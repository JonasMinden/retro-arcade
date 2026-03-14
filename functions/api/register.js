import {
  futureIso,
  hashPassword,
  json,
  nowIso,
  randomHex,
  readJson,
  sessionCookie,
  sha256,
  validPassword,
  validUsername,
} from "./_utils.js";

export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const username = body?.username?.trim();
    const password = body?.password;

    if (!validUsername(username || "")) {
      return json({ error: "Username must be 3-20 chars and use letters, numbers, or underscores." }, 400);
    }
    if (!validPassword(password)) {
      return json({ error: "Password must be at least 8 characters." }, 400);
    }

    const existing = await context.env.DB.prepare("SELECT id FROM users WHERE username = ?1 LIMIT 1").bind(username).first();
    if (existing) {
      return json({ error: "Username already exists." }, 409);
    }

    const salt = randomHex(16);
    const passwordHash = await hashPassword(password, salt);
    const createdAt = nowIso();
    const result = await context.env.DB.prepare(
      "INSERT INTO users (username, password_hash, password_salt, created_at) VALUES (?1, ?2, ?3, ?4)"
    ).bind(username, passwordHash, salt, createdAt).run();

    if (!result?.success) {
      return json({ error: "Could not create account." }, 500);
    }

    const insertedUser = await context.env.DB.prepare(
      "SELECT id, username FROM users WHERE username = ?1 LIMIT 1"
    ).bind(username).first();

    if (!insertedUser?.id) {
      return json({ error: "Could not load newly created account." }, 500);
    }

    const token = randomHex(24);
    const tokenHash = await sha256(token);
    const sessionResult = await context.env.DB.prepare(
      "INSERT INTO sessions (user_id, session_hash, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)"
    ).bind(insertedUser.id, tokenHash, futureIso(), createdAt).run();

    if (!sessionResult?.success) {
      return json({ error: "Could not create session." }, 500);
    }

    return json(
      { ok: true, user: { id: insertedUser.id, username: insertedUser.username } },
      201,
      { "set-cookie": sessionCookie(token, context.request.url) },
    );
  } catch (error) {
    return json(
      {
        error: "Register route failed.",
        detail: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
}

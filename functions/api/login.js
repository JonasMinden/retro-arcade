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
} from "./_utils.js";

export async function onRequestPost(context) {
  const body = await readJson(context.request);
  const username = body?.username?.trim();
  const password = body?.password;

  if (!username || !validPassword(password)) {
    return json({ error: "Invalid login." }, 400);
  }

  const user = await context.env.DB.prepare(
    "SELECT id, username, password_hash, password_salt FROM users WHERE username = ?1 LIMIT 1"
  ).bind(username).first();

  if (!user) {
    return json({ error: "Invalid login." }, 401);
  }

  const candidateHash = await hashPassword(password, user.password_salt);
  if (candidateHash !== user.password_hash) {
    return json({ error: "Invalid login." }, 401);
  }

  const token = randomHex(24);
  const tokenHash = await sha256(token);
  await context.env.DB.prepare(
    "INSERT INTO sessions (user_id, session_hash, expires_at, created_at) VALUES (?1, ?2, ?3, ?4)"
  ).bind(user.id, tokenHash, futureIso(), nowIso()).run();

  return json(
    { ok: true, user: { id: user.id, username: user.username } },
    200,
    { "set-cookie": sessionCookie(token, context.request.url) },
  );
}

import { json, normalizeGameKey, readJson, requireUser } from "./_utils.js";

export async function onRequestPost(context) {
  const { user, response } = await requireUser(context);
  if (response) {
    return response;
  }

  const body = await readJson(context.request);
  const game = normalizeGameKey(body?.game || "");
  const score = Number(body?.score);

  if (!game || !Number.isFinite(score) || score < 0) {
    return json({ error: "Invalid score submission." }, 400);
  }

  await context.env.DB.prepare(
    "INSERT INTO scores (user_id, game_key, score, created_at) VALUES (?1, ?2, ?3, datetime('now'))"
  ).bind(user.id, game, Math.floor(score)).run();

  return json({ ok: true });
}

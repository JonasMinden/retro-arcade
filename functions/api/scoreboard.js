import { json, normalizeGameKey } from "./_utils.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const game = normalizeGameKey(url.searchParams.get("game") || "");
  if (!game) {
    return json({ error: "Unknown game." }, 400);
  }

  const { results } = await context.env.DB.prepare(
    `SELECT scores.score, scores.created_at, users.username
     FROM scores
     JOIN users ON users.id = scores.user_id
     WHERE scores.game_key = ?1
     ORDER BY scores.score DESC, scores.created_at ASC
     LIMIT 10`
  ).bind(game).all();

  return json({ game, entries: results });
}

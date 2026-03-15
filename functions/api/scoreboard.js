import { json, normalizeGameKey } from "./_utils.js";

const gameLabels = {
  snake: "Snake",
  pong: "Pong",
  breakout: "Breakout",
  tetris: "Tetris",
  "space-invaders": "Space Invaders",
  asteroids: "Asteroids",
  "pac-man": "Pac-Man",
  pinball: "Pinball",
  "doodle-jump": "Doodle Jump",
  helicopter: "Helicopter Game",
  "crossy-road": "Crossy Road",
  runner: "Runner Game",
  "missile-command": "Sky Shield",
  centipede: "Centipede",
  "astro-blaster": "Astro Blaster",
  "tank-battle": "Panzerspiel",
  "chicken-hunt": "Duck Hunt",
  "chicken-hunt-legacy": "Chicken Hunt Classic",
  "head-soccer": "Head Soccer",
  "johnny-garden": "Johnny in the Garden",
  "tower-defense": "Tower Defense",
  "doctor-mario": "Doctor Mario",
};

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const game = url.searchParams.get("game");
  const summary = url.searchParams.get("summary");

  if (game) {
    const normalized = normalizeGameKey(game);
    if (!normalized) {
      return json({ error: "Unknown game." }, 400);
    }

    const { results } = await context.env.DB.prepare(
      `SELECT scores.score, scores.created_at, users.username
       FROM scores
       JOIN users ON users.id = scores.user_id
       WHERE scores.game_key = ?1
       ORDER BY scores.score DESC, scores.created_at ASC
       LIMIT 10`
    ).bind(normalized).all();

    return json({ game: normalized, entries: results });
  }

  if (summary === "top-games") {
    const { results } = await context.env.DB.prepare(
      `SELECT scores.game_key, COUNT(*) AS entries_count, MAX(scores.score) AS best_score
       FROM scores
       GROUP BY scores.game_key
       ORDER BY entries_count DESC, best_score DESC, scores.game_key ASC
       LIMIT 3`
    ).all();

    return json({
      games: results.map((entry) => ({
        game_key: entry.game_key,
        game_name: gameLabels[entry.game_key] || entry.game_key,
        entries_count: Number(entry.entries_count || 0),
        best_score: Number(entry.best_score || 0),
      })),
    });
  }

  const { results } = await context.env.DB.prepare(
    `SELECT scores.score, scores.created_at, scores.game_key, users.username
     FROM scores
     JOIN users ON users.id = scores.user_id
     ORDER BY scores.created_at DESC
     LIMIT 8`
  ).all();

  return json({
    entries: results.map((entry) => ({
      ...entry,
      game_name: gameLabels[entry.game_key] || entry.game_key,
    })),
  });
}



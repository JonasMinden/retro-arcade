import { clearSessionCookie, json, parseCookies, sha256 } from "./_utils.js";

export async function onRequestPost(context) {
  const cookies = parseCookies(context.request);
  const token = cookies.retro_arcade_session;
  if (token) {
    const tokenHash = await sha256(token);
    await context.env.DB.prepare("DELETE FROM sessions WHERE session_hash = ?1").bind(tokenHash).run();
  }
  return json({ ok: true }, 200, { "set-cookie": clearSessionCookie(context.request.url) });
}

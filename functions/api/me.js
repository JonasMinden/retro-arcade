import { getCurrentUser, json } from "./_utils.js";

export async function onRequestGet(context) {
  const user = await getCurrentUser(context);
  return json({ user: user ? { id: user.id, username: user.username } : null });
}

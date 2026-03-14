import { json, nowIso, readJson, validEmail } from "./_utils.js";

const allowedTopics = new Set(["suggestion", "bug", "business", "feedback", "other"]);

function validText(value, min, max) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

async function sendViaResend(env, payload) {
  if (!env.RESEND_API_KEY || !env.CONTACT_FROM_EMAIL) {
    return { delivered: false, status: "config_missing", providerMessageId: null };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + env.RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL,
      to: ["retrojomi@gmail.com"],
      reply_to: payload.replyTo,
      subject: "[Retro Arcade] " + payload.topicLabel + " von " + payload.name,
      text: [
        "Name: " + payload.name,
        "Reply-To: " + payload.replyTo,
        "Sprache: " + payload.locale,
        "Anliegen: " + payload.topic,
        "",
        payload.message,
      ].join("\\n"),
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      delivered: false,
      status: "provider_error",
      providerMessageId: null,
      detail: data.message || data.error || "Mail provider error.",
    };
  }

  return { delivered: true, status: "sent", providerMessageId: data.id || null };
}
export async function onRequestPost(context) {
  const body = await readJson(context.request);
  if (!body) {
    return json({ error: "Ungültige Anfrage." }, 400);
  }

  const name = body.name?.trim() || "";
  const topic = body.topic?.trim() || "other";
  const replyTo = body.replyTo?.trim() || "";
  const message = body.message?.trim() || "";
  const locale = body.locale?.trim() || "de";

  if (!validText(name, 2, 80)) {
    return json({ error: "Bitte einen gültigen Namen angeben." }, 400);
  }
  if (!allowedTopics.has(topic)) {
    return json({ error: "Bitte ein gültiges Anliegen wählen." }, 400);
  }
  if (!validEmail(replyTo)) {
    return json({ error: "Bitte eine gültige Reply-To-Adresse angeben." }, 400);
  }
  if (!validText(message, 10, 4000)) {
    return json({ error: "Bitte ein ausführlicheres Anliegen eingeben." }, 400);
  }

  const createdAt = nowIso();
  const topicLabels = {
    suggestion: "Vorschlag",
    bug: "Fehler",
    business: "Geschäftlich",
    feedback: "Feedback",
    other: "Sonstiges",
  };

  const result = await context.env.DB.prepare(
    "INSERT INTO contact_messages (name, topic, reply_to, message, locale, delivery_status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
  )
    .bind(name, topic, replyTo, message, locale, "pending", createdAt)
    .run();
  const sendResult = await sendViaResend(context.env, {
    name,
    topic,
    topicLabel: topicLabels[topic] || topic,
    replyTo,
    message,
    locale,
  });

  if (result.meta?.last_row_id) {
    await context.env.DB.prepare(
      "UPDATE contact_messages SET delivery_status = ?1, provider_message_id = ?2 WHERE id = ?3"
    )
      .bind(sendResult.status, sendResult.providerMessageId, result.meta.last_row_id)
      .run();
  }

  if (!sendResult.delivered) {
    return json({
      ok: true,
      delivered: false,
      message:
        sendResult.status === "config_missing"
          ? "Anfrage gespeichert. E-Mail-Versand ist noch nicht vollständig konfiguriert."
          : "Anfrage gespeichert, aber der Mail-Versand konnte gerade nicht zugestellt werden.",
      detail: sendResult.detail || null,
    }, sendResult.status === "config_missing" ? 202 : 200);
  }

  return json({ ok: true, delivered: true, message: "Nachricht erfolgreich versendet." }, 200);
}

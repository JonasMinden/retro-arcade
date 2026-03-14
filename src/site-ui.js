const GAME_CONFIG = {
  snake: { title: "Snake Scores", selector: "#score" },
  pong: { title: "Pong Scores", selector: "#player-score" },
  breakout: { title: "Breakout Scores", selector: "#score" },
  tetris: { title: "Tetris Scores", selector: "#score" },
  "space-invaders": { title: "Invaders Scores", selector: "#score" },
  asteroids: { title: "Asteroids Scores", selector: "#score" },
  "pac-man": { title: "Pac-Man Scores", selector: "#score" },
  pinball: { title: "Pinball Scores", selector: "#score" },
  "doodle-jump": { title: "Doodle Jump Scores", selector: "#score" },
  helicopter: { title: "Helicopter Scores", selector: "#score" },
  "crossy-road": { title: "Crossy Road Scores", selector: "#score" },
  runner: { title: "Runner Scores", selector: "#score" },
};

const COOKIE_CONSENT_KEY = "retro_arcade_cookie_consent_v1";
let currentUser = null;

function translate(key, vars = {}) {
  if (window.retroArcadeI18n?.t) {
    return window.retroArcadeI18n.t(key, vars);
  }
  const fallback = {
    accountLink: "Account",
    cookieTitle: "Deine Auswahl für Cookies und ähnliche Speicherungen",
    cookieBody: "Notwendige Cookies sind für Login und sichere Sessions aktiv. Analyse und Marketing bleiben aus, bis du sie erlaubst.",
    cookieNecessary: "Notwendig",
    cookieNecessaryBody: "Erforderlich für Sessions, Login und grundlegende Funktionen.",
    cookieAnalytics: "Analyse",
    cookieAnalyticsBody: "Für spätere Reichweitenmessung und Nutzungsstatistiken.",
    cookieMarketing: "Marketing",
    cookieMarketingBody: "Für spätere Werbeeinbindung und personalisierte Ad-Auslieferung.",
    cookieOnlyNecessary: "Nur notwendige",
    cookieSave: "Auswahl speichern",
    cookieAll: "Alle akzeptieren",
    loginRequired: "Bitte erst optional einloggen, um Scores zu speichern.",
    playRound: "Spiele erst eine Runde mit gültigem Score.",
    scoreSaved: "Score gespeichert.",
    registerOk: "Registriert als {username}.",
    loginOk: "Eingeloggt als {username}.",
    contactSent: "Nachricht erfolgreich versendet.",
    contactStored: "Anfrage gespeichert. E-Mail-Versand ist noch nicht vollständig konfiguriert.",
  };
  let text = fallback[key] || key;
  Object.entries(vars).forEach(([name, value]) => {
    text = text.replace("{" + name + "}", value);
  });
  return text;
}

function rootAsset(path) {
  return new URL(path, window.location.origin).toString();
}

function ensureFavicon() {
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement("link");
    link.rel = "icon";
    link.type = "image/svg+xml";
    link.href = rootAsset("/favicon.svg");
    document.head.appendChild(link);
  }
}

function detectGameKey() {
  const path = window.location.pathname.replace(/index\.html$/, "");
  const match = path.match(/\/games\/([^/]+)\/?$/);
  return match ? match[1] : null;
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function readCookieConsent() {
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function applyCookieConsent(consent) {
  if (!consent) return;
  document.documentElement.dataset.cookieConsent = JSON.stringify(consent);
  window.retroArcadeConsent = consent;
}

function saveCookieConsent(consent) {
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consent));
  applyCookieConsent(consent);
}

function createCookieBanner() {
  if (document.querySelector("[data-cookie-banner]")) return;

  const banner = document.createElement("section");
  banner.className = "cookie-banner";
  banner.dataset.cookieBanner = "true";
  banner.innerHTML = `
    <div class="cookie-banner__header">
      <p class="eyebrow">Cookie</p>
      <h2>${translate("cookieTitle")}</h2>
      <p>${translate("cookieBody")}</p>
    </div>
    <div class="cookie-banner__grid">
      <label class="cookie-banner__option">
        <strong><input type="checkbox" checked disabled>${translate("cookieNecessary")}</strong>
        <span>${translate("cookieNecessaryBody")}</span>
      </label>
      <label class="cookie-banner__option">
        <strong><input type="checkbox" data-consent-analytics>${translate("cookieAnalytics")}</strong>
        <span>${translate("cookieAnalyticsBody")}</span>
      </label>
      <label class="cookie-banner__option">
        <strong><input type="checkbox" data-consent-marketing>${translate("cookieMarketing")}</strong>
        <span>${translate("cookieMarketingBody")}</span>
      </label>
    </div>
    <div class="cookie-banner__actions">
      <button class="pixel-button pixel-button--secondary" type="button" data-consent-necessary>${translate("cookieOnlyNecessary")}</button>
      <button class="pixel-button" type="button" data-consent-save>${translate("cookieSave")}</button>
      <button class="pixel-button" type="button" data-consent-all>${translate("cookieAll")}</button>
    </div>
  `;
  document.body.appendChild(banner);

  const analytics = banner.querySelector("[data-consent-analytics]");
  const marketing = banner.querySelector("[data-consent-marketing]");
  const existing = readCookieConsent();
  if (existing) {
    analytics.checked = Boolean(existing.analytics);
    marketing.checked = Boolean(existing.marketing);
    banner.hidden = true;
    applyCookieConsent(existing);
  }

  banner.querySelector("[data-consent-necessary]").addEventListener("click", () => {
    saveCookieConsent({ necessary: true, analytics: false, marketing: false, updatedAt: new Date().toISOString() });
    banner.hidden = true;
  });

  banner.querySelector("[data-consent-save]").addEventListener("click", () => {
    saveCookieConsent({
      necessary: true,
      analytics: analytics.checked,
      marketing: marketing.checked,
      updatedAt: new Date().toISOString(),
    });
    banner.hidden = true;
  });

  banner.querySelector("[data-consent-all]").addEventListener("click", () => {
    analytics.checked = true;
    marketing.checked = true;
    saveCookieConsent({ necessary: true, analytics: true, marketing: true, updatedAt: new Date().toISOString() });
    banner.hidden = true;
  });
}

function updateHeaderAuth() {
  const navs = document.querySelectorAll(".site-nav");
  navs.forEach((nav) => {
    const existing = nav.querySelector("[data-auth-slot]");
    if (existing) existing.remove();
    const wrapper = document.createElement("span");
    wrapper.dataset.authSlot = "true";
    wrapper.className = "auth-nav";
    if (currentUser) {
      wrapper.innerHTML = `<span class="auth-nav__name">${currentUser.username}</span> <button class="auth-nav__button" type="button">Logout</button>`;
      wrapper.querySelector("button").addEventListener("click", async () => {
        await api("/api/logout", { method: "POST", body: "{}" });
        currentUser = null;
        updateHeaderAuth();
        refreshScoreboard();
      });
    } else {
      wrapper.innerHTML = `<a href="/account.html">${translate("accountLink")}</a>`;
    }
    nav.appendChild(wrapper);
  });
}

function scoreboardMarkup(title) {
  return `
    <section class="scoreboard-panel">
      <p class="eyebrow">Scoreboard</p>
      <h2>${title}</h2>
      <p class="scoreboard-panel__meta">Top 10 dieser Maschine. Gastspiel bleibt ohne Login möglich.</p>
      <div class="scoreboard-panel__current">Aktueller Score: <strong data-current-score>0</strong></div>
      <button class="pixel-button" type="button" data-submit-score>Score speichern</button>
      <p class="form-message" data-submit-message></p>
      <ol class="scoreboard-list" data-scoreboard-list></ol>
    </section>
  `;
}

function renderScoreList(container, entries) {
  container.innerHTML = "";
  if (!entries.length) {
    container.innerHTML = "<li>Noch keine Einträge.</li>";
    return;
  }
  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${entry.username}</span><strong>${entry.score}</strong>`;
    container.appendChild(item);
  });
}

function renderRecentScores(entries) {
  const containers = document.querySelectorAll("[data-recent-scores]");
  if (!containers.length) return;
  containers.forEach((container) => {
    container.innerHTML = "";
    if (!entries.length) {
      container.innerHTML = "<li>Noch keine Highscores gespeichert.</li>";
      return;
    }
    entries.forEach((entry) => {
      const item = document.createElement("li");
      item.innerHTML = `<span>${entry.username}</span><strong>${entry.score}</strong><em>${entry.game_name}</em>`;
      container.appendChild(item);
    });
  });
}

async function loadRecentScores() {
  if (!document.querySelector("[data-recent-scores]")) return;
  const data = await api("/api/scoreboard");
  renderRecentScores(data.entries || []);
}

async function loadScoreboard(gameKey, panel) {
  const data = await api(`/api/scoreboard?game=${encodeURIComponent(gameKey)}`);
  renderScoreList(panel.querySelector("[data-scoreboard-list]"), data.entries || []);
}

async function refreshScoreboard() {
  const gameKey = detectGameKey();
  if (!gameKey || !GAME_CONFIG[gameKey]) return;
  const sidebar = document.querySelector(".arcade-sidebar");
  if (!sidebar) return;

  let panel = sidebar.querySelector("[data-scoreboard-mounted]");
  if (!panel) {
    panel = document.createElement("section");
    panel.dataset.scoreboardMounted = "true";
    panel.innerHTML = scoreboardMarkup(GAME_CONFIG[gameKey].title);
    sidebar.appendChild(panel);
    panel.querySelector("[data-submit-score]").addEventListener("click", async () => {
      const score = Number(document.querySelector(GAME_CONFIG[gameKey].selector)?.textContent || "0");
      const message = panel.querySelector("[data-submit-message]");
      if (!currentUser) {
        message.textContent = translate("loginRequired");
        return;
      }
      if (!Number.isFinite(score) || score <= 0) {
        message.textContent = translate("playRound");
        return;
      }
      try {
        await api("/api/submit-score", { method: "POST", body: JSON.stringify({ game: gameKey, score }) });
        message.textContent = translate("scoreSaved");
        loadScoreboard(gameKey, panel);
        loadRecentScores();
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }
  const scoreElement = document.querySelector(GAME_CONFIG[gameKey].selector);
  panel.querySelector("[data-current-score]").textContent = scoreElement?.textContent?.trim() || "0";
  await loadScoreboard(gameKey, panel);
}

function bindAccountForms() {
  const registerForm = document.querySelector("#register-form");
  const loginForm = document.querySelector("#login-form");
  if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#register-message");
      const payload = {
        username: document.querySelector("#register-username").value,
        password: document.querySelector("#register-password").value,
      };
      try {
        const data = await api("/api/register", { method: "POST", body: JSON.stringify(payload) });
        currentUser = data.user;
        message.textContent = translate("registerOk", { username: data.user.username });
        updateHeaderAuth();
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }
  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#login-message");
      const payload = {
        username: document.querySelector("#login-username").value,
        password: document.querySelector("#login-password").value,
      };
      try {
        const data = await api("/api/login", { method: "POST", body: JSON.stringify(payload) });
        currentUser = data.user;
        message.textContent = translate("loginOk", { username: data.user.username });
        updateHeaderAuth();
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }
}

function bindContactForm() {
  const form = document.querySelector("#contact-form");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#contact-message-status");
    const payload = {
      name: document.querySelector("#contact-name").value,
      topic: document.querySelector("#contact-topic").value,
      replyTo: document.querySelector("#contact-reply-to").value,
      message: document.querySelector("#contact-message").value,
      locale: window.retroArcadeI18n?.getLanguage?.() || "de",
    };
    try {
      const data = await api("/api/contact", { method: "POST", body: JSON.stringify(payload) });
      status.textContent = data.delivered ? translate("contactSent") : translate("contactStored");
      if (data.ok) form.reset();
    } catch (error) {
      status.textContent = error.message;
    }
  });
}

async function initUser() {
  try {
    const data = await api("/api/me", { headers: {} });
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
  updateHeaderAuth();
}

export async function initSiteUi() {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  ensureFavicon();
  createCookieBanner();
  ensureContactLinks();
  await initUser();
  bindAccountForms();
  bindContactForm();
  await Promise.all([refreshScoreboard(), loadRecentScores()]);
  const gameKey = detectGameKey();
  if (gameKey && GAME_CONFIG[gameKey]) {
    window.setInterval(() => {
      const panel = document.querySelector("[data-scoreboard-mounted]");
      if (panel) {
        panel.querySelector("[data-current-score]").textContent = document.querySelector(GAME_CONFIG[gameKey].selector)?.textContent?.trim() || "0";
      }
    }, 500);
  }
}



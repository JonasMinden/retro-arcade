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
  "metro-run": { title: "Metro Run Scores", selector: "#score" },
  "missile-command": { title: "Sky Shield Scores", selector: "#score" },
  centipede: { title: "Centipede Scores", selector: "#score" },
  "astro-blaster": { title: "Astro Blaster Scores", selector: "#score" },
  "tank-battle": { title: "Panzerspiel Scores", selector: "#score" },
  "chicken-hunt": { title: "Barn Blaster Scores", selector: "#score" },
  "head-soccer": { title: "Head Soccer Scores", selector: "#home-score" },
};

const COOKIE_CONSENT_KEY = "retro_arcade_cookie_consent_v1";
const DEFAULT_POPULAR_GAMES = [
  { game_key: "snake", game_name: "Snake" },
  { game_key: "pac-man", game_name: "Pac-Man" },
  { game_key: "tetris", game_name: "Tetris" },
];

let currentUser = null;
const scoreboardRuntimeState = {};

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

function gamePath(gameKey) {
  return gameKey ? `/games/${gameKey}/` : "/";
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
      <p class="eyebrow">Cookie-Einstellungen</p>
      <h2>Deine Auswahl für Cookies und ähnliche Speicherungen</h2>
      <p>Notwendige Cookies sind für Login und sichere Sessions aktiv. Analyse und Marketing bleiben aus, bis du sie erlaubst.</p>
    </div>
    <div class="cookie-banner__grid">
      <label class="cookie-banner__option">
        <strong><input type="checkbox" checked disabled>Notwendig</strong>
        <span>Erforderlich für Sessions, Login und grundlegende Funktionen.</span>
      </label>
      <label class="cookie-banner__option">
        <strong><input type="checkbox" data-consent-analytics>Analyse</strong>
        <span>Für spätere Reichweitenmessung und Nutzungsstatistiken.</span>
      </label>
      <label class="cookie-banner__option">
        <strong><input type="checkbox" data-consent-marketing>Marketing</strong>
        <span>Für spätere Werbeeinbindung und personalisierte Ad-Auslieferung.</span>
      </label>
    </div>
    <div class="cookie-banner__actions">
      <button class="pixel-button pixel-button--secondary" type="button" data-consent-necessary>Nur notwendige</button>
      <button class="pixel-button" type="button" data-consent-save>Auswahl speichern</button>
      <button class="pixel-button" type="button" data-consent-all>Alle akzeptieren</button>
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

function markCurrentLink(link) {
  const currentPath = window.location.pathname.replace(/index\.html$/, "/");
  const linkPath = new URL(link.href, window.location.origin).pathname.replace(/index\.html$/, "/");
  if (currentPath === linkPath) link.setAttribute("aria-current", "page");
  else link.removeAttribute("aria-current");
}

function buildNavLink(href, label, className = "") {
  const link = document.createElement("a");
  link.href = href;
  link.textContent = label;
  if (className) link.className = className;
  markCurrentLink(link);
  return link;
}

function syncFooterLegalLinks() {
  document.querySelectorAll(".site-footer .site-nav").forEach((nav) => {
    nav.querySelectorAll("[data-legal-link]").forEach((node) => node.remove());
    const legal = buildNavLink("/impressum.html", "Impressum", "footer-legal-link");
    const privacy = buildNavLink("/privacy.html", "Datenschutz", "footer-legal-link");
    legal.dataset.legalLink = "true";
    privacy.dataset.legalLink = "true";
    nav.append(legal, privacy);
  });
}

function updateHeaderAuth() {
  document.querySelectorAll(".site-header .site-nav").forEach((nav) => {
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
      wrapper.innerHTML = `<a href="/account.html">Account</a>`;
    }
    nav.appendChild(wrapper);
  });
}

function renderPopularGames(games) {
  const popularGames = games?.length ? games : DEFAULT_POPULAR_GAMES;
  document.querySelectorAll(".site-header .site-nav").forEach((nav) => {
    nav.querySelectorAll("[data-popular-game]").forEach((node) => node.remove());
    nav.querySelectorAll('a[href$="impressum.html"], a[href$="privacy.html"]').forEach((node) => node.remove());
    const authSlot = nav.querySelector("[data-auth-slot]");
    popularGames.forEach((game) => {
      const link = buildNavLink(gamePath(game.game_key), game.game_name, "popular-game-link");
      link.dataset.popularGame = "true";
      if (authSlot) nav.insertBefore(link, authSlot);
      else nav.appendChild(link);
    });
  });
}

async function loadPopularGames() {
  try {
    const data = await api("/api/scoreboard?summary=top-games");
    renderPopularGames(data.games || []);
  } catch {
    renderPopularGames(DEFAULT_POPULAR_GAMES);
  }
}

function scoreLockKey(gameKey) {
  return `retro_arcade_last_submitted_${gameKey}`;
}

function readLastSubmittedScore(gameKey) {
  try {
    return Number(window.sessionStorage.getItem(scoreLockKey(gameKey)) || "0");
  } catch {
    return 0;
  }
}

function clearLastSubmittedScore(gameKey) {
  try {
    window.sessionStorage.removeItem(scoreLockKey(gameKey));
  } catch {
    // Ignore storage errors and keep the UI usable.
  }
}
function writeLastSubmittedScore(gameKey, score) {
  try {
    window.sessionStorage.setItem(scoreLockKey(gameKey), String(score));
  } catch {
    // Ignore storage errors and keep the UI usable.
  }
}

function gameHasEnded(gameKey) {
  const state = window.__retroArcadeGameState;
  if (!state) return false;
  if (gameKey === "snake") return state.status === "game-over";
  if (gameKey === "pong") return Boolean(state.winner);
  if (typeof state.gameOver === "boolean") return state.gameOver;
  if (typeof state.status === "string") return state.status === "game-over";
  return false;
}
function syncSubmitButtonState(gameKey, panel, score) {
  const button = panel.querySelector("[data-submit-score]");
  const message = panel.querySelector("[data-submit-message]");
  if (!button) return;
  const ended = gameHasEnded(gameKey);
  const runtime = scoreboardRuntimeState[gameKey] || { ended: false };
  if ((!ended && runtime.ended) || (!ended && score === 0)) {
    clearLastSubmittedScore(gameKey);
  }
  runtime.ended = ended;
  scoreboardRuntimeState[gameKey] = runtime;
  const lastSubmitted = readLastSubmittedScore(gameKey);
  const validScore = Number.isFinite(score) && score > 0;
  const locked = ended && validScore && score === lastSubmitted;
  button.disabled = !currentUser || !ended || !validScore || locked;
  if (!message) return;
  const helperMessages = new Set([
    "Bitte erst optional einloggen, um Scores zu speichern.",
    "Spiele erst eine Runde mit gültigem Score.",
    "Score lässt sich erst nach Game Over speichern.",
    "Diesen Score hast du in dieser Runde bereits gespeichert."
  ]);
  if (locked) {
    message.textContent = "Diesen Score hast du in dieser Runde bereits gespeichert.";
    return;
  }
  if (!ended) {
    if (!message.textContent || helperMessages.has(message.textContent)) {
      message.textContent = "Score lässt sich erst nach Game Over speichern.";
    }
    return;
  }
  if (message.textContent === "Diesen Score hast du in dieser Runde bereits gespeichert." || message.textContent === "Score lässt sich erst nach Game Over speichern.") {
    message.textContent = "";
  }
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

function formatRecentTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'short',
    timeStyle: 'short'
  }).format(date);
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
      const timestamp = formatRecentTimestamp(entry.created_at);
      item.innerHTML = `<span>${entry.username}</span><strong>${entry.score}</strong><em>${entry.game_name}</em>${timestamp ? `<small>${timestamp}</small>` : ""}`;
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

function syncLiveScoreboardPanel() {
  const gameKey = detectGameKey();
  if (!gameKey || !GAME_CONFIG[gameKey]) return;
  const panel = document.querySelector("[data-scoreboard-mounted]");
  if (!panel) return;
  const scoreElement = document.querySelector(GAME_CONFIG[gameKey].selector);
  const currentScore = panel.querySelector("[data-current-score]");
  if (!scoreElement || !currentScore) return;
  const score = Number(scoreElement.textContent.trim() || "0");
  currentScore.textContent = String(score);
  syncSubmitButtonState(gameKey, panel, score);
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
        message.textContent = "Bitte erst optional einloggen, um Scores zu speichern.";
        return;
      }
      if (!gameHasEnded(gameKey)) {
        message.textContent = "Score lässt sich erst nach Game Over speichern.";
        return;
      }
      if (!Number.isFinite(score) || score <= 0) {
        message.textContent = "Spiele erst eine Runde mit gültigem Score.";
        return;
      }
      try {
        await api("/api/submit-score", { method: "POST", body: JSON.stringify({ game: gameKey, score }) });
        writeLastSubmittedScore(gameKey, score);
        message.textContent = "Score gespeichert.";
        syncSubmitButtonState(gameKey, panel, score);
        loadScoreboard(gameKey, panel);
        loadRecentScores();
        loadPopularGames();
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }

  syncLiveScoreboardPanel();
  await loadScoreboard(gameKey, panel);
}

async function loadCurrentUser() {
  try {
    const data = await api("/api/me");
    currentUser = data.user || null;
  } catch {
    currentUser = null;
  }
  updateHeaderAuth();
}

async function initSiteUi() {
  ensureFavicon();
  createCookieBanner();
  syncFooterLegalLinks();
  await loadCurrentUser();
  await Promise.allSettled([loadPopularGames(), loadRecentScores(), refreshScoreboard()]);
  if (detectGameKey()) {
    window.setInterval(() => {
      syncLiveScoreboardPanel();
    }, 500);
  }
}

export { initSiteUi, detectGameKey };











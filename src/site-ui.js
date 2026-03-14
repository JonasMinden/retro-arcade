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

let currentUser = null;

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
      wrapper.innerHTML = `<a href="/account.html">Account</a>`;
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
  const container = document.querySelector("[data-recent-scores]");
  if (!container) return;
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
}

async function loadRecentScores() {
  const container = document.querySelector("[data-recent-scores]");
  if (!container) return;
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
        message.textContent = "Bitte erst optional einloggen, um Scores zu speichern.";
        return;
      }
      if (!Number.isFinite(score) || score <= 0) {
        message.textContent = "Spiele erst eine Runde mit gültigem Score.";
        return;
      }
      try {
        await api("/api/submit-score", { method: "POST", body: JSON.stringify({ game: gameKey, score }) });
        message.textContent = "Score gespeichert.";
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
        message.textContent = `Registriert als ${data.user.username}.`;
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
        message.textContent = `Eingeloggt als ${data.user.username}.`;
        updateHeaderAuth();
      } catch (error) {
        message.textContent = error.message;
      }
    });
  }
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
  await initUser();
  bindAccountForms();
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

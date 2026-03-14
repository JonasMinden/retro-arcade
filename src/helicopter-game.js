const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const distanceElement = document.querySelector("#distance");
  const statusElement = document.querySelector("#status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    width: canvas.width,
    height: canvas.height,
    score: 0,
    distance: 0,
    paused: false,
    gameOver: false,
    thrusting: false,
    lastTime: 0,
    ship: null,
    terrain: [],
    sparks: [],
  };
  window.__retroArcadeGameState = state;

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resetGame() {
    state.score = 0;
    state.distance = 0;
    state.paused = false;
    state.gameOver = false;
    state.thrusting = false;
    state.lastTime = 0;
    pauseButton.textContent = "Pause";
    statusElement.textContent = "Ready";
    state.ship = { x: 132, y: state.height / 2, vy: 0, size: 18 };
    state.terrain = [];
    state.sparks = [];

    let gapCenter = state.height / 2;
    let gapHeight = 170;
    for (let x = 0; x <= state.width + 40; x += 20) {
      gapCenter += random(-18, 18);
      gapCenter = Math.max(110, Math.min(state.height - 110, gapCenter));
      gapHeight += random(-6, 6);
      gapHeight = Math.max(130, Math.min(195, gapHeight));
      state.terrain.push({ x, gapCenter, gapHeight });
    }
    syncHud();
  }

  function syncHud() {
    scoreElement.textContent = String(state.score);
    distanceElement.textContent = String(Math.floor(state.distance));
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Weiter" : "Pause";
    statusElement.textContent = state.paused ? "Pause" : "Flight";
  }

  function extendTerrain() {
    while (state.terrain.at(-1).x < state.width + 60) {
      const previous = state.terrain.at(-1);
      const gapCenter = Math.max(105, Math.min(state.height - 105, previous.gapCenter + random(-20, 20)));
      const gapHeight = Math.max(126, Math.min(188, previous.gapHeight + random(-8, 8)));
      state.terrain.push({ x: previous.x + 20, gapCenter, gapHeight });
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    const speed = 170 + state.distance * 0.08;
    const gravity = 540;
    const thrust = -840;

    state.terrain.forEach((segment) => {
      segment.x -= speed * delta;
    });
    state.terrain = state.terrain.filter((segment) => segment.x > -30);
    extendTerrain();

    if (state.thrusting) {
      state.ship.vy += thrust * delta;
      state.sparks.push({ x: state.ship.x - 20, y: state.ship.y + 8, life: 0.22, size: random(3, 6) });
    }
    state.ship.vy += gravity * delta;
    state.ship.vy = Math.max(-250, Math.min(290, state.ship.vy));
    state.ship.y += state.ship.vy * delta;

    state.sparks.forEach((spark) => {
      spark.x -= speed * delta * 0.7;
      spark.life -= delta;
    });
    state.sparks = state.sparks.filter((spark) => spark.life > 0);

    state.distance += delta * 60;
    state.score += Math.max(1, Math.floor(delta * 100));

    const closest = state.terrain.reduce((best, segment) => {
      const diff = Math.abs(segment.x - state.ship.x);
      return diff < Math.abs(best.x - state.ship.x) ? segment : best;
    }, state.terrain[0]);
    const top = closest.gapCenter - closest.gapHeight / 2;
    const bottom = closest.gapCenter + closest.gapHeight / 2;
    const nose = state.ship.y;
    const tail = state.ship.y + 16;

    if (state.ship.y < 8 || state.ship.y > state.height - 8 || nose < top + 10 || tail > bottom - 10) {
      state.gameOver = true;
      statusElement.textContent = "Crash";
    } else {
      statusElement.textContent = state.thrusting ? "Boost" : "Flight";
    }

    syncHud();
  }

  function drawTerrain() {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    state.terrain.forEach((segment) => {
      ctx.lineTo(segment.x, segment.gapCenter - segment.gapHeight / 2);
    });
    ctx.lineTo(state.width, 0);
    ctx.closePath();
    ctx.fillStyle = "#102437";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, state.height);
    state.terrain.forEach((segment) => {
      ctx.lineTo(segment.x, segment.gapCenter + segment.gapHeight / 2);
    });
    ctx.lineTo(state.width, state.height);
    ctx.closePath();
    ctx.fillStyle = "#102437";
    ctx.fill();

    ctx.strokeStyle = "#71e3ff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    state.terrain.forEach((segment, index) => {
      const y = segment.gapCenter - segment.gapHeight / 2;
      if (index === 0) ctx.moveTo(segment.x, y); else ctx.lineTo(segment.x, y);
    });
    ctx.stroke();
    ctx.beginPath();
    state.terrain.forEach((segment, index) => {
      const y = segment.gapCenter + segment.gapHeight / 2;
      if (index === 0) ctx.moveTo(segment.x, y); else ctx.lineTo(segment.x, y);
    });
    ctx.stroke();
  }

  function drawShip() {
    ctx.save();
    ctx.translate(state.ship.x, state.ship.y);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(-18, -6, 30, 12);
    ctx.fillStyle = "#ff5fb2";
    ctx.fillRect(-4, -10, 12, 20);
    ctx.fillStyle = "#71e3ff";
    ctx.fillRect(8, -4, 12, 8);
    ctx.fillStyle = "#f7f5ff";
    ctx.fillRect(-10, -3, 10, 6);
    ctx.fillRect(-2, -16, 3, 32);
    ctx.restore();

    state.sparks.forEach((spark) => {
      ctx.globalAlpha = spark.life / 0.22;
      ctx.fillStyle = "#ff9b54";
      ctx.fillRect(spark.x, spark.y, spark.size, spark.size / 2);
      ctx.globalAlpha = 1;
    });
  }

  function drawHudOverlay() {
    if (!state.paused && !state.gameOver) return;
    ctx.fillStyle = "rgba(4, 6, 12, 0.58)";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.textAlign = "center";
    ctx.font = "bold 28px 'Courier New'";
    ctx.fillText(state.gameOver ? "Crash" : "Pause", state.width / 2, state.height / 2 - 12);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(state.gameOver ? "Restart für einen neuen Flug" : "Pause zum Fortsetzen", state.width / 2, state.height / 2 + 20);
  }

  function draw() {
    const gradient = ctx.createLinearGradient(0, 0, state.width, state.height);
    gradient.addColorStop(0, "#0a1228");
    gradient.addColorStop(1, "#111a2f");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 14; i += 1) {
      ctx.fillRect((i * 53 + state.distance * 4) % state.width, 36 + (i % 6) * 58, 3, 3);
    }

    drawTerrain();
    drawShip();
    drawHudOverlay();
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  function setThrust(active) {
    if (state.gameOver) return;
    state.thrusting = active;
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "w") {
      event.preventDefault();
      setThrust(true);
    }
    if (key === "p") togglePause();
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "w") setThrust(false);
  });

  actionButtons.forEach((button) => {
    const action = button.dataset.action;
    if (action === "pause") button.addEventListener("click", togglePause);
    if (action === "restart") button.addEventListener("click", resetGame);
    if (action === "thrust") {
      const start = () => setThrust(true);
      const stop = () => setThrust(false);
      button.addEventListener("mousedown", start);
      button.addEventListener("mouseup", stop);
      button.addEventListener("mouseleave", stop);
      button.addEventListener("touchstart", start, { passive: true });
      button.addEventListener("touchend", stop);
    }
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);

  resetGame();
  requestAnimationFrame(frame);
}


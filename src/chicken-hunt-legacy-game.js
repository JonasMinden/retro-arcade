const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const hitsElement = document.querySelector("#hits");
  const timeElement = document.querySelector("#time");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    score: 0,
    hits: 0,
    time: 45,
    paused: false,
    gameOver: false,
    birds: [],
    covers: [],
    splashes: [],
    spawnTimer: 0,
    muzzle: 0,
    lastTime: 0,
    aimX: 320,
    aimY: 210,
  };
  window.__retroArcadeGameState = state;

  function updateHud() {
    scoreElement.textContent = String(state.score);
    hitsElement.textContent = String(state.hits);
    timeElement.textContent = String(Math.max(0, Math.ceil(state.time)));
  }

  function restartGame() {
    state.score = 0;
    state.hits = 0;
    state.time = 45;
    state.paused = false;
    state.gameOver = false;
    state.birds = [];
    state.splashes = [];
    state.spawnTimer = 0;
    state.muzzle = 0;
    state.aimX = canvas.width * 0.5;
    state.aimY = canvas.height * 0.5;
    state.covers = [
      { x: 110, y: 255, w: 94, h: 128, tone: "#7d4c2c" },
      { x: 282, y: 240, w: 86, h: 144, tone: "#8d5530" },
      { x: 430, y: 250, w: 108, h: 132, tone: "#774321" },
    ];
    pauseButton.textContent = "Pause";
    updateHud();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function spawnBird() {
    const cover = state.covers[Math.floor(Math.random() * state.covers.length)];
    const side = Math.random() < 0.5 ? -1 : 1;
    const golden = Math.random() < 0.14;
    const y = cover.y - 24 - Math.random() * 80;
    state.birds.push({
      x: cover.x + cover.w * (0.25 + Math.random() * 0.5),
      y,
      vx: side * (78 + Math.random() * 44),
      vy: -18 - Math.random() * 28,
      bob: Math.random() * Math.PI * 2,
      wing: Math.random() * Math.PI * 2,
      size: 0.82 + Math.random() * 0.28,
      visible: true,
      golden,
      tint: golden ? "#ffd166" : "#f2efe0",
    });
  }

  function burst(x, y, color) {
    for (let i = 0; i < 10; i += 1) {
      const angle = (Math.PI * 2 * i) / 10 + Math.random() * 0.5;
      const speed = 26 + Math.random() * 34;
      state.splashes.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.28,
        color,
      });
    }
  }

  function shootAt(x, y) {
    if (state.paused || state.gameOver) return;
    state.aimX = x;
    state.aimY = y;
    state.muzzle = 0.11;
    for (let i = state.birds.length - 1; i >= 0; i -= 1) {
      const bird = state.birds[i];
      if (!bird.visible) continue;
      if (Math.hypot(x - bird.x, y - bird.y) < 24 * bird.size) {
        state.birds.splice(i, 1);
        state.hits += 1;
        state.score += bird.golden ? 140 : 45;
        burst(bird.x, bird.y, bird.golden ? "#ffd166" : "#f7f5ff");
        updateHud();
        return;
      }
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.time = Math.max(0, state.time - delta);
    if (state.time <= 0) {
      state.gameOver = true;
      updateHud();
      return;
    }
    state.muzzle = Math.max(0, state.muzzle - delta);
    state.spawnTimer += delta;
    if (state.spawnTimer >= 0.85) {
      state.spawnTimer = 0;
      spawnBird();
      if (Math.random() > 0.74) spawnBird();
    }

    state.birds.forEach((bird) => {
      bird.bob += delta * 7;
      bird.wing += delta * 18;
      bird.x += bird.vx * delta;
      bird.y += bird.vy * delta + Math.sin(bird.bob) * 11 * delta;
      bird.vy += 18 * delta;
    });

    state.birds = state.birds.filter((bird) => (
      bird.x > -90 &&
      bird.x < canvas.width + 90 &&
      bird.y > -80 &&
      bird.y < canvas.height + 40
    ));

    state.splashes.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.life -= delta;
    });
    state.splashes = state.splashes.filter((particle) => particle.life > 0);
    updateHud();
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#93d3ff");
    sky.addColorStop(1, "#ecf7ff");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#dcecf7";
    ctx.beginPath();
    ctx.moveTo(0, 184);
    ctx.lineTo(76, 144);
    ctx.lineTo(160, 178);
    ctx.lineTo(254, 132);
    ctx.lineTo(356, 174);
    ctx.lineTo(470, 130);
    ctx.lineTo(640, 174);
    ctx.lineTo(640, 248);
    ctx.lineTo(0, 248);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#7cca6d";
    ctx.fillRect(0, 260, canvas.width, 160);

    ctx.fillStyle = "#78c4ed";
    ctx.beginPath();
    ctx.ellipse(318, 334, 200, 48, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#8d5b35";
    ctx.fillRect(490, 170, 106, 112);
    ctx.fillStyle = "#d84f42";
    ctx.beginPath();
    ctx.moveTo(474, 180);
    ctx.lineTo(542, 124);
    ctx.lineTo(610, 180);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4deb8";
    ctx.fillRect(514, 208, 20, 74);
    ctx.fillRect(550, 208, 20, 74);

    state.covers.forEach((cover, index) => {
      ctx.fillStyle = cover.tone;
      ctx.fillRect(cover.x, cover.y, cover.w, cover.h);
      ctx.fillStyle = index % 2 === 0 ? "#5e7d2b" : "#678a31";
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.ellipse(cover.x + 18 + i * 18, cover.y - 4 - (i % 2) * 8, 12, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  function drawBird(bird) {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.scale(Math.sign(bird.vx) * bird.size, bird.size);
    const flap = Math.sin(bird.wing) * 9;

    ctx.fillStyle = bird.golden ? "#ffd166" : "#f7f5ff";
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bird.golden ? "#ffb703" : "#d7cfc2";
    ctx.beginPath();
    ctx.ellipse(-6, 4, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ff9b54";
    ctx.beginPath();
    ctx.moveTo(16, -1);
    ctx.lineTo(30, 2);
    ctx.lineTo(16, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#1a1d2b";
    ctx.beginPath();
    ctx.arc(10, -4, 2.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bird.golden ? "#fff1b0" : "#ece6dd";
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.lineTo(-22, flap);
    ctx.lineTo(-6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(-10, -13 - flap * 0.35);
    ctx.lineTo(8, -8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = "#ff9b54";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, 11);
    ctx.lineTo(-5, 20);
    ctx.moveTo(0, 11);
    ctx.lineTo(2, 20);
    ctx.stroke();
    ctx.restore();
  }

  function drawSplashes() {
    state.splashes.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life * 2.2);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 4, 4);
      ctx.globalAlpha = 1;
    });
  }

  function drawShotgun() {
    ctx.strokeStyle = "#3a2b1e";
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(68, canvas.height - 12);
    ctx.lineTo(160, canvas.height - 58);
    ctx.stroke();
    ctx.strokeStyle = "#bcc7d8";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(150, canvas.height - 63);
    ctx.lineTo(220, canvas.height - 98);
    ctx.stroke();

    if (state.muzzle > 0) {
      ctx.fillStyle = `rgba(255, 209, 102, ${state.muzzle * 7})`;
      ctx.beginPath();
      ctx.arc(222, canvas.height - 99, 24 * state.muzzle * 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.aimX - 14, state.aimY);
    ctx.lineTo(state.aimX + 14, state.aimY);
    ctx.moveTo(state.aimX, state.aimY - 14);
    ctx.lineTo(state.aimX, state.aimY + 14);
    ctx.stroke();
  }

  function draw() {
    drawBackground();
    state.birds.forEach(drawBird);
    drawSplashes();
    drawShotgun();

    ctx.fillStyle = "rgba(12, 18, 34, 0.42)";
    ctx.fillRect(14, 14, 180, 34);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "14px 'Courier New'";
    ctx.fillText(`Legacy Timer ${Math.max(0, state.time).toFixed(1)}s`, 24, 36);

    if (state.paused || state.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f7f5ff";
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText(state.gameOver ? "Time Up" : "Paused", canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = "16px 'Courier New'";
      ctx.fillText(
        state.gameOver ? "Press Restart for another old-school round" : "Press pause again to resume",
        canvas.width / 2,
        canvas.height / 2 + 22,
      );
      ctx.textAlign = "start";
    }
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointermove", (event) => {
    const rect = canvas.getBoundingClientRect();
    state.aimX = (event.clientX - rect.left) * (canvas.width / rect.width);
    state.aimY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener("pointerdown", (event) => {
    const rect = canvas.getBoundingClientRect();
    shootAt(
      (event.clientX - rect.left) * (canvas.width / rect.width),
      (event.clientY - rect.top) * (canvas.height / rect.height),
    );
  });

  actionButtons.forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.action;
    if (action === "pause") togglePause();
    if (action === "restart") restartGame();
  }));

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

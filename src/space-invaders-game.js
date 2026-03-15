const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const waveElement = document.querySelector("#wave");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const moveButtons = Array.from(document.querySelectorAll("[data-move]"));
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    width: canvas.width,
    height: canvas.height,
    score: 0,
    lives: 3,
    wave: 1,
    playerX: canvas.width / 2 - 18,
    move: 0,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    enemyDirection: 1,
    enemySpeed: 28,
    enemyFireTimer: 0,
    paused: false,
    gameOver: false,
    won: false,
    lastTime: 0,
  };
  window.__retroArcadeGameState = state;

  function createWave() {
    const enemies = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        enemies.push({
          x: 70 + col * 56,
          y: 52 + row * 42,
          width: 28,
          height: 20,
          alive: true,
          color: row < 2 ? "#87ff65" : row === 2 ? "#71e3ff" : "#ff5fb2",
        });
      }
    }
    state.enemies = enemies;
    state.enemyDirection = 1;
    state.enemySpeed = 30 + state.wave * 9;
    state.enemyBullets = [];
    state.bullets = [];
    state.playerX = state.width / 2 - 18;
  }

  function restartGame() {
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.paused = false;
    state.gameOver = false;
    state.won = false;
    state.enemyFireTimer = 0;
    scoreElement.textContent = "0";
    livesElement.textContent = "3";
    waveElement.textContent = "1";
    pauseButton.textContent = "Pause";
    createWave();
  }

  function fireBullet() {
    if (state.paused || state.gameOver) {
      return;
    }
    if (state.bullets.length < 3) {
      state.bullets.push({ x: state.playerX + 16, y: state.height - 38, vy: -420 });
    }
  }

  function togglePause() {
    if (state.gameOver) {
      return;
    }
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function updateEnemies(delta) {
    const activeEnemies = state.enemies.filter((enemy) => enemy.alive);
    if (!activeEnemies.length) {
      state.wave += 1;
      waveElement.textContent = String(state.wave);
      createWave();
      return;
    }

    const leftMost = Math.min(...activeEnemies.map((enemy) => enemy.x));
    const rightMost = Math.max(...activeEnemies.map((enemy) => enemy.x + enemy.width));
    if ((leftMost <= 18 && state.enemyDirection < 0) || (rightMost >= state.width - 18 && state.enemyDirection > 0)) {
      state.enemyDirection *= -1;
      activeEnemies.forEach((enemy) => { enemy.y += 18; });
    }

    activeEnemies.forEach((enemy) => { enemy.x += state.enemyDirection * state.enemySpeed * delta; });

    if (activeEnemies.some((enemy) => enemy.y + enemy.height >= state.height - 52)) {
      state.gameOver = true;
    }

    state.enemyFireTimer += delta;
    if (state.enemyFireTimer >= Math.max(0.22, 1.05 - state.wave * 0.1)) {
      state.enemyFireTimer = 0;
      const columns = {};
      activeEnemies.forEach((enemy) => {
        const key = Math.round(enemy.x / 10);
        if (!columns[key] || columns[key].y < enemy.y) {
          columns[key] = enemy;
        }
      });
      const shooters = Object.values(columns);
      if (shooters.length) {
        const shooter = shooters[Math.floor(Math.random() * shooters.length)];
        const shots = state.wave >= 4 && Math.random() < 0.4 ? 2 : 1;
        for (let i = 0; i < shots; i += 1) {
          state.enemyBullets.push({ x: shooter.x + shooter.width / 2 + (i === 0 ? 0 : (Math.random() < 0.5 ? -8 : 8)), y: shooter.y + shooter.height, vy: 240 + state.wave * 16 + i * 18 });
        }
      }
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) {
      return;
    }

    state.playerX = Math.max(14, Math.min(state.width - 50, state.playerX + state.move * 260 * delta));
    updateEnemies(delta);

    state.bullets.forEach((bullet) => { bullet.y += bullet.vy * delta; });
    state.enemyBullets.forEach((bullet) => { bullet.y += bullet.vy * delta; });
    state.bullets = state.bullets.filter((bullet) => bullet.y > -20);
    state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.y < state.height + 20);

    state.bullets.forEach((bullet) => {
      state.enemies.forEach((enemy) => {
        if (!enemy.alive) {
          return;
        }
        const hit = bullet.x >= enemy.x && bullet.x <= enemy.x + enemy.width && bullet.y >= enemy.y && bullet.y <= enemy.y + enemy.height;
        if (hit) {
          enemy.alive = false;
          bullet.y = -40;
          state.score += 10;
          scoreElement.textContent = String(state.score);
        }
      });
    });

    state.enemyBullets.forEach((bullet) => {
      const hit = bullet.x >= state.playerX && bullet.x <= state.playerX + 36 && bullet.y >= state.height - 36 && bullet.y <= state.height - 12;
      if (hit) {
        bullet.y = state.height + 40;
        state.lives -= 1;
        livesElement.textContent = String(state.lives);
        if (state.lives <= 0) {
          state.gameOver = true;
        }
      }
    });
  }

  function drawPlayer() {
    ctx.fillStyle = "#71e3ff";
    ctx.fillRect(state.playerX, state.height - 28, 36, 12);
    ctx.fillRect(state.playerX + 12, state.height - 38, 12, 10);
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      if (!enemy.alive) {
        return;
      }
      ctx.fillStyle = enemy.color;
      ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(enemy.x + 6, enemy.y + 6, 4, 4);
      ctx.fillRect(enemy.x + enemy.width - 10, enemy.y + 6, 4, 4);
    });
  }

  function drawBullets() {
    ctx.fillStyle = "#ffd166";
    state.bullets.forEach((bullet) => ctx.fillRect(bullet.x, bullet.y, 3, 12));
    ctx.fillStyle = "#ff5fb2";
    state.enemyBullets.forEach((bullet) => ctx.fillRect(bullet.x, bullet.y, 3, 12));
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "28px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(title, state.width / 2, state.height / 2 - 10);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(subtitle, state.width / 2, state.height / 2 + 20);
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    for (let y = 0; y < state.height; y += 28) {
      ctx.fillRect(0, y, state.width, 1);
    }
    drawEnemies();
    drawPlayer();
    drawBullets();

    if (state.paused) {
      drawOverlay("Paused", "Press pause again to resume");
    }
    if (state.gameOver) {
      drawOverlay("Game Over", "Press Restart to defend again");
    }
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") {
      state.move = -1;
    }
    if (key === "d" || key === "arrowright") {
      state.move = 1;
    }
    if (key === " ") {
      event.preventDefault();
      fireBullet();
    }
    if (key === "p") {
      togglePause();
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (["a", "d", "arrowleft", "arrowright"].includes(key)) {
      state.move = 0;
    }
  });

  moveButtons.forEach((button) => {
    const dir = button.dataset.move === "left" ? -1 : 1;
    const start = () => { state.move = dir; };
    const stop = () => { state.move = 0; };
    button.addEventListener("mousedown", start);
    button.addEventListener("touchstart", start, { passive: true });
    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("touchend", stop);
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "fire") {
        fireBullet();
      }
      if (button.dataset.action === "pause") {
        togglePause();
      }
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}



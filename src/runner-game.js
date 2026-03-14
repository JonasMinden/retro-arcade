const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const distanceElement = document.querySelector("#distance");
  const speedElement = document.querySelector("#speed");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    width: canvas.width,
    height: canvas.height,
    score: 0,
    distance: 0,
    speed: 1,
    paused: false,
    gameOver: false,
    lastTime: 0,
    player: null,
    obstacles: [],
    particles: [],
  };

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resetGame() {
    state.score = 0;
    state.distance = 0;
    state.speed = 1;
    state.paused = false;
    state.gameOver = false;
    state.lastTime = 0;
    pauseButton.textContent = "Pause";
    state.player = {
      x: 110,
      baseY: 284,
      width: 34,
      height: 60,
      yOffset: 0,
      vy: 0,
      jumpCount: 0,
      slideTimer: 0,
    };
    state.obstacles = [];
    state.particles = [];
    syncHud();
  }

  function syncHud() {
    scoreElement.textContent = String(state.score);
    distanceElement.textContent = String(Math.floor(state.distance));
    speedElement.textContent = `${state.speed.toFixed(1)}x`;
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Weiter" : "Pause";
  }

  function jump() {
    if (state.gameOver || state.paused) return;
    if (state.player.jumpCount >= 2) return;
    state.player.vy = -620;
    state.player.jumpCount += 1;
  }

  function slide() {
    if (state.gameOver || state.paused) return;
    state.player.slideTimer = 0.7;
  }

  function spawnObstacle() {
    const type = Math.random() < 0.55 ? "block" : "gate";
    const obstacle = {
      type,
      x: state.width + 40,
      width: type === "block" ? random(28, 42) : random(42, 64),
      height: type === "block" ? random(40, 72) : random(22, 34),
      y: type === "block" ? 304 : 226,
      color: type === "block" ? "#ff9b54" : "#71e3ff",
      scored: false,
    };
    state.obstacles.push(obstacle);
  }

  function playerHitbox() {
    const sliding = state.player.slideTimer > 0;
    const height = sliding ? 36 : state.player.height;
    const top = state.player.baseY - height + 6 + state.player.yOffset;
    return {
      x: state.player.x + 4,
      y: top,
      width: state.player.width - 8,
      height: height - 8,
    };
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    const runSpeed = 280 * state.speed;
    state.distance += delta * 38 * state.speed;
    state.score += Math.max(1, Math.floor(delta * 90 * state.speed));
    state.speed = Math.min(2.8, 1 + state.distance / 260);

    if (!state.obstacles.length || state.obstacles.at(-1).x < state.width - random(150, 230)) {
      spawnObstacle();
    }

    state.player.vy += 1450 * delta;
    state.player.yOffset += state.player.vy * delta;
    if (state.player.yOffset > 0) {
      state.player.yOffset = 0;
      state.player.vy = 0;
      state.player.jumpCount = 0;
    }
    if (state.player.slideTimer > 0) {
      state.player.slideTimer -= delta;
      state.particles.push({ x: state.player.x + 6, y: state.player.baseY + 4, size: random(2, 4), life: 0.25 });
    }

    state.obstacles.forEach((obstacle) => {
      obstacle.x -= runSpeed * delta;
      if (!obstacle.scored && obstacle.x + obstacle.width < state.player.x) {
        obstacle.scored = true;
        state.score += obstacle.type === "block" ? 18 : 22;
      }
    });
    state.obstacles = state.obstacles.filter((obstacle) => obstacle.x + obstacle.width > -20);

    state.particles.forEach((particle) => {
      particle.x -= runSpeed * delta * 0.35;
      particle.life -= delta;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);

    const hitbox = playerHitbox();
    const collided = state.obstacles.some((obstacle) => {
      const obstacleTop = obstacle.y - obstacle.height;
      return hitbox.x < obstacle.x + obstacle.width && hitbox.x + hitbox.width > obstacle.x && hitbox.y < obstacle.y && hitbox.y + hitbox.height > obstacleTop;
    });
    if (collided) {
      state.gameOver = true;
    }

    syncHud();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#091126");
    gradient.addColorStop(0.7, "#140f2a");
    gradient.addColorStop(1, "#241322");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let i = 0; i < 12; i += 1) {
      ctx.fillRect((i * 70 + state.distance * 9) % state.width, 38 + (i % 4) * 38, 3, 18);
    }

    ctx.fillStyle = "#ff5fb2";
    ctx.fillRect(0, 292, state.width, 4);
    ctx.fillStyle = "#ff9b54";
    ctx.fillRect(0, 300, state.width, 60);
    ctx.fillStyle = "#3b2512";
    ctx.fillRect(0, 324, state.width, 36);
  }

  function drawObstacles() {
    state.obstacles.forEach((obstacle) => {
      ctx.fillStyle = obstacle.color;
      ctx.fillRect(obstacle.x, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(obstacle.x + 4, obstacle.y - obstacle.height + 4, obstacle.width - 8, 6);
    });
  }

  function drawPlayer() {
    const sliding = state.player.slideTimer > 0;
    const x = state.player.x;
    const y = state.player.baseY + state.player.yOffset;
    ctx.fillStyle = "#71e3ff";
    if (sliding) {
      ctx.fillRect(x, y - 28, 42, 22);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 26, y - 34, 14, 12);
    } else {
      ctx.fillRect(x + 10, y - 60, 18, 30);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 8, y - 78, 22, 18);
      ctx.fillStyle = "#71e3ff";
      ctx.fillRect(x, y - 28, 40, 26);
      ctx.fillStyle = "#ff5fb2";
      ctx.fillRect(x + 2, y - 2, 10, 6);
      ctx.fillRect(x + 28, y - 2, 10, 6);
    }

    state.particles.forEach((particle) => {
      ctx.globalAlpha = particle.life / 0.25;
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
      ctx.globalAlpha = 1;
    });
  }

  function drawOverlay() {
    if (!state.paused && !state.gameOver) return;
    ctx.fillStyle = "rgba(4, 6, 12, 0.55)";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.textAlign = "center";
    ctx.font = "bold 26px 'Courier New'";
    ctx.fillText(state.gameOver ? "Game Over" : "Pause", state.width / 2, state.height / 2 - 12);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(state.gameOver ? "Restart für einen neuen Sprint" : "Pause zum Fortsetzen", state.width / 2, state.height / 2 + 20);
  }

  function draw() {
    drawBackground();
    drawObstacles();
    drawPlayer();
    drawOverlay();
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === " " || key === "w" || key === "arrowup") {
      event.preventDefault();
      jump();
    }
    if (key === "s" || key === "arrowdown") slide();
    if (key === "p") togglePause();
  });

  actionButtons.forEach((button) => {
    const action = button.dataset.action;
    if (action === "jump") button.addEventListener("click", jump);
    if (action === "slide") button.addEventListener("click", slide);
    if (action === "pause") button.addEventListener("click", togglePause);
    if (action === "restart") button.addEventListener("click", resetGame);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);

  resetGame();
  requestAnimationFrame(frame);
}

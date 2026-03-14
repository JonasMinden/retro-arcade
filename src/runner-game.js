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
    spawnCooldown: 1.8,
    skylineOffset: 0,
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
    state.spawnCooldown = 1.8;
    state.skylineOffset = 0;
    pauseButton.textContent = "Pause";
    state.player = {
      x: 126,
      baseY: 292,
      width: 34,
      height: 58,
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
    scoreElement.textContent = String(Math.floor(state.score));
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
    state.player.vy = state.player.jumpCount === 0 ? -590 : -530;
    state.player.jumpCount += 1;
  }

  function slide() {
    if (state.gameOver || state.paused) return;
    if (state.player.yOffset < -8) return;
    state.player.slideTimer = 0.8;
  }

  function spawnObstacle() {
    const prefersHigh = state.distance > 70 && Math.random() > 0.55;
    const type = prefersHigh ? "gate" : "block";
    const obstacle = {
      type,
      x: state.width + random(24, 80),
      width: type === "block" ? random(26, 40) : random(50, 66),
      height: type === "block" ? random(38, 62) : random(24, 32),
      y: type === "block" ? 304 : 224,
      color: type === "block" ? "#ff9b54" : "#71e3ff",
      scored: false,
    };
    state.obstacles.push(obstacle);
  }

  function playerHitbox() {
    const sliding = state.player.slideTimer > 0;
    const height = sliding ? 34 : state.player.height;
    const top = state.player.baseY - height + 4 + state.player.yOffset;
    return {
      x: state.player.x + 6,
      y: top,
      width: state.player.width - 10,
      height: height - 6,
    };
  }

  function obstacleDistanceFromPlayer(obstacle) {
    return obstacle.x - (state.player.x + state.player.width);
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    const runSpeed = 215 + state.distance * 0.95;
    state.distance += delta * 26 * state.speed;
    state.speed = Math.min(1.9, 1 + state.distance / 420);
    state.score += delta * 70 * state.speed;
    state.skylineOffset += delta * runSpeed * 0.18;

    state.spawnCooldown -= delta;
    const furthestObstacle = state.obstacles.at(-1);
    const farEnough = !furthestObstacle || obstacleDistanceFromPlayer(furthestObstacle) > random(260, 360);
    if (state.spawnCooldown <= 0 && farEnough) {
      spawnObstacle();
      state.spawnCooldown = random(1.15, 1.75) / state.speed;
    }

    state.player.vy += 1500 * delta;
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
        state.score += obstacle.type === "block" ? 18 : 24;
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
      return hitbox.x < obstacle.x + obstacle.width &&
        hitbox.x + hitbox.width > obstacle.x &&
        hitbox.y < obstacle.y &&
        hitbox.y + hitbox.height > obstacleTop;
    });

    if (collided) {
      state.gameOver = true;
      pauseButton.textContent = "Pause";
    }

    syncHud();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#091126");
    gradient.addColorStop(0.65, "#130f27");
    gradient.addColorStop(1, "#241322");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    for (let i = 0; i < 10; i += 1) {
      const x = (i * 92 - state.skylineOffset) % (state.width + 120);
      ctx.fillStyle = i % 2 === 0 ? "rgba(113,227,255,0.14)" : "rgba(255,95,178,0.12)";
      ctx.fillRect(x, 54 + (i % 3) * 16, 28, 120 + (i % 4) * 16);
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(x + 6, 68 + (i % 3) * 16, 5, 8);
      ctx.fillRect(x + 16, 94 + (i % 2) * 12, 5, 8);
    }

    ctx.fillStyle = "#ff5fb2";
    ctx.fillRect(0, 290, state.width, 4);
    ctx.fillStyle = "#ff9b54";
    ctx.fillRect(0, 298, state.width, 62);
    ctx.fillStyle = "#3b2512";
    ctx.fillRect(0, 322, state.width, 38);
  }

  function drawObstacles() {
    state.obstacles.forEach((obstacle) => {
      const distance = obstacleDistanceFromPlayer(obstacle);
      if (distance > 0) {
        ctx.globalAlpha = Math.max(0.18, Math.min(0.5, 1 - distance / 360));
        ctx.fillStyle = obstacle.type === "block" ? "rgba(255, 155, 84, 0.25)" : "rgba(113, 227, 255, 0.25)";
        ctx.fillRect(obstacle.x, obstacle.y - obstacle.height - 8, obstacle.width, 6);
        ctx.globalAlpha = 1;
      }

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
      ctx.fillRect(x, y - 26, 42, 20);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 26, y - 34, 14, 12);
    } else {
      ctx.fillRect(x + 10, y - 58, 18, 28);
      ctx.fillStyle = "#ffd166";
      ctx.fillRect(x + 8, y - 76, 22, 18);
      ctx.fillStyle = "#71e3ff";
      ctx.fillRect(x, y - 28, 40, 24);
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

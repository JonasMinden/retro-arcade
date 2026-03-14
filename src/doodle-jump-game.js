const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const coinsElement = document.querySelector("#coins");
  const heightElement = document.querySelector("#height");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-move]"));

  const state = {
    width: canvas.width,
    height: canvas.height,
    paused: false,
    gameOver: false,
    score: 0,
    coins: 0,
    heightValue: 0,
    cameraOffset: 0,
    lastTime: 0,
    input: { left: false, right: false },
    player: null,
    platforms: [],
    coinsOnMap: [],
    monsters: [],
    clouds: [],
  };

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function makePlatform(y) {
    const width = random(74, 112);
    return {
      x: random(18, state.width - width - 18),
      y,
      width,
      height: 12,
      moving: Math.random() < 0.28,
      speed: Math.random() < 0.5 ? -48 : 48,
    };
  }

  function maybeCoin(platform) {
    if (Math.random() < 0.55) {
      return {
        x: platform.x + platform.width / 2,
        y: platform.y - 14,
        radius: 7,
        taken: false,
      };
    }
    return null;
  }

  function maybeMonster(platform) {
    if (Math.random() < 0.18) {
      return {
        x: platform.x + platform.width / 2,
        y: platform.y - 18,
        width: 22,
        height: 16,
        direction: Math.random() < 0.5 ? -1 : 1,
        speed: random(18, 32),
      };
    }
    return null;
  }

  function syncHud() {
    scoreElement.textContent = String(state.score);
    coinsElement.textContent = String(state.coins);
    heightElement.textContent = String(state.heightValue);
  }

  function resetGame() {
    state.paused = false;
    state.gameOver = false;
    state.score = 0;
    state.coins = 0;
    state.heightValue = 0;
    state.cameraOffset = 0;
    state.lastTime = 0;
    state.input.left = false;
    state.input.right = false;
    pauseButton.textContent = "Pause";
    state.player = {
      x: state.width / 2 - 16,
      y: state.height - 78,
      width: 28,
      height: 28,
      vx: 0,
      vy: -420,
      facing: 1,
    };
    state.platforms = [];
    state.coinsOnMap = [];
    state.monsters = [];
    state.clouds = Array.from({ length: 8 }, (_, index) => ({
      x: random(0, state.width),
      y: 40 + index * 65,
      width: random(50, 95),
      speed: random(8, 18),
    }));

    let y = state.height - 42;
    while (y > -720) {
      const platform = makePlatform(y);
      state.platforms.push(platform);
      const coin = maybeCoin(platform);
      if (coin) state.coinsOnMap.push(coin);
      const monster = maybeMonster(platform);
      if (monster) state.monsters.push(monster);
      y -= random(68, 94);
    }
    state.platforms.push({ x: state.width / 2 - 48, y: state.height - 24, width: 96, height: 14, moving: false, speed: 0 });
    syncHud();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Weiter" : "Pause";
  }

  function ensureContent() {
    const highestPlatform = Math.min(...state.platforms.map((platform) => platform.y));
    let y = highestPlatform;
    while (y > state.cameraOffset - 520) {
      y -= random(68, 96);
      const platform = makePlatform(y);
      state.platforms.push(platform);
      const coin = maybeCoin(platform);
      if (coin) state.coinsOnMap.push(coin);
      const monster = maybeMonster(platform);
      if (monster) state.monsters.push(monster);
    }

    state.platforms = state.platforms.filter((platform) => platform.y < state.cameraOffset + state.height + 120);
    state.coinsOnMap = state.coinsOnMap.filter((coin) => !coin.taken && coin.y < state.cameraOffset + state.height + 120);
    state.monsters = state.monsters.filter((monster) => monster.y < state.cameraOffset + state.height + 140);
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.clouds.forEach((cloud) => {
      cloud.x += cloud.speed * delta;
      if (cloud.x - cloud.width > state.width + 40) cloud.x = -cloud.width;
    });

    state.platforms.forEach((platform) => {
      if (platform.moving) {
        platform.x += platform.speed * delta;
        if (platform.x <= 12 || platform.x + platform.width >= state.width - 12) {
          platform.speed *= -1;
        }
      }
    });

    state.monsters.forEach((monster) => {
      monster.x += monster.speed * monster.direction * delta;
      if (monster.x <= 16 || monster.x + monster.width >= state.width - 16) {
        monster.direction *= -1;
      }
    });

    const accel = state.input.left ? -360 : state.input.right ? 360 : 0;
    state.player.vx = accel;
    if (state.input.left) state.player.facing = -1;
    if (state.input.right) state.player.facing = 1;

    state.player.x += state.player.vx * delta;
    if (state.player.x + state.player.width < 0) state.player.x = state.width;
    if (state.player.x > state.width) state.player.x = -state.player.width;

    const previousY = state.player.y;
    state.player.vy += 980 * delta;
    state.player.y += state.player.vy * delta;

    if (state.player.vy > 0) {
      state.platforms.forEach((platform) => {
        const playerBottom = state.player.y + state.player.height;
        const previousBottom = previousY + state.player.height;
        const withinX = state.player.x + state.player.width > platform.x + 6 && state.player.x < platform.x + platform.width - 6;
        const crossedTop = previousBottom <= platform.y && playerBottom >= platform.y;
        if (withinX && crossedTop) {
          state.player.y = platform.y - state.player.height;
          state.player.vy = -620;
          state.score += 5;
        }
      });
    }

    state.coinsOnMap.forEach((coin) => {
      if (coin.taken) return;
      const dx = state.player.x + state.player.width / 2 - coin.x;
      const dy = state.player.y + state.player.height / 2 - coin.y;
      if (Math.hypot(dx, dy) < state.player.width / 2 + coin.radius) {
        coin.taken = true;
        state.coins += 1;
        state.score += 40;
      }
    });

    state.monsters.forEach((monster) => {
      const overlap =
        state.player.x < monster.x + monster.width &&
        state.player.x + state.player.width > monster.x &&
        state.player.y < monster.y + monster.height &&
        state.player.y + state.player.height > monster.y;
      if (overlap) {
        state.gameOver = true;
      }
    });

    const followY = state.cameraOffset + state.height * 0.38;
    if (state.player.y < followY) {
      const shift = followY - state.player.y;
      state.player.y = followY;
      state.cameraOffset -= shift;
      state.heightValue = Math.max(state.heightValue, Math.floor(Math.abs(state.cameraOffset) / 10));
      state.score += Math.max(1, Math.floor(shift / 8));
    }

    if (state.player.y - state.cameraOffset > state.height + 70) {
      state.gameOver = true;
    }

    ensureContent();
    syncHud();
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#111a44");
    gradient.addColorStop(0.6, "#1b2757");
    gradient.addColorStop(1, "#0b1227");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.fillStyle = "rgba(255,255,255,0.08)";
    state.clouds.forEach((cloud) => {
      ctx.fillRect(cloud.x, cloud.y, cloud.width, 14);
      ctx.fillRect(cloud.x + 10, cloud.y - 10, cloud.width * 0.6, 12);
    });

    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(state.width - 56, 52, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  function toScreenY(worldY) {
    return worldY - state.cameraOffset;
  }

  function drawPlatforms() {
    state.platforms.forEach((platform) => {
      const y = toScreenY(platform.y);
      if (y < -30 || y > state.height + 30) return;
      ctx.fillStyle = platform.moving ? "#71e3ff" : "#87ff65";
      ctx.fillRect(platform.x, y, platform.width, platform.height);
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.fillRect(platform.x, y + platform.height - 3, platform.width, 3);
    });
  }

  function drawCoins() {
    state.coinsOnMap.forEach((coin) => {
      if (coin.taken) return;
      const y = toScreenY(coin.y);
      if (y < -20 || y > state.height + 20) return;
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(coin.x, y, coin.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.stroke();
    });
  }

  function drawMonsters() {
    state.monsters.forEach((monster) => {
      const y = toScreenY(monster.y);
      if (y < -30 || y > state.height + 30) return;
      ctx.fillStyle = "#ff5fb2";
      ctx.fillRect(monster.x, y, monster.width, monster.height);
      ctx.fillStyle = "#f7f5ff";
      ctx.fillRect(monster.x + 4, y + 4, 4, 4);
      ctx.fillRect(monster.x + monster.width - 8, y + 4, 4, 4);
    });
  }

  function drawPlayer() {
    const y = toScreenY(state.player.y);
    ctx.fillStyle = "#9be564";
    ctx.fillRect(state.player.x + 6, y + 2, 16, 18);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(state.player.x + 8, y - 4, 12, 10);
    ctx.fillStyle = "#101221";
    ctx.fillRect(state.player.x + (state.player.facing > 0 ? 15 : 9), y - 1, 3, 3);
    ctx.fillStyle = "#ff9b54";
    ctx.fillRect(state.player.x + 3, y + 18, 8, 10);
    ctx.fillRect(state.player.x + 17, y + 18, 8, 10);
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
    ctx.fillText(state.gameOver ? "Restart für einen neuen Run" : "Weiter mit Pause", state.width / 2, state.height / 2 + 20);
  }

  function draw() {
    drawBackground();
    drawPlatforms();
    drawCoins();
    drawMonsters();
    drawPlayer();
    drawOverlay();
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.032);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  function setInput(key, pressed) {
    if (key === "left") state.input.left = pressed;
    if (key === "right") state.input.right = pressed;
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") setInput("left", true);
    if (key === "d" || key === "arrowright") setInput("right", true);
    if (key === "p") togglePause();
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") setInput("left", false);
    if (key === "d" || key === "arrowright") setInput("right", false);
  });

  controlButtons.forEach((button) => {
    const move = button.dataset.move;
    if (move === "pause") {
      button.addEventListener("click", togglePause);
      return;
    }
    if (move === "jump") return;
    const start = () => setInput(move, true);
    const stop = () => setInput(move, false);
    button.addEventListener("mousedown", start);
    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("touchstart", start, { passive: true });
    button.addEventListener("touchend", stop);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);

  resetGame();
  requestAnimationFrame(frame);
}

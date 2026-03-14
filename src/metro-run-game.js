const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const coinsElement = document.querySelector("#coins");
  const speedElement = document.querySelector("#speed");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const lanes = [180, 320, 460];
  const state = {
    score: 0,
    coins: 0,
    paused: false,
    gameOver: false,
    speed: 240,
    playerLane: 1,
    moveLane: 1,
    playerY: 330,
    jumpVelocity: 0,
    sliding: 0,
    obstacles: [],
    coinsOnTrack: [],
    laneLines: [],
    spawnTimer: 0,
    coinTimer: 0,
    lastTime: 0,
  };

  function restartGame() {
    state.score = 0;
    state.coins = 0;
    state.paused = false;
    state.gameOver = false;
    state.speed = 240;
    state.playerLane = 1;
    state.moveLane = 1;
    state.playerY = 330;
    state.jumpVelocity = 0;
    state.sliding = 0;
    state.obstacles = [];
    state.coinsOnTrack = [];
    state.spawnTimer = 0;
    state.coinTimer = 0;
    scoreElement.textContent = "0";
    coinsElement.textContent = "0";
    speedElement.textContent = "1x";
    pauseButton.textContent = "Pause";
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function jump() {
    if (state.gameOver || state.paused || state.jumpVelocity !== 0) return;
    state.jumpVelocity = -520;
  }

  function slide() {
    if (state.gameOver || state.paused) return;
    state.sliding = 0.75;
  }

  function shift(direction) {
    if (state.gameOver || state.paused) return;
    state.moveLane = Math.max(0, Math.min(2, state.moveLane + direction));
  }

  function spawnObstacle() {
    const lane = Math.floor(Math.random() * 3);
    const roll = Math.random();
    const type = roll < 0.4 ? "barrier" : roll < 0.72 ? "train" : "duck";
    state.obstacles.push({
      lane,
      y: -120,
      type,
      width: type === "train" ? 88 : 72,
      height: type === "duck" ? 48 : type === "train" ? 128 : 82,
    });
  }

  function spawnCoinLine() {
    const lane = Math.floor(Math.random() * 3);
    for (let i = 0; i < 5; i += 1) {
      state.coinsOnTrack.push({ lane, y: -i * 58 - 40, collected: false });
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.speed += delta * 4;
    state.score += Math.round(delta * 24 + state.speed * 0.02);
    scoreElement.textContent = String(state.score);
    speedElement.textContent = `${(state.speed / 240).toFixed(1)}x`;

    state.playerLane += (state.moveLane - state.playerLane) * Math.min(1, delta * 10);
    state.playerY += state.jumpVelocity * delta;
    state.jumpVelocity += 1080 * delta;
    if (state.playerY > 330) {
      state.playerY = 330;
      state.jumpVelocity = 0;
    }
    state.sliding = Math.max(0, state.sliding - delta);

    state.spawnTimer += delta;
    if (state.spawnTimer > Math.max(0.55, 1.15 - state.speed / 900)) {
      state.spawnTimer = 0;
      spawnObstacle();
    }

    state.coinTimer += delta;
    if (state.coinTimer > 1.7) {
      state.coinTimer = 0;
      spawnCoinLine();
    }

    state.obstacles.forEach((obstacle) => {
      obstacle.y += state.speed * delta;
    });
    state.coinsOnTrack.forEach((coin) => {
      coin.y += state.speed * delta;
    });
    state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < canvas.height + 160);
    state.coinsOnTrack = state.coinsOnTrack.filter((coin) => coin.y < canvas.height + 40 && !coin.collected);

    const playerX = lanes[0] + (lanes[2] - lanes[0]) * (state.playerLane / 2);
    const playerHeight = state.sliding > 0 ? 54 : 92;
    const playerTop = state.playerY - playerHeight;
    const playerBox = { x: playerX - 34, y: playerTop, width: 68, height: playerHeight };

    state.obstacles.forEach((obstacle) => {
      const obstacleX = lanes[obstacle.lane] - obstacle.width / 2;
      const obstacleTop = obstacle.type === "duck" ? 290 : obstacle.type === "train" ? 200 : 246;
      const hit = playerBox.x < obstacleX + obstacle.width && playerBox.x + playerBox.width > obstacleX && playerBox.y < obstacle.y + obstacle.height + obstacleTop && playerBox.y + playerBox.height > obstacle.y + obstacleTop;
      if (hit) {
        const safeJump = obstacle.type !== "duck" && state.playerY < 250;
        const safeSlide = obstacle.type === "duck" && state.sliding > 0.05;
        if (!safeJump && !safeSlide) {
          state.gameOver = true;
        }
      }
    });

    state.coinsOnTrack.forEach((coin) => {
      const coinX = lanes[coin.lane];
      const dx = playerX - coinX;
      const dy = (playerTop + playerHeight / 2) - coin.y;
      if (Math.hypot(dx, dy) < 36) {
        coin.collected = true;
        state.coins += 1;
        state.score += 35;
        coinsElement.textContent = String(state.coins);
        scoreElement.textContent = String(state.score);
      }
    });
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#091122");
    gradient.addColorStop(1, "#211228");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < 14; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? "rgba(113,227,255,0.06)" : "rgba(255,95,178,0.05)";
      ctx.fillRect(i * 48, 50 + (i % 3) * 20, 28, 110);
    }
    ctx.fillStyle = "#0a0d17";
    ctx.beginPath();
    ctx.moveTo(120, 420);
    ctx.lineTo(260, 80);
    ctx.lineTo(380, 80);
    ctx.lineTo(520, 420);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 3;
    [220, 320, 420].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 78);
      ctx.lineTo(x, 420);
      ctx.stroke();
    });
  }

  function drawTrack() {
    lanes.forEach((laneX, index) => {
      const width = index === 1 ? 122 : 116;
      ctx.fillStyle = index === 1 ? "rgba(113,227,255,0.08)" : "rgba(255,255,255,0.04)";
      ctx.fillRect(laneX - width / 2, 80, width, 340);
    });
  }

  function drawPlayer() {
    const x = lanes[0] + (lanes[2] - lanes[0]) * (state.playerLane / 2);
    const bodyHeight = state.sliding > 0 ? 34 : 64;
    const bodyY = state.playerY - bodyHeight;
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(x, bodyY - 18, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#71e3ff";
    ctx.fillRect(x - 16, bodyY, 32, bodyHeight);
    ctx.fillStyle = "#ff5fb2";
    ctx.fillRect(x - 24, bodyY + bodyHeight - 6, 48, 6);
  }

  function drawObstacles() {
    state.obstacles.forEach((obstacle) => {
      const x = lanes[obstacle.lane];
      const top = obstacle.type === "duck" ? 290 : obstacle.type === "train" ? 200 : 246;
      if (obstacle.type === "train") {
        ctx.fillStyle = "#ff5fb2";
        ctx.fillRect(x - 44, obstacle.y + top, 88, 128);
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(x - 28, obstacle.y + top + 22, 56, 26);
      } else if (obstacle.type === "barrier") {
        ctx.fillStyle = "#ff9b54";
        ctx.fillRect(x - 36, obstacle.y + top, 72, 82);
        ctx.fillStyle = "#101221";
        ctx.fillRect(x - 24, obstacle.y + top + 16, 48, 14);
      } else {
        ctx.fillStyle = "#87ff65";
        ctx.fillRect(x - 42, obstacle.y + top, 84, 48);
      }
    });
  }

  function drawCoins() {
    state.coinsOnTrack.forEach((coin) => {
      ctx.fillStyle = "#ffd166";
      ctx.beginPath();
      ctx.arc(lanes[coin.lane], coin.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.28)";
      ctx.stroke();
    });
  }

  function drawOverlay() {
    if (!state.gameOver && !state.paused) return;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "28px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(state.gameOver ? "Run Over" : "Paused", canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(state.gameOver ? "Press Restart for another chase" : "Press pause again to resume", canvas.width / 2, canvas.height / 2 + 20);
  }

  function draw() {
    drawBackground();
    drawTrack();
    drawCoins();
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
    if (key === "a" || key === "arrowleft") shift(-1);
    if (key === "d" || key === "arrowright") shift(1);
    if (key === "w" || key === "arrowup" || key === " ") { event.preventDefault(); jump(); }
    if (key === "s" || key === "arrowdown") slide();
    if (key === "p") togglePause();
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "left") shift(-1);
      if (action === "right") shift(1);
      if (action === "jump") jump();
      if (action === "slide") slide();
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

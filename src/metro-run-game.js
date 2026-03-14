const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const coinsElement = document.querySelector('#coins');
  const speedElement = document.querySelector('#speed');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const state = {
    score: 0,
    coins: 0,
    paused: false,
    gameOver: false,
    speed: 0.28,
    playerLane: 0,
    targetLane: 0,
    jumpTimer: 0,
    slideTimer: 0,
    stride: 0,
    safeTimer: 3,
    obstacles: [],
    coinsOnTrack: [],
    spawnTimer: 0,
    coinTimer: 0,
    lastSpawnLane: null,
    lastTime: 0,
  };

  function restartGame() {
    state.score = 0;
    state.coins = 0;
    state.paused = false;
    state.gameOver = false;
    state.speed = 0.28;
    state.playerLane = 0;
    state.targetLane = 0;
    state.jumpTimer = 0;
    state.slideTimer = 0;
    state.stride = 0;
    state.safeTimer = 3;
    state.obstacles = [];
    state.coinsOnTrack = [];
    state.spawnTimer = 0;
    state.coinTimer = 0;
    state.lastSpawnLane = null;
    scoreElement.textContent = '0';
    coinsElement.textContent = '0';
    speedElement.textContent = '1.0x';
    pauseButton.textContent = 'Pause';
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function shift(direction) {
    if (state.paused || state.gameOver) return;
    state.targetLane = Math.max(-1, Math.min(1, state.targetLane + direction));
  }

  function jump() {
    if (state.paused || state.gameOver || state.jumpTimer > 0.01) return;
    state.jumpTimer = 0.72;
  }

  function slide() {
    if (state.paused || state.gameOver) return;
    state.slideTimer = 0.62;
  }

  function laneCenterAt(depth, lane) {
    const horizonY = 92;
    const bottomY = canvas.height - 38;
    const t = 1 - depth;
    const y = horizonY + t * t * (bottomY - horizonY);
    const boardWidth = 64 + t * 320;
    const x = canvas.width / 2 + lane * boardWidth * 0.28;
    return { x, y, scale: 0.28 + t * 1.22 };
  }

  function spawnObstacle() {
    const forbiddenLane = state.safeTimer > 0 ? state.targetLane : null;
    const lanePool = [-1, 0, 1].filter((lane) => lane !== forbiddenLane && lane !== state.lastSpawnLane);
    const fallbackPool = [-1, 0, 1].filter((lane) => lane !== forbiddenLane);
    const source = lanePool.length ? lanePool : fallbackPool;
    const lane = source[Math.floor(Math.random() * source.length)];
    const roll = Math.random();
    const type = roll < 0.4 ? 'crate' : roll < 0.7 ? 'arch' : 'cart';
    state.obstacles.push({ lane, depth: 1.2, type });
    state.lastSpawnLane = lane;
  }

  function spawnCoinLine() {
    const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
    for (let i = 0; i < 5; i += 1) {
      state.coinsOnTrack.push({ lane, depth: 1.1 + i * 0.11, collected: false });
    }
  }

  function jumpHeight() {
    if (state.jumpTimer <= 0) return 0;
    const progress = 1 - state.jumpTimer / 0.72;
    return Math.sin(progress * Math.PI) * 92;
  }

  function isSliding() {
    return state.slideTimer > 0.01;
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.safeTimer = Math.max(0, state.safeTimer - delta);
    state.speed = Math.min(0.42, state.speed + delta * 0.006);
    state.score += Math.round(14 + state.speed * 26);
    scoreElement.textContent = String(state.score);
    speedElement.textContent = `${(state.speed / 0.28).toFixed(1)}x`;

    state.playerLane += (state.targetLane - state.playerLane) * Math.min(1, delta * 16);
    state.jumpTimer = Math.max(0, state.jumpTimer - delta);
    state.slideTimer = Math.max(0, state.slideTimer - delta);
    state.stride += delta * (6 + state.speed * 7);

    state.spawnTimer += delta;
    if (state.spawnTimer > Math.max(1.45, 2.8 - state.speed * 1.8)) {
      state.spawnTimer = 0;
      spawnObstacle();
    }

    state.coinTimer += delta;
    if (state.coinTimer > 1.7) {
      state.coinTimer = 0;
      spawnCoinLine();
    }

    state.obstacles.forEach((obstacle) => {
      obstacle.depth -= state.speed * 0.18 * delta;
    });
    state.coinsOnTrack.forEach((coin) => {
      coin.depth -= (state.speed + 0.03) * 0.18 * delta;
    });
    state.obstacles = state.obstacles.filter((obstacle) => obstacle.depth > -0.08);
    state.coinsOnTrack = state.coinsOnTrack.filter((coin) => coin.depth > 0 && !coin.collected);

    const jump = jumpHeight();
    const sliding = isSliding();

    state.obstacles.forEach((obstacle) => {
      if (obstacle.depth > 0.82 && obstacle.depth < 0.87 && Math.abs(obstacle.lane - state.playerLane) < 0.2) {
        const safeJump = (obstacle.type === 'crate' || obstacle.type === 'cart') && jump > 48;
        const safeSlide = obstacle.type === 'arch' && sliding;
        if (!safeJump && !safeSlide && state.safeTimer <= 0) {
          state.gameOver = true;
        }
      }
    });

    state.coinsOnTrack.forEach((coin) => {
      if (coin.depth > 0.8 && coin.depth < 0.9 && Math.abs(coin.lane - state.playerLane) < 0.28) {
        coin.collected = true;
        state.coins += 1;
        state.score += 40;
        coinsElement.textContent = String(state.coins);
        scoreElement.textContent = String(state.score);
      }
    });
  }

  function drawScene() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#091122');
    sky.addColorStop(0.55, '#1c1332');
    sky.addColorStop(1, '#04050a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 14; i += 1) {
      const x = 16 + i * 44;
      const height = 90 + (i % 5) * 24;
      ctx.fillStyle = i % 2 ? 'rgba(255,95,178,0.12)' : 'rgba(113,227,255,0.12)';
      ctx.fillRect(x, 120 - height * 0.28, 26, height);
    }

    ctx.fillStyle = '#0d1220';
    ctx.beginPath();
    ctx.moveTo(226, 92);
    ctx.lineTo(414, 92);
    ctx.lineTo(canvas.width - 30, canvas.height);
    ctx.lineTo(30, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i += 1) {
      const depth = i / 15;
      const near = laneCenterAt(depth, 0);
      const width = 64 + (1 - depth) * 320;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - width / 2, near.y);
      ctx.lineTo(canvas.width / 2 + width / 2, near.y);
      ctx.stroke();
    }
    [-1, 0, 1].forEach((lane) => {
      ctx.beginPath();
      const top = laneCenterAt(1, lane);
      const bottom = laneCenterAt(0, lane);
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    });
  }

  function drawObstacle(obstacle) {
    const { x, y, scale } = laneCenterAt(obstacle.depth, obstacle.lane);
    if (obstacle.type === 'crate') {
      ctx.fillStyle = '#ff9b54';
      ctx.fillRect(x - 26 * scale, y - 38 * scale, 52 * scale, 38 * scale);
      ctx.strokeStyle = '#101221';
      ctx.strokeRect(x - 26 * scale, y - 38 * scale, 52 * scale, 38 * scale);
    } else if (obstacle.type === 'arch') {
      ctx.fillStyle = '#87ff65';
      ctx.fillRect(x - 30 * scale, y - 64 * scale, 12 * scale, 64 * scale);
      ctx.fillRect(x + 18 * scale, y - 64 * scale, 12 * scale, 64 * scale);
      ctx.fillRect(x - 30 * scale, y - 64 * scale, 60 * scale, 14 * scale);
    } else {
      ctx.fillStyle = '#ff5fb2';
      ctx.fillRect(x - 30 * scale, y - 54 * scale, 60 * scale, 54 * scale);
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(x - 18 * scale, y - 40 * scale, 36 * scale, 18 * scale);
    }
  }

  function drawCoins() {
    state.coinsOnTrack.forEach((coin) => {
      const { x, y, scale } = laneCenterAt(coin.depth, coin.lane);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x, y - 22 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.stroke();
    });
  }

  function drawPlayer() {
    const lane = laneCenterAt(0.08, state.playerLane);
    const jump = jumpHeight();
    const sliding = isSliding();
    const bob = Math.sin(state.stride) * (sliding ? 2 : 5);
    const baseY = lane.y - jump + bob;

    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(lane.x, baseY - (sliding ? 56 : 70), 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#71e3ff';
    ctx.fillRect(lane.x - 18, baseY - (sliding ? 46 : 56), 36, sliding ? 24 : 56);

    ctx.fillStyle = '#ff5fb2';
    if (sliding) {
      ctx.fillRect(lane.x - 34, baseY - 18, 68, 12);
    } else {
      ctx.fillRect(lane.x - 24, baseY - 2, 16, 10);
      ctx.fillRect(lane.x + 8, baseY - 2, 16, 10);
    }
  }

  function drawOverlay() {
    if (!state.paused && !state.gameOver) return;
    ctx.fillStyle = 'rgba(0,0,0,0.52)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f7f5ff';
    ctx.font = "28px 'Courier New'";
    ctx.textAlign = 'center';
    ctx.fillText(state.gameOver ? 'Run Over' : 'Paused', canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(state.gameOver ? 'Restart for another board run' : 'Press pause again to resume', canvas.width / 2, canvas.height / 2 + 18);
  }

  function draw() {
    drawScene();
    drawCoins();
    [...state.obstacles].sort((a, b) => b.depth - a.depth).forEach(drawObstacle);
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

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') shift(-1);
    if (key === 'd' || key === 'arrowright') shift(1);
    if (key === 'w' || key === 'arrowup' || key === ' ') { event.preventDefault(); jump(); }
    if (key === 's' || key === 'arrowdown') slide();
    if (key === 'p') togglePause();
  });

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'left') shift(-1);
      if (action === 'right') shift(1);
      if (action === 'jump') jump();
      if (action === 'slide') slide();
    });
  });

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

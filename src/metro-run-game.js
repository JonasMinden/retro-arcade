const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const coinsElement = document.querySelector('#coins');
  const speedElement = document.querySelector('#speed');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const LANES = [-1, 0, 1];
  const PATTERN_SPACING = 9.5;
  const PLAYER_DISTANCE = 1.05;
  const START_GRACE = 2.6;
  const JUMP_DURATION = 0.78;
  const SLIDE_DURATION = 0.74;

  const state = {
    score: 0,
    coins: 0,
    paused: false,
    gameOver: false,
    speed: 8.4,
    lane: 0,
    targetLane: 0,
    jumpTimer: 0,
    slideTimer: 0,
    stride: 0,
    graceTimer: START_GRACE,
    distanceUntilNextPattern: 12,
    obstacles: [],
    coinsOnTrack: [],
    lastTime: 0,
  };
  window.__retroArcadeGameState = state;

  function laneCenterAt(distance, lane) {
    const maxDistance = 34;
    const normalized = Math.max(0, Math.min(1, 1 - distance / maxDistance));
    const horizonY = 84;
    const floorY = canvas.height - 22;
    const y = horizonY + normalized * normalized * (floorY - horizonY);
    const trackWidth = 78 + normalized * 354;
    const x = canvas.width / 2 + lane * trackWidth * 0.24;
    return { x, y, scale: 0.22 + normalized * 1.12, normalized };
  }

  function restartGame() {
    state.score = 0;
    state.coins = 0;
    state.paused = false;
    state.gameOver = false;
    state.speed = 8.4;
    state.lane = 0;
    state.targetLane = 0;
    state.jumpTimer = 0;
    state.slideTimer = 0;
    state.stride = 0;
    state.graceTimer = START_GRACE;
    state.distanceUntilNextPattern = 12;
    state.obstacles = [];
    state.coinsOnTrack = [];
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
    if (state.paused || state.gameOver || state.jumpTimer > 0.01 || state.slideTimer > 0.08) return;
    state.jumpTimer = JUMP_DURATION;
  }

  function slide() {
    if (state.paused || state.gameOver || state.slideTimer > 0.01 || state.jumpTimer > 0.12) return;
    state.slideTimer = SLIDE_DURATION;
  }

  function jumpHeight() {
    if (state.jumpTimer <= 0) return 0;
    const progress = 1 - state.jumpTimer / JUMP_DURATION;
    return Math.sin(progress * Math.PI) * 96;
  }

  function isSliding() {
    return state.slideTimer > 0.01;
  }

  function pushObstacle(lane, distance, type) {
    state.obstacles.push({ lane, distance, type, hit: false });
  }

  function pushCoinTrail(lane, startDistance, count = 5, step = 1.15) {
    for (let i = 0; i < count; i += 1) {
      state.coinsOnTrack.push({ lane, distance: startDistance + i * step, collected: false });
    }
  }

  function spawnPattern() {
    const patternStart = 32 + Math.random() * 2.5;
    const roll = Math.random();

    if (roll < 0.26) {
      const lane = LANES[Math.floor(Math.random() * LANES.length)];
      pushObstacle(lane, patternStart, 'barrier');
      pushCoinTrail(lane, patternStart + 2.4, 4, 0.95);
      return;
    }

    if (roll < 0.52) {
      const lane = LANES[Math.floor(Math.random() * LANES.length)];
      pushObstacle(lane, patternStart, 'gate');
      pushCoinTrail(lane, patternStart + 2.2, 4, 1);
      return;
    }

    if (roll < 0.8) {
      const safeLane = LANES[Math.floor(Math.random() * LANES.length)];
      LANES.filter((lane) => lane !== safeLane).forEach((lane) => {
        pushObstacle(lane, patternStart, Math.random() < 0.5 ? 'train' : 'barrier');
      });
      pushCoinTrail(safeLane, patternStart + 0.6, 6, 0.92);
      return;
    }

    const safeLane = LANES[Math.floor(Math.random() * LANES.length)];
    const blockedLane = LANES.filter((lane) => lane !== safeLane);
    pushObstacle(blockedLane[0], patternStart, 'gate');
    pushObstacle(blockedLane[1], patternStart + 1.1, 'barrier');
    pushCoinTrail(safeLane, patternStart + 0.8, 5, 0.9);
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.graceTimer = Math.max(0, state.graceTimer - delta);
    state.speed = Math.min(14.5, state.speed + delta * 0.22);
    state.score += Math.round((18 + state.speed * 2.8) * delta * 10);
    scoreElement.textContent = String(state.score);
    speedElement.textContent = `${(state.speed / 8.4).toFixed(1)}x`;

    state.lane += (state.targetLane - state.lane) * Math.min(1, delta * 12);
    state.jumpTimer = Math.max(0, state.jumpTimer - delta);
    state.slideTimer = Math.max(0, state.slideTimer - delta);
    state.stride += delta * (6 + state.speed * 0.65);

    const travelled = state.speed * delta;
    state.distanceUntilNextPattern -= travelled;
    if (state.graceTimer <= 0 && state.distanceUntilNextPattern <= 0) {
      spawnPattern();
      state.distanceUntilNextPattern = PATTERN_SPACING + Math.random() * 3.2 - Math.min(2.2, (state.speed - 8.4) * 0.22);
    }

    state.obstacles.forEach((obstacle) => {
      obstacle.distance -= travelled;
    });
    state.coinsOnTrack.forEach((coin) => {
      coin.distance -= travelled;
    });
    state.obstacles = state.obstacles.filter((obstacle) => obstacle.distance > -2);
    state.coinsOnTrack = state.coinsOnTrack.filter((coin) => coin.distance > -1.5 && !coin.collected);

    const jump = jumpHeight();
    const sliding = isSliding();

    state.obstacles.forEach((obstacle) => {
      if (obstacle.hit) return;
      if (Math.abs(obstacle.lane - state.lane) > 0.28) return;
      if (obstacle.distance > PLAYER_DISTANCE + 0.8 || obstacle.distance < PLAYER_DISTANCE - 0.45) return;

      const safeJump = obstacle.type === 'barrier' && jump > 52;
      const safeSlide = obstacle.type === 'gate' && sliding;
      const safeLaneSwitch = obstacle.type === 'train' ? false : false;
      if (!safeJump && !safeSlide && !safeLaneSwitch && state.graceTimer <= 0) {
        obstacle.hit = true;
        state.gameOver = true;
      }
    });

    state.coinsOnTrack.forEach((coin) => {
      if (coin.collected) return;
      if (Math.abs(coin.lane - state.lane) > 0.34) return;
      if (coin.distance > PLAYER_DISTANCE + 0.75 || coin.distance < PLAYER_DISTANCE - 0.5) return;
      coin.collected = true;
      state.coins += 1;
      state.score += 45;
      coinsElement.textContent = String(state.coins);
      scoreElement.textContent = String(state.score);
    });
  }

  function drawBackdrop() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#08101f');
    sky.addColorStop(0.5, '#1b1633');
    sky.addColorStop(1, '#03040a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 13; i += 1) {
      const x = 12 + i * 48;
      const height = 90 + (i % 4) * 34;
      ctx.fillStyle = i % 2 ? 'rgba(113,227,255,0.1)' : 'rgba(255,95,178,0.1)';
      ctx.fillRect(x, 126 - height * 0.3, 26 + (i % 3) * 8, height);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(x + 5, 130 - height * 0.22, 6, height * 0.28);
    }

    ctx.fillStyle = '#0f1424';
    ctx.beginPath();
    ctx.moveTo(232, 84);
    ctx.lineTo(408, 84);
    ctx.lineTo(canvas.width - 22, canvas.height);
    ctx.lineTo(22, canvas.height);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i += 1) {
      const distance = i / 17 * 34;
      const lane = laneCenterAt(distance, 0);
      const width = 74 + lane.normalized * 356;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2 - width / 2, lane.y);
      ctx.lineTo(canvas.width / 2 + width / 2, lane.y);
      ctx.stroke();
    }

    [-1, 0, 1].forEach((lane) => {
      const top = laneCenterAt(34, lane);
      const bottom = laneCenterAt(0, lane);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.stroke();
    });
  }

  function drawObstacle(obstacle) {
    const { x, y, scale } = laneCenterAt(obstacle.distance, obstacle.lane);

    if (obstacle.type === 'barrier') {
      ctx.fillStyle = '#ff9b54';
      ctx.fillRect(x - 26 * scale, y - 24 * scale, 52 * scale, 24 * scale);
      ctx.fillStyle = '#101221';
      ctx.fillRect(x - 20 * scale, y - 17 * scale, 40 * scale, 6 * scale);
      return;
    }

    if (obstacle.type === 'gate') {
      ctx.fillStyle = '#87ff65';
      ctx.fillRect(x - 26 * scale, y - 56 * scale, 12 * scale, 56 * scale);
      ctx.fillRect(x + 14 * scale, y - 56 * scale, 12 * scale, 56 * scale);
      ctx.fillRect(x - 26 * scale, y - 56 * scale, 52 * scale, 10 * scale);
      return;
    }

    ctx.fillStyle = '#ff5fb2';
    ctx.fillRect(x - 34 * scale, y - 60 * scale, 68 * scale, 60 * scale);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x - 16 * scale, y - 46 * scale, 32 * scale, 16 * scale);
    ctx.fillStyle = '#101221';
    ctx.fillRect(x - 26 * scale, y - 14 * scale, 52 * scale, 10 * scale);
  }

  function drawCoins() {
    state.coinsOnTrack.forEach((coin) => {
      const { x, y, scale } = laneCenterAt(coin.distance, coin.lane);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.arc(x, y - 18 * scale, 8 * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.34)';
      ctx.stroke();
    });
  }

  function drawPlayer() {
    const lane = laneCenterAt(0.85, state.lane);
    const jump = jumpHeight();
    const sliding = isSliding();
    const baseY = lane.y - jump + Math.sin(state.stride) * (sliding ? 2 : 4);

    ctx.save();
    ctx.translate(lane.x, baseY);

    ctx.fillStyle = '#71e3ff';
    ctx.fillRect(-18, -48 + (sliding ? 18 : 0), 36, sliding ? 28 : 54);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(0, -58 + (sliding ? 18 : 0), 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#101221';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, -16 + (sliding ? 12 : 0));
    ctx.lineTo(-24, 12);
    ctx.moveTo(10, -16 + (sliding ? 12 : 0));
    ctx.lineTo(24, 12);
    ctx.moveTo(-8, 6 + (sliding ? 10 : 0));
    ctx.lineTo(-4, 36);
    ctx.moveTo(8, 6 + (sliding ? 10 : 0));
    ctx.lineTo(4, 36);
    ctx.stroke();

    ctx.fillStyle = '#ff5fb2';
    ctx.fillRect(-20, 34, 14, 8);
    ctx.fillRect(6, 34, 14, 8);
    ctx.restore();
  }

  function drawHudOverlay() {
    if (!(state.paused || state.gameOver)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f7f5ff';
    ctx.font = "28px 'Courier New'";
    ctx.textAlign = 'center';
    ctx.fillText(state.gameOver ? 'Crash!' : 'Pause', canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(state.gameOver ? 'Restart für den nächsten Run' : 'Pause erneut zum Fortsetzen', canvas.width / 2, canvas.height / 2 + 22);
  }

  function draw() {
    drawBackdrop();

    const sortedCoins = [...state.coinsOnTrack].sort((a, b) => b.distance - a.distance);
    const sortedObstacles = [...state.obstacles].sort((a, b) => b.distance - a.distance);
    sortedCoins.forEach(drawCoin);
    sortedObstacles.forEach(drawObstacle);
    drawPlayer();
    drawHudOverlay();
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
    if (key === 'w' || key === 'arrowup' || key === ' ') {
      event.preventDefault();
      jump();
    }
    if (key === 's' || key === 'arrowdown') slide();
    if (key === 'p') togglePause();
  });

  actionButtons.forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'left') shift(-1);
    if (action === 'right') shift(1);
    if (action === 'jump') jump();
    if (action === 'slide') slide();
    if (action === 'pause') togglePause();
  }));

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}


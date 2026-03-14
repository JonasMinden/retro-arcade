const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const rowsElement = document.querySelector("#rows");
  const statusElement = document.querySelector("#status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-move]"));

  const grid = { cols: 7, rows: 10, cell: 56 };
  const startLocalRow = 8;
  const scrollAnchor = 4;
  const rowCache = new Map();
  const state = {
    score: 0,
    bestProgress: 0,
    paused: false,
    gameOver: false,
    lastTime: 0,
    scroll: 0,
    player: { x: 3, y: startLocalRow },
  };
  window.__retroArcadeGameState = state;

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function makeGrassRow(index) {
    const shrubCount = index < 2 ? 0 : Math.random() < 0.5 ? 1 : 2;
    return {
      index,
      type: "grass",
      shrubs: Array.from({ length: shrubCount }, () => Math.floor(Math.random() * grid.cols)),
    };
  }

  function makeRoadRow(index) {
    const speed = (Math.random() < 0.5 ? -1 : 1) * random(1.1, 1.9);
    const cars = Array.from({ length: Math.random() < 0.5 ? 2 : 3 }, (_, lane) => ({
      x: Math.random() * (grid.cols + 2) - 1,
      length: Math.random() < 0.55 ? 1.4 : 2.2,
      color: lane % 2 ? "#ff5fb2" : "#ffd166",
    }));
    return { index, type: "road", speed, cars };
  }

  function makeWaterRow(index) {
    const speed = (Math.random() < 0.5 ? -1 : 1) * random(0.45, 0.85);
    const logs = Array.from({ length: 3 + Math.floor(Math.random() * 2) }, () => ({
      x: Math.random() * (grid.cols + 3) - 1.5,
      length: 2 + Math.random() * 1.2,
    }));
    return { index, type: "water", speed, logs };
  }

  function makeRow(index) {
    if (index <= 2) return makeGrassRow(index);
    if (index <= 7) return Math.random() < 0.65 ? makeRoadRow(index) : makeGrassRow(index);
    if (index <= 13) return randomChoice([makeGrassRow(index), makeRoadRow(index), makeRoadRow(index)]);
    return randomChoice([makeGrassRow(index), makeRoadRow(index), makeRoadRow(index), makeWaterRow(index)]);
  }

  function getRow(index) {
    if (index <= 0) return makeGrassRow(0);
    if (!rowCache.has(index)) {
      rowCache.set(index, makeRow(index));
    }
    return rowCache.get(index);
  }

  function visibleAbsoluteRow(localY) {
    return Math.max(0, state.scroll + (startLocalRow - localY));
  }

  function currentProgress() {
    return Math.max(0, state.scroll + (startLocalRow - state.player.y));
  }

  function syncHud() {
    scoreElement.textContent = String(state.score);
    rowsElement.textContent = String(state.bestProgress);
  }

  function resetGame() {
    rowCache.clear();
    state.score = 0;
    state.bestProgress = 0;
    state.paused = false;
    state.gameOver = false;
    state.lastTime = 0;
    state.scroll = 0;
    state.player = { x: 3, y: startLocalRow };
    pauseButton.textContent = "Pause";
    statusElement.textContent = "Ready";
    syncHud();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Weiter" : "Pause";
    statusElement.textContent = state.paused ? "Pause" : "Hop";
  }

  function updateVisibleRows(delta) {
    const seen = new Set();
    for (let localY = 0; localY < grid.rows; localY += 1) {
      const row = getRow(visibleAbsoluteRow(localY));
      if (seen.has(row.index)) continue;
      seen.add(row.index);

      if (row.type === "road") {
        row.cars.forEach((car) => {
          car.x += row.speed * delta;
          if (row.speed > 0 && car.x > grid.cols + 1.5) car.x = -car.length - Math.random() * 2;
          if (row.speed < 0 && car.x + car.length < -1.5) car.x = grid.cols + Math.random() * 2;
        });
      }

      if (row.type === "water") {
        row.logs.forEach((log) => {
          log.x += row.speed * delta;
          if (row.speed > 0 && log.x > grid.cols + 1.5) log.x = -log.length - Math.random() * 2;
          if (row.speed < 0 && log.x + log.length < -1.5) log.x = grid.cols + Math.random() * 2;
        });
      }
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    updateVisibleRows(delta);

    const playerRow = getRow(visibleAbsoluteRow(state.player.y));
    if (playerRow.type === "road") {
      const hit = playerRow.cars.some((car) => state.player.x + 0.22 < car.x + car.length && state.player.x + 0.78 > car.x);
      if (hit) {
        state.gameOver = true;
        statusElement.textContent = "Crash";
      }
    }

    if (playerRow.type === "water") {
      const log = playerRow.logs.find((item) => state.player.x + 0.22 < item.x + item.length && state.player.x + 0.78 > item.x);
      if (!log) {
        state.gameOver = true;
        statusElement.textContent = "Splash";
      } else {
        state.player.x += playerRow.speed * delta * 0.85;
        if (state.player.x < -0.15 || state.player.x > grid.cols - 0.85) {
          state.gameOver = true;
          statusElement.textContent = "Splash";
        }
      }
    }
  }

  function awardProgress() {
    const progress = currentProgress();
    if (progress > state.bestProgress) {
      state.bestProgress = progress;
      state.score = progress * 25;
    }
    syncHud();
  }

  function movePlayer(dx, dy) {
    if (state.paused || state.gameOver) return;

    const nextX = Math.max(0, Math.min(grid.cols - 1, Math.round(state.player.x + dx)));
    let nextY = Math.max(0, Math.min(grid.rows - 1, state.player.y + dy));

    if (dy < 0 && state.player.y <= scrollAnchor) {
      state.scroll += 1;
      nextY = scrollAnchor;
    }

    const targetRow = getRow(visibleAbsoluteRow(nextY));
    if (targetRow.type === "grass" && targetRow.shrubs?.includes(nextX)) {
      return;
    }

    state.player.x = nextX;
    state.player.y = nextY;
    statusElement.textContent = "Hop";
    awardProgress();
  }

  function drawGrass(row, y) {
    ctx.fillStyle = row.index % 2 ? "#2d693f" : "#36734a";
    ctx.fillRect(0, y, canvas.width, grid.cell);
    ctx.fillStyle = "#1b4d30";
    (row.shrubs || []).forEach((shrub) => {
      ctx.fillRect(shrub * grid.cell + 18, y + 16, 20, 20);
    });
  }

  function drawRoad(row, y) {
    ctx.fillStyle = "#2f333d";
    ctx.fillRect(0, y, canvas.width, grid.cell);
    ctx.fillStyle = "#f7f5ff";
    for (let x = 18; x < canvas.width; x += 74) ctx.fillRect(x, y + grid.cell / 2 - 2, 30, 4);
    row.cars.forEach((car) => {
      ctx.fillStyle = car.color;
      ctx.fillRect(car.x * grid.cell + 4, y + 10, car.length * grid.cell - 8, grid.cell - 20);
    });
  }

  function drawWater(row, y) {
    ctx.fillStyle = "#164866";
    ctx.fillRect(0, y, canvas.width, grid.cell);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let x = 0; x < canvas.width; x += 42) ctx.fillRect(x, y + 8, 22, 4);
    row.logs.forEach((log) => {
      ctx.fillStyle = "#8f6237";
      ctx.fillRect(log.x * grid.cell + 2, y + 14, log.length * grid.cell - 4, grid.cell - 28);
    });
  }

  function drawPlayer() {
    const x = state.player.x * grid.cell + 12;
    const y = state.player.y * grid.cell + 12;
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(x + 10, y, 22, 18);
    ctx.fillStyle = "#9be564";
    ctx.fillRect(x + 6, y + 16, 30, 18);
    ctx.fillStyle = "#101221";
    ctx.fillRect(x + 14, y + 6, 4, 4);
    ctx.fillRect(x + 24, y + 6, 4, 4);
    ctx.fillStyle = "#ff9b54";
    ctx.fillRect(x + 4, y + 32, 8, 8);
    ctx.fillRect(x + 30, y + 32, 8, 8);
  }

  function drawOverlay() {
    if (!state.paused && !state.gameOver) return;
    ctx.fillStyle = "rgba(4, 6, 12, 0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.textAlign = "center";
    ctx.font = "bold 26px 'Courier New'";
    ctx.fillText(state.gameOver ? statusElement.textContent : "Pause", canvas.width / 2, canvas.height / 2 - 12);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(state.gameOver ? "Restart für die nächste Runde" : "Pause zum Fortsetzen", canvas.width / 2, canvas.height / 2 + 20);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let localY = 0; localY < grid.rows; localY += 1) {
      const row = getRow(visibleAbsoluteRow(localY));
      const y = localY * grid.cell;
      if (row.type === "grass") drawGrass(row, y);
      if (row.type === "road") drawRoad(row, y);
      if (row.type === "water") drawWater(row, y);
    }
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
    if (key === "arrowup" || key === "w") movePlayer(0, -1);
    if (key === "arrowdown" || key === "s") movePlayer(0, 1);
    if (key === "arrowleft" || key === "a") movePlayer(-1, 0);
    if (key === "arrowright" || key === "d") movePlayer(1, 0);
    if (key === "p") togglePause();
  });

  controlButtons.forEach((button) => {
    const move = button.dataset.move;
    button.addEventListener("click", () => {
      if (move === "up") movePlayer(0, -1);
      if (move === "down") movePlayer(0, 1);
      if (move === "left") movePlayer(-1, 0);
      if (move === "right") movePlayer(1, 0);
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);

  resetGame();
  requestAnimationFrame(frame);
}


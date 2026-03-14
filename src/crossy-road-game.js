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
  const types = ["grass", "road", "water"];
  const state = {
    score: 0,
    rowsAdvanced: 0,
    paused: false,
    gameOver: false,
    lastTime: 0,
    baseRowIndex: 0,
    player: { x: 3, y: 8 },
    rows: [],
  };

  function randomChoice(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function makeRow(index) {
    const nearStart = index < 3;
    const type = nearStart ? "grass" : randomChoice(types);
    if (type === "road") {
      const speed = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 1.6);
      const length = Math.random() < 0.6 ? 2 : 1;
      const cars = [];
      for (let lane = 0; lane < 3; lane += 1) {
        cars.push({ x: Math.random() * grid.cols, length, color: lane % 2 ? "#ff5fb2" : "#ffd166" });
      }
      return { index, type, speed, cars };
    }
    if (type === "water") {
      const speed = (Math.random() < 0.5 ? -1 : 1) * (0.75 + Math.random() * 1.2);
      const logs = [];
      for (let lane = 0; lane < 2; lane += 1) {
        logs.push({ x: Math.random() * grid.cols, length: 2 + Math.floor(Math.random() * 2) });
      }
      return { index, type, speed, logs };
    }
    const shrubs = Array.from({ length: Math.random() < 0.4 ? 1 : 2 }, () => Math.floor(Math.random() * grid.cols));
    return { index, type, shrubs };
  }

  function syncHud() {
    scoreElement.textContent = String(state.score);
    rowsElement.textContent = String(state.rowsAdvanced);
  }

  function resetGame() {
    state.score = 0;
    state.rowsAdvanced = 0;
    state.paused = false;
    state.gameOver = false;
    state.lastTime = 0;
    state.baseRowIndex = 0;
    state.player = { x: 3, y: 8 };
    pauseButton.textContent = "Pause";
    statusElement.textContent = "Ready";
    state.rows = Array.from({ length: 22 }, (_, idx) => makeRow(idx));
    syncHud();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Weiter" : "Pause";
    statusElement.textContent = state.paused ? "Pause" : "Hop";
  }

  function visibleRowIndex(localY) {
    return state.baseRowIndex + localY;
  }

  function getRowByIndex(index) {
    while (state.rows.at(-1).index < index) {
      state.rows.push(makeRow(state.rows.at(-1).index + 1));
    }
    state.rows = state.rows.filter((row) => row.index >= state.baseRowIndex - 2);
    return state.rows.find((row) => row.index === index);
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.rows.forEach((row) => {
      if (row.type === "road") {
        row.cars.forEach((car) => {
          car.x += row.speed * delta;
          if (row.speed > 0 && car.x > grid.cols + 1) car.x = -car.length - Math.random() * 2;
          if (row.speed < 0 && car.x + car.length < -1) car.x = grid.cols + Math.random() * 2;
        });
      }
      if (row.type === "water") {
        row.logs.forEach((log) => {
          log.x += row.speed * delta;
          if (row.speed > 0 && log.x > grid.cols + 2) log.x = -log.length - Math.random() * 2;
          if (row.speed < 0 && log.x + log.length < -2) log.x = grid.cols + Math.random() * 2;
        });
      }
    });

    const row = getRowByIndex(visibleRowIndex(state.player.y));
    if (row.type === "road") {
      const hit = row.cars.some((car) => state.player.x + 0.2 < car.x + car.length && state.player.x + 0.8 > car.x);
      if (hit) {
        state.gameOver = true;
        statusElement.textContent = "Crash";
      }
    }
    if (row.type === "water") {
      const log = row.logs.find((item) => state.player.x + 0.2 < item.x + item.length && state.player.x + 0.8 > item.x);
      if (!log) {
        state.gameOver = true;
        statusElement.textContent = "Splash";
      } else {
        state.player.x += row.speed * delta;
        if (state.player.x < 0 || state.player.x > grid.cols - 1) {
          state.gameOver = true;
          statusElement.textContent = "Splash";
        }
      }
    }

    syncHud();
  }

  function movePlayer(dx, dy) {
    if (state.paused || state.gameOver) return;
    const targetX = Math.max(0, Math.min(grid.cols - 1, state.player.x + dx));
    const targetY = Math.max(0, Math.min(grid.rows - 1, state.player.y + dy));
    const targetRow = getRowByIndex(visibleRowIndex(targetY));
    if (targetRow.type === "grass" && targetRow.shrubs?.includes(targetX)) {
      return;
    }

    state.player.x = targetX;
    state.player.y = targetY;
    statusElement.textContent = "Hop";

    if (dy === -1 && targetY <= 3) {
      state.baseRowIndex += 1;
      state.player.y += 1;
      state.rowsAdvanced += 1;
      state.score += 25;
    } else if (dy === -1) {
      state.rowsAdvanced += 1;
      state.score += 25;
    } else if (dy === 1 && state.rowsAdvanced > 0) {
      state.rowsAdvanced = Math.max(0, state.rowsAdvanced - 1);
    }

    syncHud();
  }

  function drawRow(row, localY) {
    const y = localY * grid.cell;
    if (row.type === "grass") {
      ctx.fillStyle = localY % 2 ? "#2d693f" : "#36734a";
      ctx.fillRect(0, y, canvas.width, grid.cell);
      ctx.fillStyle = "#1b4d30";
      (row.shrubs || []).forEach((shrub) => {
        ctx.fillRect(shrub * grid.cell + 18, y + 16, 20, 20);
      });
      return;
    }
    if (row.type === "road") {
      ctx.fillStyle = "#2f333d";
      ctx.fillRect(0, y, canvas.width, grid.cell);
      ctx.fillStyle = "#f7f5ff";
      for (let x = 18; x < canvas.width; x += 74) ctx.fillRect(x, y + grid.cell / 2 - 2, 30, 4);
      row.cars.forEach((car) => {
        ctx.fillStyle = car.color;
        ctx.fillRect(car.x * grid.cell + 4, y + 10, car.length * grid.cell - 8, grid.cell - 20);
      });
      return;
    }
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
      drawRow(getRowByIndex(visibleRowIndex(localY)), localY);
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

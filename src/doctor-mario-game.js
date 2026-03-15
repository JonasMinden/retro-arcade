const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const virusesElement = document.querySelector("#viruses");
  const levelElement = document.querySelector("#level");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-move]"));

  const cols = 8;
  const rows = 16;
  const cellSize = canvas.width / cols;
  const colors = ["red", "blue", "yellow"];
  const palette = {
    red: "#ff5f6d",
    blue: "#71e3ff",
    yellow: "#ffd166",
  };

  const state = {
    board: [],
    piece: null,
    score: 0,
    viruses: 0,
    level: 1,
    paused: false,
    gameOver: false,
    dropTimer: 0,
    lastTime: 0,
  };
  window.__retroArcadeGameState = state;

  function syncHud() {
    scoreElement.textContent = String(state.score);
    virusesElement.textContent = String(state.viruses);
    levelElement.textContent = String(state.level);
  }

  function createBoard() {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  function randomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function createPiece() {
    return {
      a: { x: 3, y: 0, color: randomColor(), link: "A" },
      b: { x: 4, y: 0, color: randomColor(), link: "B" },
      orientation: "horizontal",
    };
  }

  function cells(piece = state.piece) {
    return [piece.a, piece.b];
  }

  function canPlace(testCells) {
    return testCells.every((cell) => {
      if (cell.x < 0 || cell.x >= cols || cell.y >= rows) return false;
      if (cell.y < 0) return true;
      return !state.board[cell.y][cell.x];
    });
  }

  function move(dx, dy) {
    if (state.paused || state.gameOver) return false;
    const next = cells().map((cell) => ({ ...cell, x: cell.x + dx, y: cell.y + dy }));
    if (!canPlace(next)) return false;
    state.piece.a.x += dx;
    state.piece.a.y += dy;
    state.piece.b.x += dx;
    state.piece.b.y += dy;
    return true;
  }

  function rotate() {
    if (state.paused || state.gameOver) return;
    const piece = state.piece;
    const pivot = piece.a;
    const nextB = { ...piece.b };
    if (piece.orientation === "horizontal") {
      nextB.x = pivot.x;
      nextB.y = pivot.y - 1;
      piece.orientation = "vertical";
    } else {
      nextB.x = pivot.x + 1;
      nextB.y = pivot.y;
      piece.orientation = "horizontal";
    }
    let test = [{ ...pivot }, nextB];
    if (!canPlace(test)) {
      test = test.map((cell) => ({ ...cell, x: cell.x - 1 }));
      if (canPlace(test)) {
        piece.a.x -= 1;
        nextB.x -= 1;
      } else {
        piece.orientation = piece.orientation === "horizontal" ? "vertical" : "horizontal";
        return;
      }
    }
    piece.b.x = nextB.x;
    piece.b.y = nextB.y;
  }

  function spawnViruses() {
    state.board = createBoard();
    state.viruses = 6 + state.level * 2;
    let placed = 0;
    while (placed < state.viruses) {
      const x = Math.floor(Math.random() * cols);
      const y = 6 + Math.floor(Math.random() * (rows - 6));
      if (state.board[y][x]) continue;
      state.board[y][x] = { color: randomColor(), type: "virus", partner: null };
      placed += 1;
    }
  }

  function spawnPiece() {
    state.piece = createPiece();
    if (!canPlace(cells())) state.gameOver = true;
  }

  function lockPiece() {
    const [a, b] = cells();
    if (a.y < 0 || b.y < 0) {
      state.gameOver = true;
      return;
    }
    const mode = a.x === b.x ? "vertical" : "horizontal";
    state.board[a.y][a.x] = { color: a.color, type: "pill", partner: { x: b.x, y: b.y }, mode };
    state.board[b.y][b.x] = { color: b.color, type: "pill", partner: { x: a.x, y: a.y }, mode };
    settleBoard();
    if (!state.gameOver) spawnPiece();
  }

  function clearMatches() {
    const marked = new Set();
    const mark = (x, y) => marked.add(`${x},${y}`);

    for (let y = 0; y < rows; y += 1) {
      let streak = [];
      for (let x = 0; x <= cols; x += 1) {
        const cell = x < cols ? state.board[y][x] : null;
        if (cell && (!streak.length || streak[0].color === cell.color)) {
          streak.push({ x, y, color: cell.color });
        } else {
          if (streak.length >= 4) streak.forEach((entry) => mark(entry.x, entry.y));
          streak = cell ? [{ x, y, color: cell.color }] : [];
        }
      }
    }

    for (let x = 0; x < cols; x += 1) {
      let streak = [];
      for (let y = 0; y <= rows; y += 1) {
        const cell = y < rows ? state.board[y][x] : null;
        if (cell && (!streak.length || streak[0].color === cell.color)) {
          streak.push({ x, y, color: cell.color });
        } else {
          if (streak.length >= 4) streak.forEach((entry) => mark(entry.x, entry.y));
          streak = cell ? [{ x, y, color: cell.color }] : [];
        }
      }
    }

    if (!marked.size) return false;
    for (const key of marked) {
      const [x, y] = key.split(",").map(Number);
      const cell = state.board[y][x];
      if (cell?.type === "virus") state.viruses -= 1;
      state.board[y][x] = null;
    }
    state.score += marked.size * 25;
    return true;
  }

  function unlinkBrokenPartners() {
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const cell = state.board[y][x];
        if (!cell || cell.type !== "pill" || !cell.partner) continue;
        const other = state.board[cell.partner.y]?.[cell.partner.x];
        if (!other || other.type !== "pill") cell.partner = null;
      }
    }
  }

  function gravityPass() {
    let moved = false;
    for (let y = rows - 2; y >= 0; y -= 1) {
      for (let x = 0; x < cols; x += 1) {
        const cell = state.board[y][x];
        if (!cell || cell.type === "virus") continue;
        if (cell.partner && cell.partner.y === y && cell.partner.x > x) continue;
        if (cell.partner && cell.partner.y === y && cell.partner.x < x) {
          if (state.board[y + 1][x] || state.board[y + 1][cell.partner.x]) continue;
          const leftX = cell.partner.x;
          const rightX = x;
          const leftCell = state.board[y][leftX];
          const rightCell = state.board[y][rightX];
          state.board[y][leftX] = null;
          state.board[y][rightX] = null;
          state.board[y + 1][leftX] = leftCell;
          state.board[y + 1][rightX] = rightCell;
          leftCell.partner = { x: rightX, y: y + 1 };
          rightCell.partner = { x: leftX, y: y + 1 };
          moved = true;
          continue;
        }
        if (state.board[y + 1][x]) continue;
        state.board[y + 1][x] = cell;
        state.board[y][x] = null;
        if (cell.partner) cell.partner.y += 1;
        moved = true;
      }
    }
    return moved;
  }

  function settleBoard() {
    let changed = true;
    while (changed) {
      changed = clearMatches();
      unlinkBrokenPartners();
      while (gravityPass()) {
        unlinkBrokenPartners();
      }
    }
    if (state.viruses <= 0) {
      state.level += 1;
      state.score += 400 + state.level * 100;
      spawnViruses();
    }
    syncHud();
  }

  function hardDrop() {
    if (state.paused || state.gameOver) return;
    while (move(0, 1)) {}
    lockPiece();
    state.dropTimer = 0;
  }

  function restartGame() {
    state.score = 0;
    state.level = 1;
    state.paused = false;
    state.gameOver = false;
    state.dropTimer = 0;
    pauseButton.textContent = "Pause";
    spawnViruses();
    spawnPiece();
    syncHud();
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.dropTimer += delta;
    const interval = Math.max(0.14, 0.82 - (state.level - 1) * 0.05);
    if (state.dropTimer >= interval) {
      if (!move(0, 1)) lockPiece();
      state.dropTimer = 0;
    }
  }

  function drawCell(x, y, color, virus = false) {
    ctx.fillStyle = palette[color];
    ctx.fillRect(x * cellSize + 1, y * cellSize + 1, cellSize - 2, cellSize - 2);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(x * cellSize + 4, y * cellSize + 4, cellSize - 10, 4);
    if (virus) {
      ctx.fillStyle = "#101221";
      ctx.beginPath();
      ctx.arc(x * cellSize + cellSize * 0.35, y * cellSize + cellSize * 0.45, 2.4, 0, Math.PI * 2);
      ctx.arc(x * cellSize + cellSize * 0.65, y * cellSize + cellSize * 0.45, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    for (let x = 0; x <= cols; x += 1) ctx.fillRect(x * cellSize, 0, 1, canvas.height);
    for (let y = 0; y <= rows; y += 1) ctx.fillRect(0, y * cellSize, canvas.width, 1);

    state.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) drawCell(x, y, cell.color, cell.type === "virus");
      });
    });
    if (state.piece) {
      cells().forEach((cell) => {
        if (cell.y >= 0) drawCell(cell.x, cell.y, cell.color, false);
      });
    }

    if (state.paused || state.gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.46)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f7f5ff";
      ctx.textAlign = "center";
      ctx.font = "26px 'Courier New'";
      ctx.fillText(state.paused ? "Paused" : "Game Over", canvas.width / 2, canvas.height / 2 - 8);
      ctx.font = "16px 'Courier New'";
      ctx.fillText(state.paused ? "Press pause again to resume" : "Press Restart for another shift", canvas.width / 2, canvas.height / 2 + 22);
    }
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") move(-1, 0);
    if (key === "arrowright" || key === "d") move(1, 0);
    if (key === "arrowup" || key === "w") rotate();
    if (key === "arrowdown" || key === "s") hardDrop();
    if (key === " ") {
      event.preventDefault();
      togglePause();
    }
  });

  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.move === "left") move(-1, 0);
      if (button.dataset.move === "right") move(1, 0);
      if (button.dataset.move === "rotate") rotate();
      if (button.dataset.move === "drop") hardDrop();
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);

  restartGame();
  requestAnimationFrame(frame);
}

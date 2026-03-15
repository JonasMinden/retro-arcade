const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const linesElement = document.querySelector("#lines");
  const levelElement = document.querySelector("#level");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-move]"));

  const cols = 10;
  const rows = 14;
  const cellSize = canvas.width / cols;
  const colors = {
    I: "#71e3ff",
    O: "#ffd166",
    T: "#ff5fb2",
    S: "#87ff65",
    Z: "#ff5f6d",
    J: "#4d7cff",
    L: "#ff9b54",
  };

  const shapes = {
    I: [[1, 1, 1, 1]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1]],
    S: [[0, 1, 1], [1, 1, 0]],
    Z: [[1, 1, 0], [0, 1, 1]],
    J: [[1, 0, 0], [1, 1, 1]],
    L: [[0, 0, 1], [1, 1, 1]],
  };

  const state = {
    board: createBoard(),
    piece: null,
    score: 0,
    lines: 0,
    level: 1,
    paused: false,
    gameOver: false,
    dropCounter: 0,
    lastTime: 0,
  };
  window.__retroArcadeGameState = state;

  function createBoard() {
    return Array.from({ length: rows }, () => Array(cols).fill(null));
  }

  function randomPiece() {
    const keys = Object.keys(shapes);
    const type = keys[Math.floor(Math.random() * keys.length)];
    return {
      type,
      matrix: shapes[type].map((row) => [...row]),
      x: Math.floor(cols / 2) - 1,
      y: 0,
    };
  }

  function rotate(matrix) {
    return matrix[0].map((_, index) => matrix.map((row) => row[index]).reverse());
  }

  function collides(piece, board, offsetX = 0, offsetY = 0, matrix = piece.matrix) {
    for (let y = 0; y < matrix.length; y += 1) {
      for (let x = 0; x < matrix[y].length; x += 1) {
        if (!matrix[y][x]) continue;
        const boardX = piece.x + x + offsetX;
        const boardY = piece.y + y + offsetY;
        if (boardX < 0 || boardX >= cols || boardY >= rows) return true;
        if (boardY >= 0 && board[boardY][boardX]) return true;
      }
    }
    return false;
  }

  function mergePiece() {
    const placedCells = [];
    state.piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value && state.piece.y + y >= 0) {
          const boardY = state.piece.y + y;
          const boardX = state.piece.x + x;
          state.board[boardY][boardX] = state.piece.type;
          placedCells.push([boardX, boardY]);
        }
      });
    });
    return placedCells;
  }
  function clearLines() {
    let cleared = 0;
    state.board = state.board.filter((row) => {
      const full = row.every(Boolean);
      if (full) cleared += 1;
      return !full;
    });
    while (state.board.length < rows) {
      state.board.unshift(Array(cols).fill(null));
    }
    if (cleared > 0) {
      state.lines += cleared;
      state.score += [0, 100, 300, 500, 800][cleared] * state.level;
    }
    return cleared;
  }
  function syncHud() {
    state.level = 1 + Math.floor(state.lines / 10);
    scoreElement.textContent = String(state.score);
    linesElement.textContent = String(state.lines);
    levelElement.textContent = String(state.level);
  }

  function spawnPiece() {
    state.piece = randomPiece();
    state.piece.x = Math.floor((cols - state.piece.matrix[0].length) / 2);
    state.piece.y = -1;
    if (collides(state.piece, state.board, 0, 1)) {
      state.gameOver = true;
    }
  }

  function restartGame() {
    state.board = createBoard();
    state.score = 0;
    state.lines = 0;
    state.level = 1;
    state.paused = false;
    state.gameOver = false;
    state.dropCounter = 0;
    scoreElement.textContent = "0";
    linesElement.textContent = "0";
    levelElement.textContent = "1";
    pauseButton.textContent = "Pause";
    spawnPiece();
  }

  function movePiece(direction) {
    if (state.paused || state.gameOver) return;
    if (!collides(state.piece, state.board, direction, 0)) {
      state.piece.x += direction;
    }
  }

  function rotatePiece() {
    if (state.paused || state.gameOver) return;
    const rotated = rotate(state.piece.matrix);
    if (!collides(state.piece, state.board, 0, 0, rotated)) {
      state.piece.matrix = rotated;
      return;
    }
    if (!collides(state.piece, state.board, -1, 0, rotated)) {
      state.piece.x -= 1;
      state.piece.matrix = rotated;
      return;
    }
    if (!collides(state.piece, state.board, 1, 0, rotated)) {
      state.piece.x += 1;
      state.piece.matrix = rotated;
    }
  }

  function lockPiece() {
    mergePiece();
    clearLines();
    syncHud();
    spawnPiece();
  }

  function dropPiece() {
    if (state.paused || state.gameOver) return;
    if (!collides(state.piece, state.board, 0, 1)) {
      state.piece.y += 1;
    } else {
      lockPiece();
    }
    state.dropCounter = 0;
  }

  function hardDrop() {
    if (state.paused || state.gameOver) return;
    while (!collides(state.piece, state.board, 0, 1)) {
      state.piece.y += 1;
    }
    lockPiece();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function drawCell(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(x * cellSize + 2, y * cellSize + 2, cellSize - 8, 4);
  }

  function drawBoard() {
    state.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell) drawCell(x, y, colors[cell]);
      });
    });
  }

  function drawPiece() {
    state.piece.matrix.forEach((row, y) => {
      row.forEach((value, x) => {
        if (value && state.piece.y + y >= 0) {
          drawCell(state.piece.x + x, state.piece.y + y, colors[state.piece.type]);
        }
      });
    });
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "26px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 22);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let x = 0; x <= cols; x += 1) {
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(x * cellSize, 0, 1, canvas.height);
    }
    for (let y = 0; y <= rows; y += 1) {
      ctx.fillRect(0, y * cellSize, canvas.width, 1);
    }

    drawBoard();
    drawPiece();

    if (state.paused) drawOverlay("Paused", "Press pause again to resume");
    if (state.gameOver) drawOverlay("Game Over", "Press Restart to play again");
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.dropCounter += delta;
    const interval = Math.max(0.12, 0.8 - (state.level - 1) * 0.06);
    if (state.dropCounter >= interval) {
      dropPiece();
    }
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
    if (key === "arrowleft" || key === "a") movePiece(-1);
    if (key === "arrowright" || key === "d") movePiece(1);
    if (key === "arrowup" || key === "w") rotatePiece();
    if (key === "arrowdown" || key === "s") dropPiece();
    if (key === " ") {
      event.preventDefault();
      togglePause();
    }
  });

  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const move = button.dataset.move;
      if (move === "left") movePiece(-1);
      if (move === "right") movePiece(1);
      if (move === "rotate") rotatePiece();
      if (move === "drop") hardDrop();
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}





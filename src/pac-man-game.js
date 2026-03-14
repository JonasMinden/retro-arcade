const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const pelletsElement = document.querySelector("#pellets");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-move]"));

  const tile = 40;
  const layout = [
    "##############",
    "#............#",
    "#.####.####..#",
    "#.#........#.#",
    "#.#.##..##.#.#",
    "#....#..#....#",
    "#.##.#..#.##.#",
    "#............#",
    "#.##.####.##.#",
    "#............#",
    "##############",
    "##############",
    "##############",
    "##############",
  ];

  const state = {
    board: [],
    player: null,
    ghosts: [],
    queuedDirection: null,
    score: 0,
    lives: 3,
    pellets: 0,
    paused: false,
    gameOver: false,
    lastTime: 0,
    moveTimer: 0,
  };

  function makeBoard() {
    return layout.map((row) => row.split(""));
  }

  function countPellets(board) {
    return board.flat().filter((cell) => cell === ".").length;
  }

  function resetRound(resetScore = false) {
    if (resetScore) {
      state.score = 0;
      state.lives = 3;
    }
    state.board = makeBoard();
    state.player = { x: 1, y: 1, direction: { x: 1, y: 0 } };
    state.ghosts = [
      { x: 12, y: 1, color: "#ff5fb2" },
      { x: 12, y: 9, color: "#71e3ff" },
      { x: 1, y: 9, color: "#ff9b54" },
    ];
    state.queuedDirection = null;
    state.moveTimer = 0;
    state.paused = false;
    state.gameOver = false;
    state.pellets = countPellets(state.board);
    scoreElement.textContent = String(state.score);
    livesElement.textContent = String(state.lives);
    pelletsElement.textContent = String(state.pellets);
    pauseButton.textContent = "Pause";
  }

  function isWall(x, y) {
    return state.board[y]?.[x] === "#";
  }

  function setDirection(dir) {
    state.queuedDirection = dir;
  }

  function moveEntity(entity, direction) {
    const nextX = entity.x + direction.x;
    const nextY = entity.y + direction.y;
    if (!isWall(nextX, nextY)) {
      entity.x = nextX;
      entity.y = nextY;
      return true;
    }
    return false;
  }

  function chooseGhostDirection(ghost) {
    const directions = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].filter((dir) => !isWall(ghost.x + dir.x, ghost.y + dir.y));
    directions.sort((a, b) => {
      const da = Math.hypot(state.player.x - (ghost.x + a.x), state.player.y - (ghost.y + a.y));
      const db = Math.hypot(state.player.x - (ghost.x + b.x), state.player.y - (ghost.y + b.y));
      return da - db;
    });
    return directions[Math.floor(Math.random() * Math.min(2, directions.length))] || { x: 0, y: 0 };
  }

  function handlePellet() {
    if (state.board[state.player.y][state.player.x] === ".") {
      state.board[state.player.y][state.player.x] = " ";
      state.score += 10;
      state.pellets -= 1;
      scoreElement.textContent = String(state.score);
      pelletsElement.textContent = String(state.pellets);
      if (state.pellets <= 0) {
        resetRound(true);
      }
    }
  }

  function handleGhostCollision() {
    const hit = state.ghosts.some((ghost) => ghost.x === state.player.x && ghost.y === state.player.y);
    if (hit) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        state.gameOver = true;
      } else {
        const currentScore = state.score;
        const currentLives = state.lives;
        resetRound();
        state.score = currentScore;
        state.lives = currentLives;
        scoreElement.textContent = String(state.score);
        livesElement.textContent = String(state.lives);
      }
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) {
      return;
    }
    state.moveTimer += delta;
    if (state.moveTimer < 0.18) {
      return;
    }
    state.moveTimer = 0;

    if (state.queuedDirection) {
      const moved = moveEntity(state.player, state.queuedDirection);
      if (moved) {
        state.player.direction = state.queuedDirection;
      }
    }
    moveEntity(state.player, state.player.direction);
    handlePellet();

    state.ghosts.forEach((ghost) => {
      moveEntity(ghost, chooseGhostDirection(ghost));
    });

    handleGhostCollision();
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    state.board.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell === "#") {
          ctx.fillStyle = "#273cff";
          ctx.fillRect(x * tile, y * tile, tile, tile);
        }
        if (cell === ".") {
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.arc(x * tile + tile / 2, y * tile + tile / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  }

  function drawPlayer() {
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(state.player.x * tile + tile / 2, state.player.y * tile + tile / 2, 14, 0.25 * Math.PI, 1.75 * Math.PI);
    ctx.lineTo(state.player.x * tile + tile / 2, state.player.y * tile + tile / 2);
    ctx.fill();
  }

  function drawGhosts() {
    state.ghosts.forEach((ghost) => {
      const px = ghost.x * tile + tile / 2;
      const py = ghost.y * tile + tile / 2;
      ctx.fillStyle = ghost.color;
      ctx.beginPath();
      ctx.arc(px, py, 14, Math.PI, 0);
      ctx.lineTo(px + 14, py + 14);
      ctx.lineTo(px + 6, py + 8);
      ctx.lineTo(px, py + 14);
      ctx.lineTo(px - 6, py + 8);
      ctx.lineTo(px - 14, py + 14);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "28px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 20);
  }

  function draw() {
    drawBoard();
    drawPlayer();
    drawGhosts();
    if (state.paused) drawOverlay("Paused", "Press pause again to resume");
    if (state.gameOver) drawOverlay("Game Over", "Press Restart to chase again");
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowup" || key === "w") setDirection({ x: 0, y: -1 });
    if (key === "arrowdown" || key === "s") setDirection({ x: 0, y: 1 });
    if (key === "arrowleft" || key === "a") setDirection({ x: -1, y: 0 });
    if (key === "arrowright" || key === "d") setDirection({ x: 1, y: 0 });
    if (key === "p" || key === " ") {
      event.preventDefault();
      togglePause();
    }
  });

  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const map = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 },
      };
      setDirection(map[button.dataset.move]);
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", () => resetRound(true));
  resetRound(true);
  requestAnimationFrame(frame);
}

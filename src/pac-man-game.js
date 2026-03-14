const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const pelletsElement = document.querySelector("#pellets");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-move]"));

  const tile = 28;
  const layout = [
    "####################",
    "#o.......##.......o#",
    "#.####.#.##.#.####.#",
    "#.#....#....#....#.#",
    "#.#.##.####.##.#.#.#",
    "#......#..#......#.#",
    "#.####.#..#.####.#.#",
    "#......#..#......#.#",
    "#.####.####.####.#.#",
    "#..................#",
    "#.####.##..##.####.#",
    "#o...#..........#o.#",
    "###.#.#.####.#.#.###",
    "#...#.#......#.#...#",
    "#.###.####..####.###",
    "#..................#",
    "#.###.#.####.#.###.#",
    "#.....#..##..#.....#",
    "#o########..########",
    "####################",
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
    powerTimer: 0,
    lastTime: 0,
    moveTimer: 0,
    ghostTimer: 0,
  };

  function makeBoard() {
    return layout.map((row) => row.split(""));
  }

  function countPellets(board) {
    return board.flat().filter((cell) => cell === "." || cell === "o").length;
  }

  function resetPositions() {
    state.player = { x: 1, y: 1, direction: { x: 1, y: 0 } };
    state.ghosts = [
      { x: 18, y: 1, color: "#ff5fb2", homeX: 18, homeY: 1 },
      { x: 18, y: 17, color: "#71e3ff", homeX: 18, homeY: 17 },
      { x: 1, y: 17, color: "#ff9b54", homeX: 1, homeY: 17 },
    ];
    state.queuedDirection = null;
    state.moveTimer = 0;
    state.ghostTimer = 0;
  }

  function startLevel(resetScore = false) {
    if (resetScore) {
      state.score = 0;
      state.lives = 3;
    }
    state.board = makeBoard();
    state.pellets = countPellets(state.board);
    state.powerTimer = 0;
    state.paused = false;
    state.gameOver = false;
    resetPositions();
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

  function tryMove(entity, direction) {
    const nextX = entity.x + direction.x;
    const nextY = entity.y + direction.y;
    if (!isWall(nextX, nextY)) {
      entity.x = nextX;
      entity.y = nextY;
      entity.direction = direction;
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
      const targetX = state.powerTimer > 0 ? ghost.homeX : state.player.x;
      const targetY = state.powerTimer > 0 ? ghost.homeY : state.player.y;
      const da = Math.hypot(targetX - (ghost.x + a.x), targetY - (ghost.y + a.y));
      const db = Math.hypot(targetX - (ghost.x + b.x), targetY - (ghost.y + b.y));
      return da - db;
    });
    if (state.powerTimer > 0) {
      directions.reverse();
    }
    return directions[0] || { x: 0, y: 0 };
  }

  function eatPellet() {
    const tileValue = state.board[state.player.y][state.player.x];
    if (tileValue === ".") {
      state.board[state.player.y][state.player.x] = " ";
      state.score += 10;
      state.pellets -= 1;
    }
    if (tileValue === "o") {
      state.board[state.player.y][state.player.x] = " ";
      state.score += 50;
      state.pellets -= 1;
      state.powerTimer = 8;
    }
    scoreElement.textContent = String(state.score);
    pelletsElement.textContent = String(state.pellets);
    if (state.pellets <= 0) {
      startLevel(false);
    }
  }

  function handleGhostCollisions() {
    state.ghosts.forEach((ghost) => {
      if (ghost.x === state.player.x && ghost.y === state.player.y) {
        if (state.powerTimer > 0) {
          ghost.x = ghost.homeX;
          ghost.y = ghost.homeY;
          state.score += 200;
          scoreElement.textContent = String(state.score);
        } else {
          state.lives -= 1;
          livesElement.textContent = String(state.lives);
          if (state.lives <= 0) {
            state.gameOver = true;
          } else {
            resetPositions();
          }
        }
      }
    });
  }

  function update(delta) {
    if (state.paused || state.gameOver) {
      return;
    }
    state.powerTimer = Math.max(0, state.powerTimer - delta);
    state.moveTimer += delta;
    state.ghostTimer += delta;

    if (state.moveTimer >= 0.2) {
      state.moveTimer = 0;
      if (state.queuedDirection) {
        tryMove(state.player, state.queuedDirection);
      }
      tryMove(state.player, state.player.direction);
      eatPellet();
      handleGhostCollisions();
    }

    if (state.ghostTimer >= 0.28) {
      state.ghostTimer = 0;
      state.ghosts.forEach((ghost) => {
        tryMove(ghost, chooseGhostDirection(ghost));
      });
      handleGhostCollisions();
    }
  }

  function drawBoard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#050814";
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
          ctx.arc(x * tile + tile / 2, y * tile + tile / 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (cell === "o") {
          ctx.fillStyle = "#f7f5ff";
          ctx.beginPath();
          ctx.arc(x * tile + tile / 2, y * tile + tile / 2, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  }

  function drawPlayer() {
    const px = state.player.x * tile + tile / 2;
    const py = state.player.y * tile + tile / 2;
    ctx.fillStyle = state.powerTimer > 0 ? "#fff3a6" : "#ffd166";
    ctx.beginPath();
    ctx.arc(px, py, 12, 0.2 * Math.PI, 1.8 * Math.PI);
    ctx.lineTo(px, py);
    ctx.fill();
  }

  function drawGhosts() {
    state.ghosts.forEach((ghost) => {
      const px = ghost.x * tile + tile / 2;
      const py = ghost.y * tile + tile / 2;
      ctx.fillStyle = state.powerTimer > 0 ? "#4d7cff" : ghost.color;
      ctx.beginPath();
      ctx.arc(px, py, 12, Math.PI, 0);
      ctx.lineTo(px + 12, py + 12);
      ctx.lineTo(px + 5, py + 6);
      ctx.lineTo(px, py + 12);
      ctx.lineTo(px - 5, py + 6);
      ctx.lineTo(px - 12, py + 12);
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
    if (state.powerTimer > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "14px 'Courier New'";
      ctx.fillText(`BOOST ${state.powerTimer.toFixed(1)}s`, 12, 18);
    }
    if (state.paused) drawOverlay("Paused", "Press pause again to resume");
    if (state.gameOver) drawOverlay("Game Over", "Press Restart to try again");
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
  restartButton.addEventListener("click", () => startLevel(true));
  startLevel(true);
  requestAnimationFrame(frame);
}

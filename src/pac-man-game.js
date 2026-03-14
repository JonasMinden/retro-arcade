const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const pelletsElement = document.querySelector("#pellets");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-move]"));

  const layout = [
    "#####################",
    "#o........#........o#",
    "#.###.###.#.###.###.#",
    "#...................#",
    "#.###.#.#####.#.###.#",
    "#.....#...#...#.....#",
    "#####.###.#.###.#####",
    "#.........#.........#",
    "#.###.#.#####.#.###.#",
    "#o..#.#.......#.#..o#",
    "###.#.###...###.#.###",
    "#...#...#...#...#...#",
    "#.#####.#.#.#.#####.#",
    "#.......#.#.#.......#",
    "#.###.###.#.###.###.#",
    "#...#..... .....#...#",
    "###.#.#.#####.#.#.###",
    "#.....#...#...#.....#",
    "#.########.########.#",
    "#...................#",
    "#####################",
  ];

  const state = {
    board: [],
    tile: canvas.width / layout[0].length,
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
    mouthTimer: 0,
  };

  function makeBoard() {
    return layout.map((row) => row.split(""));
  }

  function countPellets(board) {
    return board.flat().filter((cell) => cell === "." || cell === "o").length;
  }

  function resetPositions() {
    state.player = { x: 10, y: 15, direction: { x: 1, y: 0 }, heading: { x: 1, y: 0 } };
    state.ghosts = [
      { x: 10, y: 9, color: "#ff5fb2", homeX: 10, homeY: 9, direction: { x: -1, y: 0 } },
      { x: 9, y: 10, color: "#71e3ff", homeX: 9, homeY: 10, direction: { x: 1, y: 0 } },
      { x: 11, y: 10, color: "#ff9b54", homeX: 11, homeY: 10, direction: { x: -1, y: 0 } },
    ];
    state.queuedDirection = null;
    state.moveTimer = 0;
    state.ghostTimer = 0;
    state.mouthTimer = 0;
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
      if (entity === state.player) {
        entity.heading = direction;
      }
      return true;
    }
    return false;
  }

  function getNeighbors(x, y) {
    return [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].filter((dir) => !isWall(x + dir.x, y + dir.y));
  }

  function findDirectionTowards(startX, startY, targetX, targetY, flee = false) {
    const queue = [{ x: targetX, y: targetY }];
    const distances = new Map([`${targetX},${targetY}`, 0]);

    while (queue.length) {
      const current = queue.shift();
      const currentDistance = distances.get(`${current.x},${current.y}`);
      getNeighbors(current.x, current.y).forEach((dir) => {
        const nextX = current.x + dir.x;
        const nextY = current.y + dir.y;
        const key = `${nextX},${nextY}`;
        if (!distances.has(key)) {
          distances.set(key, currentDistance + 1);
          queue.push({ x: nextX, y: nextY });
        }
      });
    }

    const options = getNeighbors(startX, startY);
    if (!options.length) {
      return { x: 0, y: 0 };
    }

    options.sort((a, b) => {
      const aDistance = distances.get(`${startX + a.x},${startY + a.y}`) ?? Number.MAX_SAFE_INTEGER;
      const bDistance = distances.get(`${startX + b.x},${startY + b.y}`) ?? Number.MAX_SAFE_INTEGER;
      return flee ? bDistance - aDistance : aDistance - bDistance;
    });

    return options[0];
  }

  function chooseGhostDirection(ghost) {
    const frightened = state.powerTimer > 0;
    const targetX = frightened ? ghost.homeX : state.player.x;
    const targetY = frightened ? ghost.homeY : state.player.y;
    let direction = findDirectionTowards(ghost.x, ghost.y, targetX, targetY, frightened);

    const opposite = { x: -ghost.direction.x, y: -ghost.direction.y };
    if (
      direction.x === opposite.x &&
      direction.y === opposite.y &&
      getNeighbors(ghost.x, ghost.y).length > 1
    ) {
      const alternatives = getNeighbors(ghost.x, ghost.y).filter((dir) => dir.x !== opposite.x || dir.y !== opposite.y);
      direction = alternatives[0] || direction;
    }

    return direction;
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
      state.powerTimer = 7.5;
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
          ghost.direction = { x: 0, y: -1 };
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
    state.mouthTimer += delta * 9;

    if (state.moveTimer >= 0.16) {
      state.moveTimer = 0;
      if (state.queuedDirection) {
        tryMove(state.player, state.queuedDirection);
      }
      tryMove(state.player, state.player.direction);
      eatPellet();
      handleGhostCollisions();
    }

    const ghostStep = state.powerTimer > 0 ? 0.24 : 0.21;
    if (state.ghostTimer >= ghostStep) {
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
        const drawX = x * state.tile;
        const drawY = y * state.tile;
        if (cell === "#") {
          ctx.fillStyle = "#273cff";
          ctx.fillRect(drawX, drawY, state.tile, state.tile);
          ctx.strokeStyle = "rgba(113, 227, 255, 0.18)";
          ctx.strokeRect(drawX + 1, drawY + 1, state.tile - 2, state.tile - 2);
        }
        if (cell === ".") {
          ctx.fillStyle = "#ffd166";
          ctx.beginPath();
          ctx.arc(drawX + state.tile / 2, drawY + state.tile / 2, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
        if (cell === "o") {
          ctx.fillStyle = "#f7f5ff";
          ctx.beginPath();
          ctx.arc(drawX + state.tile / 2, drawY + state.tile / 2, 6.2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    });
  }

  function drawPlayer() {
    const px = state.player.x * state.tile + state.tile / 2;
    const py = state.player.y * state.tile + state.tile / 2;
    const heading = state.player.heading || { x: 1, y: 0 };
    const baseAngle = Math.atan2(heading.y, heading.x);
    const mouth = 0.18 + Math.abs(Math.sin(state.mouthTimer)) * 0.34;
    ctx.fillStyle = state.powerTimer > 0 ? "#fff3a6" : "#ffd166";
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, state.tile * 0.42, baseAngle + mouth, baseAngle - mouth + Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
  }

  function drawGhost(ghost) {
    const px = ghost.x * state.tile + state.tile / 2;
    const py = ghost.y * state.tile + state.tile / 2;
    const frightened = state.powerTimer > 0;
    ctx.fillStyle = frightened ? "#4d7cff" : ghost.color;
    ctx.beginPath();
    ctx.arc(px, py, state.tile * 0.42, Math.PI, 0);
    ctx.lineTo(px + state.tile * 0.42, py + state.tile * 0.38);
    ctx.lineTo(px + state.tile * 0.22, py + state.tile * 0.18);
    ctx.lineTo(px, py + state.tile * 0.38);
    ctx.lineTo(px - state.tile * 0.22, py + state.tile * 0.18);
    ctx.lineTo(px - state.tile * 0.42, py + state.tile * 0.38);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#f7f5ff";
    ctx.beginPath();
    ctx.arc(px - 5, py - 2, 3.5, 0, Math.PI * 2);
    ctx.arc(px + 5, py - 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = frightened ? "#f7f5ff" : "#111827";
    ctx.beginPath();
    ctx.arc(px - 5, py - 2, 1.6, 0, Math.PI * 2);
    ctx.arc(px + 5, py - 2, 1.6, 0, Math.PI * 2);
    ctx.fill();
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
    state.ghosts.forEach(drawGhost);
    if (state.powerTimer > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "14px 'Courier New'";
      ctx.textAlign = "left";
      ctx.fillText(`POWER ${state.powerTimer.toFixed(1)}s`, 12, 18);
    }
    if (state.paused) drawOverlay("Paused", "Press pause again to resume");
    if (state.gameOver) drawOverlay("Game Over", "Press Restart to try again");
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.05);
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

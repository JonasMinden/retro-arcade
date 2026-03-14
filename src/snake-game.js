const GRID_SIZE = 16;
const TICK_MS = 160;
const DIRECTIONS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};
const OPPOSITES = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function createInitialState(gridSize = GRID_SIZE) {
  const center = Math.floor(gridSize / 2);
  const snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];

  return {
    gridSize,
    snake,
    direction: "right",
    queuedDirection: "right",
    food: placeFood(snake, gridSize, 0),
    score: 0,
    status: "idle",
  };
}

export function isOppositeDirection(nextDirection, currentDirection) {
  return OPPOSITES[nextDirection] === currentDirection;
}

export function queueDirection(state, nextDirection) {
  if (!DIRECTIONS[nextDirection]) {
    return state;
  }

  if (isOppositeDirection(nextDirection, state.direction) && state.snake.length > 1) {
    return state;
  }

  return { ...state, queuedDirection: nextDirection };
}

export function placeFood(snake, gridSize, randomValue = Math.random()) {
  const occupied = new Set(snake.map(({ x, y }) => `${x},${y}`));
  const cells = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        cells.push({ x, y });
      }
    }
  }

  if (cells.length === 0) {
    return null;
  }

  const index = Math.min(cells.length - 1, Math.floor(randomValue * cells.length));
  return cells[index];
}

export function stepGame(state, randomValue = Math.random()) {
  if (state.status === "game-over" || state.status === "paused") {
    return state;
  }

  const direction = state.queuedDirection;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + delta.x, y: head.y + delta.y };
  const ateFood = state.food && nextHead.x === state.food.x && nextHead.y === state.food.y;
  const nextSnake = [nextHead, ...state.snake];

  if (!ateFood) {
    nextSnake.pop();
  }

  const hitBoundary =
    nextHead.x < 0 ||
    nextHead.x >= state.gridSize ||
    nextHead.y < 0 ||
    nextHead.y >= state.gridSize;
  const hitSelf = nextSnake
    .slice(1)
    .some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

  if (hitBoundary || hitSelf) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      status: "game-over",
    };
  }

  return {
    ...state,
    snake: nextSnake,
    direction,
    status: "running",
    score: ateFood ? state.score + 1 : state.score,
    food: ateFood ? placeFood(nextSnake, state.gridSize, randomValue) : state.food,
  };
}

function createGameController(options) {
  const {
    boardElement,
    scoreElement,
    statusElement,
    pauseButton,
    restartButton,
    controlButtons,
  } = options;

  let state = createInitialState();
  let timerId = null;

  function syncStatus() {
    scoreElement.textContent = String(state.score);

    if (state.status === "idle") {
      statusElement.textContent = "Press any arrow key or WASD to start.";
      pauseButton.textContent = "Pause";
      return;
    }

    if (state.status === "paused") {
      statusElement.textContent = "Paused.";
      pauseButton.textContent = "Resume";
      return;
    }

    if (state.status === "game-over") {
      statusElement.textContent = "Game over. Restart to play again.";
      pauseButton.textContent = "Pause";
      return;
    }

    statusElement.textContent = "Running.";
    pauseButton.textContent = "Pause";
  }

  function renderBoard() {
    const snakeCells = new Set(state.snake.map(({ x, y }) => `${x},${y}`));
    const headKey = `${state.snake[0].x},${state.snake[0].y}`;
    const foodKey = state.food ? `${state.food.x},${state.food.y}` : null;

    boardElement.innerHTML = "";
    boardElement.style.gridTemplateColumns = `repeat(${state.gridSize}, 1fr)`;

    for (let y = 0; y < state.gridSize; y += 1) {
      for (let x = 0; x < state.gridSize; x += 1) {
        const cell = document.createElement("div");
        const key = `${x},${y}`;
        cell.className = "cell";

        if (snakeCells.has(key)) {
          cell.classList.add("cell--snake");
        }

        if (key === headKey) {
          cell.classList.add("cell--head");
        }

        if (foodKey === key) {
          cell.classList.add("cell--food");
        }

        boardElement.appendChild(cell);
      }
    }
  }

  function render() {
    window.__retroArcadeGameState = state;
    renderBoard();
    syncStatus();
  }

  function stopTimer() {
    if (timerId !== null) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function startTimer() {
    if (timerId !== null) {
      return;
    }

    timerId = window.setInterval(() => {
      state = stepGame(state);
      render();

      if (state.status === "game-over") {
        stopTimer();
      }
    }, TICK_MS);
  }

  function beginRunning() {
    if (state.status === "idle") {
      state = { ...state, status: "running" };
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
    }

    if (state.status === "running") {
      startTimer();
    }

    render();
  }

  function handleDirection(nextDirection) {
    if (state.status === "game-over") {
      return;
    }

    state = queueDirection(state, nextDirection);
    beginRunning();
  }

  function togglePause() {
    if (state.status === "game-over" || state.status === "idle") {
      return;
    }

    if (state.status === "paused") {
      state = { ...state, status: "running" };
      startTimer();
    } else {
      state = { ...state, status: "paused" };
      stopTimer();
    }

    render();
  }

  function restart() {
    stopTimer();
    state = createInitialState();
    render();
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    const keyMap = {
      arrowup: "up",
      w: "up",
      arrowdown: "down",
      s: "down",
      arrowleft: "left",
      a: "left",
      arrowright: "right",
      d: "right",
    };

    if (key === " ") {
      event.preventDefault();
      togglePause();
      return;
    }

    const direction = keyMap[key];
    if (direction) {
      event.preventDefault();
      handleDirection(direction);
    }
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restart);
  controlButtons.forEach((button) => {
    button.addEventListener("click", () => {
      handleDirection(button.dataset.direction);
    });
  });

  render();
}

if (typeof document !== "undefined") {
  const boardElement = document.querySelector("#game-board");
  const scoreElement = document.querySelector("#score");
  const statusElement = document.querySelector("#status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const controlButtons = Array.from(document.querySelectorAll("[data-direction]"));

  if (boardElement && scoreElement && statusElement && pauseButton && restartButton) {
    createGameController({
      boardElement,
      scoreElement,
      statusElement,
      pauseButton,
      restartButton,
      controlButtons,
    });
  }
}




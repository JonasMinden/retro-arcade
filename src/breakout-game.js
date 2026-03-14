const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const statusElement = document.querySelector("#status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const moveButtons = Array.from(document.querySelectorAll("[data-move]"));
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    width: canvas.width,
    height: canvas.height,
    paddle: { x: canvas.width / 2 - 60, y: canvas.height - 28, width: 120, height: 12, speed: 420 },
    ball: null,
    bricks: [],
    move: 0,
    score: 0,
    lives: 3,
    paused: false,
    running: false,
    won: false,
    lastTime: 0,
  };

  const brickPalette = ["#ff5fb2", "#ffd166", "#71e3ff", "#87ff65", "#ff9b54"];

  function createBricks() {
    const bricks = [];
    const rows = 5;
    const cols = 9;
    const width = 58;
    const height = 18;
    const gap = 8;
    const offsetX = 21;
    const offsetY = 42;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        bricks.push({
          x: offsetX + col * (width + gap),
          y: offsetY + row * (height + gap),
          width,
          height,
          color: brickPalette[row % brickPalette.length],
          alive: true,
        });
      }
    }
    return bricks;
  }

  function createBall() {
    return {
      x: state.paddle.x + state.paddle.width / 2,
      y: state.paddle.y - 10,
      radius: 8,
      vx: 220 * (Math.random() > 0.5 ? 1 : -1),
      vy: -240,
      stuck: true,
    };
  }

  function setStatus(text) {
    statusElement.textContent = text;
  }

  function resetBall() {
    state.ball = createBall();
    state.running = false;
    state.paused = false;
    setStatus("Ready");
    pauseButton.textContent = "Pause";
  }

  function restartGame() {
    state.score = 0;
    state.lives = 3;
    state.won = false;
    state.bricks = createBricks();
    scoreElement.textContent = "0";
    livesElement.textContent = "3";
    resetBall();
  }

  function launchBall() {
    if (state.won) {
      restartGame();
      return;
    }

    if (state.ball.stuck) {
      state.ball.stuck = false;
      state.running = true;
      setStatus("Live");
    }
  }

  function togglePause() {
    if (!state.running || state.ball.stuck || state.won) {
      return;
    }
    state.paused = !state.paused;
    setStatus(state.paused ? "Paused" : "Live");
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function update(delta) {
    state.paddle.x = Math.max(0, Math.min(state.width - state.paddle.width, state.paddle.x + state.move * state.paddle.speed * delta));

    if (state.ball.stuck) {
      state.ball.x = state.paddle.x + state.paddle.width / 2;
      state.ball.y = state.paddle.y - 10;
      return;
    }

    if (state.paused || state.won) {
      return;
    }

    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;

    if (state.ball.x - state.ball.radius <= 0 || state.ball.x + state.ball.radius >= state.width) {
      state.ball.vx *= -1;
    }
    if (state.ball.y - state.ball.radius <= 0) {
      state.ball.vy *= -1;
    }

    if (
      state.ball.y + state.ball.radius >= state.paddle.y &&
      state.ball.x >= state.paddle.x &&
      state.ball.x <= state.paddle.x + state.paddle.width &&
      state.ball.vy > 0
    ) {
      const relative = (state.ball.x - (state.paddle.x + state.paddle.width / 2)) / (state.paddle.width / 2);
      state.ball.vx = 280 * relative;
      state.ball.vy = -Math.abs(state.ball.vy);
    }

    state.bricks.forEach((brick) => {
      if (!brick.alive) {
        return;
      }
      const hit =
        state.ball.x + state.ball.radius >= brick.x &&
        state.ball.x - state.ball.radius <= brick.x + brick.width &&
        state.ball.y + state.ball.radius >= brick.y &&
        state.ball.y - state.ball.radius <= brick.y + brick.height;
      if (hit) {
        brick.alive = false;
        state.ball.vy *= -1;
        state.score += 10;
        scoreElement.textContent = String(state.score);
      }
    });

    if (state.bricks.every((brick) => !brick.alive)) {
      state.won = true;
      state.running = false;
      setStatus("Cleared");
    }

    if (state.ball.y - state.ball.radius > state.height) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        state.won = true;
        setStatus("Game Over");
        state.running = false;
      } else {
        resetBall();
      }
    }
  }

  function drawBricks() {
    state.bricks.forEach((brick) => {
      if (!brick.alive) {
        return;
      }
      ctx.fillStyle = brick.color;
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(brick.x + 4, brick.y + 4, brick.width - 8, 3);
    });
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, state.width, state.height);

    drawBricks();

    ctx.fillStyle = "#71e3ff";
    ctx.fillRect(state.paddle.x, state.paddle.y, state.paddle.width, state.paddle.height);

    ctx.beginPath();
    ctx.fillStyle = "#ffd166";
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    if (state.ball.stuck && !state.won) {
      ctx.fillStyle = "rgba(247,245,255,0.9)";
      ctx.font = "22px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText("Press Launch or Space", state.width / 2, state.height / 2);
    }

    if (state.won) {
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.fillStyle = "#f7f5ff";
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = "center";
      const message = state.lives > 0 ? "Bricks cleared" : "Game over";
      ctx.fillText(message, state.width / 2, state.height / 2 - 10);
      ctx.font = "18px 'Courier New'";
      ctx.fillText("Press Restart to play again", state.width / 2, state.height / 2 + 24);
    }
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.02);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") {
      state.move = -1;
    }
    if (key === "d" || key === "arrowright") {
      state.move = 1;
    }
    if (key === " ") {
      event.preventDefault();
      launchBall();
    }
    if (key === "p") {
      togglePause();
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (["a", "arrowleft", "d", "arrowright"].includes(key)) {
      state.move = 0;
    }
  });

  moveButtons.forEach((button) => {
    const direction = button.dataset.move;
    const value = direction === "left" ? -1 : 1;
    const start = () => { state.move = value; };
    const stop = () => { state.move = 0; };
    button.addEventListener("mousedown", start);
    button.addEventListener("touchstart", start, { passive: true });
    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("touchend", stop);
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "launch") {
        launchBall();
      }
      if (button.dataset.action === "pause") {
        togglePause();
      }
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

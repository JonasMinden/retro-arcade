const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const playerScore = document.querySelector("#player-score");
  const cpuScore = document.querySelector("#cpu-score");
  const roundStatus = document.querySelector("#round-status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const moveButtons = Array.from(document.querySelectorAll("[data-move]"));
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));
  const state = {
    width: canvas.width,
    height: canvas.height,
    playerY: canvas.height / 2 - 45,
    cpuY: canvas.height / 2 - 45,
    paddleWidth: 14,
    paddleHeight: 90,
    playerScore: 0,
    cpuScore: 0,
    cpuTargetScore: 7,
    playerMove: 0,
    paused: false,
    running: false,
    winner: "",
    lastTime: 0,
    ball: null,
  };
  window.__retroArcadeGameState = state;

  function setStatus(text) {
    roundStatus.textContent = text;
  }

  function createBall(direction = 1) {
    return {
      x: state.width / 2,
      y: state.height / 2,
      radius: 9,
      vx: 280 * direction,
      vy: Math.random() * 180 - 90,
    };
  }

  function resetRound(direction = 1) {
    state.ball = createBall(direction);
    state.playerY = state.height / 2 - state.paddleHeight / 2;
    state.cpuY = state.playerY;
    state.running = false;
    state.paused = false;
    pauseButton.textContent = "Pause";
    if (!state.winner) {
      setStatus("Ready");
    }
  }

  function restartGame() {
    state.playerScore = 0;
    state.cpuScore = 0;
    playerScore.textContent = "0";
    cpuScore.textContent = "0";
    state.winner = "";
    resetRound(Math.random() > 0.5 ? 1 : -1);
  }

  function serveBall() {
    if (state.winner) {
      restartGame();
      return;
    }

    if (!state.running) {
      state.running = true;
      state.paused = false;
      setStatus("Live");
    }
  }

  function togglePause() {
    if (!state.running || state.winner) {
      return;
    }

    state.paused = !state.paused;
    setStatus(state.paused ? "Paused" : "Live");
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function clampPaddle(y) {
    return Math.max(0, Math.min(state.height - state.paddleHeight, y));
  }

  function finishRound(side) {
    if (side === "player") {
      state.playerScore += 1;
      playerScore.textContent = String(state.playerScore);
      setStatus(`Du führst mit ${state.playerScore}`);
      resetRound(1);
      return;
    }

    state.cpuScore += 1;
    cpuScore.textContent = String(state.cpuScore);
    if (state.cpuScore >= state.cpuTargetScore) {
      state.winner = "CPU";
      setStatus("CPU Wins");
      resetRound(-1);
      return;
    }
    resetRound(-1);
  }

  function update(delta) {
    state.playerY = clampPaddle(state.playerY + state.playerMove * 340 * delta);

    if (!state.running || state.paused || state.winner) {
      return;
    }

    state.cpuY = clampPaddle(state.cpuY + Math.sign(state.ball.y - (state.cpuY + state.paddleHeight / 2)) * 280 * delta);

    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;

    if (state.ball.y - state.ball.radius <= 0 || state.ball.y + state.ball.radius >= state.height) {
      state.ball.vy *= -1;
    }

    const playerHit = state.ball.x - state.ball.radius <= 34 && state.ball.y >= state.playerY && state.ball.y <= state.playerY + state.paddleHeight;
    const cpuHit = state.ball.x + state.ball.radius >= state.width - 34 && state.ball.y >= state.cpuY && state.ball.y <= state.cpuY + state.paddleHeight;

    if (playerHit) {
      state.ball.x = 34 + state.ball.radius;
      state.ball.vx = Math.abs(state.ball.vx) * 1.03;
      state.ball.vy += (state.ball.y - (state.playerY + state.paddleHeight / 2)) * 4;
    }

    if (cpuHit) {
      state.ball.x = state.width - 34 - state.ball.radius;
      state.ball.vx = -Math.abs(state.ball.vx) * 1.03;
      state.ball.vy += (state.ball.y - (state.cpuY + state.paddleHeight / 2)) * 4;
    }

    if (state.ball.x < -24) {
      finishRound("cpu");
    }

    if (state.ball.x > state.width + 24) {
      finishRound("player");
    }
  }

  function drawNet() {
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    for (let y = 0; y < state.height; y += 24) {
      ctx.fillRect(state.width / 2 - 2, y, 4, 12);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, state.width, state.height);
    drawNet();

    ctx.fillStyle = "#71e3ff";
    ctx.fillRect(20, state.playerY, state.paddleWidth, state.paddleHeight);
    ctx.fillStyle = "#ff5fb2";
    ctx.fillRect(state.width - 34, state.cpuY, state.paddleWidth, state.paddleHeight);

    ctx.beginPath();
    ctx.fillStyle = "#ffd166";
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();

    if (!state.running && !state.winner) {
      ctx.fillStyle = "rgba(247,245,255,0.9)";
      ctx.font = "24px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText("Press Serve or Space", state.width / 2, state.height / 2 - 26);
    }

    if (state.winner) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, state.width, state.height);
      ctx.fillStyle = "#f7f5ff";
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText(state.winner === "CPU" ? "CPU gewinnt bei 7 Punkten" : `${state.winner} führt weiter`, state.width / 2, state.height / 2 - 8);
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
    if (key === "w" || key === "arrowup") {
      state.playerMove = -1;
    }
    if (key === "s" || key === "arrowdown") {
      state.playerMove = 1;
    }
    if (key === " ") {
      event.preventDefault();
      serveBall();
    }
    if (key === "p") {
      togglePause();
    }
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (["w", "arrowup", "s", "arrowdown"].includes(key)) {
      state.playerMove = 0;
    }
  });

  moveButtons.forEach((button) => {
    const direction = button.dataset.move;
    const value = direction === "up" ? -1 : 1;
    const start = () => { state.playerMove = value; };
    const stop = () => { state.playerMove = 0; };
    button.addEventListener("mousedown", start);
    button.addEventListener("touchstart", start, { passive: true });
    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("touchend", stop);
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "serve") {
        serveBall();
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




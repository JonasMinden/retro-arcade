const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const statusElement = document.querySelector("#ball-status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    width: canvas.width,
    height: canvas.height,
    score: 0,
    lives: 3,
    paused: false,
    leftActive: false,
    rightActive: false,
    ball: null,
    lastTime: 0,
    bumpers: [
      { x: 120, y: 170, radius: 24, color: "#ff5fb2" },
      { x: 210, y: 130, radius: 22, color: "#ffd166" },
      { x: 300, y: 180, radius: 24, color: "#71e3ff" },
    ],
  };

  function createBall() {
    return { x: state.width - 34, y: state.height - 88, vx: 0, vy: 0, radius: 10, launched: false };
  }

  function resetBall() {
    state.ball = createBall();
    statusElement.textContent = "Ready";
  }

  function restartGame() {
    state.score = 0;
    state.lives = 3;
    state.paused = false;
    state.leftActive = false;
    state.rightActive = false;
    scoreElement.textContent = "0";
    livesElement.textContent = "3";
    pauseButton.textContent = "Pause";
    resetBall();
  }

  function launchBall() {
    if (!state.ball.launched) {
      state.ball.launched = true;
      state.ball.vx = -120;
      state.ball.vy = -420;
      statusElement.textContent = "Live";
    }
  }

  function togglePause() {
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function flipperRects() {
    return [
      { x: 90, y: 540, width: 92, height: 16, activeY: state.leftActive ? 522 : 540, side: "left" },
      { x: 238, y: 540, width: 92, height: 16, activeY: state.rightActive ? 522 : 540, side: "right" },
    ];
  }

  function update(delta) {
    if (state.paused) return;
    if (!state.ball.launched) return;

    state.ball.vy += 620 * delta;
    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;

    if (state.ball.x - state.ball.radius <= 16 || state.ball.x + state.ball.radius >= state.width - 16) {
      state.ball.vx *= -1;
    }
    if (state.ball.y - state.ball.radius <= 16) {
      state.ball.vy = Math.abs(state.ball.vy);
    }

    state.bumpers.forEach((bumper) => {
      const dx = state.ball.x - bumper.x;
      const dy = state.ball.y - bumper.y;
      const distance = Math.hypot(dx, dy);
      if (distance < state.ball.radius + bumper.radius) {
        const nx = dx / distance;
        const ny = dy / distance;
        const speed = Math.max(260, Math.hypot(state.ball.vx, state.ball.vy));
        state.ball.vx = nx * speed;
        state.ball.vy = ny * speed;
        state.score += 25;
        scoreElement.textContent = String(state.score);
      }
    });

    flipperRects().forEach((flipper) => {
      const fy = flipper.activeY;
      const hit =
        state.ball.x + state.ball.radius >= flipper.x &&
        state.ball.x - state.ball.radius <= flipper.x + flipper.width &&
        state.ball.y + state.ball.radius >= fy &&
        state.ball.y - state.ball.radius <= fy + flipper.height &&
        state.ball.vy > 0;
      if (hit) {
        const impulse = flipper.side === "left" ? -180 : 180;
        state.ball.vx += impulse;
        state.ball.vy = -Math.abs(state.ball.vy) - 120;
      }
    });

    if (state.ball.y - state.ball.radius > state.height) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        statusElement.textContent = "Game Over";
        state.paused = true;
      } else {
        resetBall();
      }
    }
  }

  function drawTable() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.strokeStyle = "#71e3ff";
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, state.width - 32, state.height - 32);
    ctx.strokeRect(state.width - 52, 32, 24, state.height - 120);

    state.bumpers.forEach((bumper) => {
      ctx.fillStyle = bumper.color;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.stroke();
    });

    flipperRects().forEach((flipper) => {
      ctx.fillStyle = flipper.side === "left" ? "#ff9b54" : "#ffd166";
      ctx.fillRect(flipper.x, flipper.activeY, flipper.width, flipper.height);
    });

    ctx.fillStyle = "#ff5fb2";
    ctx.fillRect(40, 460, 28, 96);
    ctx.fillRect(state.width - 68, 460, 28, 96);
  }

  function drawBall() {
    ctx.fillStyle = "#f7f5ff";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function draw() {
    drawTable();
    drawBall();
    if (!state.ball.launched && !state.paused) {
      ctx.fillStyle = "rgba(247,245,255,0.9)";
      ctx.font = "22px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText("Press Launch or Space", state.width / 2, state.height / 2);
    }
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") state.leftActive = true;
    if (key === "d" || key === "arrowright") state.rightActive = true;
    if (key === " ") {
      event.preventDefault();
      launchBall();
    }
    if (key === "p") togglePause();
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") state.leftActive = false;
    if (key === "d" || key === "arrowright") state.rightActive = false;
  });

  actionButtons.forEach((button) => {
    if (button.dataset.action === "left") {
      const start = () => { state.leftActive = true; };
      const stop = () => { state.leftActive = false; };
      button.addEventListener("mousedown", start);
      button.addEventListener("touchstart", start, { passive: true });
      button.addEventListener("mouseup", stop);
      button.addEventListener("mouseleave", stop);
      button.addEventListener("touchend", stop);
    }
    if (button.dataset.action === "right") {
      const start = () => { state.rightActive = true; };
      const stop = () => { state.rightActive = false; };
      button.addEventListener("mousedown", start);
      button.addEventListener("touchstart", start, { passive: true });
      button.addEventListener("mouseup", stop);
      button.addEventListener("mouseleave", stop);
      button.addEventListener("touchend", stop);
    }
    if (button.dataset.action === "launch") button.addEventListener("click", launchBall);
    if (button.dataset.action === "pause") button.addEventListener("click", togglePause);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

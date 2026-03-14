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
      { x: 118, y: 162, radius: 25, color: "#ff5fb2", score: 35 },
      { x: 208, y: 122, radius: 22, color: "#ffd166", score: 45 },
      { x: 304, y: 172, radius: 25, color: "#71e3ff", score: 35 },
    ],
    targets: [
      { x: 92, y: 248, width: 16, height: 54, color: "#ff9b54", score: 75, active: true },
      { x: 312, y: 248, width: 16, height: 54, color: "#ff9b54", score: 75, active: true },
      { x: 202, y: 208, width: 18, height: 48, color: "#87ff65", score: 120, active: true },
    ],
  };

  function createBall() {
    return {
      x: 376,
      y: 520,
      vx: 0,
      vy: 0,
      radius: 8,
      launched: false,
    };
  }

  function flippers() {
    return [
      { pivotX: 148, pivotY: 540, length: 72, angle: state.leftActive ? -0.45 : 0.38, side: "left", color: "#ff9b54" },
      { pivotX: 272, pivotY: 540, length: 72, angle: state.rightActive ? Math.PI + 0.45 : Math.PI - 0.38, side: "right", color: "#ffd166" },
    ];
  }

  function lineDistance(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSquared = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    return { x: closestX, y: closestY, dx: px - closestX, dy: py - closestY, t };
  }

  function reflectFromNormal(nx, ny, boost = 1) {
    const velocityDot = state.ball.vx * nx + state.ball.vy * ny;
    if (velocityDot >= 0) return;
    state.ball.vx -= (1.9 * velocityDot) * nx;
    state.ball.vy -= (1.9 * velocityDot) * ny;
    state.ball.vx *= boost;
    state.ball.vy *= boost;
  }

  function clampBallInside() {
    const { ball } = state;

    if (ball.x - ball.radius < 26) {
      ball.x = 26 + ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.92;
    }
    if (ball.x + ball.radius > 346) {
      ball.x = 346 - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.92;
    }
    if (ball.y - ball.radius < 24) {
      ball.y = 24 + ball.radius;
      ball.vy = Math.abs(ball.vy) * 0.94;
    }

    if (ball.y < 150) {
      const leftSlope = lineDistance(ball.x, ball.y, 26, 96, 98, 30);
      const rightSlope = lineDistance(ball.x, ball.y, 346, 96, 274, 30);
      [leftSlope, rightSlope].forEach((collision) => {
        const distance = Math.hypot(collision.dx, collision.dy);
        if (distance < ball.radius + 4) {
          const nx = collision.dx / (distance || 1);
          const ny = collision.dy / (distance || 1);
          ball.x = collision.x + nx * (ball.radius + 4);
          ball.y = collision.y + ny * (ball.radius + 4);
          reflectFromNormal(nx, ny, 1.02);
        }
      });
    }

    if (ball.y > 448) {
      const leftGuide = lineDistance(ball.x, ball.y, 52, 454, 112, 582);
      const rightGuide = lineDistance(ball.x, ball.y, 320, 454, 260, 582);
      [leftGuide, rightGuide].forEach((collision) => {
        const distance = Math.hypot(collision.dx, collision.dy);
        if (distance < ball.radius + 3) {
          const nx = collision.dx / (distance || 1);
          const ny = collision.dy / (distance || 1);
          ball.x = collision.x + nx * (ball.radius + 3);
          ball.y = collision.y + ny * (ball.radius + 3);
          reflectFromNormal(nx, ny, 0.98);
        }
      });
    }
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
    state.targets.forEach((target) => { target.active = true; });
    scoreElement.textContent = "0";
    livesElement.textContent = "3";
    pauseButton.textContent = "Pause";
    resetBall();
  }

  function launchBall() {
    if (!state.ball.launched) {
      state.ball.launched = true;
      state.ball.vx = -82;
      state.ball.vy = -520;
      statusElement.textContent = "Live";
    }
  }

  function togglePause() {
    if (statusElement.textContent === "Game Over") return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function addScore(value) {
    state.score += value;
    scoreElement.textContent = String(state.score);
  }

  function updateBall(delta) {
    if (!state.ball.launched || state.paused) return;

    state.ball.vy += 680 * delta;
    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;

    clampBallInside();

    state.bumpers.forEach((bumper) => {
      const dx = state.ball.x - bumper.x;
      const dy = state.ball.y - bumper.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = state.ball.radius + bumper.radius;
      if (distance < minDistance) {
        const nx = dx / (distance || 1);
        const ny = dy / (distance || 1);
        state.ball.x = bumper.x + nx * minDistance;
        state.ball.y = bumper.y + ny * minDistance;
        const baseSpeed = Math.max(280, Math.hypot(state.ball.vx, state.ball.vy));
        state.ball.vx = nx * baseSpeed * 1.06;
        state.ball.vy = ny * baseSpeed * 1.06;
        addScore(bumper.score);
      }
    });

    state.targets.forEach((target) => {
      if (!target.active) return;
      const hit = state.ball.x + state.ball.radius > target.x &&
        state.ball.x - state.ball.radius < target.x + target.width &&
        state.ball.y + state.ball.radius > target.y &&
        state.ball.y - state.ball.radius < target.y + target.height;
      if (hit) {
        target.active = false;
        state.ball.vx *= -1;
        addScore(target.score);
      }
    });

    flippers().forEach((flipper) => {
      const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
      const collision = lineDistance(state.ball.x, state.ball.y, flipper.pivotX, flipper.pivotY, tipX, tipY);
      const distance = Math.hypot(collision.dx, collision.dy);
      if (distance < state.ball.radius + 7 && state.ball.vy > -40) {
        const nx = collision.dx / (distance || 1);
        const ny = collision.dy / (distance || 1);
        state.ball.x = collision.x + nx * (state.ball.radius + 7);
        state.ball.y = collision.y + ny * (state.ball.radius + 7);
        const lift = flipper.side === "left" ? -280 : 280;
        state.ball.vx += lift * (flipper.side === "left" ? 1 : -1) * 0.55;
        state.ball.vy = -Math.abs(state.ball.vy) - (flipper.side === "left" || flipper.side === "right" ? 260 : 160);
        addScore(10);
      }
    });

    const ballSpeed = Math.hypot(state.ball.vx, state.ball.vy);
    if (ballSpeed > 760) {
      state.ball.vx *= 0.985;
      state.ball.vy *= 0.985;
    }

    if (state.ball.y - state.ball.radius > state.height + 18) {
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
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#130b1f");
    gradient.addColorStop(0.65, "#08101f");
    gradient.addColorStop(1, "#04060d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.strokeStyle = "#71e3ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(26, 580);
    ctx.lineTo(26, 96);
    ctx.lineTo(98, 30);
    ctx.lineTo(274, 30);
    ctx.lineTo(346, 96);
    ctx.lineTo(346, 580);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 3;
    ctx.strokeRect(360, 48, 34, 512);

    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath();
    ctx.moveTo(52, 454);
    ctx.lineTo(112, 582);
    ctx.moveTo(320, 454);
    ctx.lineTo(260, 582);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(66, 58, 220, 92);

    state.bumpers.forEach((bumper) => {
      ctx.fillStyle = bumper.color;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    state.targets.forEach((target) => {
      ctx.fillStyle = target.active ? target.color : "rgba(255,255,255,0.12)";
      ctx.fillRect(target.x, target.y, target.width, target.height);
    });

    flippers().forEach((flipper) => {
      const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
      ctx.strokeStyle = flipper.color;
      ctx.lineWidth = 14;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(flipper.pivotX, flipper.pivotY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = "#f7f5ff";
      ctx.beginPath();
      ctx.arc(flipper.pivotX, flipper.pivotY, 7, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = "#ff5fb2";
    ctx.fillRect(42, 470, 18, 96);
    ctx.fillRect(312, 470, 18, 96);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(370, 500, 14, 42);
  }

  function drawBall() {
    ctx.fillStyle = "#f7f5ff";
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOverlay() {
    if (state.ball.launched || state.paused) return;
    ctx.fillStyle = "rgba(247,245,255,0.92)";
    ctx.font = "22px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("Press Launch or Space", state.width / 2 - 16, state.height / 2);
  }

  function draw() {
    drawTable();
    drawBall();
    drawOverlay();
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03);
    state.lastTime = time;
    updateBall(delta);
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
    const action = button.dataset.action;
    if (action === "left") {
      const start = () => { state.leftActive = true; };
      const stop = () => { state.leftActive = false; };
      button.addEventListener("mousedown", start);
      button.addEventListener("touchstart", start, { passive: true });
      button.addEventListener("mouseup", stop);
      button.addEventListener("mouseleave", stop);
      button.addEventListener("touchend", stop);
    }
    if (action === "right") {
      const start = () => { state.rightActive = true; };
      const stop = () => { state.rightActive = false; };
      button.addEventListener("mousedown", start);
      button.addEventListener("touchstart", start, { passive: true });
      button.addEventListener("mouseup", stop);
      button.addEventListener("mouseleave", stop);
      button.addEventListener("touchend", stop);
    }
    if (action === "launch") button.addEventListener("click", launchBall);
    if (action === "pause") button.addEventListener("click", togglePause);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);

  restartGame();
  requestAnimationFrame(frame);
}

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
      { x: 112, y: 156, radius: 24, color: "#ff5fb2", score: 40 },
      { x: 208, y: 118, radius: 22, color: "#ffd166", score: 55 },
      { x: 304, y: 164, radius: 24, color: "#71e3ff", score: 40 },
      { x: 152, y: 258, radius: 16, color: "#87ff65", score: 80 },
      { x: 260, y: 258, radius: 16, color: "#ff9b54", score: 80 },
    ],
    posts: [
      { x: 82, y: 326, radius: 9 },
      { x: 330, y: 326, radius: 9 },
      { x: 208, y: 338, radius: 11 },
    ],
    targets: [
      { x: 72, y: 236, width: 16, height: 58, color: "#ff9b54", score: 90, active: true },
      { x: 332, y: 236, width: 16, height: 58, color: "#ff9b54", score: 90, active: true },
      { x: 202, y: 210, width: 16, height: 52, color: "#87ff65", score: 120, active: true },
      { x: 128, y: 86, width: 14, height: 46, color: "#ffd166", score: 110, active: true },
      { x: 276, y: 86, width: 14, height: 46, color: "#ffd166", score: 110, active: true },
    ],
  };

  function createBall() {
    return {
      x: 377,
      y: 520,
      vx: 0,
      vy: 0,
      radius: 8,
      launched: false,
    };
  }

  function flippers() {
    return [
      { pivotX: 146, pivotY: 546, length: 58, angle: state.leftActive ? -0.55 : 0.52, color: "#ff9b54" },
      { pivotX: 270, pivotY: 546, length: 58, angle: state.rightActive ? Math.PI + 0.55 : Math.PI - 0.52, color: "#ffd166" },
    ];
  }

  function lineDistance(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const lengthSquared = abx * abx + aby * aby || 1;
    const t = Math.max(0, Math.min(1, ((px - ax) * abx + (py - ay) * aby) / lengthSquared));
    const closestX = ax + abx * t;
    const closestY = ay + aby * t;
    return { x: closestX, y: closestY, dx: px - closestX, dy: py - closestY };
  }

  function reflect(nx, ny, boost = 1) {
    const dot = state.ball.vx * nx + state.ball.vy * ny;
    if (dot >= 0) return;
    state.ball.vx -= 2 * dot * nx;
    state.ball.vy -= 2 * dot * ny;
    state.ball.vx *= boost;
    state.ball.vy *= boost;
  }

  function circleCollision(circle, boost = 1.04, score = 0) {
    const dx = state.ball.x - circle.x;
    const dy = state.ball.y - circle.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = state.ball.radius + circle.radius;
    if (distance < minDistance) {
      const nx = dx / (distance || 1);
      const ny = dy / (distance || 1);
      state.ball.x = circle.x + nx * minDistance;
      state.ball.y = circle.y + ny * minDistance;
      reflect(nx, ny, boost);
      if (score) addScore(score);
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
      state.ball.vx = -48;
      state.ball.vy = -760;
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

  function handleWalls() {
    const ball = state.ball;
    if (ball.x - ball.radius < 24) {
      ball.x = 24 + ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.94;
    }
    if (ball.y - ball.radius < 22) {
      ball.y = 22 + ball.radius;
      ball.vy = Math.abs(ball.vy) * 0.96;
    }

    if (ball.x + ball.radius > 350 && ball.y < 560) {
      ball.x = 350 - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.94;
    }

    const slopes = [
      [24, 94, 94, 28],
      [350, 94, 280, 28],
      [54, 438, 118, 596],
      [320, 438, 258, 596],
      [96, 432, 160, 482],
      [278, 432, 222, 482],
    ];

    slopes.forEach(([ax, ay, bx, by]) => {
      const collision = lineDistance(ball.x, ball.y, ax, ay, bx, by);
      const distance = Math.hypot(collision.dx, collision.dy);
      if (distance < ball.radius + 3) {
        const nx = collision.dx / (distance || 1);
        const ny = collision.dy / (distance || 1);
        ball.x = collision.x + nx * (ball.radius + 3);
        ball.y = collision.y + ny * (ball.radius + 3);
        reflect(nx, ny, 1.01);
      }
    });
  }

  function handleTargets() {
    state.targets.forEach((target) => {
      if (!target.active) return;
      const hit =
        state.ball.x + state.ball.radius > target.x &&
        state.ball.x - state.ball.radius < target.x + target.width &&
        state.ball.y + state.ball.radius > target.y &&
        state.ball.y - state.ball.radius < target.y + target.height;
      if (hit) {
        target.active = false;
        state.ball.vx *= -1;
        addScore(target.score);
      }
    });
  }

  function handleFlippers() {
    flippers().forEach((flipper, index) => {
      const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
      const collision = lineDistance(state.ball.x, state.ball.y, flipper.pivotX, flipper.pivotY, tipX, tipY);
      const distance = Math.hypot(collision.dx, collision.dy);
      if (distance < state.ball.radius + 7 && state.ball.vy > -120) {
        const nx = collision.dx / (distance || 1);
        const ny = collision.dy / (distance || 1);
        state.ball.x = collision.x + nx * (state.ball.radius + 7);
        state.ball.y = collision.y + ny * (state.ball.radius + 7);
        state.ball.vy = -Math.max(360, Math.abs(state.ball.vy) + (index === 0 ? 280 : 280));
        state.ball.vx += index === 0 ? -150 : 150;
        addScore(12);
      }
    });
  }

  function updateBall(delta) {
    if (!state.ball.launched || state.paused) return;

    state.ball.vy += 700 * delta;
    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;

    handleWalls();
    state.bumpers.forEach((bumper) => circleCollision(bumper, 1.08, bumper.score));
    state.posts.forEach((post) => circleCollision(post, 1.03, 15));
    handleTargets();
    handleFlippers();

    const drainLeft = 182;
    const drainRight = 234;
    if (state.ball.y > 554 && state.ball.x > drainLeft && state.ball.x < drainRight) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        statusElement.textContent = "Game Over";
        state.paused = true;
      } else {
        resetBall();
      }
      return;
    }

    if (state.ball.y > state.height + 20) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        statusElement.textContent = "Game Over";
        state.paused = true;
      } else {
        resetBall();
      }
      return;
    }

    const speed = Math.hypot(state.ball.vx, state.ball.vy);
    if (speed > 820) {
      state.ball.vx *= 0.985;
      state.ball.vy *= 0.985;
    }
  }

  function drawTable() {
    ctx.clearRect(0, 0, state.width, state.height);
    const gradient = ctx.createLinearGradient(0, 0, 0, state.height);
    gradient.addColorStop(0, "#150a21");
    gradient.addColorStop(0.5, "#08101f");
    gradient.addColorStop(1, "#04060d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, state.width, state.height);

    ctx.strokeStyle = "#71e3ff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(24, 596);
    ctx.lineTo(24, 94);
    ctx.lineTo(94, 28);
    ctx.lineTo(280, 28);
    ctx.lineTo(350, 94);
    ctx.lineTo(350, 596);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.2)";
    ctx.lineWidth = 3;
    ctx.strokeRect(360, 48, 34, 512);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(72, 54, 210, 86);

    state.bumpers.forEach((bumper) => {
      ctx.fillStyle = bumper.color;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.24)";
      ctx.lineWidth = 3;
      ctx.stroke();
    });

    state.posts.forEach((post) => {
      ctx.fillStyle = "#f7f5ff";
      ctx.beginPath();
      ctx.arc(post.x, post.y, post.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    state.targets.forEach((target) => {
      ctx.fillStyle = target.active ? target.color : "rgba(255,255,255,0.12)";
      ctx.fillRect(target.x, target.y, target.width, target.height);
    });

    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.moveTo(54, 438);
    ctx.lineTo(118, 596);
    ctx.moveTo(320, 438);
    ctx.lineTo(258, 596);
    ctx.moveTo(96, 432);
    ctx.lineTo(160, 482);
    ctx.moveTo(278, 432);
    ctx.lineTo(222, 482);
    ctx.stroke();

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
    ctx.fillRect(44, 470, 18, 98);
    ctx.fillRect(310, 470, 18, 98);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
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
    ctx.fillText("Press Launch or Space", state.width / 2 - 14, state.height / 2);
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
      const start = (event) => { event?.preventDefault?.(); state.leftActive = true; };
      const stop = (event) => { event?.preventDefault?.(); state.leftActive = false; };
      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("pointerleave", stop);
    }
    if (action === "right") {
      const start = (event) => { event?.preventDefault?.(); state.rightActive = true; };
      const stop = (event) => { event?.preventDefault?.(); state.rightActive = false; };
      button.addEventListener("pointerdown", start);
      button.addEventListener("pointerup", stop);
      button.addEventListener("pointercancel", stop);
      button.addEventListener("pointerleave", stop);
    }
    if (action === "launch") button.addEventListener("click", launchBall);
    if (action === "pause") button.addEventListener("click", togglePause);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

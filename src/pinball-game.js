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
      { x: 110, y: 150, radius: 22, color: "#ff5fb2", score: 35 },
      { x: 206, y: 114, radius: 20, color: "#ffd166", score: 50 },
      { x: 302, y: 150, radius: 22, color: "#71e3ff", score: 35 },
      { x: 150, y: 250, radius: 16, color: "#87ff65", score: 65 },
      { x: 262, y: 250, radius: 16, color: "#ff9b54", score: 65 },
      { x: 206, y: 324, radius: 14, color: "#f7f5ff", score: 90 },
    ],
    posts: [
      { x: 82, y: 326, radius: 9 },
      { x: 330, y: 326, radius: 9 },
      { x: 126, y: 392, radius: 8 },
      { x: 290, y: 392, radius: 8 },
      { x: 206, y: 372, radius: 10 },
      { x: 206, y: 450, radius: 7 },
    ],
    targets: [
      { x: 68, y: 224, width: 16, height: 54, color: "#ff9b54", score: 90, active: true },
      { x: 332, y: 224, width: 16, height: 54, color: "#ff9b54", score: 90, active: true },
      { x: 200, y: 204, width: 16, height: 46, color: "#87ff65", score: 110, active: true },
      { x: 126, y: 84, width: 14, height: 44, color: "#ffd166", score: 110, active: true },
      { x: 274, y: 84, width: 14, height: 44, color: "#ffd166", score: 110, active: true },
      { x: 88, y: 146, width: 12, height: 40, color: "#71e3ff", score: 75, active: true },
      { x: 312, y: 146, width: 12, height: 40, color: "#71e3ff", score: 75, active: true },
    ],
  };

  function createBall() {
    return {
      x: 377,
      y: 518,
      vx: 0,
      vy: 0,
      radius: 8,
      launched: false,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function flippers() {
    return [
      { pivotX: 150, pivotY: 548, length: 64, angle: state.leftActive ? -0.72 : 0.4, color: "#ff9b54" },
      { pivotX: 266, pivotY: 548, length: 64, angle: state.rightActive ? Math.PI + 0.72 : Math.PI - 0.4, color: "#ffd166" },
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

  function addScore(value) {
    state.score += value;
    scoreElement.textContent = String(state.score);
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
      state.ball.vx = -12;
      state.ball.vy = -680;
      statusElement.textContent = "Live";
    }
  }

  function togglePause() {
    if (statusElement.textContent === "Game Over") return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function circleCollision(circle, boost = 1.01, score = 0) {
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

  function handleWalls() {
    const ball = state.ball;
    if (ball.x - ball.radius < 24) {
      ball.x = 24 + ball.radius;
      ball.vx = Math.abs(ball.vx) * 0.9;
    }
    if (ball.y - ball.radius < 22) {
      ball.y = 22 + ball.radius;
      ball.vy = Math.abs(ball.vy) * 0.78;
    }

    if (ball.x + ball.radius > 350 && ball.y < 562) {
      ball.x = 350 - ball.radius;
      ball.vx = -Math.abs(ball.vx) * 0.9;
    }

    const slopes = [
      [24, 94, 94, 28],
      [350, 94, 280, 28],
      [58, 436, 122, 596],
      [316, 436, 252, 596],
      [94, 430, 166, 484],
      [322, 430, 250, 484],
      [82, 204, 124, 152],
      [330, 204, 288, 152],
      [122, 336, 168, 292],
      [290, 336, 244, 292],
    ];

    slopes.forEach(([ax, ay, bx, by]) => {
      const collision = lineDistance(ball.x, ball.y, ax, ay, bx, by);
      const distance = Math.hypot(collision.dx, collision.dy);
      if (distance < ball.radius + 4) {
        const nx = collision.dx / (distance || 1);
        const ny = collision.dy / (distance || 1);
        ball.x = collision.x + nx * (ball.radius + 4);
        ball.y = collision.y + ny * (ball.radius + 4);
        reflect(nx, ny, 0.98);
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
      if (!hit) return;
      target.active = false;
      state.ball.vx *= -0.92;
      state.ball.vy *= 0.95;
      addScore(target.score);
    });
  }

  function handleFlippers() {
    flippers().forEach((flipper, index) => {
      const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
      const collision = lineDistance(state.ball.x, state.ball.y, flipper.pivotX, flipper.pivotY, tipX, tipY);
      const distance = Math.hypot(collision.dx, collision.dy);
      const active = index === 0 ? state.leftActive : state.rightActive;
      if (distance < state.ball.radius + 8 && state.ball.y < flipper.pivotY + 8) {
        const nx = collision.dx / (distance || 1);
        const ny = collision.dy / (distance || 1);
        state.ball.x = collision.x + nx * (state.ball.radius + 8);
        state.ball.y = collision.y + ny * (state.ball.radius + 8);
        const sideKick = active ? 150 : 50;
        state.ball.vy = -Math.max(active ? 460 : 320, Math.abs(state.ball.vy) * 0.55 + (active ? 90 : 50));
        state.ball.vx = clamp(state.ball.vx + (index === 0 ? -sideKick : sideKick), -300, 300);
        addScore(active ? 18 : 8);
      }
    });
  }

  function handleDrain() {
    const drainLeft = 190;
    const drainRight = 226;
    if (state.ball.y > 556 && state.ball.x > drainLeft && state.ball.x < drainRight) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        statusElement.textContent = "Game Over";
        state.paused = true;
      } else {
        resetBall();
      }
      return true;
    }

    if (state.ball.y > state.height + 24) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        statusElement.textContent = "Game Over";
        state.paused = true;
      } else {
        resetBall();
      }
      return true;
    }
    return false;
  }

  function stabilizeBall() {
    state.ball.vx *= 0.994;
    state.ball.vy *= 0.996;
    const speed = Math.hypot(state.ball.vx, state.ball.vy);
    if (speed > 690) {
      const scale = 690 / speed;
      state.ball.vx *= scale;
      state.ball.vy *= scale;
    }
  }

  function updateBall(delta) {
    if (!state.ball.launched || state.paused) return;

    state.ball.vy += 820 * delta;
    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;

    handleWalls();
    state.bumpers.forEach((bumper, index) => circleCollision(bumper, index < 3 ? 1.015 : 1.005, bumper.score));
    state.posts.forEach((post) => circleCollision(post, 0.99, 12));
    handleTargets();
    handleFlippers();
    stabilizeBall();

    if (handleDrain()) return;
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
    ctx.fillRect(70, 52, 214, 90);
    ctx.fillRect(88, 178, 238, 26);
    ctx.fillRect(116, 286, 180, 18);

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
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(58, 436);
    ctx.lineTo(122, 596);
    ctx.moveTo(316, 436);
    ctx.lineTo(252, 596);
    ctx.moveTo(94, 430);
    ctx.lineTo(166, 484);
    ctx.moveTo(322, 430);
    ctx.lineTo(250, 484);
    ctx.moveTo(82, 204);
    ctx.lineTo(124, 152);
    ctx.moveTo(330, 204);
    ctx.lineTo(288, 152);
    ctx.moveTo(122, 336);
    ctx.lineTo(168, 292);
    ctx.moveTo(290, 336);
    ctx.lineTo(244, 292);
    ctx.stroke();

    flippers().forEach((flipper) => {
      const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
      ctx.strokeStyle = flipper.color;
      ctx.lineWidth = 15;
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

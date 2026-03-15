const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const statusElement = document.querySelector("#ball-status");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const TABLE = { left: 28, right: 352, top: 26, bottom: 600 };
  const SHOOTER = { left: 364, right: 392, top: 48, bottom: 564, exitX: 350, exitY: 128 };
  const BALL_RADIUS = 7.5;
  const GRAVITY = 760;
  const MAX_SPEED = 760;
  const FLIPPER_SPEED = 10.5;

  const state = {
    width: canvas.width,
    height: canvas.height,
    score: 0,
    lives: 3,
    paused: false,
    gameOver: false,
    leftActive: false,
    rightActive: false,
    leftAngle: 0.42,
    rightAngle: Math.PI - 0.42,
    leftAngularVelocity: 0,
    rightAngularVelocity: 0,
    ball: null,
    lastTime: 0,
    bumpers: [
      { x: 118, y: 148, radius: 24, color: "#ffb347", ring: "#ffe0a6", score: 40 },
      { x: 210, y: 112, radius: 22, color: "#ffd166", ring: "#fff1b5", score: 55 },
      { x: 302, y: 150, radius: 24, color: "#71e3ff", ring: "#cff7ff", score: 40 },
      { x: 150, y: 258, radius: 18, color: "#ff6b6b", ring: "#ffc1c1", score: 70 },
      { x: 270, y: 262, radius: 18, color: "#c9a227", ring: "#f7e4a3", score: 70 }
    ],
    posts: [
      { x: 86, y: 330, radius: 9 },
      { x: 334, y: 330, radius: 9 },
      { x: 112, y: 452, radius: 8 },
      { x: 308, y: 452, radius: 8 },
      { x: 182, y: 520, radius: 7 },
      { x: 238, y: 520, radius: 7 },
      { x: 362, y: 122, radius: 7 },
      { x: 362, y: 232, radius: 7 }
    ],
    targets: [
      { x: 72, y: 218, width: 18, height: 56, color: "#ff9b54", score: 110, active: true },
      { x: 330, y: 218, width: 18, height: 56, color: "#ff9b54", score: 110, active: true },
      { x: 202, y: 194, width: 16, height: 54, color: "#87ff65", score: 140, active: true },
      { x: 122, y: 86, width: 14, height: 46, color: "#ffd166", score: 95, active: true },
      { x: 284, y: 86, width: 14, height: 46, color: "#ffd166", score: 95, active: true },
      { x: 352, y: 308, width: 14, height: 44, color: "#71e3ff", score: 125, active: true }
    ],
    lights: [
      { x: 90, y: 72, color: "#ffb347" },
      { x: 146, y: 58, color: "#ffd166" },
      { x: 210, y: 54, color: "#71e3ff" },
      { x: 274, y: 58, color: "#ff6b6b" },
      { x: 330, y: 72, color: "#c9a227" }
    ]
  };
  window.__retroArcadeGameState = state;

  function createBall() {
    return {
      x: 378,
      y: 528,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      launched: false,
      mode: "ready",
      trail: [],
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
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
    state.gameOver = false;
    state.leftActive = false;
    state.rightActive = false;
    state.leftAngle = 0.42;
    state.rightAngle = Math.PI - 0.42;
    state.leftAngularVelocity = 0;
    state.rightAngularVelocity = 0;
    state.targets.forEach((target) => { target.active = true; });
    scoreElement.textContent = "0";
    livesElement.textContent = "3";
    pauseButton.textContent = "Pause";
    resetBall();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function launchBall() {
    if (state.ball.mode !== "ready" || state.gameOver) return;
    state.ball.launched = true;
    state.ball.mode = "tube";
    state.ball.vx = 0;
    state.ball.vy = -540;
    statusElement.textContent = "Launch";
  }

  function flippers() {
    return [
      {
        pivotX: 148,
        pivotY: 548,
        length: 56,
        width: 15,
        angle: state.leftAngle,
        color: "#ff9b54",
        glow: "rgba(255, 155, 84, 0.42)",
        angularVelocity: state.leftAngularVelocity,
        side: "left"
      },
      {
        pivotX: 272,
        pivotY: 548,
        length: 56,
        width: 15,
        angle: state.rightAngle,
        color: "#ffd166",
        glow: "rgba(255, 209, 102, 0.42)",
        angularVelocity: state.rightAngularVelocity,
        side: "right"
      }
    ];
  }

  function updateFlippers(delta) {
    const leftTarget = state.leftActive ? -0.56 : 0.42;
    const rightTarget = state.rightActive ? Math.PI + 0.56 : Math.PI - 0.42;
    const nextLeft = clamp(leftTarget - state.leftAngle, -FLIPPER_SPEED * delta, FLIPPER_SPEED * delta);
    const nextRight = clamp(rightTarget - state.rightAngle, -FLIPPER_SPEED * delta, FLIPPER_SPEED * delta);
    state.leftAngularVelocity = delta > 0 ? nextLeft / delta : 0;
    state.rightAngularVelocity = delta > 0 ? nextRight / delta : 0;
    state.leftAngle += nextLeft;
    state.rightAngle += nextRight;
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

  function reflectVelocity(nx, ny, restitution = 0.92) {
    const dot = state.ball.vx * nx + state.ball.vy * ny;
    if (dot >= 0) return;
    state.ball.vx -= 2 * dot * nx;
    state.ball.vy -= 2 * dot * ny;
    state.ball.vx *= restitution;
    state.ball.vy *= restitution;
  }

  function pushBallOut(collision, padding) {
    const distance = Math.hypot(collision.dx, collision.dy) || 1;
    const nx = collision.dx / distance;
    const ny = collision.dy / distance;
    state.ball.x = collision.x + nx * padding;
    state.ball.y = collision.y + ny * padding;
    return { nx, ny };
  }

  function collideCircle(circle, restitution = 0.96, score = 0, impulse = 0) {
    const dx = state.ball.x - circle.x;
    const dy = state.ball.y - circle.y;
    const distance = Math.hypot(dx, dy);
    const minDistance = state.ball.radius + circle.radius;
    if (distance >= minDistance) return false;
    const nx = dx / (distance || 1);
    const ny = dy / (distance || 1);
    state.ball.x = circle.x + nx * minDistance;
    state.ball.y = circle.y + ny * minDistance;
    reflectVelocity(nx, ny, restitution);
    if (impulse) {
      state.ball.vx += nx * impulse;
      state.ball.vy += ny * impulse;
    }
    if (score) addScore(score);
    return true;
  }

  function tableSegments() {
    return [
      { ax: 28, ay: 598, bx: 28, by: 96, restitution: 0.9 },
      { ax: 28, ay: 96, bx: 96, by: 32, restitution: 0.92 },
      { ax: 96, ay: 32, bx: 286, by: 32, restitution: 0.92 },
      { ax: 286, ay: 32, bx: 352, by: 94, restitution: 0.92 },
      { ax: 352, ay: 94, bx: 352, by: 598, restitution: 0.9 },
      { ax: 60, ay: 440, bx: 122, by: 596, restitution: 0.88 },
      { ax: 320, ay: 440, bx: 258, by: 596, restitution: 0.88 },
      { ax: 92, ay: 430, bx: 162, by: 486, restitution: 0.92, sling: "left" },
      { ax: 328, ay: 430, bx: 258, by: 486, restitution: 0.92, sling: "right" },
      { ax: 88, ay: 214, bx: 128, by: 162, restitution: 0.94 },
      { ax: 332, ay: 214, bx: 292, by: 162, restitution: 0.94 },
      { ax: 126, ay: 344, bx: 174, by: 292, restitution: 0.9 },
      { ax: 294, ay: 344, bx: 246, by: 292, restitution: 0.9 },
      { ax: 364, ay: 48, bx: 364, by: 564, restitution: 0.86 },
      { ax: 392, ay: 48, bx: 392, by: 564, restitution: 0.86 },
      { ax: 364, ay: 48, bx: 392, by: 48, restitution: 0.86 },
      { ax: 364, ay: 564, bx: 392, by: 564, restitution: 0.86 }
    ];
  }

  function handleWallCollisions() {
    const ball = state.ball;
    if (ball.mode === "tube") return;
    tableSegments().forEach((segment) => {
      const collision = lineDistance(ball.x, ball.y, segment.ax, segment.ay, segment.bx, segment.by);
      const distance = Math.hypot(collision.dx, collision.dy);
      const padding = ball.radius + 3;
      if (distance >= padding) return;
      const push = pushBallOut(collision, padding);
      reflectVelocity(push.nx, push.ny, segment.restitution);
      if (segment.sling) {
        const slingKick = segment.sling === "left" ? { x: 110, y: -160 } : { x: -110, y: -160 };
        state.ball.vx += slingKick.x;
        state.ball.vy += slingKick.y;
        addScore(12);
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
      state.ball.vx *= -0.88;
      state.ball.vy = Math.min(state.ball.vy, -200);
      addScore(target.score);
    });
  }

  function handleFlippers() {
    flippers().forEach((flipper) => {
      const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
      const collision = lineDistance(state.ball.x, state.ball.y, flipper.pivotX, flipper.pivotY, tipX, tipY);
      const distance = Math.hypot(collision.dx, collision.dy);
      const padding = state.ball.radius + flipper.width * 0.55;
      if (distance >= padding) return;
      const push = pushBallOut(collision, padding);
      reflectVelocity(push.nx, push.ny, 0.9);
      const tangentX = (tipX - flipper.pivotX) / flipper.length;
      const tangentY = (tipY - flipper.pivotY) / flipper.length;
      const flipStrength = Math.abs(flipper.angularVelocity) * 22;
      const reachBoost = 0.65 + collision.t * 0.65;
      if (flipStrength > 6) {
        state.ball.vx += tangentX * flipStrength * reachBoost + (flipper.side === "left" ? -36 : 36);
        state.ball.vy += tangentY * flipStrength * reachBoost - 280;
      } else {
        state.ball.vy -= 32;
      }
      if (state.ball.vy > -260) state.ball.vy = -260;
      addScore(flipStrength > 6 ? 16 : 6);
    });
  }

  function handleDrain() {
    const drainLeft = 194;
    const drainRight = 226;
    if (state.ball.y > 584 && state.ball.x > drainLeft && state.ball.x < drainRight) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        statusElement.textContent = "Game Over";
        state.gameOver = true;
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
        state.gameOver = true;
        state.paused = true;
      } else {
        resetBall();
      }
      return true;
    }
    return false;
  }

  function stabilizeBall() {
    const ball = state.ball;
    if (ball.mode === "tube") return;
    ball.vx *= 0.997;
    ball.vy *= 0.998;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      ball.vx *= scale;
      ball.vy *= scale;
    }
    if (ball.launched && ball.mode === "live" && speed < 220) {
      const scale = 220 / Math.max(speed, 1);
      ball.vx *= scale;
      ball.vy *= scale;
    }
  }

  function updateLaunchTube(step) {
    const ball = state.ball;
    ball.x = 378;
    ball.y += ball.vy * step;
    if (ball.y <= SHOOTER.exitY) {
      ball.mode = "live";
      ball.x = SHOOTER.exitX;
      ball.y = SHOOTER.exitY;
      ball.vx = -248;
      ball.vy = -188;
      statusElement.textContent = "Live";
    }
  }

  function updateBallStep(step) {
    const ball = state.ball;
    if (!ball.launched) return;

    if (ball.mode === "tube") {
      updateLaunchTube(step);
      ball.trail.unshift({ x: ball.x, y: ball.y });
      ball.trail = ball.trail.slice(0, 8);
      return;
    }

    ball.vy += GRAVITY * step;
    ball.x += ball.vx * step;
    ball.y += ball.vy * step;

    handleWallCollisions();
    const pulse = performance.now() / 140;
    state.bumpers.forEach((bumper, index) => collideCircle(bumper, 0.96, bumper.score, index < 3 ? 38 + Math.sin(pulse + index) * 8 : 22));
    state.posts.forEach((post) => collideCircle(post, 0.9, 8, 8));
    handleTargets();
    handleFlippers();
    stabilizeBall();

    ball.trail.unshift({ x: ball.x, y: ball.y });
    ball.trail = ball.trail.slice(0, 8);
  }

  function updateBall(delta) {
    if (state.paused) return;
    updateFlippers(delta);
    if (!state.ball.launched) return;
    let remaining = delta;
    while (remaining > 0) {
      const step = Math.min(1 / 120, remaining);
      updateBallStep(step);
      if (state.ball.mode === "live" && handleDrain()) return;
      remaining -= step;
    }
  }

  function drawBackground() {
    const background = ctx.createLinearGradient(0, 0, 0, state.height);
    background.addColorStop(0, "#241505");
    background.addColorStop(0.4, "#5b3511");
    background.addColorStop(1, "#130a04");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, state.width, state.height);

    const sun = ctx.createRadialGradient(210, 120, 24, 210, 120, 180);
    sun.addColorStop(0, "rgba(255, 209, 102, 0.38)");
    sun.addColorStop(1, "rgba(255, 209, 102, 0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, state.width, 260);

    ctx.fillStyle = "rgba(24, 11, 4, 0.42)";
    ctx.beginPath();
    ctx.moveTo(24, 230);
    ctx.lineTo(116, 110);
    ctx.lineTo(198, 230);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(178, 238);
    ctx.lineTo(272, 96);
    ctx.lineTo(366, 238);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "rgba(18, 10, 3, 0.5)";
    ctx.fillRect(0, 414, state.width, 206);
    ctx.fillRect(122, 360, 176, 46);
    ctx.beginPath();
    ctx.moveTo(136, 360);
    ctx.lineTo(166, 334);
    ctx.lineTo(254, 334);
    ctx.lineTo(284, 360);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(160, 344, 12, 22);
    ctx.fillRect(248, 344, 12, 22);

    ctx.fillStyle = "rgba(255, 209, 102, 0.12)";
    for (let i = 0; i < 14; i += 1) {
      ctx.fillRect(0, 438 + i * 12, state.width, 1);
    }
  }

  function drawTable() {
    drawBackground();

    ctx.strokeStyle = "#e0c17b";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(28, 598);
    ctx.lineTo(28, 96);
    ctx.lineTo(96, 32);
    ctx.lineTo(286, 32);
    ctx.lineTo(352, 94);
    ctx.lineTo(352, 598);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 233, 183, 0.16)";
    ctx.lineWidth = 3;
    ctx.strokeRect(364, 48, 28, 516);

    ctx.fillStyle = "rgba(255,255,255,0.045)";
    ctx.fillRect(74, 48, 214, 94);
    ctx.fillRect(92, 182, 236, 24);
    ctx.fillRect(122, 292, 176, 18);
    ctx.fillRect(60, 444, 72, 134);
    ctx.fillRect(288, 444, 72, 134);

    ctx.strokeStyle = "rgba(255, 239, 199, 0.2)";
    ctx.lineWidth = 4;
    tableSegments().forEach((segment) => {
      ctx.beginPath();
      ctx.moveTo(segment.ax, segment.ay);
      ctx.lineTo(segment.bx, segment.by);
      ctx.stroke();
    });

    state.lights.forEach((light, index) => {
      const pulse = 0.52 + Math.sin(performance.now() / 180 + index * 0.9) * 0.28;
      ctx.fillStyle = light.color;
      ctx.shadowColor = light.color;
      ctx.shadowBlur = 18 * pulse;
      ctx.beginPath();
      ctx.arc(light.x, light.y, 6 + pulse, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }

  function drawBumpers() {
    state.bumpers.forEach((bumper, index) => {
      const pulse = 0.86 + Math.sin(performance.now() / 170 + index) * 0.14;
      const ring = ctx.createRadialGradient(bumper.x - 6, bumper.y - 6, 4, bumper.x, bumper.y, bumper.radius + 14);
      ring.addColorStop(0, bumper.ring);
      ring.addColorStop(0.4, bumper.color);
      ring.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = ring;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius + 8 + pulse * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = bumper.color;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bumper.ring;
      ctx.beginPath();
      ctx.arc(bumper.x, bumper.y, bumper.radius * 0.52, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.34)";
      ctx.lineWidth = 3;
      ctx.stroke();
    });
  }

  function drawTargets() {
    state.targets.forEach((target, index) => {
      const pulse = 0.55 + Math.sin(performance.now() / 160 + index * 1.3) * 0.2;
      ctx.fillStyle = target.active ? target.color : "rgba(255,255,255,0.14)";
      ctx.fillRect(target.x, target.y, target.width, target.height);
      ctx.fillStyle = target.active ? `rgba(255,255,255,${0.18 + pulse * 0.18})` : "rgba(255,255,255,0.08)";
      ctx.fillRect(target.x + 2, target.y + 3, target.width - 4, 10);
      ctx.strokeStyle = "rgba(16,18,33,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(target.x + 1, target.y + 1, target.width - 2, target.height - 2);
    });
  }

  function drawPosts() {
    state.posts.forEach((post) => {
      ctx.fillStyle = "#f0e3bf";
      ctx.beginPath();
      ctx.arc(post.x, post.y, post.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.24)";
      ctx.beginPath();
      ctx.arc(post.x, post.y, Math.max(2, post.radius - 4), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawFlippers() {
    flippers().forEach((flipper) => {
      const tipX = flipper.pivotX + Math.cos(flipper.angle) * flipper.length;
      const tipY = flipper.pivotY + Math.sin(flipper.angle) * flipper.length;
      ctx.strokeStyle = flipper.color;
      ctx.lineWidth = 16;
      ctx.lineCap = "round";
      ctx.shadowColor = flipper.glow;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.moveTo(flipper.pivotX, flipper.pivotY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#f7f5ff";
      ctx.beginPath();
      ctx.arc(flipper.pivotX, flipper.pivotY, 7, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawLauncher() {
    const pulse = 0.6 + Math.sin(performance.now() / 180) * 0.2;
    ctx.fillStyle = "rgba(210, 181, 118, 0.14)";
    ctx.fillRect(368, 492, 20, 54);
    ctx.fillStyle = `rgba(255, 209, 102, ${0.28 + pulse * 0.22})`;
    ctx.fillRect(372, 516, 12, 26);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(372, 500, 12, 10);
  }

  function drawBall() {
    state.ball.trail.forEach((point, index) => {
      const alpha = (1 - index / state.ball.trail.length) * 0.18;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(point.x, point.y, Math.max(2, state.ball.radius - index * 0.6), 0, Math.PI * 2);
      ctx.fill();
    });

    const ballGradient = ctx.createRadialGradient(state.ball.x - 2, state.ball.y - 2, 2, state.ball.x, state.ball.y, state.ball.radius + 2);
    ballGradient.addColorStop(0, "#ffffff");
    ballGradient.addColorStop(0.35, "#f1f6ff");
    ballGradient.addColorStop(1, "#a8b5c7");
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawOverlay() {
    if (state.ball.mode !== "ready" || state.paused) return;
    ctx.fillStyle = "rgba(247,245,255,0.94)";
    ctx.font = "22px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("Launch the Ball", state.width / 2 - 12, state.height / 2 - 10);
    ctx.font = "14px 'Courier New'";
    ctx.fillText("Die Kugel kommt oben sauber aus der Röhre. Danach musst du wirklich arbeiten.", state.width / 2 - 12, state.height / 2 + 18);
  }

  function draw() {
    drawTable();
    drawBumpers();
    drawTargets();
    drawPosts();
    drawFlippers();
    drawLauncher();
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

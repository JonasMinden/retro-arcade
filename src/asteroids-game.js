const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const waveElement = document.querySelector("#wave");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const moveButtons = Array.from(document.querySelectorAll("[data-move]"));
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    width: canvas.width,
    height: canvas.height,
    ship: null,
    bullets: [],
    asteroids: [],
    score: 0,
    lives: 3,
    wave: 1,
    paused: false,
    gameOver: false,
    thrusting: false,
    turn: 0,
    lastTime: 0,
  };
  window.__retroArcadeGameState = state;

  function wrapPosition(body) {
    if (body.x < 0) body.x += state.width;
    if (body.x > state.width) body.x -= state.width;
    if (body.y < 0) body.y += state.height;
    if (body.y > state.height) body.y -= state.height;
  }

  function createShip() {
    return { x: state.width / 2, y: state.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, radius: 16 };
  }

  function createAsteroid(size, x = Math.random() * state.width, y = Math.random() * state.height) {
    const radius = size === 3 ? 34 : size === 2 ? 22 : 14;
    return {
      x,
      y,
      vx: (Math.random() * 2 - 1) * (35 + (4 - size) * 18),
      vy: (Math.random() * 2 - 1) * (35 + (4 - size) * 18),
      radius,
      size,
      rotation: Math.random() * Math.PI * 2,
      spin: (Math.random() * 2 - 1) * 0.8,
    };
  }

  function createWave() {
    state.asteroids = [];
    for (let i = 0; i < state.wave + 2; i += 1) {
      let asteroid = createAsteroid(3);
      while (Math.hypot(asteroid.x - state.width / 2, asteroid.y - state.height / 2) < 100) {
        asteroid = createAsteroid(3);
      }
      state.asteroids.push(asteroid);
    }
  }

  function restartGame() {
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.paused = false;
    state.gameOver = false;
    state.ship = createShip();
    state.bullets = [];
    scoreElement.textContent = "0";
    livesElement.textContent = "3";
    waveElement.textContent = "1";
    pauseButton.textContent = "Pause";
    createWave();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function fire() {
    if (state.paused || state.gameOver) return;
    if (state.bullets.length < 5) {
      state.bullets.push({
        x: state.ship.x + Math.cos(state.ship.angle) * 18,
        y: state.ship.y + Math.sin(state.ship.angle) * 18,
        vx: state.ship.vx + Math.cos(state.ship.angle) * 340,
        vy: state.ship.vy + Math.sin(state.ship.angle) * 340,
        life: 1.2,
      });
    }
  }

  function splitAsteroid(asteroid) {
    if (asteroid.size > 1) {
      state.asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
      state.asteroids.push(createAsteroid(asteroid.size - 1, asteroid.x, asteroid.y));
    }
  }

  function respawnShip() {
    state.ship = createShip();
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.ship.angle += state.turn * 3.2 * delta;
    if (state.thrusting) {
      state.ship.vx += Math.cos(state.ship.angle) * 120 * delta;
      state.ship.vy += Math.sin(state.ship.angle) * 120 * delta;
    }
    state.ship.vx *= 0.992;
    state.ship.vy *= 0.992;
    state.ship.x += state.ship.vx * delta;
    state.ship.y += state.ship.vy * delta;
    wrapPosition(state.ship);

    state.bullets.forEach((bullet) => {
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      wrapPosition(bullet);
    });
    state.bullets = state.bullets.filter((bullet) => bullet.life > 0);

    state.asteroids.forEach((asteroid) => {
      asteroid.x += asteroid.vx * delta;
      asteroid.y += asteroid.vy * delta;
      asteroid.rotation += asteroid.spin * delta;
      wrapPosition(asteroid);
    });

    state.bullets.forEach((bullet) => {
      state.asteroids.forEach((asteroid) => {
        const hit = Math.hypot(bullet.x - asteroid.x, bullet.y - asteroid.y) < asteroid.radius;
        if (hit && bullet.life > 0) {
          bullet.life = 0;
          asteroid.hit = true;
          state.score += asteroid.size === 3 ? 20 : asteroid.size === 2 ? 50 : 100;
          scoreElement.textContent = String(state.score);
          splitAsteroid(asteroid);
        }
      });
    });
    state.asteroids = state.asteroids.filter((asteroid) => !asteroid.hit);

    if (state.asteroids.some((asteroid) => Math.hypot(state.ship.x - asteroid.x, state.ship.y - asteroid.y) < asteroid.radius + state.ship.radius)) {
      state.lives -= 1;
      livesElement.textContent = String(state.lives);
      if (state.lives <= 0) {
        state.gameOver = true;
      } else {
        respawnShip();
      }
    }

    if (!state.asteroids.length) {
      state.wave += 1;
      waveElement.textContent = String(state.wave);
      createWave();
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(state.ship.x, state.ship.y);
    ctx.rotate(state.ship.angle + Math.PI / 2);
    ctx.strokeStyle = "#71e3ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(13, 10);
    ctx.lineTo(6, 7);
    ctx.lineTo(4, 16);
    ctx.lineTo(-4, 16);
    ctx.lineTo(-6, 7);
    ctx.lineTo(-13, 10);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(113,227,255,0.12)";
    ctx.fill();
    ctx.fillStyle = "#ffd166";
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    if (state.thrusting) {
      ctx.strokeStyle = "#ff9b54";
      ctx.beginPath();
      ctx.moveTo(-5, 15);
      ctx.lineTo(0, 28);
      ctx.lineTo(5, 15);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawAsteroids() {
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    state.asteroids.forEach((asteroid) => {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y);
      ctx.rotate(asteroid.rotation);
      ctx.beginPath();
      const points = 8;
      for (let i = 0; i < points; i += 1) {
        const angle = (Math.PI * 2 * i) / points;
        const radius = asteroid.radius * (0.8 + (i % 2) * 0.28);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });
  }

  function drawBullets() {
    ctx.fillStyle = "#ff5fb2";
    state.bullets.forEach((bullet) => ctx.fillRect(bullet.x - 1, bullet.y - 1, 3, 3));
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "28px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(title, state.width / 2, state.height / 2 - 10);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(subtitle, state.width / 2, state.height / 2 + 20);
  }

  function draw() {
    ctx.clearRect(0, 0, state.width, state.height);
    ctx.fillStyle = "#08101f";
    ctx.fillRect(0, 0, state.width, state.height);
    drawAsteroids();
    drawBullets();
    drawShip();
    if (state.paused) drawOverlay("Paused", "Press pause again to resume");
    if (state.gameOver) drawOverlay("Game Over", "Press Restart to launch again");
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
    if (key === "a" || key === "arrowleft") state.turn = -1;
    if (key === "d" || key === "arrowright") state.turn = 1;
    if (key === "w" || key === "arrowup") state.thrusting = true;
    if (key === " ") {
      event.preventDefault();
      fire();
    }
    if (key === "p") togglePause();
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (["a", "arrowleft", "d", "arrowright"].includes(key)) state.turn = 0;
    if (["w", "arrowup"].includes(key)) state.thrusting = false;
  });

  moveButtons.forEach((button) => {
    const start = () => { state.turn = button.dataset.move === "left" ? -1 : 1; };
    const stop = () => { state.turn = 0; };
    button.addEventListener("mousedown", start);
    button.addEventListener("touchstart", start, { passive: true });
    button.addEventListener("mouseup", stop);
    button.addEventListener("mouseleave", stop);
    button.addEventListener("touchend", stop);
  });

  actionButtons.forEach((button) => {
    if (button.dataset.action === "thrust") {
      const start = () => { state.thrusting = true; };
      const stop = () => { state.thrusting = false; };
      button.addEventListener("mousedown", start);
      button.addEventListener("touchstart", start, { passive: true });
      button.addEventListener("mouseup", stop);
      button.addEventListener("mouseleave", stop);
      button.addEventListener("touchend", stop);
    }
    if (button.dataset.action === "fire") button.addEventListener("click", fire);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", restartGame);
  restartGame();
  requestAnimationFrame(frame);
}


const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const waveElement = document.querySelector("#wave");
  const healthLabel = document.querySelector("#health-label");
  const healthFill = document.querySelector("#health-fill");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const state = {
    score: 0,
    wave: 1,
    paused: false,
    gameOver: false,
    lastTime: 0,
    input: { x: 0, y: 0 },
    player: null,
    enemies: [],
    rocks: [],
    particles: [],
    walls: [],
  };
  window.__retroArcadeGameState = state;

  function createMaze() {
    return [
      { x: 0, y: 0, w: 640, h: 20 },
      { x: 0, y: 400, w: 640, h: 20 },
      { x: 0, y: 0, w: 20, h: 420 },
      { x: 620, y: 0, w: 20, h: 420 },
      { x: 126, y: 20, w: 16, h: 92 },
      { x: 126, y: 160, w: 16, h: 170 },
      { x: 244, y: 92, w: 16, h: 76 },
      { x: 244, y: 216, w: 16, h: 144 },
      { x: 362, y: 20, w: 16, h: 104 },
      { x: 362, y: 172, w: 16, h: 168 },
      { x: 480, y: 92, w: 16, h: 90 },
      { x: 480, y: 232, w: 16, h: 128 },
      { x: 20, y: 94, w: 74, h: 14 },
      { x: 142, y: 94, w: 100, h: 14 },
      { x: 300, y: 94, w: 62, h: 14 },
      { x: 426, y: 94, w: 194, h: 14 },
      { x: 20, y: 196, w: 132, h: 14 },
      { x: 206, y: 196, w: 96, h: 14 },
      { x: 378, y: 196, w: 242, h: 14 },
      { x: 20, y: 304, w: 82, h: 14 },
      { x: 142, y: 304, w: 100, h: 14 },
      { x: 300, y: 304, w: 62, h: 14 },
      { x: 426, y: 304, w: 194, h: 14 }
    ];
  }

  function createPlayer() {
    return {
      x: 54,
      y: 52,
      radius: 12,
      speed: 160,
      health: 100,
      jumpTimer: 0,
      invulnerable: 0,
      hitFlash: 0,
    };
  }

  function createEnemy(x, y, seed = 0) {
    return {
      x,
      y,
      radius: 12,
      speed: 68 + seed * 4,
      dirX: 0,
      dirY: 0,
      think: 0.18 + Math.random() * 0.2,
      throwCooldown: 0.8 + Math.random() * 0.6,
      panic: 0,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function collidesCircleRect(x, y, radius, wall) {
    const nearestX = clamp(x, wall.x, wall.x + wall.w);
    const nearestY = clamp(y, wall.y, wall.y + wall.h);
    return Math.hypot(x - nearestX, y - nearestY) < radius;
  }

  function collidesMaze(x, y, radius) {
    return state.walls.some((wall) => collidesCircleRect(x, y, radius, wall));
  }

  function moveActor(actor, dx, dy, delta) {
    const nx = actor.x + dx * actor.speed * delta;
    const ny = actor.y + dy * actor.speed * delta;
    if (!collidesMaze(nx, actor.y, actor.radius)) actor.x = nx;
    if (!collidesMaze(actor.x, ny, actor.radius)) actor.y = ny;
    actor.x = clamp(actor.x, 22, canvas.width - 22);
    actor.y = clamp(actor.y, 22, canvas.height - 22);
  }

  function spawnParticle(x, y, color, count = 8) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.45;
      const speed = 20 + Math.random() * 60;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.25 + Math.random() * 0.3,
        age: 0,
        color,
      });
    }
  }

  function damagePlayer(amount) {
    if (state.player.invulnerable > 0) return;
    state.player.health = Math.max(0, state.player.health - amount);
    state.player.invulnerable = 0.8;
    state.player.hitFlash = 0.3;
    healthLabel.textContent = String(Math.round(state.player.health));
    healthFill.style.width = `${state.player.health}%`;
    spawnParticle(state.player.x, state.player.y, "rgba(255, 107, 107, 0.9)", 10);
    if (state.player.health <= 0) {
      state.gameOver = true;
      state.paused = true;
      pauseButton.textContent = "Pause";
    }
  }

  function resetGame() {
    state.score = 0;
    state.wave = 1;
    state.paused = false;
    state.gameOver = false;
    state.lastTime = 0;
    state.input = { x: 0, y: 0 };
    state.player = createPlayer();
    state.enemies = [
      createEnemy(566, 56, 1),
      createEnemy(566, 356, 2),
      createEnemy(320, 352, 3),
    ];
    state.rocks = [];
    state.particles = [];
    state.walls = createMaze();
    scoreElement.textContent = "0";
    waveElement.textContent = "1";
    healthLabel.textContent = "100";
    healthFill.style.width = "100%";
    pauseButton.textContent = "Pause";
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function canSeePlayer(enemy) {
    const steps = 18;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const px = enemy.x + (state.player.x - enemy.x) * t;
      const py = enemy.y + (state.player.y - enemy.y) * t;
      if (collidesMaze(px, py, 4)) return false;
    }
    return true;
  }

  function throwRock(enemy) {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    state.rocks.push({
      x: enemy.x,
      y: enemy.y,
      vx: (dx / distance) * (180 + state.wave * 10),
      vy: (dy / distance) * (180 + state.wave * 10) - 18,
      radius: 6,
      life: 3,
    });
    spawnParticle(enemy.x, enemy.y, "rgba(210, 181, 118, 0.7)", 5);
  }

  function chooseChaseVector(enemy) {
    const dx = state.player.x - enemy.x;
    const dy = state.player.y - enemy.y;
    const primaryHorizontal = Math.abs(dx) >= Math.abs(dy);
    const attempts = primaryHorizontal
      ? [
          [Math.sign(dx), 0],
          [0, Math.sign(dy)],
          [Math.sign(dx), Math.sign(dy)],
          [0, -Math.sign(dy)],
          [-Math.sign(dx), 0]
        ]
      : [
          [0, Math.sign(dy)],
          [Math.sign(dx), 0],
          [Math.sign(dx), Math.sign(dy)],
          [-Math.sign(dx), 0],
          [0, -Math.sign(dy)]
        ];

    for (const [mx, my] of attempts) {
      if (!mx && !my) continue;
      const probeX = enemy.x + mx * 18;
      const probeY = enemy.y + my * 18;
      if (!collidesMaze(probeX, probeY, enemy.radius)) {
        return { x: mx, y: my };
      }
    }

    return { x: 0, y: 0 };
  }

  function updateEnemies(delta) {
    state.enemies.forEach((enemy, index) => {
      enemy.think -= delta;
      enemy.throwCooldown -= delta;
      const dx = state.player.x - enemy.x;
      const dy = state.player.y - enemy.y;
      const distance = Math.hypot(dx, dy) || 1;
      const visible = canSeePlayer(enemy);

      if (enemy.think <= 0) {
        enemy.think = 0.1 + Math.random() * 0.18;
        const chase = chooseChaseVector(enemy);
        if (visible) {
          enemy.dirX = dx / distance;
          enemy.dirY = dy / distance;
        } else if (chase.x || chase.y) {
          enemy.dirX = chase.x;
          enemy.dirY = chase.y;
        } else {
          const angle = Math.random() * Math.PI * 2;
          enemy.dirX = Math.cos(angle);
          enemy.dirY = Math.sin(angle);
        }
      }

      moveActor(enemy, enemy.dirX, enemy.dirY, delta * (visible ? 1.08 : 0.92));

      if ((visible || distance < 180) && enemy.throwCooldown <= 0) {
        throwRock(enemy);
        enemy.throwCooldown = 1.05 - Math.min(0.3, state.wave * 0.04) + Math.random() * 0.22;
      }

      if (Math.hypot(state.player.x - enemy.x, state.player.y - enemy.y) < state.player.radius + enemy.radius + 2) {
        damagePlayer(16);
        enemy.dirX *= -1;
        enemy.dirY *= -1;
      }

      if (enemy.think < 0.02 && index === state.wave % state.enemies.length) {
        enemy.dirX *= -1;
        enemy.dirY *= -1;
      }
    });
  }

  function updateRocks(delta) {
    state.rocks.forEach((rock) => {
      rock.life -= delta;
      rock.x += rock.vx * delta;
      rock.y += rock.vy * delta;
      rock.vy += 160 * delta;
      if (collidesMaze(rock.x, rock.y, rock.radius)) {
        rock.dead = true;
        spawnParticle(rock.x, rock.y, "rgba(210, 181, 118, 0.8)", 6);
      }
      if (Math.hypot(rock.x - state.player.x, rock.y - state.player.y) < rock.radius + state.player.radius - (state.player.jumpTimer > 0 ? 8 : 0)) {
        rock.dead = true;
        damagePlayer(state.player.jumpTimer > 0 ? 8 : 18);
      }
      if (rock.life <= 0 || rock.x < -12 || rock.x > canvas.width + 12 || rock.y > canvas.height + 12) rock.dead = true;
    });
    state.rocks = state.rocks.filter((rock) => !rock.dead);
  }

  function updateParticles(delta) {
    state.particles.forEach((particle) => {
      particle.age += delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    });
    state.particles = state.particles.filter((particle) => particle.age < particle.life);
  }

  function updatePlayer(delta) {
    const moveLen = Math.hypot(state.input.x, state.input.y) || 1;
    moveActor(state.player, state.input.x / moveLen, state.input.y / moveLen, delta);
    state.player.jumpTimer = Math.max(0, state.player.jumpTimer - delta);
    state.player.invulnerable = Math.max(0, state.player.invulnerable - delta);
    state.player.hitFlash = Math.max(0, state.player.hitFlash - delta);
  }

  function update(delta) {
    if (state.paused) return;
    updatePlayer(delta);
    updateEnemies(delta);
    updateRocks(delta);
    updateParticles(delta);
    state.score += delta * 10;
    scoreElement.textContent = String(Math.floor(state.score));
    const nextWave = 1 + Math.floor(state.score / 180);
    if (nextWave !== state.wave) {
      state.wave = nextWave;
      waveElement.textContent = String(state.wave);
      if (state.enemies.length < 5) {
        state.enemies.push(createEnemy(586, 210, state.enemies.length + 1));
      }
    }
  }

  function drawMaze() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#203b1d");
    sky.addColorStop(1, "#102510");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    for (let x = 0; x < canvas.width; x += 32) ctx.fillRect(x, 0, 1, canvas.height);
    for (let y = 0; y < canvas.height; y += 32) ctx.fillRect(0, y, canvas.width, 1);

    state.walls.forEach((wall) => {
      ctx.fillStyle = wall.w > wall.h ? "#274d2b" : "#315f36";
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(wall.x, wall.y, wall.w, 3);
    });
  }

  function drawPlayer() {
    ctx.save();
    ctx.translate(state.player.x, state.player.y);
    ctx.fillStyle = state.player.hitFlash > 0 ? "#ffd166" : "#71e3ff";
    ctx.beginPath();
    ctx.arc(0, 0, state.player.radius + (state.player.jumpTimer > 0 ? 2 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0e1728";
    ctx.fillRect(-5, -10, 10, 18);
    ctx.fillStyle = "#f7f5ff";
    ctx.fillRect(-3, -6, 2, 2);
    ctx.fillRect(1, -6, 2, 2);
    if (state.player.jumpTimer > 0) {
      ctx.strokeStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath();
      ctx.arc(0, 0, state.player.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemies() {
    state.enemies.forEach((enemy, index) => {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.fillStyle = index % 2 === 0 ? "#ff6b6b" : "#ff9b54";
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2b0f0f";
      ctx.fillRect(-5, -8, 10, 14);
      ctx.fillStyle = "#fff2e0";
      ctx.fillRect(-3, -4, 2, 2);
      ctx.fillRect(1, -4, 2, 2);
      ctx.restore();
    });
  }

  function drawRocks() {
    state.rocks.forEach((rock) => {
      ctx.fillStyle = "#d2b576";
      ctx.beginPath();
      ctx.arc(rock.x, rock.y, rock.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(rock.x - 2, rock.y - 1, 4, 2);
    });
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      const alpha = 1 - particle.age / particle.life;
      ctx.fillStyle = particle.color.replace(/0\.[0-9]+\)/, `${alpha})`);
      ctx.fillRect(particle.x - 2, particle.y - 2, 4, 4);
    });
  }

  function drawOverlay() {
    if (!state.gameOver && !state.paused) return;
    ctx.fillStyle = "rgba(0,0,0,0.38)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "28px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText(state.gameOver ? "Johnny erwischt" : "Pause", canvas.width / 2, canvas.height / 2 - 10);
    if (state.gameOver) {
      ctx.font = "16px 'Courier New'";
      ctx.fillText("Restart für den nächsten Garten-Nervenzusammenbruch.", canvas.width / 2, canvas.height / 2 + 18);
    }
  }

  function draw() {
    drawMaze();
    drawEnemies();
    drawRocks();
    drawPlayer();
    drawParticles();
    drawOverlay();
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  function setInput(action, active) {
    if (action === "left") state.input.x = active ? -1 : (state.input.x === -1 ? 0 : state.input.x);
    if (action === "right") state.input.x = active ? 1 : (state.input.x === 1 ? 0 : state.input.x);
    if (action === "up") state.input.y = active ? -1 : (state.input.y === -1 ? 0 : state.input.y);
    if (action === "down") state.input.y = active ? 1 : (state.input.y === 1 ? 0 : state.input.y);
    if (action === "jump" && active && state.player.jumpTimer <= 0) {
      state.player.jumpTimer = 0.45;
      state.player.invulnerable = Math.max(state.player.invulnerable, 0.2);
      spawnParticle(state.player.x, state.player.y, "rgba(113, 227, 255, 0.8)", 9);
    }
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") setInput("left", true);
    if (key === "d" || key === "arrowright") setInput("right", true);
    if (key === "w" || key === "arrowup") setInput("up", true);
    if (key === "s" || key === "arrowdown") setInput("down", true);
    if (key === " ") {
      event.preventDefault();
      setInput("jump", true);
    }
    if (key === "p") togglePause();
  });

  document.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "a" || key === "arrowleft") setInput("left", false);
    if (key === "d" || key === "arrowright") setInput("right", false);
    if (key === "w" || key === "arrowup") setInput("up", false);
    if (key === "s" || key === "arrowdown") setInput("down", false);
  });

  actionButtons.forEach((button) => {
    const action = button.dataset.action;
    const start = (event) => { event?.preventDefault?.(); setInput(action, true); };
    const stop = (event) => { event?.preventDefault?.(); if (action !== "jump") setInput(action, false); };
    button.addEventListener("pointerdown", start);
    button.addEventListener("pointerup", stop);
    button.addEventListener("pointercancel", stop);
    button.addEventListener("pointerleave", stop);
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetGame);
  resetGame();
  requestAnimationFrame(frame);
}

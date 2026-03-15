const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const livesElement = document.querySelector('#lives');
  const waveElement = document.querySelector('#wave');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const TANK_RADIUS = 12;
  const STATIC_WALLS = [
    { x: 126, y: 96, w: 56, h: 12 },
    { x: 338, y: 96, w: 56, h: 12 },
    { x: 126, y: 312, w: 56, h: 12 },
    { x: 338, y: 312, w: 56, h: 12 },
    { x: 224, y: 154, w: 74, h: 12 },
    { x: 224, y: 250, w: 74, h: 12 }
  ];

  const state = {
    score: 0,
    lives: 3,
    wave: 1,
    paused: false,
    gameOver: false,
    player: null,
    enemies: [],
    bullets: [],
    move: { x: 0, y: 0 },
    gates: [],
    buttons: [],
    lastTime: 0
  };
  window.__retroArcadeGameState = state;

  function createGate(id, x, y, w, h) {
    return { id, x, y, w, h, open: false, cooldown: 0 };
  }

  function createButton(id, x, y, targetGate) {
    return { id, x, y, r: 10, targetGate, pulse: Math.random() * Math.PI * 2 };
  }

  function createTank(x, y, color, isEnemy = false) {
    return {
      x,
      y,
      dir: 'up',
      cooldown: 0,
      color,
      isEnemy,
      hp: isEnemy ? 1 : 3,
      think: 0.12 + Math.random() * 0.18,
      stuckFor: 0,
      targetButton: null,
      wanderTimer: 0,
      wanderDir: 'up',
      unstuckCooldown: 0,
      speed: isEnemy ? 88 + Math.random() * 10 : 116,
    };
  }

  function activeWalls() {
    return [...STATIC_WALLS, ...state.gates.filter((gate) => !gate.open)];
  }

  function collidesRect(x, y, size) {
    return activeWalls().some((wall) => x - size < wall.x + wall.w && x + size > wall.x && y - size < wall.y + wall.h && y + size > wall.y);
  }

  function segmentsBlocked(x1, y1, x2, y2) {
    const steps = 20;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      if (collidesRect(px, py, 4)) return true;
    }
    return false;
  }

  function toggleGate(gateId) {
    const gate = state.gates.find((entry) => entry.id === gateId);
    if (!gate || gate.cooldown > 0.01) return;
    gate.open = !gate.open;
    gate.cooldown = 0.4;
  }

  function lineOfSight(a, b) {
    const alignedX = Math.abs(a.x - b.x) < 16;
    const alignedY = Math.abs(a.y - b.y) < 16;
    if (!alignedX && !alignedY) return false;
    return !segmentsBlocked(a.x, a.y, b.x, b.y);
  }

  function fire(tank) {
    if (!tank || tank.cooldown > 0) return;
    tank.cooldown = tank.isEnemy ? 1.28 : 0.34;
    const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = vectors[tank.dir];
    state.bullets.push({ x: tank.x, y: tank.y, dx, dy, owner: tank.isEnemy ? 'enemy' : 'player', life: 2.2 });
  }

  function respawnWave() {
    state.player = createTank(260, 378, '#71e3ff');
    state.gates = [
      createGate('alpha', 252, 106, 18, 14),
      createGate('beta', 252, 300, 18, 14)
    ];
    state.buttons = [
      createButton('alpha-btn', 88, 164, 'alpha'),
      createButton('beta-btn', 432, 256, 'beta')
    ];

    const spawnPoints = [
      [420, 78],
      [100, 78],
      [420, 320]
    ];
    const palette = ['#ff6b8f', '#ffb25c', '#86e7ff'];
    state.enemies = spawnPoints.map(([x, y], index) => createTank(x, y, palette[index % palette.length], true));
    state.bullets = [];
  }

  function restartGame() {
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.paused = false;
    state.gameOver = false;
    state.move = { x: 0, y: 0 };
    scoreElement.textContent = '0';
    livesElement.textContent = '3';
    waveElement.textContent = '1';
    pauseButton.textContent = 'Pause';
    respawnWave();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function updateTank(tank, delta, moveX, moveY) {
    let moved = false;
    if (moveX || moveY) {
      if (Math.abs(moveX) > Math.abs(moveY)) tank.dir = moveX < 0 ? 'left' : 'right';
      else tank.dir = moveY < 0 ? 'up' : 'down';
      const nx = tank.x + moveX * tank.speed * delta;
      const ny = tank.y + moveY * tank.speed * delta;
      if (nx > 20 && nx < canvas.width - 20 && ny > 20 && ny < canvas.height - 20 && !collidesRect(nx, ny, TANK_RADIUS)) {
        tank.x = nx;
        tank.y = ny;
        moved = true;
      }
    }
    tank.cooldown = Math.max(0, tank.cooldown - delta);
    tank.unstuckCooldown = Math.max(0, (tank.unstuckCooldown || 0) - delta);
    return moved;
  }

  function loseLife() {
    state.lives -= 1;
    livesElement.textContent = String(state.lives);
    if (state.lives <= 0) {
      state.gameOver = true;
      return;
    }
    respawnWave();
  }

  function directionToward(from, to) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 'left' : 'right';
    return dy < 0 ? 'up' : 'down';
  }

  function vectorFor(dir) {
    const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    return vectors[dir];
  }

  function candidateDirections(enemy, target) {
    const base = ['up', 'down', 'left', 'right'];
    return base
      .map((dir) => {
        const [vx, vy] = vectorFor(dir);
        const probeX = enemy.x + vx * 26;
        const probeY = enemy.y + vy * 26;
        if (probeX < 20 || probeX > canvas.width - 20 || probeY < 20 || probeY > canvas.height - 20) return null;
        if (collidesRect(probeX, probeY, TANK_RADIUS)) return null;
        const distance = Math.hypot(target.x - probeX, target.y - probeY);
        const sameDirBonus = dir === enemy.dir ? -8 : 0;
        return { dir, distance: distance + sameDirBonus };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .map((entry) => entry.dir);
  }

  function chooseButtonTarget() {
    return state.buttons.find((button) => {
      const gate = state.gates.find((entry) => entry.id === button.targetGate);
      return gate && !gate.open;
    }) || null;
  }

  function pickMovementDirection(enemy, options) {
    if (!options.length) return enemy.dir;
    if (enemy.wanderTimer > 0 && options.includes(enemy.wanderDir)) return enemy.wanderDir;
    if (Math.random() < 0.28 && options[1]) return options[1];
    if (Math.random() < 0.18) return options[Math.floor(Math.random() * options.length)];
    return options[0];
  }

  function updateEnemy(enemy, delta) {
    enemy.think -= delta;
    enemy.wanderTimer = Math.max(0, enemy.wanderTimer - delta);
    const playerTarget = { x: state.player.x, y: state.player.y };
    const canSeePlayer = lineOfSight(enemy, playerTarget);

    if (enemy.think <= 0) {
      enemy.think = 0.12 + Math.random() * 0.18;
      enemy.targetButton = !canSeePlayer && Math.random() < 0.2 ? chooseButtonTarget() : null;

      if (canSeePlayer && Math.random() < 0.22) {
        enemy.dir = directionToward(enemy, playerTarget);
        enemy.cooldown = Math.max(enemy.cooldown, 0.22);
      } else if (enemy.targetButton && lineOfSight(enemy, enemy.targetButton) && Math.random() < 0.16) {
        enemy.dir = directionToward(enemy, enemy.targetButton);
        enemy.cooldown = Math.max(enemy.cooldown, 0.18);
      }

      const dirs = ['up', 'down', 'left', 'right'];
      enemy.wanderDir = dirs[Math.floor(Math.random() * dirs.length)];
      enemy.wanderTimer = 0.18 + Math.random() * 0.24;
    }

    const target = enemy.targetButton || playerTarget;
    const preferredDirections = candidateDirections(enemy, target);
    const chosenDir = pickMovementDirection(enemy, preferredDirections);
    enemy.dir = chosenDir;
    const [mx, my] = vectorFor(chosenDir);
    const moved = updateTank(enemy, delta, mx * 0.88, my * 0.88);

    if (!moved) {
      enemy.stuckFor += delta;
      if (enemy.stuckFor > 0.08) {
        const fallbackOptions = preferredDirections.length ? preferredDirections : ['up', 'down', 'left', 'right'];
        const fallback = fallbackOptions[Math.floor(Math.random() * fallbackOptions.length)];
        enemy.dir = fallback;
        enemy.wanderDir = fallback;
        enemy.wanderTimer = 0.32;
        enemy.think = 0.02;
        enemy.stuckFor = 0;
        enemy.unstuckCooldown = 0.18;
        const [fx, fy] = vectorFor(fallback);
        updateTank(enemy, delta * 1.6, fx, fy);
      }
    } else {
      enemy.stuckFor = 0;
    }

    if (enemy.targetButton && Math.hypot(enemy.x - enemy.targetButton.x, enemy.y - enemy.targetButton.y) < 90 && lineOfSight(enemy, enemy.targetButton)) {
      enemy.dir = directionToward(enemy, enemy.targetButton);
      if (Math.random() < 0.003) enemy.cooldown = Math.max(enemy.cooldown, 0.16);
    }

    if (enemy.unstuckCooldown > 0) {
      const [ux, uy] = vectorFor(enemy.wanderDir);
      updateTank(enemy, delta * 0.9, ux, uy);
    }

    if (canSeePlayer && enemy.cooldown < 0.04 && Math.random() < 0.14) {
      fire(enemy);
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.gates.forEach((gate) => {
      gate.cooldown = Math.max(0, gate.cooldown - delta);
    });
    state.buttons.forEach((button) => {
      button.pulse += delta * 4;
    });

    updateTank(state.player, delta, state.move.x, state.move.y);
    state.enemies.forEach((enemy) => updateEnemy(enemy, delta));

    state.bullets.forEach((bullet) => {
      bullet.x += bullet.dx * 320 * delta;
      bullet.y += bullet.dy * 320 * delta;
      bullet.life -= delta;
    });

    state.bullets.forEach((bullet) => {
      if (bullet.life <= 0) bullet.dead = true;
      if (bullet.x < -12 || bullet.x > canvas.width + 12 || bullet.y < -12 || bullet.y > canvas.height + 12) bullet.dead = true;
      if (collidesRect(bullet.x, bullet.y, 4)) bullet.dead = true;

      state.buttons.forEach((button) => {
        if (bullet.dead) return;
        if (Math.hypot(button.x - bullet.x, button.y - bullet.y) < button.r + 5) {
          toggleGate(button.targetGate);
          bullet.dead = true;
        }
      });

      if (bullet.dead) return;

      if (bullet.owner === 'player') {
        state.enemies.forEach((enemy) => {
          if (!enemy.dead && Math.abs(enemy.x - bullet.x) < TANK_RADIUS + 4 && Math.abs(enemy.y - bullet.y) < TANK_RADIUS + 4) {
            enemy.hp -= 1;
            bullet.dead = true;
            if (enemy.hp <= 0) {
              enemy.dead = true;
              state.score += 120;
              scoreElement.textContent = String(state.score);
            }
          }
        });
      } else if (Math.abs(state.player.x - bullet.x) < TANK_RADIUS + 4 && Math.abs(state.player.y - bullet.y) < TANK_RADIUS + 4) {
        bullet.dead = true;
        loseLife();
      }
    });

    state.bullets = state.bullets.filter((bullet) => !bullet.dead);
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);

    if (!state.enemies.length) {
      state.wave += 1;
      waveElement.textContent = String(state.wave);
      respawnWave();
    }
  }

  function drawTank(tank) {
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.fillStyle = tank.isEnemy ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.18)';
    ctx.fillRect(-14, -10, 28, 20);
    ctx.fillStyle = '#2c2f40';
    ctx.fillRect(-15, -11, 5, 22);
    ctx.fillRect(10, -11, 5, 22);
    ctx.fillStyle = tank.color;
    ctx.fillRect(-11, -8, 22, 16);
    ctx.fillStyle = '#f7f5ff';
    ctx.fillRect(-6, -5, 12, 10);
    ctx.fillStyle = '#101221';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    if (tank.dir === 'up') ctx.fillRect(-2, -18, 4, 15);
    if (tank.dir === 'down') ctx.fillRect(-2, 3, 4, 15);
    if (tank.dir === 'left') ctx.fillRect(-18, -2, 15, 4);
    if (tank.dir === 'right') ctx.fillRect(3, -2, 15, 4);
    ctx.restore();
  }

  function drawButton(button) {
    ctx.save();
    ctx.translate(button.x, button.y);
    ctx.fillStyle = '#2b2038';
    ctx.beginPath();
    ctx.arc(0, 0, button.r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 107, 107, ${0.45 + Math.sin(button.pulse) * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, button.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGate(gate) {
    ctx.fillStyle = gate.open ? 'rgba(113, 227, 255, 0.16)' : '#71e3ff';
    ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
    if (!gate.open) {
      ctx.strokeStyle = '#101221';
      ctx.lineWidth = 2;
      ctx.strokeRect(gate.x + 1, gate.y + 1, gate.w - 2, gate.h - 2);
    }
  }

  function drawWall(wall) {
    ctx.fillStyle = '#485d96';
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(wall.x + 3, wall.y + 3, wall.w - 6, 4);
  }

  function draw() {
    ctx.fillStyle = '#09111f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < canvas.width; x += 26) ctx.fillRect(x, 0, 1, canvas.height);
    for (let y = 0; y < canvas.height; y += 26) ctx.fillRect(0, y, canvas.width, 1);

    STATIC_WALLS.forEach(drawWall);
    state.gates.forEach(drawGate);
    state.buttons.forEach(drawButton);
    drawTank(state.player);
    state.enemies.forEach(drawTank);

    ctx.fillStyle = '#ffd166';
    state.bullets.forEach((bullet) => ctx.fillRect(bullet.x - 3, bullet.y - 3, 6, 6));

    if (state.paused || state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.52)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f5ff';
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillText(state.gameOver ? 'Steel Maze verloren' : 'Pause', canvas.width / 2, canvas.height / 2 - 10);
    }
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  document.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') state.move.x = -1;
    if (key === 'd' || key === 'arrowright') state.move.x = 1;
    if (key === 'w' || key === 'arrowup') state.move.y = -1;
    if (key === 's' || key === 'arrowdown') state.move.y = 1;
    if (key === ' ') {
      event.preventDefault();
      fire(state.player);
    }
    if (key === 'p') togglePause();
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) state.move.x = 0;
    if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) state.move.y = 0;
  });

  actionButtons.forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'up') state.move.y = -1;
    if (action === 'down') state.move.y = 1;
    if (action === 'left') state.move.x = -1;
    if (action === 'right') state.move.x = 1;
    if (action === 'fire') fire(state.player);
    if (action === 'pause') togglePause();
    setTimeout(() => {
      state.move.x = 0;
      state.move.y = 0;
    }, 150);
  }));

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}





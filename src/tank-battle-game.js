const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const livesElement = document.querySelector('#lives');
  const waveElement = document.querySelector('#wave');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const STATIC_WALLS = [
    { x: 52, y: 54, w: 120, h: 18 },
    { x: 346, y: 54, w: 120, h: 18 },
    { x: 52, y: 348, w: 120, h: 18 },
    { x: 346, y: 348, w: 120, h: 18 },
    { x: 120, y: 96, w: 18, h: 104 },
    { x: 382, y: 96, w: 18, h: 104 },
    { x: 120, y: 220, w: 18, h: 104 },
    { x: 382, y: 220, w: 18, h: 104 },
    { x: 174, y: 120, w: 172, h: 16 },
    { x: 174, y: 284, w: 172, h: 16 },
    { x: 212, y: 168, w: 16, h: 92 },
    { x: 292, y: 168, w: 16, h: 92 },
    { x: 64, y: 196, w: 78, h: 16 },
    { x: 378, y: 196, w: 78, h: 16 }
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
    return { id, x, y, r: 12, targetGate, pulse: Math.random() * Math.PI * 2 };
  }

  function createTank(x, y, color, isEnemy = false) {
    return {
      x,
      y,
      dir: 'up',
      cooldown: 0,
      color,
      isEnemy,
      hp: isEnemy ? 2 : 3,
      think: 0.16 + Math.random() * 0.22,
      stuckFor: 0,
      intent: 'hunt',
      targetButton: null,
      speed: isEnemy ? 84 + Math.random() * 12 : 122,
    };
  }

  function activeWalls() {
    return [...STATIC_WALLS, ...state.gates.filter((gate) => !gate.open)];
  }

  function collidesRect(x, y, size) {
    return activeWalls().some((wall) => x - size < wall.x + wall.w && x + size > wall.x && y - size < wall.y + wall.h && y + size > wall.y);
  }

  function segmentsBlocked(x1, y1, x2, y2) {
    const steps = 28;
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
    gate.cooldown = 0.35;
  }

  function lineOfSight(a, b) {
    const alignedX = Math.abs(a.x - b.x) < 18;
    const alignedY = Math.abs(a.y - b.y) < 18;
    if (!alignedX && !alignedY) return false;
    return !segmentsBlocked(a.x, a.y, b.x, b.y);
  }

  function fire(tank) {
    if (!tank || tank.cooldown > 0) return;
    tank.cooldown = tank.isEnemy ? 0.95 : 0.4;
    const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = vectors[tank.dir];
    state.bullets.push({ x: tank.x, y: tank.y, dx, dy, owner: tank.isEnemy ? 'enemy' : 'player', life: 2.2 });
  }

  function respawnWave() {
    state.player = createTank(260, 382, '#71e3ff');
    state.gates = [
      createGate('alpha', 246, 96, 28, 16),
      createGate('beta', 246, 308, 28, 16),
      createGate('gamma', 152, 202, 16, 36),
      createGate('delta', 352, 202, 16, 36)
    ];
    state.buttons = [
      createButton('alpha-btn', 92, 156, 'alpha'),
      createButton('beta-btn', 428, 156, 'beta'),
      createButton('gamma-btn', 94, 258, 'gamma'),
      createButton('delta-btn', 426, 258, 'delta')
    ];

    const enemyCount = Math.min(7, 2 + state.wave);
    const spawnPoints = [
      [438, 76],
      [438, 316],
      [260, 76],
      [260, 88],
      [86, 76],
      [86, 254],
      [438, 254]
    ];
    const palette = ['#ff5fb2', '#ff9b54', '#ffd166', '#ff7676', '#c88cff', '#8ef0ff', '#f2c14e'];
    state.enemies = spawnPoints.slice(0, enemyCount).map(([x, y], index) => createTank(x, y, palette[index % palette.length], true));
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
      if (nx > 22 && nx < canvas.width - 22 && ny > 22 && ny < canvas.height - 22 && !collidesRect(nx, ny, 17)) {
        tank.x = nx;
        tank.y = ny;
        moved = true;
      }
    }
    tank.cooldown = Math.max(0, tank.cooldown - delta);
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
        const probeX = enemy.x + vx * 28;
        const probeY = enemy.y + vy * 28;
        if (probeX < 22 || probeX > canvas.width - 22 || probeY < 22 || probeY > canvas.height - 22) return null;
        if (collidesRect(probeX, probeY, 16)) return null;
        const distance = Math.hypot(target.x - probeX, target.y - probeY);
        const sameDirBonus = dir === enemy.dir ? -16 : 0;
        return { dir, distance: distance + sameDirBonus };
      })
      .filter(Boolean)
      .sort((a, b) => a.distance - b.distance)
      .map((entry) => entry.dir);
  }

  function chooseButtonTarget(enemy) {
    const closedGateButton = state.buttons.find((button) => {
      const gate = state.gates.find((entry) => entry.id === button.targetGate);
      return gate && !gate.open;
    });
    return closedGateButton || null;
  }

  function updateEnemy(enemy, delta) {
    enemy.think -= delta;
    const playerTarget = { x: state.player.x, y: state.player.y };
    const canSeePlayer = lineOfSight(enemy, playerTarget);

    if (enemy.think <= 0) {
      enemy.think = 0.16 + Math.random() * 0.24;
      const pursueButton = !canSeePlayer && Math.random() < 0.32;
      enemy.targetButton = pursueButton ? chooseButtonTarget(enemy) : null;
      enemy.intent = enemy.targetButton ? 'button' : 'hunt';

      if (canSeePlayer && Math.random() < 0.48) {
        enemy.dir = directionToward(enemy, playerTarget);
        fire(enemy);
      } else if (enemy.targetButton && lineOfSight(enemy, enemy.targetButton) && Math.random() < 0.42) {
        enemy.dir = directionToward(enemy, enemy.targetButton);
        fire(enemy);
      }
    }

    const target = enemy.targetButton || playerTarget;
    const preferredDirections = candidateDirections(enemy, target);
    const [mx, my] = vectorFor(preferredDirections[0] || enemy.dir);
    const moved = updateTank(enemy, delta, mx * 0.9, my * 0.9);

    if (!moved) {
      enemy.stuckFor += delta;
      if (enemy.stuckFor > 0.18) {
        const fallback = preferredDirections[Math.floor(Math.random() * Math.max(1, preferredDirections.length))] || enemy.dir;
        enemy.dir = fallback;
        enemy.think = 0.04;
        enemy.stuckFor = 0;
      }
    } else {
      enemy.stuckFor = 0;
    }

    if (enemy.targetButton && Math.hypot(enemy.x - enemy.targetButton.x, enemy.y - enemy.targetButton.y) < 110 && lineOfSight(enemy, enemy.targetButton)) {
      enemy.dir = directionToward(enemy, enemy.targetButton);
      if (Math.random() < 0.012) fire(enemy);
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
          if (!enemy.dead && Math.abs(enemy.x - bullet.x) < 18 && Math.abs(enemy.y - bullet.y) < 18) {
            enemy.hp -= 1;
            bullet.dead = true;
            if (enemy.hp <= 0) {
              enemy.dead = true;
              state.score += 120;
              scoreElement.textContent = String(state.score);
            }
          }
        });
      } else if (Math.abs(state.player.x - bullet.x) < 18 && Math.abs(state.player.y - bullet.y) < 18) {
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
    ctx.fillRect(-20, -15, 40, 30);
    ctx.fillStyle = '#2c2f40';
    ctx.fillRect(-21, -17, 8, 34);
    ctx.fillRect(13, -17, 8, 34);
    ctx.fillStyle = tank.color;
    ctx.fillRect(-16, -12, 32, 24);
    ctx.fillStyle = '#f7f5ff';
    ctx.fillRect(-9, -8, 18, 16);
    ctx.fillStyle = '#101221';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    if (tank.dir === 'up') ctx.fillRect(-3, -25, 6, 22);
    if (tank.dir === 'down') ctx.fillRect(-3, 3, 6, 22);
    if (tank.dir === 'left') ctx.fillRect(-25, -3, 22, 6);
    if (tank.dir === 'right') ctx.fillRect(3, -3, 22, 6);
    ctx.restore();
  }

  function drawButton(button) {
    ctx.save();
    ctx.translate(button.x, button.y);
    ctx.fillStyle = '#18243f';
    ctx.beginPath();
    ctx.arc(0, 0, button.r + 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 209, 102, ${0.45 + Math.sin(button.pulse) * 0.2})`;
    ctx.beginPath();
    ctx.arc(0, 0, button.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawGate(gate) {
    ctx.fillStyle = gate.open ? 'rgba(135, 255, 101, 0.18)' : '#87ff65';
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


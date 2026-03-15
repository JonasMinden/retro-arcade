const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const shieldElement = document.querySelector('#shield');
  const waveElement = document.querySelector('#wave');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const MAX_ENEMIES = 6;
  const state = {
    score: 0,
    shield: 100,
    wave: 1,
    paused: false,
    gameOver: false,
    playerX: 320,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    meteors: [],
    move: 0,
    boost: 0,
    spawnTimer: 0,
    meteorTimer: 2.8,
    remainingSpawns: 0,
    spawnedInWave: 0,
    waveClearDelay: 0,
    lastTime: 0
  };
  window.__retroArcadeGameState = state;

  function enemyHealth(type) {
    if (type === 'carrier') return 4;
    if (type === 'pulser') return 2;
    return 3;
  }

  function enemyScore(type) {
    if (type === 'carrier') return 90;
    if (type === 'pulser') return 55;
    return 70;
  }

  function enemyFireDelay(type) {
    if (type === 'carrier') return 2.2 + Math.random() * 0.55;
    if (type === 'pulser') return 1.8 + Math.random() * 0.45;
    return 2.1 + Math.random() * 0.6;
  }

  function enemyTypeForWave() {
    const roll = Math.random();
    if (state.wave === 1) return roll < 0.55 ? 'hunter' : 'pulser';
    if (roll < 0.34) return 'carrier';
    if (roll < 0.68) return 'pulser';
    return 'hunter';
  }

  function startWave() {
    state.remainingSpawns = 7 + state.wave * 2;
    state.spawnedInWave = 0;
    state.spawnTimer = 0.8;
    state.waveClearDelay = 0;
    state.meteorTimer = Math.max(2.2, 4.2 - state.wave * 0.16);
    waveElement.textContent = String(state.wave);
  }

  function restartGame() {
    state.score = 0;
    state.shield = 100;
    state.wave = 1;
    state.paused = false;
    state.gameOver = false;
    state.playerX = 320;
    state.bullets = [];
    state.enemyBullets = [];
    state.enemies = [];
    state.meteors = [];
    state.move = 0;
    state.boost = 0;
    state.lastTime = 0;
    scoreElement.textContent = '0';
    shieldElement.textContent = '100';
    pauseButton.textContent = 'Pause';
    startWave();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function fire() {
    if (state.paused || state.gameOver || state.bullets.length > 5) return;
    state.bullets.push({ x: state.playerX, y: 350, vy: -520 });
  }

  function spawnEnemy() {
    if (state.remainingSpawns <= 0 || state.enemies.length >= MAX_ENEMIES) return;
    const type = enemyTypeForWave();
    const spawnX = 72 + Math.random() * (canvas.width - 144);
    const driftCenter = 76 + Math.random() * (canvas.width - 152);
    state.enemies.push({
      type,
      hp: enemyHealth(type),
      x: spawnX,
      y: -44 - Math.random() * 70,
      targetY: 72 + Math.random() * 110,
      driftCenter,
      driftRange: type === 'hunter' ? 58 + Math.random() * 22 : 34 + Math.random() * 18,
      driftPhase: Math.random() * Math.PI * 2,
      driftSpeed: type === 'hunter' ? 2.4 : type === 'pulser' ? 1.8 : 1.2,
      entrySpeed: 110 + Math.random() * 20,
      fireCooldown: 1.1 + Math.random() * 0.5,
      rearm: enemyFireDelay(type),
      entered: false,
      hitFlash: 0,
      dead: false
    });
    state.remainingSpawns -= 1;
    state.spawnedInWave += 1;
    state.spawnTimer = Math.max(0.75, 1.65 - state.wave * 0.06) + Math.random() * 0.55;
  }

  function spawnMeteor() {
    state.meteors.push({
      x: 40 + Math.random() * (canvas.width - 80),
      y: -30,
      vx: (Math.random() - 0.5) * 55,
      vy: 150 + Math.random() * 60 + state.wave * 6,
      spin: Math.random() * Math.PI * 2,
      radius: 14 + Math.random() * 10,
      danger: 12,
      dead: false
    });
    state.meteorTimer = Math.max(2.4, 5.4 - state.wave * 0.2) + Math.random() * 1.6;
  }

  function damageShield(amount) {
    state.shield = Math.max(0, state.shield - amount);
    shieldElement.textContent = String(state.shield);
    if (state.shield <= 0) state.gameOver = true;
  }

  function updateEnemies(delta) {
    state.spawnTimer -= delta;
    if (state.spawnTimer <= 0 && state.remainingSpawns > 0) {
      spawnEnemy();
    }

    state.enemies.forEach((enemy) => {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - delta * 5);
      if (!enemy.entered) {
        enemy.y += enemy.entrySpeed * delta;
        if (enemy.y >= enemy.targetY) {
          enemy.y = enemy.targetY;
          enemy.entered = true;
          enemy.fireCooldown = 0.8 + Math.random() * 0.8;
        }
        return;
      }

      enemy.driftPhase += delta * enemy.driftSpeed;
      enemy.x = enemy.driftCenter + Math.sin(enemy.driftPhase) * enemy.driftRange;
      enemy.y = enemy.targetY + Math.cos(enemy.driftPhase * 0.65) * (enemy.type === 'carrier' ? 8 : 15);
      enemy.fireCooldown -= delta;
      if (enemy.fireCooldown <= 0) {
        enemy.fireCooldown = enemy.rearm;
        if (enemy.type === 'carrier') {
          [-0.24, 0, 0.24].forEach((angle) => {
            state.enemyBullets.push({ x: enemy.x, y: enemy.y + 20, vx: Math.sin(angle) * 125, vy: 178, damage: 10 });
          });
        } else if (enemy.type === 'pulser') {
          state.enemyBullets.push({ x: enemy.x, y: enemy.y + 18, vx: Math.sin(enemy.driftPhase) * 64, vy: 205, damage: 8 });
        } else {
          const dx = state.playerX - enemy.x;
          const dy = 356 - enemy.y;
          const distance = Math.hypot(dx, dy) || 1;
          state.enemyBullets.push({ x: enemy.x, y: enemy.y + 16, vx: dx / distance * 132, vy: dy / distance * 132, damage: 9 });
        }
      }
    });
  }

  function updateProjectiles(delta) {
    state.bullets.forEach((bullet) => {
      bullet.y += bullet.vy * delta;
    });
    state.enemyBullets.forEach((bullet) => {
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
    });
    state.meteors.forEach((meteor) => {
      meteor.x += meteor.vx * delta;
      meteor.y += meteor.vy * delta;
      meteor.spin += delta * 3;
    });

    state.bullets = state.bullets.filter((bullet) => bullet.y > -24 && !bullet.dead);
    state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.y < canvas.height + 24 && bullet.x > -24 && bullet.x < canvas.width + 24 && !bullet.dead);
    state.meteors = state.meteors.filter((meteor) => meteor.y < canvas.height + 42 && meteor.x > -60 && meteor.x < canvas.width + 60 && !meteor.dead);
  }

  function handleCollisions() {
    state.bullets.forEach((bullet) => {
      state.enemies.forEach((enemy) => {
        if (!enemy.dead && Math.abs(enemy.x - bullet.x) < 20 && Math.abs(enemy.y - bullet.y) < 20) {
          bullet.dead = true;
          enemy.hp -= 1;
          enemy.hitFlash = 1;
          if (enemy.hp <= 0) {
            enemy.dead = true;
            state.score += enemyScore(enemy.type);
            scoreElement.textContent = String(state.score);
          }
        }
      });

      state.meteors.forEach((meteor) => {
        if (!meteor.dead && Math.hypot(meteor.x - bullet.x, meteor.y - bullet.y) < meteor.radius + 5) {
          bullet.dead = true;
          meteor.dead = true;
          state.score += 35;
          scoreElement.textContent = String(state.score);
        }
      });
    });

    state.enemyBullets.forEach((bullet) => {
      if (Math.abs(state.playerX - bullet.x) < 22 && Math.abs(362 - bullet.y) < 24) {
        bullet.dead = true;
        damageShield(bullet.damage || 10);
      }
    });

    state.meteors.forEach((meteor) => {
      if (Math.hypot(state.playerX - meteor.x, 360 - meteor.y) < meteor.radius + 18) {
        meteor.dead = true;
        damageShield(meteor.danger);
      }
    });

    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  }

  function updateWave(delta) {
    if (state.remainingSpawns <= 0 && state.enemies.length === 0) {
      state.waveClearDelay += delta;
      if (state.waveClearDelay > 1) {
        state.wave += 1;
        startWave();
      }
    } else {
      state.waveClearDelay = 0;
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;

    state.playerX = Math.max(36, Math.min(canvas.width - 36, state.playerX + state.move * (250 + state.boost * 120) * delta));
    state.boost = Math.max(0, state.boost - delta * 1.6);
    state.meteorTimer -= delta;
    if (state.meteorTimer <= 0) spawnMeteor();

    updateEnemies(delta);
    updateProjectiles(delta);
    handleCollisions();
    updateWave(delta);
  }

  function drawShip(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 20);
    ctx.lineTo(x - 18, y + 14);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x + 18, y + 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7f5ff';
    ctx.fillRect(x - 4, y - 6, 8, 18);
  }

  function drawEnemy(enemy) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    ctx.globalAlpha = enemy.entered ? 1 : 0.7;
    if (enemy.type === 'carrier') {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#ffd7ef' : '#ff5fb2';
      ctx.fillRect(-22, -12, 44, 24);
      ctx.fillStyle = '#f7f5ff';
      ctx.fillRect(-10, -6, 20, 12);
    } else if (enemy.type === 'pulser') {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#fff2b5' : '#ffd166';
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#101221';
      ctx.fillRect(-4, -14, 8, 28);
    } else {
      ctx.fillStyle = enemy.hitFlash > 0 ? '#d9faff' : '#71e3ff';
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(-18, 12);
      ctx.lineTo(0, 4);
      ctx.lineTo(18, 12);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawMeteor(meteor) {
    ctx.save();
    ctx.translate(meteor.x, meteor.y);
    ctx.rotate(meteor.spin);
    ctx.fillStyle = '#8a5b3c';
    ctx.beginPath();
    for (let i = 0; i < 7; i += 1) {
      const angle = (Math.PI * 2 * i) / 7;
      const radius = meteor.radius + (i % 2 === 0 ? 3 : -2);
      const px = Math.cos(angle) * radius;
      const py = Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ff9b54';
    ctx.fillRect(-3, meteor.radius - 2, 6, 12);
    ctx.restore();
  }

  function draw() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#040812');
    gradient.addColorStop(1, '#180b25');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 80; i += 1) {
      ctx.fillStyle = i % 5 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)';
      ctx.fillRect((i * 79) % canvas.width, (i * 37) % canvas.height, 2, 2);
    }

    ctx.strokeStyle = 'rgba(113,227,255,0.15)';
    ctx.strokeRect(28, 24, canvas.width - 56, canvas.height - 52);

    state.meteors.forEach(drawMeteor);
    state.enemies.forEach(drawEnemy);
    drawShip(state.playerX, 360, '#71e3ff');

    ctx.fillStyle = '#ffd166';
    state.bullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y, 4, 14));
    ctx.fillStyle = '#ff9b54';
    state.enemyBullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y, 4, 10));

    if (state.paused || state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f5ff';
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillText(state.gameOver ? 'Ship Lost' : 'Paused', canvas.width / 2, canvas.height / 2 - 10);
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
    if (key === 'a' || key === 'arrowleft') state.move = -1;
    if (key === 'd' || key === 'arrowright') state.move = 1;
    if (key === ' ') {
      event.preventDefault();
      fire();
    }
    if (key === 'w' || key === 'arrowup') state.boost = 1;
    if (key === 'p') togglePause();
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (['a', 'd', 'arrowleft', 'arrowright'].includes(key)) state.move = 0;
  });

  actionButtons.forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'left') state.move = -1;
    if (action === 'right') state.move = 1;
    if (action === 'fire') fire();
    if (action === 'boost') state.boost = 1;
    setTimeout(() => {
      state.move = 0;
    }, 160);
  }));

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

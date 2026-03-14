const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const livesElement = document.querySelector('#lives');
  const waveElement = document.querySelector('#wave');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));
  const walls = [
    { x: 110, y: 120, w: 28, h: 110 },
    { x: 240, y: 60, w: 28, h: 140 },
    { x: 380, y: 220, w: 28, h: 120 },
    { x: 180, y: 250, w: 140, h: 24 },
    { x: 60, y: 320, w: 90, h: 20 },
    { x: 330, y: 120, w: 110, h: 22 }
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
    lastTime: 0
  };
  window.__retroArcadeGameState = state;

  function createTank(x, y, color, isEnemy = false) {
    return {
      x,
      y,
      dir: 'up',
      cooldown: 0,
      color,
      isEnemy,
      think: 0.45 + Math.random() * 0.45,
      stuckFor: 0
    };
  }

  function spawnWave() {
    state.player = createTank(52, 382, '#71e3ff');
    state.enemies = [
      createTank(460, 44, '#ff5fb2', true),
      createTank(460, 382, '#ff9b54', true),
      createTank(260, 44, '#ffd166', true)
    ].slice(0, Math.min(3, 1 + state.wave));
    state.bullets = [];
  }

  function restartGame() {
    state.score = 0;
    state.lives = 3;
    state.wave = 1;
    state.paused = false;
    state.gameOver = false;
    scoreElement.textContent = '0';
    livesElement.textContent = '3';
    waveElement.textContent = '1';
    pauseButton.textContent = 'Pause';
    spawnWave();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function collidesRect(x, y, size) {
    return walls.some((wall) => x - size < wall.x + wall.w && x + size > wall.x && y - size < wall.y + wall.h && y + size > wall.y);
  }

  function randomDirection(except = '') {
    const directions = ['up', 'down', 'left', 'right'].filter((dir) => dir !== except);
    return directions[Math.floor(Math.random() * directions.length)] || 'up';
  }

  function fire(tank) {
    if (tank.cooldown > 0) return;
    tank.cooldown = tank.isEnemy ? 1 : 0.45;
    const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [dx, dy] = vectors[tank.dir];
    state.bullets.push({ x: tank.x, y: tank.y, dx, dy, owner: tank.isEnemy ? 'enemy' : 'player' });
  }

  function updateTank(tank, delta, moveX, moveY) {
    const speed = tank.isEnemy ? 86 : 110;
    let moved = false;
    if (moveX || moveY) {
      if (Math.abs(moveX) > Math.abs(moveY)) tank.dir = moveX < 0 ? 'left' : 'right';
      else tank.dir = moveY < 0 ? 'up' : 'down';
      const nx = tank.x + moveX * speed * delta;
      const ny = tank.y + moveY * speed * delta;
      if (nx > 20 && nx < canvas.width - 20 && ny > 20 && ny < canvas.height - 20 && !collidesRect(nx, ny, 16)) {
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
    if (state.lives <= 0) state.gameOver = true;
    else spawnWave();
  }

  function updateEnemy(enemy, delta) {
    enemy.think -= delta;
    const playerDx = state.player.x - enemy.x;
    const playerDy = state.player.y - enemy.y;

    if (enemy.think <= 0) {
      enemy.think = 0.45 + Math.random() * 0.6;
      if (Math.abs(playerDx) > Math.abs(playerDy)) enemy.dir = playerDx < 0 ? 'left' : 'right';
      else enemy.dir = playerDy < 0 ? 'up' : 'down';
      if (Math.random() < 0.62) fire(enemy);
    }

    const vectors = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    const [mx, my] = vectors[enemy.dir];
    const moved = updateTank(enemy, delta, mx * 0.72, my * 0.72);

    if (!moved) {
      enemy.stuckFor += delta;
      if (enemy.stuckFor > 0.18) {
        enemy.dir = randomDirection(enemy.dir);
        enemy.think = Math.min(enemy.think, 0.18);
        enemy.stuckFor = 0;
      }
    } else {
      enemy.stuckFor = 0;
    }

    const hasLineOfSight = Math.abs(playerDx) < 18 || Math.abs(playerDy) < 18;
    if (hasLineOfSight && Math.random() < 0.018) fire(enemy);
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    updateTank(state.player, delta, state.move.x, state.move.y);
    state.enemies.forEach((enemy) => updateEnemy(enemy, delta));

    state.bullets.forEach((bullet) => {
      bullet.x += bullet.dx * 260 * delta;
      bullet.y += bullet.dy * 260 * delta;
    });

    state.bullets = state.bullets.filter((bullet) => bullet.x > -10 && bullet.x < canvas.width + 10 && bullet.y > -10 && bullet.y < canvas.height + 10 && !collidesRect(bullet.x, bullet.y, 5));

    state.bullets.forEach((bullet) => {
      if (bullet.owner === 'player') {
        state.enemies.forEach((enemy) => {
          if (Math.abs(enemy.x - bullet.x) < 16 && Math.abs(enemy.y - bullet.y) < 16) {
            enemy.dead = true;
            bullet.x = -99;
            state.score += 100;
            scoreElement.textContent = String(state.score);
          }
        });
      } else if (Math.abs(state.player.x - bullet.x) < 16 && Math.abs(state.player.y - bullet.y) < 16) {
        bullet.x = -99;
        loseLife();
      }
    });

    state.enemies = state.enemies.filter((enemy) => !enemy.dead);
    if (!state.enemies.length) {
      state.wave += 1;
      waveElement.textContent = String(state.wave);
      spawnWave();
    }
  }

  function drawTank(tank) {
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.fillStyle = tank.color;
    ctx.fillRect(-16, -12, 32, 24);
    ctx.fillStyle = '#101221';
    if (tank.dir === 'up') ctx.fillRect(-3, -22, 6, 18);
    if (tank.dir === 'down') ctx.fillRect(-3, 4, 6, 18);
    if (tank.dir === 'left') ctx.fillRect(-22, -3, 18, 6);
    if (tank.dir === 'right') ctx.fillRect(4, -3, 18, 6);
    ctx.fillStyle = '#f7f5ff';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.fillStyle = '#0b1020';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < canvas.width; x += 32) ctx.fillRect(x, 0, 1, canvas.height);
    walls.forEach((wall) => {
      ctx.fillStyle = '#4d7cff';
      ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    });
    drawTank(state.player);
    state.enemies.forEach(drawTank);
    ctx.fillStyle = '#ffd166';
    state.bullets.forEach((bullet) => ctx.fillRect(bullet.x - 3, bullet.y - 3, 6, 6));
    if (state.paused || state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f5ff';
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillText(state.gameOver ? 'Game Over' : 'Paused', canvas.width / 2, canvas.height / 2 - 10);
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
    }, 140);
  }));

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const citiesElement = document.querySelector('#cities');
  const waveElement = document.querySelector('#wave');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const siloPositions = [110, 320, 530];
  const state = {
    score: 0,
    wave: 1,
    paused: false,
    gameOver: false,
    preferredSilo: 1,
    cities: [],
    enemyMissiles: [],
    defenseMissiles: [],
    explosions: [],
    spawnTimer: 0,
    missilesLeft: 0,
    introTimer: 6,
    crosshair: { x: 320, y: 160 },
    lastTime: 0,
  };
  window.__retroArcadeGameState = state;

  function resetCities() {
    state.cities = [70, 160, 250, 390, 480, 570].map((x) => ({ x, alive: true }));
    citiesElement.textContent = String(state.cities.length);
  }

  function startWave() {
    state.enemyMissiles = [];
    state.defenseMissiles = [];
    state.explosions = [];
    state.spawnTimer = -0.8;
    state.missilesLeft = 7 + state.wave * 2;
  }

  function restartGame() {
    state.score = 0;
    state.wave = 1;
    state.paused = false;
    state.gameOver = false;
    state.preferredSilo = 1;
    state.introTimer = 6;
    state.crosshair = { x: 320, y: 160 };
    scoreElement.textContent = '0';
    waveElement.textContent = '1';
    pauseButton.textContent = 'Pause';
    resetCities();
    startWave();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function pickLaunchSilo(targetX) {
    const alive = siloPositions.map((x, index) => ({ x, index, distance: Math.abs(targetX - x) })).sort((a, b) => a.distance - b.distance);
    return alive[0]?.index ?? state.preferredSilo;
  }

  function launchDefense(targetX, targetY) {
    if (state.gameOver || state.paused) return;
    const siloIndex = pickLaunchSilo(targetX);
    const startX = siloPositions[siloIndex];
    state.defenseMissiles.push({ x: startX, y: 356, tx: targetX, ty: targetY, speed: 300 });
    state.preferredSilo = siloIndex;
    state.crosshair = { x: targetX, y: targetY };
    if (state.introTimer > 0) state.introTimer = 0;
  }

  function spawnEnemy() {
    const aliveCities = state.cities.filter((city) => city.alive);
    if (!aliveCities.length) {
      state.gameOver = true;
      return;
    }
    const targets = [...aliveCities.map((city) => city.x), ...siloPositions];
    const tx = targets[Math.floor(Math.random() * targets.length)];
    state.enemyMissiles.push({
      x: 32 + Math.random() * (canvas.width - 64),
      y: -24,
      tx,
      ty: 372,
      speed: 48 + state.wave * 7,
      radius: 10 + Math.random() * 6,
      spin: Math.random() * Math.PI * 2,
    });
    state.missilesLeft -= 1;
  }

  function triggerExplosion(x, y, maxRadius = 58) {
    state.explosions.push({ x, y, radius: 0, maxRadius, age: 0, life: 0.9 });
  }

  function advanceMissile(missile, delta) {
    const dx = missile.tx - missile.x;
    const dy = missile.ty - missile.y;
    const distance = Math.hypot(dx, dy) || 1;
    missile.x += dx / distance * missile.speed * delta;
    missile.y += dy / distance * missile.speed * delta;
    return distance < 10;
  }

  function destroyCityAt(x) {
    const city = state.cities.find((entry) => entry.alive && Math.abs(entry.x - x) < 26);
    if (city) {
      city.alive = false;
      citiesElement.textContent = String(state.cities.filter((entry) => entry.alive).length);
    }
    if (!state.cities.some((entry) => entry.alive)) state.gameOver = true;
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.introTimer = Math.max(0, state.introTimer - delta);

    state.spawnTimer += delta;
    if (state.missilesLeft > 0 && state.spawnTimer >= Math.max(0.55, 1.15 - state.wave * 0.05)) {
      state.spawnTimer = 0;
      spawnEnemy();
    }

    state.defenseMissiles = state.defenseMissiles.filter((missile) => {
      if (advanceMissile(missile, delta)) {
        triggerExplosion(missile.tx, missile.ty, 64);
        return false;
      }
      return true;
    });

    state.enemyMissiles = state.enemyMissiles.filter((missile) => {
      if (advanceMissile(missile, delta)) {
        destroyCityAt(missile.tx);
        triggerExplosion(missile.tx, missile.ty, 42);
        return false;
      }
      return true;
    });

    state.explosions.forEach((explosion) => {
      explosion.age += delta;
      const progress = explosion.age / explosion.life;
      explosion.radius = progress < 0.45 ? explosion.maxRadius * (progress / 0.45) : explosion.maxRadius * (1 - (progress - 0.45) / 0.55);
    });
    state.explosions = state.explosions.filter((explosion) => explosion.age < explosion.life);

    state.explosions.forEach((explosion) => {
      state.enemyMissiles.forEach((missile) => {
        if (!missile.destroyed && Math.hypot(missile.x - explosion.x, missile.y - explosion.y) < explosion.radius) {
          missile.destroyed = true;
          state.score += 25;
          scoreElement.textContent = String(state.score);
          triggerExplosion(missile.x, missile.y, 30);
        }
      });
    });
    state.enemyMissiles = state.enemyMissiles.filter((missile) => !missile.destroyed);

    if (state.missilesLeft <= 0 && state.enemyMissiles.length === 0 && state.defenseMissiles.length === 0) {
      state.wave += 1;
      waveElement.textContent = String(state.wave);
      startWave();
    }
  }

  function drawCrosshair() {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.crosshair.x - 12, state.crosshair.y);
    ctx.lineTo(state.crosshair.x + 12, state.crosshair.y);
    ctx.moveTo(state.crosshair.x, state.crosshair.y - 12);
    ctx.lineTo(state.crosshair.x, state.crosshair.y + 12);
    ctx.stroke();
  }

  function drawInstructions() {
    if (state.introTimer <= 0) return;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(118, 34, 404, 72);
    ctx.strokeStyle = 'rgba(113,227,255,0.4)';
    ctx.strokeRect(118, 34, 404, 72);
    ctx.fillStyle = '#f7f5ff';
    ctx.font = "16px 'Courier New'";
    ctx.textAlign = 'center';
    ctx.fillText('Tippe oder klicke auf einen Punkt im Himmel.', canvas.width / 2, 62);
    ctx.fillText('Deine Abwehrrakete detoniert dort und sprengt Meteoriten in der Nähe.', canvas.width / 2, 86);
  }

  function draw() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#050915');
    sky.addColorStop(1, '#1e2340');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 70; i += 1) {
      ctx.fillStyle = i % 5 === 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)';
      ctx.fillRect((i * 79) % canvas.width, (i * 43) % 180, 2, 2);
    }

    ctx.fillStyle = '#132845';
    ctx.fillRect(0, 324, canvas.width, 96);

    state.cities.forEach((city) => {
      if (!city.alive) return;
      ctx.fillStyle = '#ff9b54';
      ctx.fillRect(city.x - 18, 350, 36, 24);
      ctx.fillRect(city.x - 8, 338, 16, 12);
    });

    siloPositions.forEach((x, index) => {
      ctx.fillStyle = index === state.preferredSilo ? '#71e3ff' : '#87ff65';
      ctx.beginPath();
      ctx.moveTo(x - 18, 370);
      ctx.lineTo(x, 332);
      ctx.lineTo(x + 18, 370);
      ctx.closePath();
      ctx.fill();
    });

    ctx.strokeStyle = '#f7f5ff';
    ctx.lineWidth = 2;
    state.defenseMissiles.forEach((missile) => {
      ctx.beginPath();
      ctx.moveTo(missile.x, missile.y);
      ctx.lineTo(missile.tx, missile.ty);
      ctx.stroke();
    });

    state.enemyMissiles.forEach((meteor) => {
      ctx.strokeStyle = 'rgba(255,140,94,0.38)';
      ctx.beginPath();
      ctx.moveTo(meteor.x, meteor.y);
      ctx.lineTo(meteor.x - 18, meteor.y - 28);
      ctx.stroke();
      ctx.save();
      ctx.translate(meteor.x, meteor.y);
      ctx.rotate(meteor.spin + meteor.y * 0.02);
      ctx.fillStyle = '#ff9b54';
      ctx.beginPath();
      ctx.moveTo(0, -meteor.radius);
      ctx.lineTo(meteor.radius * 0.8, -meteor.radius * 0.15);
      ctx.lineTo(meteor.radius * 0.4, meteor.radius);
      ctx.lineTo(-meteor.radius * 0.7, meteor.radius * 0.5);
      ctx.lineTo(-meteor.radius, -meteor.radius * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    state.explosions.forEach((explosion) => {
      ctx.fillStyle = `rgba(255, 209, 102, ${Math.max(0, 1 - explosion.age / explosion.life)})`;
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, Math.max(0, explosion.radius), 0, Math.PI * 2);
      ctx.fill();
    });

    drawCrosshair();
    drawInstructions();

    if (state.paused || state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f5ff';
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillText(state.gameOver ? 'Defeat' : 'Paused', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = "16px 'Courier New'";
      ctx.fillText(state.gameOver ? 'Restart to defend again' : 'Press pause again to resume', canvas.width / 2, canvas.height / 2 + 20);
    }
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    state.crosshair.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    state.crosshair.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    launchDefense((event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height));
  });

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'left') state.preferredSilo = 0;
      if (action === 'center') state.preferredSilo = 1;
      if (action === 'right') state.preferredSilo = 2;
      if (action === 'pause') togglePause();
    });
  });

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}


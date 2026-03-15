const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;

if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const livesElement = document.querySelector("#lives");
  const cashElement = document.querySelector("#cash");
  const waveElement = document.querySelector("#wave");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const path = [
    { x: 24, y: 116 },
    { x: 188, y: 116 },
    { x: 188, y: 308 },
    { x: 370, y: 308 },
    { x: 370, y: 88 },
    { x: 552, y: 88 },
    { x: 552, y: 252 },
    { x: 698, y: 252 },
  ];
  const pads = [
    { x: 92, y: 200 },
    { x: 278, y: 132 },
    { x: 276, y: 368 },
    { x: 454, y: 180 },
    { x: 450, y: 352 },
    { x: 630, y: 144 },
  ];
  const towerTypes = {
    pea: { label: "Pea", cost: 60, range: 125, fireRate: 0.75, damage: 20, speed: 250, color: "#87ff65" },
    burst: { label: "Burst", cost: 95, range: 145, fireRate: 1.2, damage: 36, speed: 300, color: "#ff5fb2" },
  };

  const state = {
    score: 0,
    lives: 15,
    cash: 120,
    wave: 1,
    selected: "pea",
    paused: false,
    gameOver: false,
    waveRunning: false,
    spawnQueue: 0,
    spawnTimer: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    lastTime: 0,
  };
  window.__retroArcadeGameState = state;

  function syncHud() {
    scoreElement.textContent = String(Math.floor(state.score));
    livesElement.textContent = String(state.lives);
    cashElement.textContent = String(state.cash);
    waveElement.textContent = String(state.wave);
  }

  function resetState() {
    state.score = 0;
    state.lives = 15;
    state.cash = 120;
    state.wave = 1;
    state.selected = "pea";
    state.paused = false;
    state.gameOver = false;
    state.waveRunning = false;
    state.spawnQueue = 0;
    state.spawnTimer = 0;
    state.towers = [];
    state.enemies = [];
    state.projectiles = [];
    state.particles = [];
    pauseButton.textContent = "Pause";
    syncHud();
  }

  function startWave() {
    if (state.gameOver || state.paused || state.waveRunning) return;
    state.waveRunning = true;
    state.spawnQueue = 7 + state.wave * 3;
    state.spawnTimer = 0;
  }

  function padBusy(index) {
    return state.towers.some((tower) => tower.padIndex === index);
  }

  function buildTower(index) {
    const type = towerTypes[state.selected];
    if (!type || padBusy(index) || state.cash < type.cost || state.gameOver) return;
    state.cash -= type.cost;
    const pad = pads[index];
    state.towers.push({ padIndex: index, type: state.selected, x: pad.x, y: pad.y, cooldown: 0.1 });
    syncHud();
  }

  function spawnEnemy() {
    const hp = 44 + state.wave * 14;
    state.enemies.push({
      x: path[0].x,
      y: path[0].y,
      radius: 11,
      hp,
      maxHp: hp,
      speed: 44 + state.wave * 5,
      waypoint: 1,
      tint: Math.random() < 0.2 ? "#ff9b54" : "#71e3ff",
    });
  }

  function burst(x, y, color, amount = 8) {
    for (let i = 0; i < amount; i += 1) {
      const angle = (Math.PI * 2 * i) / amount + Math.random() * 0.25;
      const speed = 25 + Math.random() * 55;
      state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.2, color });
    }
  }

  function updateWave(delta) {
    if (!state.waveRunning) return;
    state.spawnTimer -= delta;
    if (state.spawnQueue > 0 && state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnQueue -= 1;
      state.spawnTimer = Math.max(0.32, 0.78 - state.wave * 0.03);
    }
    if (state.spawnQueue <= 0 && state.enemies.length === 0) {
      state.waveRunning = false;
      state.score += 80 + state.wave * 24;
      state.cash += 45 + state.wave * 8;
      state.wave += 1;
      syncHud();
    }
  }

  function updateEnemies(delta) {
    state.enemies.forEach((enemy) => {
      const target = path[enemy.waypoint];
      if (!target) return;
      const dx = target.x - enemy.x;
      const dy = target.y - enemy.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= enemy.speed * delta) {
        enemy.x = target.x;
        enemy.y = target.y;
        enemy.waypoint += 1;
      } else {
        enemy.x += (dx / distance) * enemy.speed * delta;
        enemy.y += (dy / distance) * enemy.speed * delta;
      }
    });

    state.enemies = state.enemies.filter((enemy) => {
      if (enemy.waypoint < path.length) return true;
      state.lives = Math.max(0, state.lives - 1);
      if (state.lives <= 0) state.gameOver = true;
      syncHud();
      return false;
    });
  }

  function bestTarget(tower) {
    const type = towerTypes[tower.type];
    let best = null;
    let bestValue = -1;
    state.enemies.forEach((enemy) => {
      const distance = Math.hypot(enemy.x - tower.x, enemy.y - tower.y);
      if (distance > type.range) return;
      const value = enemy.waypoint + (1 - distance / type.range);
      if (value > bestValue) {
        bestValue = value;
        best = enemy;
      }
    });
    return best;
  }

  function updateTowers(delta) {
    state.towers.forEach((tower) => {
      tower.cooldown -= delta;
      const type = towerTypes[tower.type];
      const target = bestTarget(tower);
      if (!target || tower.cooldown > 0) return;
      const angle = Math.atan2(target.y - tower.y, target.x - tower.x);
      const shots = tower.type === "burst" ? 2 : 1;
      for (let i = 0; i < shots; i += 1) {
        const spread = shots === 1 ? 0 : i === 0 ? -0.08 : 0.08;
        state.projectiles.push({
          x: tower.x,
          y: tower.y,
          vx: Math.cos(angle + spread) * type.speed,
          vy: Math.sin(angle + spread) * type.speed,
          damage: type.damage,
          color: type.color,
          life: 1.1,
        });
      }
      tower.cooldown = type.fireRate;
    });
  }

  function updateProjectiles(delta) {
    state.projectiles.forEach((shot) => {
      shot.x += shot.vx * delta;
      shot.y += shot.vy * delta;
      shot.life -= delta;
      state.enemies.forEach((enemy) => {
        if (shot.life <= 0) return;
        if (Math.hypot(enemy.x - shot.x, enemy.y - shot.y) > enemy.radius + 4) return;
        enemy.hp -= shot.damage;
        shot.life = 0;
        burst(shot.x, shot.y, shot.color, 6);
        if (enemy.hp <= 0) {
          state.score += 26 + state.wave * 4;
          state.cash += 12;
          burst(enemy.x, enemy.y, enemy.tint, 10);
        }
      });
    });
    state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
    state.projectiles = state.projectiles.filter((shot) => shot.life > 0 && shot.x >= -20 && shot.x <= canvas.width + 20 && shot.y >= -20 && shot.y <= canvas.height + 20);
    syncHud();
  }

  function updateParticles(delta) {
    state.particles.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= delta;
    });
    state.particles = state.particles.filter((particle) => particle.life > 0);
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    updateWave(delta);
    updateEnemies(delta);
    updateTowers(delta);
    updateProjectiles(delta);
    updateParticles(delta);
  }

  function drawPath() {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 28;
    ctx.strokeStyle = "#6a4429";
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    path.slice(1).forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 12]);
    ctx.strokeStyle = "rgba(255,209,102,0.6)";
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPads() {
    pads.forEach((pad, index) => {
      ctx.fillStyle = padBusy(index) ? "rgba(255,255,255,0.1)" : "rgba(113,227,255,0.12)";
      ctx.beginPath();
      ctx.arc(pad.x, pad.y, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = padBusy(index) ? "rgba(255,255,255,0.22)" : "rgba(113,227,255,0.35)";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }

  function drawTowers() {
    state.towers.forEach((tower) => {
      const type = towerTypes[tower.type];
      ctx.save();
      ctx.translate(tower.x, tower.y);
      ctx.fillStyle = "#13192f";
      ctx.fillRect(-12, -12, 24, 24);
      ctx.strokeStyle = type.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);
      ctx.fillStyle = type.color;
      ctx.fillRect(-4, -18, 8, 22);
      if (tower.type === "burst") ctx.fillRect(-12, -4, 24, 6);
      ctx.restore();
    });
  }

  function drawEnemies() {
    state.enemies.forEach((enemy) => {
      ctx.fillStyle = enemy.tint;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#101221";
      ctx.fillRect(enemy.x - 5, enemy.y - 3, 10, 6);
      ctx.fillStyle = "rgba(0,0,0,0.28)";
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28, 4);
      ctx.fillStyle = "#87ff65";
      ctx.fillRect(enemy.x - 14, enemy.y - 18, 28 * (enemy.hp / enemy.maxHp), 4);
    });
  }

  function drawProjectiles() {
    state.projectiles.forEach((shot) => {
      ctx.fillStyle = shot.color;
      ctx.beginPath();
      ctx.arc(shot.x, shot.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawParticles() {
    state.particles.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life * 1.5);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 3, 3);
      ctx.globalAlpha = 1;
    });
  }

  function drawOverlay(title, subtitle) {
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f5ff";
    ctx.textAlign = "center";
    ctx.font = "28px 'Courier New'";
    ctx.fillText(title, canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = "16px 'Courier New'";
    ctx.fillText(subtitle, canvas.width / 2, canvas.height / 2 + 22);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, "#0f1a31");
    sky.addColorStop(1, "#142338");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#203c2a";
    ctx.fillRect(0, canvas.height * 0.54, canvas.width, canvas.height * 0.46);
    drawPath();
    drawPads();
    drawTowers();
    drawEnemies();
    drawProjectiles();
    drawParticles();
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(10, 10, 170, 28);
    ctx.fillStyle = "#f7f5ff";
    ctx.font = "14px 'Courier New'";
    ctx.fillText(`Selected: ${towerTypes[state.selected].label}`, 18, 29);
    if (!state.waveRunning && !state.gameOver) drawOverlay("Ready", "Build towers and start the next wave");
    if (state.paused) drawOverlay("Paused", "Press pause again to resume");
    if (state.gameOver) drawOverlay("Base Lost", "Press Restart to try another defense");
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? "Resume" : "Pause";
  }

  function frame(time) {
    const delta = Math.min((time - state.lastTime) / 1000, 0.033);
    state.lastTime = time;
    update(delta);
    draw();
    requestAnimationFrame(frame);
  }

  function handlePoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) * (canvas.width / rect.width);
    const y = (clientY - rect.top) * (canvas.height / rect.height);
    const index = pads.findIndex((pad) => Math.hypot(pad.x - x, pad.y - y) <= 24);
    if (index >= 0) buildTower(index);
  }

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "1") state.selected = "pea";
    if (key === "2") state.selected = "burst";
    if (key === "n") startWave();
    if (key === "p") togglePause();
  });

  canvas.addEventListener("click", (event) => handlePoint(event.clientX, event.clientY));
  canvas.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    if (touch) handlePoint(touch.clientX, touch.clientY);
  }, { passive: true });

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.action === "select-pea") state.selected = "pea";
      if (button.dataset.action === "select-burst") state.selected = "burst";
      if (button.dataset.action === "start-wave") startWave();
      if (button.dataset.action === "pause") togglePause();
    });
  });

  pauseButton.addEventListener("click", togglePause);
  restartButton.addEventListener("click", resetState);

  resetState();
  requestAnimationFrame(frame);
}

const canvas = typeof document !== "undefined" ? document.querySelector("#game-canvas") : null;
if (canvas) {
  const ctx = canvas.getContext("2d");
  const scoreElement = document.querySelector("#score");
  const citiesElement = document.querySelector("#cities");
  const waveElement = document.querySelector("#wave");
  const pauseButton = document.querySelector("#pause-button");
  const restartButton = document.querySelector("#restart-button");
  const actionButtons = Array.from(document.querySelectorAll("[data-action]"));

  const silos = [120, 320, 520];
  const state = { score: 0, wave: 1, paused: false, gameOver: false, selectedSilo: 1, cities: [], missiles: [], enemyMissiles: [], explosions: [], spawnTimer: 0, remainingEnemy: 0, lastTime: 0 };

  function setupCities() { state.cities = [70, 150, 250, 390, 490, 570].map((x) => ({ x, alive: true })); }
  function restartGame() { state.score = 0; state.wave = 1; state.paused = false; state.gameOver = false; state.selectedSilo = 1; state.missiles = []; state.enemyMissiles = []; state.explosions = []; state.spawnTimer = 0; scoreElement.textContent = '0'; waveElement.textContent = '1'; setupCities(); startWave(); pauseButton.textContent = 'Pause'; }
  function startWave() { state.remainingEnemy = 8 + state.wave * 3; state.enemyMissiles = []; state.missiles = []; state.explosions = []; citiesElement.textContent = String(state.cities.filter((c) => c.alive).length); }
  function launchAt(x, y) { if (state.gameOver || state.paused) return; const siloX = silos[state.selectedSilo]; state.missiles.push({ x: siloX, y: 360, tx: x, ty: y, speed: 320 }); }
  function togglePause() { if (state.gameOver) return; state.paused = !state.paused; pauseButton.textContent = state.paused ? 'Resume' : 'Pause'; }
  function spawnEnemy() { const aliveCities = state.cities.filter((c) => c.alive); if (!aliveCities.length) { state.gameOver = true; return; } const targets = [...aliveCities.map((c) => c.x), ...silos]; const targetX = targets[Math.floor(Math.random() * targets.length)]; state.enemyMissiles.push({ x: 40 + Math.random() * 560, y: -10, tx: targetX, ty: 380, speed: 42 + state.wave * 7 }); state.remainingEnemy -= 1; }
  function explode(x, y, radius = 0) { state.explosions.push({ x, y, radius, maxRadius: 48, life: 0.6 }); }

  function updateMissile(missile, delta) { const dx = missile.tx - missile.x; const dy = missile.ty - missile.y; const distance = Math.hypot(dx, dy) || 1; missile.x += (dx / distance) * missile.speed * delta; missile.y += (dy / distance) * missile.speed * delta; return distance < 10; }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.spawnTimer += delta;
    if (state.remainingEnemy > 0 && state.spawnTimer > Math.max(0.25, 0.85 - state.wave * 0.06)) { state.spawnTimer = 0; spawnEnemy(); }

    state.missiles = state.missiles.filter((missile) => { if (updateMissile(missile, delta)) { explode(missile.tx, missile.ty, 8); return false; } return true; });
    state.enemyMissiles = state.enemyMissiles.filter((missile) => {
      if (updateMissile(missile, delta)) {
        const city = state.cities.find((entry) => entry.alive && Math.abs(entry.x - missile.tx) < 28);
        if (city) city.alive = false;
        citiesElement.textContent = String(state.cities.filter((c) => c.alive).length);
        explode(missile.tx, missile.ty, 16);
        if (!state.cities.some((c) => c.alive)) state.gameOver = true;
        return false;
      }
      return true;
    });

    state.explosions.forEach((explosion) => { explosion.life -= delta; explosion.radius = Math.min(explosion.maxRadius, explosion.radius + 120 * delta); });
    state.explosions = state.explosions.filter((explosion) => explosion.life > 0);

    state.explosions.forEach((explosion) => {
      state.enemyMissiles.forEach((missile) => {
        if (Math.hypot(missile.x - explosion.x, missile.y - explosion.y) < explosion.radius) {
          missile.y = 999;
          state.score += 25;
          scoreElement.textContent = String(state.score);
          explode(missile.x, missile.y - 999 + explosion.y, 8);
        }
      });
    });
    state.enemyMissiles = state.enemyMissiles.filter((missile) => missile.y < 900);

    if (state.remainingEnemy <= 0 && state.enemyMissiles.length === 0) { state.wave += 1; waveElement.textContent = String(state.wave); startWave(); }
  }

  function draw() {
    ctx.fillStyle = '#08101f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#132845'; ctx.fillRect(0, 330, canvas.width, 90);
    ctx.fillStyle = '#ff9b54'; state.cities.forEach((city) => { if (city.alive) { ctx.fillRect(city.x - 18, 350, 36, 24); ctx.fillRect(city.x - 10, 340, 20, 10); } });
    silos.forEach((x, index) => { ctx.fillStyle = index === state.selectedSilo ? '#71e3ff' : '#87ff65'; ctx.beginPath(); ctx.moveTo(x - 18, 368); ctx.lineTo(x, 330); ctx.lineTo(x + 18, 368); ctx.closePath(); ctx.fill(); });
    ctx.strokeStyle = '#f7f5ff'; state.missiles.forEach((missile) => { ctx.beginPath(); ctx.moveTo(missile.x, missile.y); ctx.lineTo(missile.tx, missile.ty); ctx.stroke(); });
    ctx.strokeStyle = '#ff5fb2'; state.enemyMissiles.forEach((missile) => { ctx.beginPath(); ctx.moveTo(missile.x, missile.y); ctx.lineTo(missile.tx, missile.ty); ctx.stroke(); });
    state.explosions.forEach((explosion) => { ctx.fillStyle = `rgba(255, 209, 102, ${Math.max(0.15, explosion.life)})`; ctx.beginPath(); ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2); ctx.fill(); });
    if (state.paused || state.gameOver) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle = '#f7f5ff'; ctx.font = "28px 'Courier New'"; ctx.textAlign='center'; ctx.fillText(state.gameOver ? 'Defeat' : 'Paused', canvas.width/2, canvas.height/2 - 10); ctx.font = "16px 'Courier New'"; ctx.fillText(state.gameOver ? 'Restart to defend again' : 'Press pause again to resume', canvas.width/2, canvas.height/2 + 18); }
  }

  function frame(time) { const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03); state.lastTime = time; update(delta); draw(); requestAnimationFrame(frame); }
  canvas.addEventListener('pointerdown', (event) => { const rect = canvas.getBoundingClientRect(); launchAt((event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height)); });
  actionButtons.forEach((button) => button.addEventListener('click', () => { const action = button.dataset.action; if (action === 'left') state.selectedSilo = 0; if (action === 'center') state.selectedSilo = 1; if (action === 'right') state.selectedSilo = 2; if (action === 'pause') togglePause(); }));
  pauseButton.addEventListener('click', togglePause); restartButton.addEventListener('click', restartGame); restartGame(); requestAnimationFrame(frame);
}

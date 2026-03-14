const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const shieldElement = document.querySelector('#shield');
  const waveElement = document.querySelector('#wave');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const state = { score: 0, shield: 100, wave: 1, paused: false, gameOver: false, playerX: 320, bullets: [], enemyBullets: [], enemies: [], move: 0, boost: 0, lastTime: 0 };

  function spawnWave() {
    state.enemies = [];
    for (let row = 0; row < 3 + Math.min(2, state.wave); row += 1) {
      for (let col = 0; col < 6; col += 1) {
        const type = row === 0 ? 'carrier' : row === 1 ? 'pulser' : 'hunter';
        state.enemies.push({ x: 90 + col * 76, y: 50 + row * 48, type, hp: type === 'carrier' ? 4 : type === 'pulser' ? 2 : 3, drift: Math.random() * Math.PI * 2, cooldown: Math.random() * 1.2 });
      }
    }
  }
  function restartGame() { state.score = 0; state.shield = 100; state.wave = 1; state.paused = false; state.gameOver = false; state.playerX = 320; state.bullets = []; state.enemyBullets = []; state.move = 0; state.boost = 0; scoreElement.textContent = '0'; shieldElement.textContent = '100'; waveElement.textContent = '1'; pauseButton.textContent = 'Pause'; spawnWave(); }
  function togglePause() { if (state.gameOver) return; state.paused = !state.paused; pauseButton.textContent = state.paused ? 'Resume' : 'Pause'; }
  function fire() { if (state.paused || state.gameOver || state.bullets.length > 5) return; state.bullets.push({ x: state.playerX, y: 350, vy: -520 }); }
  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.playerX = Math.max(36, Math.min(canvas.width - 36, state.playerX + state.move * (260 + state.boost * 120) * delta));
    state.boost = Math.max(0, state.boost - delta * 1.6);
    state.bullets.forEach((bullet) => { bullet.y += bullet.vy * delta; });
    state.enemyBullets.forEach((bullet) => { bullet.x += bullet.vx * delta; bullet.y += bullet.vy * delta; });
    state.bullets = state.bullets.filter((bullet) => bullet.y > -20);
    state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.y < canvas.height + 20 && bullet.x > -20 && bullet.x < canvas.width + 20);

    state.enemies.forEach((enemy, index) => {
      enemy.drift += delta * (enemy.type === 'hunter' ? 2.4 : 1.2);
      enemy.x += Math.sin(enemy.drift + index) * (enemy.type === 'hunter' ? 32 : 18) * delta;
      enemy.y += Math.cos(enemy.drift * 0.4 + index) * 12 * delta;
      enemy.cooldown -= delta;
      if (enemy.cooldown <= 0) {
        enemy.cooldown = enemy.type === 'carrier' ? 1.45 : enemy.type === 'pulser' ? 0.95 : 0.7;
        if (enemy.type === 'carrier') {
          [-0.22, 0, 0.22].forEach((angle) => state.enemyBullets.push({ x: enemy.x, y: enemy.y + 20, vx: Math.sin(angle) * 130, vy: 200 }));
        } else if (enemy.type === 'pulser') {
          state.enemyBullets.push({ x: enemy.x, y: enemy.y + 20, vx: Math.sin(enemy.drift) * 80, vy: 240 });
        } else {
          const dx = state.playerX - enemy.x; const dy = 352 - enemy.y; const distance = Math.hypot(dx, dy) || 1; state.enemyBullets.push({ x: enemy.x, y: enemy.y + 20, vx: dx / distance * 160, vy: dy / distance * 160 });
        }
      }
    });

    state.bullets.forEach((bullet) => {
      state.enemies.forEach((enemy) => {
        if (Math.abs(enemy.x - bullet.x) < 18 && Math.abs(enemy.y - bullet.y) < 18) {
          enemy.hp -= 1; bullet.y = -30; if (enemy.hp <= 0) { enemy.dead = true; state.score += enemy.type === 'carrier' ? 80 : enemy.type === 'pulser' ? 45 : 60; scoreElement.textContent = String(state.score); }
        }
      });
    });
    state.enemies = state.enemies.filter((enemy) => !enemy.dead);

    state.enemyBullets.forEach((bullet) => {
      if (Math.abs(state.playerX - bullet.x) < 22 && Math.abs(362 - bullet.y) < 24) {
        bullet.y = canvas.height + 40; state.shield = Math.max(0, state.shield - 10); shieldElement.textContent = String(state.shield); if (state.shield <= 0) state.gameOver = true;
      }
    });

    if (!state.enemies.length) { state.wave += 1; waveElement.textContent = String(state.wave); spawnWave(); }
  }

  function drawShip(x, y, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x - 18, y + 14); ctx.lineTo(x, y + 6); ctx.lineTo(x + 18, y + 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#f7f5ff'; ctx.fillRect(x - 4, y - 6, 8, 18); }
  function drawEnemy(enemy) { ctx.save(); ctx.translate(enemy.x, enemy.y); if (enemy.type === 'carrier') { ctx.fillStyle = '#ff5fb2'; ctx.fillRect(-22, -12, 44, 24); ctx.fillStyle = '#f7f5ff'; ctx.fillRect(-10, -6, 20, 12); } else if (enemy.type === 'pulser') { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#101221'; ctx.fillRect(-4, -14, 8, 28); } else { ctx.fillStyle = '#71e3ff'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(-18, 12); ctx.lineTo(0, 4); ctx.lineTo(18, 12); ctx.closePath(); ctx.fill(); } ctx.restore(); }
  function draw() {
    const gradient = ctx.createLinearGradient(0,0,0,canvas.height); gradient.addColorStop(0,'#040812'); gradient.addColorStop(1,'#180b25'); ctx.fillStyle = gradient; ctx.fillRect(0,0,canvas.width,canvas.height);
    for (let i=0;i<80;i+=1) { ctx.fillStyle = i % 5 === 0 ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)'; ctx.fillRect((i*79)%canvas.width, (i*37)%canvas.height, 2, 2); }
    ctx.strokeStyle = 'rgba(113,227,255,0.15)'; ctx.strokeRect(28, 24, canvas.width-56, canvas.height-52);
    state.enemies.forEach(drawEnemy); drawShip(state.playerX, 360, '#71e3ff');
    ctx.fillStyle = '#ffd166'; state.bullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y, 4, 14));
    ctx.fillStyle = '#ff9b54'; state.enemyBullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y, 4, 10));
    if (state.paused || state.gameOver) { ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#f7f5ff'; ctx.font="28px 'Courier New'"; ctx.textAlign='center'; ctx.fillText(state.gameOver ? 'Ship Lost' : 'Paused', canvas.width/2, canvas.height/2 - 10); }
  }
  function frame(time) { const delta = Math.min((time - state.lastTime || 16)/1000,0.03); state.lastTime = time; update(delta); draw(); requestAnimationFrame(frame); }
  document.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (key==='a' || key==='arrowleft') state.move = -1; if (key==='d' || key==='arrowright') state.move = 1; if (key===' '){ event.preventDefault(); fire(); } if (key==='w' || key==='arrowup') state.boost = 1; if (key==='p') togglePause(); });
  document.addEventListener('keyup', (event) => { const key = event.key.toLowerCase(); if (['a','d','arrowleft','arrowright'].includes(key)) state.move = 0; });
  actionButtons.forEach((button) => button.addEventListener('click', () => { const action = button.dataset.action; if (action==='left') state.move = -1; if (action==='right') state.move = 1; if (action==='fire') fire(); if (action==='boost') state.boost = 1; setTimeout(() => { state.move = 0; }, 160); }));
  pauseButton.addEventListener('click', togglePause); restartButton.addEventListener('click', restartGame); restartGame(); requestAnimationFrame(frame);
}

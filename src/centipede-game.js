const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const livesElement = document.querySelector('#lives');
  const waveElement = document.querySelector('#wave');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  
  window.__retroArcadeGameState = state;

  function makeMushrooms() { state.mushrooms = []; for (let i = 0; i < 28; i += 1) { state.mushrooms.push({ x: 40 + Math.random() * 560, y: 70 + Math.random() * 250, hp: 3 }); } }
  function makeCentipede() { state.centipede = []; for (let i = 0; i < 10 + state.wave; i += 1) { state.centipede.push({ x: 40 + i * 24, y: 50, dir: 1, alive: true }); } }
  function restartGame() { state.score = 0; state.lives = 3; state.wave = 1; state.paused = false; state.gameOver = false; state.player = { x: 320, y: 370 }; state.bullets = []; state.spider = null; scoreElement.textContent = '0'; livesElement.textContent = '3'; waveElement.textContent = '1'; pauseButton.textContent = 'Pause'; makeMushrooms(); makeCentipede(); }
  function togglePause() { if (state.gameOver) return; state.paused = !state.paused; pauseButton.textContent = state.paused ? 'Resume' : 'Pause'; }
  function fire() { if (state.paused || state.gameOver || state.bullets.length > 3) return; state.bullets.push({ x: state.player.x, y: state.player.y - 18, vy: -420 }); }

  function updateCentipede(delta) {
    state.centipede.forEach((segment, index) => {
      if (!segment.alive) return;
      segment.x += segment.dir * (90 + state.wave * 10) * delta;
      const hitWall = segment.x < 18 || segment.x > canvas.width - 18;
      const hitMushroom = state.mushrooms.some((m) => Math.abs(segment.x - m.x) < 18 && Math.abs(segment.y - m.y) < 12);
      if (hitWall || hitMushroom) { segment.dir *= -1; segment.y += 20; }
      if (index > 0) {
        const prev = state.centipede[index - 1];
        if (prev.alive) {
          segment.y += (prev.y - segment.y) * 0.22;
          segment.x += (prev.x - segment.x - segment.dir * 22) * 0.18;
        }
      }
      if (segment.y > 330 && Math.abs(segment.x - state.player.x) < 18 && Math.abs(segment.y - state.player.y) < 18) {
        loseLife();
      }
    });
  }

  function loseLife() { state.lives -= 1; livesElement.textContent = String(state.lives); state.player.x = 320; state.player.y = 370; if (state.lives <= 0) state.gameOver = true; }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.player.x = Math.max(24, Math.min(canvas.width - 24, state.player.x + state.move.x * 220 * delta));
    state.player.y = Math.max(300, Math.min(canvas.height - 24, state.player.y + state.move.y * 220 * delta));
    state.bullets.forEach((bullet) => { bullet.y += bullet.vy * delta; });
    state.bullets = state.bullets.filter((bullet) => bullet.y > -20);
    updateCentipede(delta);

    if (!state.spider && Math.random() < 0.01 + state.wave * 0.001) { state.spider = { x: Math.random() < 0.5 ? -30 : canvas.width + 30, y: 310 + Math.random() * 70, vx: Math.random() < 0.5 ? 120 : -120 }; }
    if (state.spider) {
      state.spider.x += state.spider.vx * delta;
      state.spider.y += Math.sin(Date.now() / 250) * 0.8;
      if (Math.abs(state.spider.x - state.player.x) < 20 && Math.abs(state.spider.y - state.player.y) < 20) loseLife();
      if (state.spider.x < -50 || state.spider.x > canvas.width + 50) state.spider = null;
    }

    state.bullets.forEach((bullet) => {
      state.centipede.forEach((segment) => {
        if (segment.alive && Math.abs(segment.x - bullet.x) < 14 && Math.abs(segment.y - bullet.y) < 14) {
          segment.alive = false; bullet.y = -50; state.mushrooms.push({ x: segment.x, y: segment.y, hp: 2 }); state.score += 30; scoreElement.textContent = String(state.score);
        }
      });
      state.mushrooms.forEach((mushroom) => {
        if (mushroom.hp > 0 && Math.abs(mushroom.x - bullet.x) < 14 && Math.abs(mushroom.y - bullet.y) < 14) { mushroom.hp -= 1; bullet.y = -50; if (mushroom.hp <= 0) { state.score += 8; scoreElement.textContent = String(state.score); } }
      });
      if (state.spider && Math.abs(state.spider.x - bullet.x) < 18 && Math.abs(state.spider.y - bullet.y) < 18) { state.spider = null; bullet.y = -50; state.score += 70; scoreElement.textContent = String(state.score); }
    });
    state.mushrooms = state.mushrooms.filter((m) => m.hp > 0);

    if (!state.centipede.some((segment) => segment.alive)) { state.wave += 1; waveElement.textContent = String(state.wave); makeCentipede(); makeMushrooms(); }
  }

  function draw() {
    ctx.fillStyle = '#08101f'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; for (let x = 0; x < canvas.width; x += 32) ctx.fillRect(x, 0, 1, canvas.height);
    state.mushrooms.forEach((m) => { ctx.fillStyle = m.hp === 3 ? '#87ff65' : m.hp === 2 ? '#ffd166' : '#ff9b54'; ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(m.x - 4, m.y, 8, 10); });
    state.centipede.forEach((segment, index) => { if (!segment.alive) return; ctx.fillStyle = index === 0 ? '#ff5fb2' : '#71e3ff'; ctx.beginPath(); ctx.arc(segment.x, segment.y, 12, 0, Math.PI * 2); ctx.fill(); });
    if (state.spider) { ctx.fillStyle = '#ff9b54'; ctx.beginPath(); ctx.ellipse(state.spider.x, state.spider.y, 18, 12, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#f7f5ff'; state.bullets.forEach((bullet) => ctx.fillRect(bullet.x - 2, bullet.y, 4, 14));
    ctx.fillStyle = '#ffd166'; ctx.fillRect(state.player.x - 16, state.player.y - 8, 32, 16); ctx.fillRect(state.player.x - 6, state.player.y - 18, 12, 12);
    if (state.paused || state.gameOver) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle = '#f7f5ff'; ctx.font = "28px 'Courier New'"; ctx.textAlign='center'; ctx.fillText(state.gameOver ? 'Game Over' : 'Paused', canvas.width/2, canvas.height/2 - 10); }
  }

  function frame(time) { const delta = Math.min((time - state.lastTime || 16) / 1000, 0.03); state.lastTime = time; update(delta); draw(); requestAnimationFrame(frame); }
  document.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (key === 'a' || key === 'arrowleft') state.move.x = -1; if (key === 'd' || key === 'arrowright') state.move.x = 1; if (key === 'w' || key === 'arrowup') state.move.y = -1; if (key === 's' || key === 'arrowdown') state.move.y = 1; if (key === ' ') { event.preventDefault(); fire(); } if (key === 'p') togglePause(); });
  document.addEventListener('keyup', (event) => { const key = event.key.toLowerCase(); if (['a','d','arrowleft','arrowright'].includes(key)) state.move.x = 0; if (['w','s','arrowup','arrowdown'].includes(key)) state.move.y = 0; });
  actionButtons.forEach((button) => button.addEventListener('click', () => { const action = button.dataset.action; if (action === 'left') state.move.x = -1; if (action === 'right') state.move.x = 1; if (action === 'up') state.move.y = -1; if (action === 'down') state.move.y = 1; if (action === 'fire') fire(); if (action === 'pause') togglePause(); setTimeout(() => { state.move.x = 0; state.move.y = 0; }, 140); }));
  pauseButton.addEventListener('click', togglePause); restartButton.addEventListener('click', restartGame); restartGame(); requestAnimationFrame(frame);
}



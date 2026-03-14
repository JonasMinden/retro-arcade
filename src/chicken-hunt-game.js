const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const hitsElement = document.querySelector('#hits');
  const timeElement = document.querySelector('#time');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const covers = [
    { x: 110, y: 298, w: 118, h: 70, type: 'hay' },
    { x: 270, y: 286, w: 150, h: 86, type: 'wagon' },
    { x: 502, y: 304, w: 116, h: 64, type: 'crate' },
  ];

  
  window.__retroArcadeGameState = state;

  function restartGame() {
    state.score = 0;
    state.hits = 0;
    state.time = 45;
    state.paused = false;
    state.gameOver = false;
    state.birds = [];
    state.spawnTimer = 0;
    state.muzzle = 0;
    scoreElement.textContent = '0';
    hitsElement.textContent = '0';
    timeElement.textContent = '45';
    pauseButton.textContent = 'Pause';
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function spawnBird() {
    const cover = covers[Math.floor(Math.random() * covers.length)];
    const golden = Math.random() < 0.12;
    state.birds.push({
      cover,
      x: cover.x + (Math.random() - 0.5) * (cover.w * 0.52),
      y: cover.y - 8,
      visible: 0,
      targetVisible: 0.8 + Math.random() * 0.45,
      timer: 0.9 + Math.random() * 1.1,
      golden,
      flap: Math.random() * Math.PI * 2,
    });
  }

  function shootAt(x, y) {
    if (state.paused || state.gameOver) return;
    state.aimX = x;
    state.aimY = y;
    state.muzzle = 0.12;
    for (let i = state.birds.length - 1; i >= 0; i -= 1) {
      const bird = state.birds[i];
      const visibleY = bird.y - bird.visible * 44;
      if (bird.visible < 0.3) continue;
      if (Math.hypot(x - bird.x, y - visibleY) < 26) {
        state.birds.splice(i, 1);
        state.hits += 1;
        state.score += bird.golden ? 140 : 45;
        hitsElement.textContent = String(state.hits);
        scoreElement.textContent = String(state.score);
        return;
      }
    }
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.time = Math.max(0, state.time - delta);
    timeElement.textContent = String(Math.ceil(state.time));
    if (state.time <= 0) {
      state.gameOver = true;
      return;
    }

    state.muzzle = Math.max(0, state.muzzle - delta);
    state.spawnTimer += delta;
    if (state.spawnTimer > 0.72 && state.birds.length < 4) {
      state.spawnTimer = 0;
      spawnBird();
    }

    state.birds.forEach((bird) => {
      bird.flap += delta * 10;
      bird.timer -= delta;
      const rising = bird.timer > 0.2;
      bird.visible += ((rising ? bird.targetVisible : 0) - bird.visible) * Math.min(1, delta * 7);
    });
    state.birds = state.birds.filter((bird) => bird.timer > -0.18);
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#78d4ff');
    sky.addColorStop(1, '#d9f4ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#91d061';
    ctx.fillRect(0, 286, canvas.width, 134);

    ctx.fillStyle = '#7a5634';
    ctx.fillRect(88, 170, 122, 132);
    ctx.fillStyle = '#5b3310';
    ctx.beginPath();
    ctx.moveTo(62, 182);
    ctx.lineTo(149, 110);
    ctx.lineTo(236, 182);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f7f0df';
    ctx.fillRect(432, 160, 128, 110);
    ctx.fillStyle = '#d84f42';
    ctx.beginPath();
    ctx.moveTo(412, 172);
    ctx.lineTo(496, 110);
    ctx.lineTo(580, 172);
    ctx.closePath();
    ctx.fill();
  }

  function drawCovers() {
    covers.forEach((cover) => {
      if (cover.type === 'hay') {
        ctx.fillStyle = '#d8aa43';
        ctx.fillRect(cover.x - cover.w / 2, cover.y, cover.w, cover.h);
        ctx.strokeStyle = 'rgba(123,85,20,0.5)';
        ctx.strokeRect(cover.x - cover.w / 2, cover.y, cover.w, cover.h);
      } else if (cover.type === 'wagon') {
        ctx.fillStyle = '#8d5a33';
        ctx.fillRect(cover.x - cover.w / 2, cover.y, cover.w, cover.h);
        ctx.fillStyle = '#2a2020';
        ctx.beginPath();
        ctx.arc(cover.x - 42, cover.y + cover.h, 14, 0, Math.PI * 2);
        ctx.arc(cover.x + 42, cover.y + cover.h, 14, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#9f7449';
        ctx.fillRect(cover.x - cover.w / 2, cover.y, cover.w, cover.h);
        ctx.fillStyle = '#6b4c2d';
        ctx.fillRect(cover.x - cover.w / 2 + 10, cover.y + 10, cover.w - 20, 8);
      }
    });
  }

  function drawBird(bird) {
    const y = bird.y - bird.visible * 44;
    ctx.save();
    ctx.translate(bird.x, y);
    ctx.fillStyle = bird.golden ? '#ffd166' : '#ff9b54';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7f5ff';
    ctx.beginPath();
    ctx.moveTo(-2, -2);
    ctx.lineTo(-20, Math.sin(bird.flap) * 8);
    ctx.lineTo(-2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(20, -Math.sin(bird.flap) * 8);
    ctx.lineTo(2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#101221';
    ctx.beginPath();
    ctx.arc(6, -4, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawShotgun() {
    ctx.strokeStyle = '#35281d';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(60, canvas.height - 12);
    ctx.lineTo(156, canvas.height - 58);
    ctx.stroke();
    ctx.strokeStyle = '#bbc0c9';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(146, canvas.height - 64);
    ctx.lineTo(208, canvas.height - 96);
    ctx.stroke();
    if (state.muzzle > 0) {
      ctx.fillStyle = `rgba(255, 209, 102, ${state.muzzle * 6})`;
      ctx.beginPath();
      ctx.arc(210, canvas.height - 98, 18 * state.muzzle * 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(state.aimX - 14, state.aimY);
    ctx.lineTo(state.aimX + 14, state.aimY);
    ctx.moveTo(state.aimX, state.aimY - 14);
    ctx.lineTo(state.aimX, state.aimY + 14);
    ctx.stroke();
  }

  function draw() {
    drawBackground();
    drawCovers();
    [...state.birds].sort((a, b) => a.cover.y - b.cover.y).forEach(drawBird);
    drawShotgun();

    if (state.paused || state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f5ff';
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillText(state.gameOver ? 'Time Up' : 'Paused', canvas.width / 2, canvas.height / 2 - 10);
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
    state.aimX = (event.clientX - rect.left) * (canvas.width / rect.width);
    state.aimY = (event.clientY - rect.top) * (canvas.height / rect.height);
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    shootAt((event.clientX - rect.left) * (canvas.width / rect.width), (event.clientY - rect.top) * (canvas.height / rect.height));
  });

  actionButtons.forEach((button) => button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'pause') togglePause();
    if (action === 'restart') restartGame();
  }));

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}



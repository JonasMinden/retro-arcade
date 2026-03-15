const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;

if (canvas) {
  const ctx = canvas.getContext('2d');
  const scoreElement = document.querySelector('#score');
  const hitsElement = document.querySelector('#hits');
  const livesElement = document.querySelector('#lives');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const state = {
    score: 0,
    hits: 0,
    lives: 5,
    paused: false,
    gameOver: false,
    ducks: [],
    splashes: [],
    spawnTimer: 0,
    elapsed: 0,
    muzzle: 0,
    lastTime: 0,
    aimX: 320,
    aimY: 210,
    audioContext: null,
  };
  window.__retroArcadeGameState = state;

  function quack() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!state.audioContext) state.audioContext = new AudioCtx();
    const audio = state.audioContext;
    const now = audio.currentTime;
    const osc1 = audio.createOscillator();
    const osc2 = audio.createOscillator();
    const gain = audio.createGain();
    osc1.type = 'square';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(560, now);
    osc1.frequency.exponentialRampToValueAtTime(320, now + 0.08);
    osc2.frequency.setValueAtTime(760, now);
    osc2.frequency.exponentialRampToValueAtTime(380, now + 0.1);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(audio.destination);
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.18);
    osc2.stop(now + 0.18);
  }

  function updateHud() {
    scoreElement.textContent = String(state.score);
    hitsElement.textContent = String(state.hits);
    livesElement.textContent = String(state.lives);
  }

  function restartGame() {
    state.score = 0;
    state.hits = 0;
    state.lives = 5;
    state.paused = false;
    state.gameOver = false;
    state.ducks = [];
    state.splashes = [];
    state.spawnTimer = 0;
    state.elapsed = 0;
    state.muzzle = 0;
    pauseButton.textContent = 'Pause';
    updateHud();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function difficulty() {
    return 1 + state.elapsed * 0.045;
  }

  function spawnDuck(batchSize = 1) {
    for (let i = 0; i < batchSize; i += 1) {
      const fromLeft = Math.random() < 0.5;
      const lane = 86 + Math.random() * 170;
      const size = 0.78 + Math.random() * 0.42;
      const speed = (110 + Math.random() * 40) * difficulty();
      state.ducks.push({
        x: fromLeft ? -70 : canvas.width + 70,
        y: lane,
        vx: fromLeft ? speed : -speed,
        vy: -18 - Math.random() * 32,
        bob: Math.random() * Math.PI * 2,
        wing: Math.random() * Math.PI * 2,
        size,
        tint: Math.random() < 0.18 ? '#ffd166' : '#ffcc3f',
      });
    }
  }

  function burst(x, y, color) {
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
      const speed = 28 + Math.random() * 44;
      state.splashes.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + Math.random() * 0.25, color });
    }
  }

  function shootAt(x, y) {
    if (state.paused || state.gameOver) return;
    state.aimX = x;
    state.aimY = y;
    state.muzzle = 0.12;
    for (let i = state.ducks.length - 1; i >= 0; i -= 1) {
      const duck = state.ducks[i];
      if (Math.hypot(x - duck.x, y - duck.y) < 26 * duck.size) {
        state.ducks.splice(i, 1);
        state.hits += 1;
        state.score += 40 + Math.round(difficulty() * 9);
        burst(duck.x, duck.y, duck.tint);
        quack();
        updateHud();
        return;
      }
    }
  }

  function loseLife(x, y) {
    state.lives = Math.max(0, state.lives - 1);
    burst(x, y, '#ff5f6d');
    updateHud();
    if (state.lives <= 0) state.gameOver = true;
  }

  function update(delta) {
    if (state.paused || state.gameOver) return;
    state.elapsed += delta;
    state.muzzle = Math.max(0, state.muzzle - delta);
    state.spawnTimer += delta;
    const interval = Math.max(0.26, 1.08 - state.elapsed * 0.035);
    if (state.spawnTimer >= interval) {
      state.spawnTimer = 0;
      const roll = Math.random();
      const amount = difficulty() > 2.8 && roll > 0.74 ? 3 : difficulty() > 1.7 && roll > 0.52 ? 2 : 1;
      spawnDuck(amount);
    }

    state.ducks.forEach((duck) => {
      duck.bob += delta * 7;
      duck.wing += delta * 18;
      duck.x += duck.vx * delta;
      duck.y += duck.vy * delta + Math.sin(duck.bob) * 14 * delta;
      duck.vy += 24 * delta;
    });

    state.ducks = state.ducks.filter((duck) => {
      const escaped = duck.x < -90 || duck.x > canvas.width + 90 || duck.y < -80 || duck.y > canvas.height + 40;
      if (escaped) loseLife(duck.x, Math.min(canvas.height - 24, duck.y));
      return !escaped;
    });

    state.splashes.forEach((particle) => {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life -= delta;
    });
    state.splashes = state.splashes.filter((particle) => particle.life > 0);
  }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#89d9ff');
    sky.addColorStop(1, '#f0fbff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#d7ecf6';
    ctx.beginPath();
    ctx.moveTo(0, 178);
    ctx.lineTo(80, 134);
    ctx.lineTo(182, 176);
    ctx.lineTo(280, 126);
    ctx.lineTo(388, 176);
    ctx.lineTo(514, 124);
    ctx.lineTo(640, 170);
    ctx.lineTo(640, 250);
    ctx.lineTo(0, 250);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#76c971';
    ctx.fillRect(0, 270, canvas.width, 150);

    ctx.fillStyle = '#69bfe7';
    ctx.beginPath();
    ctx.ellipse(316, 336, 210, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(250 + i * 42, 336 + Math.sin(i) * 3, 22 - i * 2, 0, Math.PI);
      ctx.stroke();
    }

    ctx.fillStyle = '#8a603a';
    ctx.fillRect(474, 164, 112, 118);
    ctx.fillStyle = '#d84f42';
    ctx.beginPath();
    ctx.moveTo(456, 176);
    ctx.lineTo(530, 120);
    ctx.lineTo(604, 176);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f7e2b8';
    ctx.fillRect(500, 206, 24, 76);
    ctx.fillRect(540, 206, 24, 76);

    for (let i = 0; i < 9; i += 1) {
      const x = 38 + i * 66;
      ctx.strokeStyle = '#497126';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, 300);
      ctx.lineTo(x, 234 - (i % 3) * 10);
      ctx.stroke();
      ctx.fillStyle = '#8b4d22';
      ctx.beginPath();
      ctx.ellipse(x - 4, 238 - (i % 3) * 10, 6, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + 4, 230 - (i % 3) * 10, 6, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawDuck(duck) {
    ctx.save();
    ctx.translate(duck.x, duck.y);
    ctx.scale(Math.sign(duck.vx) * duck.size, duck.size);
    const flap = Math.sin(duck.wing) * 10;

    ctx.fillStyle = duck.tint;
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f6f0cf';
    ctx.beginPath();
    ctx.ellipse(-4, 3, 10, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff9b54';
    ctx.beginPath();
    ctx.moveTo(18, -2);
    ctx.lineTo(33, 2);
    ctx.lineTo(18, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#101221';
    ctx.beginPath();
    ctx.arc(11, -4, 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f7f5ff';
    ctx.beginPath();
    ctx.moveTo(-2, 0);
    ctx.lineTo(-24, flap);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(-12, -14 - flap * 0.4);
    ctx.lineTo(8, -8);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ff9b54';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, 12);
    ctx.lineTo(-6, 22);
    ctx.moveTo(0, 12);
    ctx.lineTo(2, 22);
    ctx.stroke();

    ctx.restore();
  }

  function drawSplashes() {
    state.splashes.forEach((particle) => {
      ctx.globalAlpha = Math.max(0, particle.life * 2.2);
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 4, 4);
      ctx.globalAlpha = 1;
    });
  }

  function drawShotgun() {
    ctx.strokeStyle = '#3a2b1e';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(68, canvas.height - 10);
    ctx.lineTo(158, canvas.height - 58);
    ctx.stroke();
    ctx.strokeStyle = '#bcc7d8';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(150, canvas.height - 63);
    ctx.lineTo(220, canvas.height - 98);
    ctx.stroke();
    if (state.muzzle > 0) {
      ctx.fillStyle = `rgba(255, 209, 102, ${state.muzzle * 7})`;
      ctx.beginPath();
      ctx.arc(222, canvas.height - 99, 24 * state.muzzle * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.72)';
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
    state.ducks.forEach(drawDuck);
    drawSplashes();
    drawShotgun();
    ctx.fillStyle = 'rgba(12, 18, 34, 0.42)';
    ctx.fillRect(14, 14, 176, 34);
    ctx.fillStyle = '#f7f5ff';
    ctx.font = "14px 'Courier New'";
    ctx.fillText(`Tempo x${difficulty().toFixed(2)}`, 24, 36);

    if (state.paused || state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f5ff';
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillText(state.gameOver ? 'Out of Lives' : 'Paused', canvas.width / 2, canvas.height / 2 - 10);
      ctx.font = "16px 'Courier New'";
      ctx.fillText(state.gameOver ? 'Press Restart for another hunt' : 'Press pause again to resume', canvas.width / 2, canvas.height / 2 + 22);
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

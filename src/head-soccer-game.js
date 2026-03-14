const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const homeScoreElement = document.querySelector('#home-score');
  const awayScoreElement = document.querySelector('#away-score');
  const timeElement = document.querySelector('#time');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));
  const gravity = 900;
  
  window.__retroArcadeGameState = state;

  function resetPositions() {
    state.player = { x: 150, y: 320, vx: 0, vy: 0, kick: 0 };
    state.ai = { x: 490, y: 320, vx: 0, vy: 0, kick: 0 };
    state.ball = { x: 320, y: 180, vx: (Math.random() < 0.5 ? -1 : 1) * 150, vy: -20, r: 18 };
  }

  function restartGame() {
    state.paused = false;
    state.gameOver = false;
    state.time = 60;
    state.home = 0;
    state.away = 0;
    homeScoreElement.textContent = '0';
    awayScoreElement.textContent = '0';
    timeElement.textContent = '60';
    pauseButton.textContent = 'Pause';
    resetPositions();
  }

  function togglePause() {
    if (state.gameOver) return;
    state.paused = !state.paused;
    pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
  }

  function jump(character) {
    if (character.y >= 320) character.vy = -470;
  }

  function kick(character, direction) {
    character.kick = 0.18;
    if (Math.abs(state.ball.x - character.x) < 56 && Math.abs(state.ball.y - (character.y - 28)) < 60) {
      state.ball.vx = direction * 260 + character.vx * 0.5;
      state.ball.vy = Math.min(state.ball.vy, -220);
    }
  }

  function updateCharacter(character, delta, desiredX) {
    if (desiredX !== undefined) {
      const diff = desiredX - character.x;
      character.vx = Math.max(-170, Math.min(170, diff * 2));
    }
    character.x += character.vx * delta;
    character.vy += gravity * delta;
    character.y += character.vy * delta;
    if (character.y > 320) {
      character.y = 320;
      character.vy = 0;
    }
    character.kick = Math.max(0, character.kick - delta);
    character.x = Math.max(48, Math.min(canvas.width - 48, character.x));
  }

  function goal(side) {
    if (side === 'home') {
      state.home += 1;
      homeScoreElement.textContent = String(state.home);
    } else {
      state.away += 1;
      awayScoreElement.textContent = String(state.away);
    }
    resetPositions();
  }

  function updateBall(delta) {
    state.ball.vy += gravity * delta;
    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;
    state.ball.vx *= 0.998;

    if (state.ball.y + state.ball.r > 390) {
      state.ball.y = 390 - state.ball.r;
      state.ball.vy *= -0.74;
      state.ball.vx *= 0.985;
    }

    if (state.ball.y - state.ball.r < 18) {
      state.ball.y = 18 + state.ball.r;
      state.ball.vy = Math.abs(state.ball.vy) * 0.9;
    }

    if (state.ball.x - state.ball.r < 0) goal('away');
    if (state.ball.x + state.ball.r > canvas.width) goal('home');
  }

  function resolveBodyCollision(character, direction) {
    const headX = character.x;
    const headY = character.y - 48;
    const dx = state.ball.x - headX;
    const dy = state.ball.y - headY;
    const distance = Math.hypot(dx, dy);
    const minDistance = state.ball.r + 28;
    if (distance < minDistance) {
      const nx = dx / (distance || 1);
      const ny = dy / (distance || 1);
      state.ball.x = headX + nx * minDistance;
      state.ball.y = headY + ny * minDistance;
      const approach = state.ball.vx * nx + state.ball.vy * ny;
      if (approach < 0) {
        state.ball.vx -= 1.8 * approach * nx;
        state.ball.vy -= 1.8 * approach * ny;
      }
      state.ball.vx += direction * 26 + character.vx * 0.18;
      if (character.kick > 0) {
        state.ball.vx += direction * 120;
        state.ball.vy -= 90;
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

    state.player.vx = state.input.left ? -180 : state.input.right ? 180 : 0;
    const aiTarget = state.ball.x < 320 ? Math.max(385, state.ball.x + 36) : state.ball.x - 18;
    if (Math.random() < 0.02 && state.ai.y >= 320 && state.ball.y < 250) jump(state.ai);
    if (Math.random() < 0.02) kick(state.ai, -1);

    updateCharacter(state.player, delta);
    updateCharacter(state.ai, delta, aiTarget);
    updateBall(delta);
    resolveBodyCollision(state.player, 1);
    resolveBodyCollision(state.ai, -1);
  }

  function drawCharacter(character, color, facing) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(character.x, character.y - 48, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(character.x - 18, character.y - 22, 36, 42);
    ctx.fillStyle = '#101221';
    ctx.fillRect(character.x - 6, character.y - 18, 12, 30);
    if (character.kick > 0) {
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(character.x + (facing > 0 ? 12 : -34), character.y + 8, 22, 8);
    }
  }

  function draw() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#10203d');
    gradient.addColorStop(1, '#0a8a6b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#2ccf8f';
    ctx.fillRect(0, 302, canvas.width, 118);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(320, 110);
    ctx.lineTo(320, 420);
    ctx.stroke();
    ctx.strokeRect(16, 250, 52, 142);
    ctx.strokeRect(canvas.width - 68, 250, 52, 142);
    drawCharacter(state.player, '#71e3ff', 1);
    drawCharacter(state.ai, '#ff5fb2', -1);
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, state.ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.stroke();
    if (state.paused || state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#f7f5ff';
      ctx.font = "28px 'Courier New'";
      ctx.textAlign = 'center';
      ctx.fillText(state.gameOver ? 'Final Whistle' : 'Paused', canvas.width / 2, canvas.height / 2 - 10);
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
    if (key === 'a' || key === 'arrowleft') state.input.left = true;
    if (key === 'd' || key === 'arrowright') state.input.right = true;
    if (key === 'w' || key === 'arrowup' || key === ' ') { event.preventDefault(); jump(state.player); }
    if (key === 's' || key === 'arrowdown') kick(state.player, 1);
    if (key === 'p') togglePause();
  });

  document.addEventListener('keyup', (event) => {
    const key = event.key.toLowerCase();
    if (key === 'a' || key === 'arrowleft') state.input.left = false;
    if (key === 'd' || key === 'arrowright') state.input.right = false;
  });

  actionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.dataset.action;
      if (action === 'left') { state.input.left = true; setTimeout(() => { state.input.left = false; }, 140); }
      if (action === 'right') { state.input.right = true; setTimeout(() => { state.input.right = false; }, 140); }
      if (action === 'jump') jump(state.player);
      if (action === 'kick') kick(state.player, 1);
    });
  });

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}



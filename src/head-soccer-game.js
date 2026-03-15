const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const homeScoreElement = document.querySelector('#home-score');
  const awayScoreElement = document.querySelector('#away-score');
  const timeElement = document.querySelector('#time');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));

  const GRAVITY = 980;
  const FLOOR_Y = 378;
  const GOAL_HEIGHT = 112;
  const state = {
    paused: false,
    gameOver: false,
    time: 60,
    home: 0,
    away: 0,
    input: { left: false, right: false },
    player: null,
    ai: null,
    ball: null,
    lastTime: 0
  };
  window.__retroArcadeGameState = state;

  function createPlayer(x, color) {
    return {
      x,
      y: FLOOR_Y,
      vx: 0,
      vy: 0,
      width: 42,
      height: 78,
      headR: 28,
      kick: 0,
      color,
      speed: 235,
      facing: x < canvas.width / 2 ? 1 : -1,
    };
  }

  function createBall() {
    return {
      x: canvas.width / 2,
      y: 162,
      vx: (Math.random() < 0.5 ? -1 : 1) * 110,
      vy: -40,
      r: 16,
      spin: 0,
    };
  }

  function resetPositions() {
    state.player = createPlayer(150, '#71e3ff');
    state.ai = createPlayer(490, '#ff5fb2');
    state.ball = createBall();
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
    if (character.y >= FLOOR_Y - 0.5) character.vy = -480;
  }

  function kick(character, direction) {
    character.kick = 0.2;
    character.facing = direction;
  }

  function updateCharacter(character, delta, desiredX) {
    if (desiredX !== undefined) {
      const diff = desiredX - character.x;
      const target = Math.max(-1, Math.min(1, diff / 70)) * character.speed;
      character.vx += (target - character.vx) * Math.min(1, delta * 7.5);
    } else {
      const target = state.input.left ? -character.speed : state.input.right ? character.speed : 0;
      character.vx += (target - character.vx) * Math.min(1, delta * 10);
      if (target !== 0) character.facing = target > 0 ? 1 : -1;
    }

    character.x += character.vx * delta;
    character.vy += GRAVITY * delta;
    character.y += character.vy * delta;

    if (character.y > FLOOR_Y) {
      character.y = FLOOR_Y;
      character.vy = 0;
    }

    character.kick = Math.max(0, character.kick - delta);
    character.x = Math.max(46, Math.min(canvas.width - 46, character.x));
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
    state.ball.vy += GRAVITY * delta;
    state.ball.x += state.ball.vx * delta;
    state.ball.y += state.ball.vy * delta;
    state.ball.vx *= 0.996;
    state.ball.spin *= 0.992;
    state.ball.vx += state.ball.spin * delta * 32;

    if (state.ball.y + state.ball.r > 394) {
      state.ball.y = 394 - state.ball.r;
      state.ball.vy = -Math.max(165, Math.abs(state.ball.vy) * 0.68);
      state.ball.vx *= 0.97;
      if (Math.abs(state.ball.vx) < 24) state.ball.vx += state.ball.vx >= 0 ? 24 : -24;
    }

    if (state.ball.y - state.ball.r < 18) {
      state.ball.y = 18 + state.ball.r;
      state.ball.vy = Math.abs(state.ball.vy) * 0.88;
    }

    const inGoalHeight = state.ball.y > 282;
    if (state.ball.x - state.ball.r < 0 && inGoalHeight) goal('away');
    if (state.ball.x + state.ball.r > canvas.width && inGoalHeight) goal('home');

    if (state.ball.x - state.ball.r < 0 && !inGoalHeight) {
      state.ball.x = state.ball.r;
      state.ball.vx = Math.abs(state.ball.vx) * 0.92;
    }
    if (state.ball.x + state.ball.r > canvas.width && !inGoalHeight) {
      state.ball.x = canvas.width - state.ball.r;
      state.ball.vx = -Math.abs(state.ball.vx) * 0.92;
    }
  }

  function applyImpulse(nx, ny, power) {
    const approach = state.ball.vx * nx + state.ball.vy * ny;
    if (approach < power) {
      const boost = power - approach;
      state.ball.vx += nx * boost;
      state.ball.vy += ny * boost;
    }
  }

  function resolveHeadCollision(character, direction) {
    const headX = character.x;
    const headY = character.y - 48;
    const dx = state.ball.x - headX;
    const dy = state.ball.y - headY;
    const distance = Math.hypot(dx, dy);
    const minDistance = state.ball.r + character.headR;
    if (distance >= minDistance) return;

    const nx = dx / (distance || 1);
    const ny = dy / (distance || 1);
    state.ball.x = headX + nx * minDistance;
    state.ball.y = headY + ny * minDistance;
    applyImpulse(nx, ny, 210 + Math.abs(character.vx) * 0.3);
    state.ball.vx += direction * 42 + character.vx * 0.22;
    state.ball.vy -= 24;
    state.ball.spin += direction * 8;
  }

  function resolveBodyCollision(character, direction) {
    const rect = {
      left: character.x - character.width / 2,
      right: character.x + character.width / 2,
      top: character.y - 24,
      bottom: character.y + character.height - 24,
    };

    const nearestX = Math.max(rect.left, Math.min(state.ball.x, rect.right));
    const nearestY = Math.max(rect.top, Math.min(state.ball.y, rect.bottom));
    const dx = state.ball.x - nearestX;
    const dy = state.ball.y - nearestY;
    const distance = Math.hypot(dx, dy);
    if (distance >= state.ball.r) return;

    const nx = dx / (distance || 1);
    const ny = dy / (distance || 1);
    state.ball.x = nearestX + nx * (state.ball.r + 1);
    state.ball.y = nearestY + ny * (state.ball.r + 1);
    applyImpulse(nx, ny, 120);
    state.ball.vx += character.vx * 0.15;

    const footY = character.y + 10;
    const footReach = character.kick > 0 ? 26 : 10;
    const inKickZone = Math.abs(state.ball.x - (character.x + direction * 18)) < 30 && Math.abs(state.ball.y - footY) < footReach;
    if (character.kick > 0 && inKickZone) {
      state.ball.vx = direction * 320 + character.vx * 0.35;
      state.ball.vy = Math.min(state.ball.vy, -110);
      state.ball.spin += direction * 20;
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

    const aiTargetX = state.ball.x < canvas.width / 2 ? Math.max(396, state.ball.x + 38) : state.ball.x - 14;
    if (Math.random() < 0.02 && state.ai.y >= FLOOR_Y && state.ball.y < 238) jump(state.ai);
    if (Math.random() < 0.03 && Math.abs(state.ball.x - state.ai.x) < 68 && state.ball.y > 276) kick(state.ai, -1);

    updateCharacter(state.player, delta);
    updateCharacter(state.ai, delta, aiTargetX);
    updateBall(delta);
    resolveHeadCollision(state.player, 1);
    resolveBodyCollision(state.player, 1);
    resolveHeadCollision(state.ai, -1);
    resolveBodyCollision(state.ai, -1);
  }

  function drawFootball(x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#f6f4ef';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#121212';
    const patches = [
      [0, 0],
      [r * 0.46, -r * 0.18],
      [-r * 0.42, -r * 0.12],
      [r * 0.25, r * 0.4],
      [-r * 0.26, r * 0.38]
    ];
    patches.forEach(([px, py], index) => {
      ctx.beginPath();
      const sides = 5;
      for (let i = 0; i < sides; i += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * i) / sides + index * 0.04;
        const vx = px + Math.cos(angle) * (index === 0 ? 5.8 : 4.6);
        const vy = py + Math.sin(angle) * (index === 0 ? 5.8 : 4.6);
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();
    });
    ctx.restore();
  }

  function drawCharacter(character, color, facing) {
    ctx.save();
    ctx.translate(character.x, character.y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, -48, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7f5ff';
    ctx.fillRect(-3, -58, 2, 2);
    ctx.fillRect(1, -58, 2, 2);

    ctx.fillStyle = '#14203a';
    ctx.fillRect(-17, -22, 34, 42);
    ctx.fillStyle = color;
    ctx.fillRect(-17, -22, 34, 8);

    const stride = Math.sin(performance.now() / 120) * (Math.abs(character.vx) > 20 ? 6 : 2);
    ctx.strokeStyle = '#f7f5ff';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 20);
    ctx.lineTo(-10 + stride, 44);
    ctx.moveTo(8, 20);
    ctx.lineTo(10 - stride, 44);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-15, -8);
    ctx.lineTo(-28, 6);
    ctx.moveTo(15, -8);
    ctx.lineTo(28, 6);
    ctx.stroke();

    if (character.kick > 0) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(facing > 0 ? 10 : -10, 20);
      ctx.lineTo(facing > 0 ? 34 : -34, 10);
      ctx.stroke();
    }
    ctx.restore();
  }

  function draw() {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87d4ff');
    gradient.addColorStop(1, '#1ea56f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#2ccf8f';
    ctx.fillRect(0, 300, canvas.width, 120);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(0, 344, canvas.width, 6);

    ctx.strokeStyle = 'rgba(255,255,255,0.82)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 120);
    ctx.lineTo(canvas.width / 2, 420);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 330, 56, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeRect(16, 282, 54, GOAL_HEIGHT);
    ctx.strokeRect(canvas.width - 70, 282, 54, GOAL_HEIGHT);

    drawCharacter(state.player, '#71e3ff', 1);
    drawCharacter(state.ai, '#ff5fb2', -1);
    drawFootball(state.ball.x, state.ball.y, state.ball.r);

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
      if (action === 'left') { state.input.left = true; setTimeout(() => { state.input.left = false; }, 160); }
      if (action === 'right') { state.input.right = true; setTimeout(() => { state.input.right = false; }, 160); }
      if (action === 'jump') jump(state.player);
      if (action === 'kick') kick(state.player, 1);
    });
  });

  pauseButton.addEventListener('click', togglePause);
  restartButton.addEventListener('click', restartGame);
  restartGame();
  requestAnimationFrame(frame);
}

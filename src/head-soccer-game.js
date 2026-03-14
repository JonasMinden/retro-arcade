const canvas = typeof document !== 'undefined' ? document.querySelector('#game-canvas') : null;
if (canvas) {
  const ctx = canvas.getContext('2d');
  const homeScoreElement = document.querySelector('#home-score');
  const awayScoreElement = document.querySelector('#away-score');
  const timeElement = document.querySelector('#time');
  const pauseButton = document.querySelector('#pause-button');
  const restartButton = document.querySelector('#restart-button');
  const actionButtons = Array.from(document.querySelectorAll('[data-action]'));
  const gravity = 980;
  const state = { paused:false, gameOver:false, time:60, player:{x:150,y:320,vx:0,vy:0}, ai:{x:490,y:320,vx:0,vy:0}, ball:{x:320,y:180,vx:180,vy:-30,r:18}, input:{left:false,right:false}, home:0, away:0, lastTime:0 };
  function restartGame(){ state.paused=false; state.gameOver=false; state.time=60; state.home=0; state.away=0; homeScoreElement.textContent='0'; awayScoreElement.textContent='0'; timeElement.textContent='60'; pauseButton.textContent='Pause'; resetPositions(); }
  function resetPositions(){ state.player={x:150,y:320,vx:0,vy:0}; state.ai={x:490,y:320,vx:0,vy:0}; state.ball={x:320,y:180,vx:(Math.random()<0.5?-1:1)*160,vy:-80,r:18}; }
  function togglePause(){ if(state.gameOver)return; state.paused=!state.paused; pauseButton.textContent=state.paused?'Resume':'Pause'; }
  function jump(character){ if (character.y >= 320) character.vy = -480; }
  function kick(character, direction){ if (Math.abs(state.ball.x - character.x) < 54 && Math.abs(state.ball.y - character.y) < 56) { state.ball.vx += direction * 220; state.ball.vy = -260; } }
  function updateCharacter(character, delta, desiredX){ if (desiredX !== undefined) { const diff = desiredX - character.x; character.vx = Math.max(-180, Math.min(180, diff * 2)); } character.x += character.vx * delta; character.vy += gravity * delta; character.y += character.vy * delta; if (character.y > 320) { character.y = 320; character.vy = 0; } character.x = Math.max(46, Math.min(canvas.width - 46, character.x)); }
  function scoreGoal(side){ if (side === 'home') { state.home += 1; homeScoreElement.textContent = String(state.home); } else { state.away += 1; awayScoreElement.textContent = String(state.away); } resetPositions(); }
  function update(delta){ if(state.paused||state.gameOver)return; state.time = Math.max(0, state.time - delta); timeElement.textContent = String(Math.ceil(state.time)); if(state.time <= 0){ state.gameOver = true; return; } updateCharacter(state.player, delta); const targetX = state.ball.x < 320 ? Math.max(390, state.ball.x + 40) : state.ball.x; if (Math.random() < 0.02 && state.ai.y >= 320 && state.ball.y < 250) jump(state.ai); if (Math.random() < 0.03) kick(state.ai, -1); updateCharacter(state.ai, delta, targetX);
    state.ball.vy += gravity * delta; state.ball.x += state.ball.vx * delta; state.ball.y += state.ball.vy * delta;
    if (state.ball.y + state.ball.r > 390) { state.ball.y = 390 - state.ball.r; state.ball.vy *= -0.78; state.ball.vx *= 0.98; }
    if (state.ball.x - state.ball.r < 20) scoreGoal('away'); if (state.ball.x + state.ball.r > canvas.width - 20) scoreGoal('home');
    if (state.ball.x - state.ball.r < 0 || state.ball.x + state.ball.r > canvas.width) state.ball.vx *= -0.9;
    [{c:state.player,dir:1},{c:state.ai,dir:-1}].forEach(({c,dir})=>{ if (Math.hypot(state.ball.x-c.x, state.ball.y-(c.y-26)) < 44) { const dx = state.ball.x - c.x; const dy = state.ball.y - (c.y - 26); const distance = Math.hypot(dx,dy)||1; state.ball.x = c.x + dx / distance * 44; state.ball.y = c.y - 26 + dy / distance * 44; state.ball.vx += dx / distance * 160 + dir * 35; state.ball.vy = Math.min(state.ball.vy, -120); } });
  }
  function drawCharacter(character, color){ ctx.fillStyle = color; ctx.beginPath(); ctx.arc(character.x, character.y - 48, 28, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(character.x - 18, character.y - 20, 36, 36); ctx.fillStyle = '#101221'; ctx.fillRect(character.x - 8, character.y - 12, 16, 28); }
  function draw(){ const gradient = ctx.createLinearGradient(0,0,0,canvas.height); gradient.addColorStop(0,'#10203d'); gradient.addColorStop(1,'#0a8a6b'); ctx.fillStyle = gradient; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#2ccf8f'; ctx.fillRect(0,300,canvas.width,120); ctx.strokeStyle='rgba(255,255,255,0.7)'; ctx.lineWidth=4; ctx.beginPath(); ctx.moveTo(320,120); ctx.lineTo(320,420); ctx.stroke(); ctx.strokeRect(20,250,44,140); ctx.strokeRect(canvas.width-64,250,44,140); drawCharacter(state.player,'#71e3ff'); drawCharacter(state.ai,'#ff5fb2'); ctx.fillStyle='#ffd166'; ctx.beginPath(); ctx.arc(state.ball.x,state.ball.y,state.ball.r,0,Math.PI*2); ctx.fill(); if(state.paused||state.gameOver){ ctx.fillStyle='rgba(0,0,0,0.45)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#f7f5ff'; ctx.font="28px 'Courier New'"; ctx.textAlign='center'; ctx.fillText(state.gameOver?'Final Whistle':'Paused', canvas.width/2, canvas.height/2 - 10); } }
  function frame(time){ const delta=Math.min((time-state.lastTime||16)/1000,0.03); state.lastTime=time; update(delta); draw(); requestAnimationFrame(frame); }
  document.addEventListener('keydown',(event)=>{ const key=event.key.toLowerCase(); if(key==='a'||key==='arrowleft'){ state.input.left=true; state.player.vx=-180; } if(key==='d'||key==='arrowright'){ state.input.right=true; state.player.vx=180; } if(key==='w'||key==='arrowup'||key===' '){ event.preventDefault(); jump(state.player); } if(key==='s'||key==='arrowdown'){ kick(state.player,1); } if(key==='p') togglePause(); });
  document.addEventListener('keyup',(event)=>{ const key=event.key.toLowerCase(); if(key==='a'||key==='arrowleft') state.input.left=false; if(key==='d'||key==='arrowright') state.input.right=false; if(!state.input.left && !state.input.right) state.player.vx=0; else if(state.input.left) state.player.vx=-180; else if(state.input.right) state.player.vx=180; });
  actionButtons.forEach((button)=>button.addEventListener('click',()=>{ const action=button.dataset.action; if(action==='left') state.player.vx=-180; if(action==='right') state.player.vx=180; if(action==='jump') jump(state.player); if(action==='kick') kick(state.player,1); setTimeout(()=>{ if(!state.input.left && !state.input.right) state.player.vx=0; }, 140); }));
  pauseButton.addEventListener('click',togglePause); restartButton.addEventListener('click',restartGame); restartGame(); requestAnimationFrame(frame);
}

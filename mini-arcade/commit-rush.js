(() => {



  'use strict';







  // ---------- DOM ----------



  const stage = document.querySelector('#commit-stage');



  const canvas = document.querySelector('#commit-canvas');



  const ctx = canvas.getContext('2d');



  const start = document.querySelector('#commit-start');



  const play = document.querySelector('#commit-play');



  const again = document.querySelector('#commit-again');



  const jump = document.querySelector('#jump-btn');



  const down = document.querySelector('#down-btn');



  const musicToggle = document.querySelector('#commit-music');



  const trailToggle = document.querySelector('#commit-trail');



  const intensityEl = document.querySelector('#commit-level');



  const scoreEl = document.querySelector('#commit-score');



  const livesEl = document.querySelector('#commit-lives');



  const progressEl = document.querySelector('#commit-progress');



  const statusEl = document.querySelector('#commit-status');



  const toast = document.querySelector('#commit-toast');



  const result = document.querySelector('#commit-result');



  const resultStatus = document.querySelector('#commit-result-status');



  const resultTitle = document.querySelector('#commit-result-title');



  const resultCopy = document.querySelector('#commit-result-copy');



  const rankBox = document.querySelector('#commit-result .round-rank');



  const rankEl = document.querySelector('#commit-rank');



  const finalScoreEl = document.querySelector('#commit-final-score');



  const statCoins = document.querySelector('#commit-stat-coins');



  const statTime = document.querySelector('#commit-stat-time');



  const statIntensity = document.querySelector('#commit-stat-intensity');



  const learnTopicEl = document.querySelector('#commit-learn-topic');



  const learnCopyEl = document.querySelector('#commit-learn-copy');







  const root = document.documentElement;



  const token = name => getComputedStyle(root).getPropertyValue(name).trim();



  const colors = { black: token('--black-02'), green: token('--core-green'), lightGreen: token('--pastel-green'), yellow: token('--core-yellow'), red: token('--core-red'), halfYellow: token('--halftone-yellow'), white: token('--surface-container-lowest'), outlineVariant: token('--outline-variant') };







  // ---------- rules ----------



  const MAX_LIVES = 3;



  const RUN_SECONDS = 120;               // intensity climbs to its peak over two minutes, then stays there



  const PHYSICS = { apex: 124 };         // jump apex in pixels, kept constant



  const HIT_HEIGHT = { pit: 22, beam: 24 }; // height the block must keep to clear each hazard



  const EW = { pit: 74, beam: 138 };     // hazard widths, matching what is drawn



  const MARGIN = .06;                    // timing slack the generator leaves a human player



  const JUMP_BUFFER = .12, SLAM_GRAVITY = 2.5, INVULN = 1.2, CHARGE = .22;



  const TRACKS = ['commit-rush-level1.mp3', 'commit-rush-level2.mp3', 'commit-rush-level3.mp3'];



  const TRAILS = ['FLAME', 'OFF'];



  const LEARN = {



    'MERGE CONFLICT': "Two branches edited the same lines, so Git cannot pick a version for you. It marks the conflict. You keep the right code, then run git add and git commit to finish the merge.",



    'FORCE PUSH': "git push --force overwrites the remote branch, which can erase your teammates' commits. Use git push --force-with-lease instead: it refuses if someone pushed first."



  };



  const RANKS = [



    { rank: 'S', min: 1500, title: 'Flawless shipping', line: 'Obstacles fell away. Keep this rhythm for the next deploy.' },



    { rank: 'A', min: 1000, title: 'Clean pipeline', line: 'Strong run. One more clean jump timing and you reach S.' },



    { rank: 'B', min: 600, title: 'Stable build', line: 'Solid run. The late, fast obstacles are where the pipeline broke.' },



    { rank: 'C', min: 250, title: 'Shaky deploy', line: 'You kept moving, but the merges got away from you. Time the first jumps.' },



    { rank: 'D', min: 0, title: 'Build failed', line: 'Practice the jump timing and try again. Every death teaches the next jump.' }



  ];







  // ---------- pacing: obstacle speed and spacing by intensity ----------



  const intensityAt = t => Math.min(1, t / RUN_SECONDS);



  const lerp = (a, b, k) => a + (b - a) * k;



  const pitPx = t => lerp(190, 380, intensityAt(t));   // pixels per second



  const beamPx = t => lerp(520, 1100, intensityAt(t));



  const pitShare = t => lerp(.5, .8, intensityAt(t)); // share of hazards that are holes











  const gapAt = t => lerp(1.9, .55, intensityAt(t));   // seconds between obstacles







  // ---------- jump maths: measured with the same frame step the game uses ----------



  const FRAME = 1 / 60;



  const SPACING = .05;                   // slack between one landing and the next takeoff



  // Jump tuning at a given run time: air time shrinks from 0.83s to 0.68s, so the block gets snappier.



  function jumpTuning(t) { const T = lerp(.83, .68, intensityAt(t)); const g = 8 * PHYSICS.apex / (T * T); return { g, v: g * T / 2 }; }



  // Jump profile measured with the same frame step the game uses, for the tuning in effect at time t.



  function jumpProfile(t) {



    const { v, g } = jumpTuning(t);



    let y = 0; let vel = v; let clock = 0; let landed = null;



    const up = { pit: { t1: null, t2: 0 }, beam: { t1: null, t2: 0 } };



    while (landed === null) {



      vel -= g * FRAME; y += vel * FRAME; clock += FRAME;



      if (y <= 0) landed = clock;



      ['pit', 'beam'].forEach(type => { if (y >= HIT_HEIGHT[type]) { if (up[type].t1 === null) up[type].t1 = clock; up[type].t2 = clock; } });



    }



    return { T: landed, pit: up.pit, beam: up.beam };



  }



  const timeToLand = (y, v, g) => (v + Math.sqrt(v * v + 2 * g * y)) / g;







  // Replays an obstacle spawned at spawnAt and returns the time it can hit the block.



  function hazardWindow(type, spawnAt, w) {



    const RX = runner.x * w + 5, RR = runner.x * w + 23, ew = EW[type];



    let x = w * 1.08, t = spawnAt, a = null, b = null;



    while (x > -ew && t < spawnAt + 15) {



      const charged = type === 'beam' && t - spawnAt < CHARGE;



      if (!charged && x < RR && x + ew > RX) { if (a === null) a = t; b = t; }



      x -= (type === 'beam' ? beamPx(t) : pitPx(t)) * .01;



      t += .01;



    }



    return a === null ? null : { a, b };



  }







  // ---------- state ----------



  const runner = { x: 0.14, w: 28, h: 34, ground: 0 };



  let state = 'idle'; let rafId = 0; let last = 0; let elapsed = 0; let dpr = 1;



  let score = 0; let coins = 0; let lives = MAX_LIVES; let peak = 0; let lastHit = null; let invulnLeft = 0;



  let entities = []; let effects = []; let plan = []; let nextSpawnAt = 2; let nextCoinAt = 1.5;



  let jumpY = 0; let jumpV = 0; let jumpAge = 0; let jumpDuration = .82; let jumpG = 1450; let runnerAngle = 0; let jumpStartAngle = 0; let jumpBuffer = 0; let slamming = false;



  let trailHistory = []; let trailAge = 0; let trailStyle = 0;



  let toastTimer = 0; let failureAge = 0; let countRaf = 0; let audioCtx = null; let musicOn = true; let musicTrack = 0;



  const music = new Audio(TRACKS[0]); music.loop = true; music.volume = .16;







  function setStatus(text, tone) { statusEl.querySelector('span:last-child').textContent = text; statusEl.className = `status ${tone ? `status-${tone}` : ''}`; }



  function fmt(seconds) { return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }



  function showToast(text) { toast.textContent = text; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 700); }



  function resize() { const w = stage.clientWidth; const h = stage.clientHeight; dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.max(1, Math.floor(w * dpr)); canvas.height = Math.max(1, Math.floor(h * dpr)); canvas.style.width = `${w}px`; canvas.style.height = `${h}px`; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); runner.ground = h - 42; }







  // ---------- audio ----------



  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }



  function playCoinSound() { try { const ctx = getAudioCtx(); const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'square'; osc.frequency.setValueAtTime(880, now); osc.frequency.exponentialRampToValueAtTime(1318.5, now + .08); gain.gain.setValueAtTime(.15, now); gain.gain.exponentialRampToValueAtTime(.001, now + .18); osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + .2); } catch (err) { /* audio is optional */ } }



  function playFallSound() { try { const ctx = getAudioCtx(); const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(180, now + .3); gain.gain.setValueAtTime(.18, now); gain.gain.exponentialRampToValueAtTime(.001, now + .35); osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + .35); } catch (err) { /* audio is optional */ } }



  function playWarningSound() { try { const ctx = getAudioCtx(); const now = ctx.currentTime; [0, .13].forEach((offset, index) => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'square'; osc.frequency.setValueAtTime(index ? 740 : 620, now + offset); gain.gain.setValueAtTime(.001, now + offset); gain.gain.exponentialRampToValueAtTime(.1, now + offset + .015); gain.gain.exponentialRampToValueAtTime(.001, now + offset + .1); osc.connect(gain).connect(ctx.destination); osc.start(now + offset); osc.stop(now + offset + .12); }); } catch (err) { /* audio is optional */ } }



  function playErrorSound() { try { const ctx = getAudioCtx(); const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(190, now); osc.frequency.exponentialRampToValueAtTime(70, now + .28); gain.gain.setValueAtTime(.14, now); gain.gain.exponentialRampToValueAtTime(.001, now + .32); osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + .35); } catch (err) { /* audio is optional */ } }



  function updateMusic(I) {



    const track = I < .34 ? 0 : I < .67 ? 1 : 2;



    if (track === musicTrack) return;



    musicTrack = track;



    const playingNow = musicOn && state === 'playing';



    music.pause(); music.src = TRACKS[track]; music.load();



    if (playingNow) music.play().catch(() => {});



  }







  // ---------- obstacle planner: every obstacle is covered by a jump the planner has already committed to ----------



  // Committed takeoffs never move, so the schedule the player can follow stays valid as new obstacles arrive.



  let commits = [];



  function slotFor(type, win) { const c = jumpProfile(win.a)[type]; return { lo: win.b + MARGIN - c.t2, hi: win.a - MARGIN - c.t1 }; }



  function planObstacles(w) {



    plan = plan.filter(item => !item.spawned || item.win.b > elapsed - 1);



    commits = commits.filter(s => s > elapsed - 2);



    while (nextSpawnAt < elapsed + 4) {



      const type = Math.random() < pitShare(nextSpawnAt) ? 'pit' : 'beam';



      let placed = null; let t = Math.max(nextSpawnAt, elapsed); let tries = 0;



      while (!placed && tries < 150) {



        const win = hazardWindow(type, t, w);



        if (win) {



          const { lo, hi } = slotFor(type, win);



          if (lo <= hi) {



            if (commits.some(c => c >= lo && c <= hi)) placed = { type, t, win, spawned: false, takeoff: null };



            else {



              const next = commits.length ? commits[commits.length - 1] + jumpProfile(commits[commits.length - 1]).T + SPACING : 0;



              let takeoff = Math.max(lo, next);



              if (takeoff <= hi) {



                takeoff = Math.min(hi, Math.max(takeoff, (lo + hi) / 2)); // middle of the window: room to be early or late



                placed = { type, t, win, spawned: false, takeoff };



              }



            }



          }



        }



        if (!placed) { t += .04; tries += 1; }



      }



      if (!placed) break;



      if (placed.takeoff !== null) commits.push(placed.takeoff);



      plan.push(placed);



      nextSpawnAt = placed.t + gapAt(placed.t) * (.85 + Math.random() * .4);



    }



  }



  function spawnEntity(type) {



    if (type === 'beam') playWarningSound();



    entities.push({ type, x: 1.08, charge: type === 'beam' ? CHARGE : 0, collected: false, hit: false, trail: [], trailAge: 0 });



  }



  function spawnDue() {



    plan.forEach(item => { if (!item.spawned && item.t <= elapsed) { item.spawned = true; spawnEntity(item.type); } });



    if (elapsed >= nextCoinAt) { nextCoinAt = elapsed + lerp(1.1, 2.2, Math.random()); entities.push({ type: 'pickup', x: 1.08, collected: false, hit: false, charge: 0, trail: [], trailAge: 0 }); }



  }







  // ---------- collisions ----------



  function collides(entity, w) {



    const rx = runner.x * w + 5; const rw = runner.w - 10; const rh = runner.h;



    const ry = runner.ground - rh - jumpY + 4;



    const ex = entity.x * w;



    const ew = entity.type === 'pickup' ? 32 : entity.type === 'beam' ? EW.beam : EW.pit;



    const ey = entity.type === 'pickup' ? runner.ground - 54 : entity.type === 'beam' ? runner.ground - 20 : runner.ground - 18;



    const eh = entity.type === 'pickup' ? 32 : entity.type === 'beam' ? 20 : 18;



    return rx < ex + ew && rx + rw > ex && ry < ey + eh && ry + rh > ey;



  }



  function handleEntity(entity, w) {



    if (entity.hit || entity.collected) return;



    if (entity.type === 'pickup') {



      if (!collides(entity, w)) return;



      entity.collected = true; coins += 1; score += 25;



      for (let i = 0; i < 5; i += 1) effects.push({ type: 'particle', x: entity.x * w + 16, y: runner.ground - 38, age: 0, duration: .3, dx: Math.cos(i * 1.256) * 24, dy: Math.sin(i * 1.256) * 24 });



      playCoinSound(); showToast('✓ COMMIT +25');



      return;



    }



    if (entity.type === 'beam' && entity.charge > 0) return;



    if (invulnLeft > 0 || !collides(entity, w)) return;



    entity.hit = true; lives -= 1; lastHit = entity.type; invulnLeft = INVULN; score = Math.max(0, score - 10);



    if (entity.type === 'pit') {



      const pitX = entity.x * w + 34;



      effects.push({ type: 'fallCoin', x: pitX, startY: runner.ground - 38, age: 0, duration: .45 });



      effects.push({ type: 'runnerFall', age: 0, duration: .55 });



      for (let i = 0; i < 18; i += 1) effects.push({ type: 'pitParticle', x: runner.x * w + runner.w / 2, y: runner.ground - runner.h / 2, age: 0, duration: .7 + (i % 4) * .05, dx: (i - 9) * 10, dy: -70 - (i % 6) * 11, spin: i * .4 });



      playFallSound(); showToast(`ERROR: MERGE CONFLICT — ${Math.max(0, lives)} LIVES LEFT`);



    } else {



      playErrorSound(); showToast(`ERROR: FORCE PUSH LASER HIT — ${Math.max(0, lives)} LIVES LEFT`);



    }



    if (lives <= 0) failGame();



  }







  // ---------- jump and slam ----------



  function doJump() {



    if (state !== 'playing') return;



    if (jumpY > 0) { jumpBuffer = JUMP_BUFFER; return; }



    jumpBuffer = 0; const tune = jumpTuning(elapsed); jumpV = tune.v; jumpG = tune.g; jumpDuration = jumpProfile(elapsed).T; jumpAge = 0; slamming = false; jumpStartAngle = runnerAngle;



    showToast('JUMP · ROTATE');



  }



  function doSlam() {



    if (state !== 'playing' || jumpY <= 0) return;



    slamming = true; jumpDuration = jumpAge + timeToLand(jumpY, jumpV, jumpG * SLAM_GRAVITY);



    showToast('SLAM ↓ · FAST FALL');



  }



  function onKeyDown(event) {



    if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'ArrowDown') event.preventDefault();



    if (event.repeat) return;



    if (event.code === 'ArrowDown') doSlam();



    else if (event.code === 'Space' || event.code === 'ArrowUp') doJump();



  }







  // ---------- frame update ----------



  function update(dt) {



    elapsed += dt;



    const w = stage.getBoundingClientRect().width;



    const I = intensityAt(elapsed);



    peak = Math.max(peak, I);



    invulnLeft = Math.max(0, invulnLeft - dt);



    updateMusic(I);

    music.volume = lerp(.16, .34, I); music.playbackRate = lerp(1, 1.1, I); // the soundtrack gets louder and faster as the run intensifies



    planObstacles(w);



    spawnDue();







    entities.forEach(e => {



      e.x -= (e.type === 'beam' ? beamPx(elapsed) : pitPx(elapsed)) * dt / w;



      if (e.type === 'beam' && e.charge > 0) e.charge = Math.max(0, e.charge - dt);



      if (e.type === 'beam' && e.charge <= 0 && !e.hit) {



        e.trailAge += dt;



        if (e.trailAge >= .035) { e.trailAge = 0; e.trail = [e.x, ...e.trail].slice(0, 10); }



      }



      handleEntity(e, w);



    });



    entities = entities.filter(e => e.x > -.25 && !e.collected && !e.hit);



    effects.forEach(fx => { fx.age += dt; });



    effects = effects.filter(fx => fx.age < fx.duration);







    if (jumpBuffer > 0) jumpBuffer = Math.max(0, jumpBuffer - dt);



    jumpV -= jumpG * (slamming ? SLAM_GRAVITY : 1) * dt;



    jumpY += jumpV * dt;



    if (jumpY <= 0) {



      jumpY = 0; jumpV = 0;



      if (jumpAge > 0) runnerAngle = jumpStartAngle + Math.PI / 2;



      jumpAge = 0; slamming = false;



      if (jumpBuffer > 0) doJump();



    } else {



      jumpAge += dt;



      runnerAngle = jumpStartAngle + (Math.PI / 2) * Math.min(1, jumpAge / jumpDuration);



    }







    trailAge += dt;



    if (trailAge >= .05) { trailAge = 0; trailHistory.unshift({ y: runner.ground - runner.h / 2 - jumpY }); if (trailHistory.length > 7) trailHistory.length = 7; }







    score += dt * (10 + 20 * I);



    progressEl.textContent = `RUN ${fmt(elapsed)}`;



    scoreEl.textContent = `SCORE ${Math.floor(score)}`;



    livesEl.textContent = `LIVES ${Math.max(0, lives)}/${MAX_LIVES}`;



    intensityEl.textContent = `INTENSITY ${Math.round(I * 100)}%`;



    intensityEl.className = `code-pill ${I < .34 ? 'pill-green' : I < .67 ? 'pill-yellow' : 'pill-red'}`;



  }



  function loop(now) {



    if (state !== 'playing') return;



    const dt = Math.min((now - last) / 1000, .05); last = now;



    update(dt); draw();



    if (state === 'playing') rafId = requestAnimationFrame(loop);



  }







  // ---------- drawing ----------



  function drawCoin(cx, cy, fill, scaleX = 1, alpha = 1, rotation = 0) { ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rotation); ctx.scale(scaleX, 1); ctx.fillStyle = fill; ctx.strokeStyle = colors.black; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.strokeStyle = colors.white; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(0, 7); ctx.stroke(); ctx.fillStyle = colors.white; ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }



  // Rocket-style flame behind the force-push beam (flat, outlined, fading with distance).



  function drawRocketTrail(e, w, laserW) {



    const palette = [colors.yellow, colors.red, colors.halfYellow];



    e.trail.forEach((sample, i) => {



      const t = i / e.trail.length; const fw = 22 * (1 - t * .8); const fh = 14 * (1 - t * .6);



      const fx = sample * w + laserW - 6; const fy = runner.ground - 10 - fh / 2;



      ctx.save(); ctx.globalAlpha = 1 - t * .7; ctx.lineWidth = 1.5; ctx.strokeStyle = colors.black; ctx.fillStyle = palette[i % palette.length];



      ctx.fillRect(fx, fy, fw, fh); ctx.strokeRect(fx, fy, fw, fh); ctx.restore();



    });



  }



  // Rocket-style flame behind the block (same look as the beam's flame).



  function drawBlockTrail(w) {



    if (TRAILS[trailStyle] === 'OFF' || trailHistory.length < 1) return;



    const palette = [colors.yellow, colors.red, colors.halfYellow];



    const n = trailHistory.length;



    for (let i = n - 1; i >= 0; i -= 1) {



      const sample = trailHistory[i]; const t = i / n;



      const fw = 22 * (1 - t * .8); const fh = 14 * (1 - t * .6);



      const fx = runner.x * w - fw + 6 - i * 12; const fy = sample.y - fh / 2;



      ctx.save(); ctx.globalAlpha = 1 - t * .7; ctx.lineWidth = 1.5; ctx.strokeStyle = colors.black; ctx.fillStyle = palette[i % palette.length];



      ctx.fillRect(fx, fy, fw, fh); ctx.strokeRect(fx, fy, fw, fh); ctx.restore();



    }



  }



  function drawEntity(e, w) {



    const x = e.x * w;



    ctx.strokeStyle = colors.black; ctx.lineWidth = 1.5;



    if (e.type === 'pickup') {



      const scaleX = Math.abs(Math.cos(elapsed * 4 + e.x * 10));



      drawCoin(x + 16, runner.ground - 38, colors.green, Math.max(.08, scaleX));



    } else if (e.type === 'pit') {



      const holeW = 74;



      ctx.fillStyle = colors.black; ctx.beginPath(); ctx.roundRect(x, runner.ground - 1, holeW, 82, 5); ctx.fill(); ctx.stroke();



      ctx.fillStyle = colors.outlineVariant; ctx.beginPath(); ctx.ellipse(x + holeW / 2, runner.ground + 68, 20, 6, 0, 0, Math.PI * 2); ctx.fill();



      drawCoin(x + holeW / 2, runner.ground + 58, colors.outlineVariant, 1, .8);



      ctx.fillStyle = colors.yellow; ctx.font = '700 10px monospace'; ctx.textAlign = 'center';



      ctx.fillText('OK — MERGE', x + holeW / 2, runner.ground + 17); ctx.fillText('CONFLICT!', x + holeW / 2, runner.ground + 30);



      ctx.textAlign = 'start';



    } else if (e.type === 'beam') {



      if (e.charge > 0) {



        ctx.globalAlpha = .35 + Math.abs(Math.sin(elapsed * 16)) * .5; ctx.fillStyle = colors.yellow;



        ctx.beginPath(); ctx.arc(x + 5, runner.ground - 10, 9, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;



        ctx.fillStyle = colors.black; ctx.font = '600 9px monospace'; ctx.fillText('git push --force', x - 38, runner.ground - 28);



      } else {



        const laserW = EW.beam;



        drawRocketTrail(e, w, laserW);



        ctx.fillStyle = colors.yellow; ctx.fillRect(x, runner.ground - 20, laserW, 20); ctx.strokeRect(x, runner.ground - 20, laserW, 20);



        ctx.fillStyle = colors.white; ctx.fillRect(x + 4, runner.ground - 15, laserW - 8, 4);



        ctx.strokeStyle = colors.black; ctx.beginPath();



        [22, 58, 94].forEach(offset => { ctx.moveTo(x + offset, runner.ground - 17); ctx.lineTo(x + offset + 8, runner.ground - 3); });



        ctx.stroke();



        ctx.fillStyle = colors.black; ctx.font = '600 9px monospace'; ctx.fillText('git push --force', x + 7, runner.ground - 25);



      }



    }



  }



  function draw() {



    const w = stage.clientWidth; const h = stage.clientHeight;



    ctx.clearRect(0, 0, w, h);



    ctx.fillStyle = colors.lightGreen; ctx.fillRect(0, 0, w, h);



    ctx.strokeStyle = colors.green; ctx.lineWidth = 2; ctx.setLineDash([4, 7]);



    ctx.beginPath(); ctx.moveTo(0, runner.ground + 10); ctx.lineTo(w, runner.ground + 10); ctx.stroke(); ctx.setLineDash([]);



    entities.forEach(e => drawEntity(e, w));



    effects.forEach(fx => {



      const progress = Math.min(1, fx.age / fx.duration);



      if (fx.type === 'particle') {



        ctx.fillStyle = colors.green; ctx.globalAlpha = 1 - progress;



        ctx.beginPath(); ctx.arc(fx.x + fx.dx * progress, fx.y + fx.dy * progress, 3, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;



      } else if (fx.type === 'pitParticle') {



        ctx.save(); ctx.globalAlpha = 1 - progress; ctx.translate(fx.x + fx.dx * progress, fx.y + fx.dy * progress + progress * progress * 85); ctx.rotate(fx.spin + progress * 5);



        ctx.fillStyle = [colors.green, colors.yellow, colors.white][Math.floor(fx.spin * 3) % 3]; ctx.fillRect(-3, -3, 6, 6); ctx.restore();



      } else if (fx.type === 'fallCoin') {



        drawCoin(fx.x, fx.startY + progress * 40, colors.outlineVariant, 1, 1 - progress, progress * 2.4);



      }



    });



    drawBlockTrail(w);



    const runnerFall = effects.find(fx => fx.type === 'runnerFall');



    const fallProgress = runnerFall ? Math.min(1, runnerFall.age / runnerFall.duration) : 0;



    const ry = runner.ground - runner.h - jumpY + fallProgress * 54;



    const blink = invulnLeft > 0 && Math.floor(invulnLeft * 12) % 2 === 0;



    ctx.save(); ctx.globalAlpha = blink ? .35 : 1;



    ctx.translate(runner.x * w + runner.w / 2, ry + runner.h / 2);



    ctx.rotate(runnerAngle + fallProgress * .55);



    ctx.translate(-runner.w / 2, -runner.h / 2);



    ctx.fillStyle = colors.green; ctx.strokeStyle = colors.black; ctx.lineWidth = 1.5;



    ctx.beginPath(); ctx.roundRect(0, 0, runner.w, runner.h, 6); ctx.fill(); ctx.stroke();



    ctx.fillStyle = colors.white; ctx.fillRect(17, 9, 4, 4);



    ctx.restore();



    if (state === 'failure') {



      ctx.save(); ctx.globalAlpha = Math.min(1, failureAge * 3); ctx.fillStyle = colors.black; ctx.textAlign = 'center';



      ctx.font = '700 21px monospace'; ctx.fillText('OUT OF LIVES', w / 2, 54);



      ctx.font = '600 11px monospace'; ctx.fillText('TRY AGAIN', w / 2, 74);



      ctx.restore();



    }



  }







  // ---------- run lifecycle ----------



  function reset() {



    cancelAnimationFrame(rafId); clearTimeout(toastTimer); cancelAnimationFrame(countRaf);



    music.pause(); musicTrack = 0; music.src = TRACKS[0]; music.load();



    state = 'idle'; last = 0; elapsed = 0; score = 0; coins = 0; lives = MAX_LIVES; peak = 0; lastHit = null; invulnLeft = 0;



    entities = []; effects = []; plan = []; commits = []; nextSpawnAt = 2; nextCoinAt = 1.5; trailHistory = []; trailAge = 0;



    jumpY = 0; jumpV = 0; jumpAge = 0; jumpBuffer = 0; slamming = false; runnerAngle = 0; jumpStartAngle = 0; failureAge = 0;



    result.hidden = true; result.classList.remove('is-revealed'); start.hidden = false;



    setStatus('IDLE', ''); scoreEl.textContent = 'SCORE 0'; livesEl.textContent = `LIVES ${MAX_LIVES}/${MAX_LIVES}`;



    intensityEl.textContent = 'INTENSITY 0%'; intensityEl.className = 'code-pill pill-green'; progressEl.textContent = 'RUN 0:00';



    musicToggle.textContent = musicOn ? '♫ MUSIC ON' : '♫ MUSIC OFF';



    resize(); draw();



  }



  function begin() {



    reset(); state = 'playing'; start.hidden = true; setStatus('PLAYING', 'green');



    last = performance.now();



    try { getAudioCtx(); } catch (err) { /* audio is optional */ }



    if (musicOn) music.play().catch(() => {});



    rafId = requestAnimationFrame(loop);



  }



  function failGame() {



    if (state !== 'playing') return;



    state = 'failure'; failureAge = 0; music.pause(); showToast('GAME OVER');



    rafId = requestAnimationFrame(failureLoop);



  }



  function failureLoop(now) {



    if (state !== 'failure') return;



    const dt = Math.min((now - last) / 1000, .05); last = now;



    failureAge += dt;



    effects.forEach(fx => { fx.age += dt; });



    effects = effects.filter(fx => fx.age < fx.duration);



    draw();



    if (failureAge >= 1.1) end(); else rafId = requestAnimationFrame(failureLoop);



  }



  function countUp(el, target) { const startAt = performance.now(); const step = now => { const k = Math.min(1, (now - startAt) / 900); el.textContent = String(Math.round(target * k)); if (k < 1) countRaf = requestAnimationFrame(step); }; countRaf = requestAnimationFrame(step); }



  function end() {



    state = 'ended'; cancelAnimationFrame(rafId); music.pause();



    const rank = RANKS.find(item => score >= item.min) || RANKS[RANKS.length - 1];



    setStatus('GAME OVER', 'red');



    resultStatus.className = 'status status-red'; resultStatus.querySelector('span:last-child').textContent = 'GAME OVER';



    rankEl.textContent = rank.rank; rankBox.dataset.rank = rank.rank;



    resultTitle.textContent = rank.title; resultCopy.textContent = rank.line;



    statCoins.textContent = String(coins); statTime.textContent = fmt(elapsed); statIntensity.textContent = `${Math.round(peak * 100)}%`;



    const topic = lastHit === 'beam' ? 'FORCE PUSH' : 'MERGE CONFLICT';



    learnTopicEl.textContent = topic; learnCopyEl.textContent = LEARN[topic];



    result.hidden = false; void result.offsetWidth; result.classList.add('is-revealed');



    countUp(finalScoreEl, Math.floor(score));



  }







  // ---------- input ----------



  stage.addEventListener('pointerdown', e => { if (state === 'playing' && e.target === canvas) doJump(); }, { passive: false });



  jump.addEventListener('pointerdown', e => { e.preventDefault(); doJump(); }, { passive: false });



  down.addEventListener('pointerdown', e => { e.preventDefault(); doSlam(); }, { passive: false });



  trailToggle.addEventListener('pointerdown', e => { e.preventDefault(); trailStyle = (trailStyle + 1) % TRAILS.length; trailToggle.textContent = `TRAIL · ${TRAILS[trailStyle]}`; draw(); }, { passive: false });



  musicToggle.addEventListener('pointerdown', e => { e.preventDefault(); musicOn = !musicOn; if (musicOn && state === 'playing') music.play().catch(() => {}); else music.pause(); musicToggle.textContent = musicOn ? '♫ MUSIC ON' : '♫ MUSIC OFF'; }, { passive: false });



  play.addEventListener('pointerdown', begin, { passive: false });



  again.addEventListener('pointerdown', begin, { passive: false });



  window.addEventListener('keydown', onKeyDown);



  window.addEventListener('resize', resize);



  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);



  reset();



})();




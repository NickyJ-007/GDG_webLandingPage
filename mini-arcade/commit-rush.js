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
  const statPhase = document.querySelector('#commit-stat-phase');
  const learnTopicEl = document.querySelector('#commit-learn-topic');
  const learnCopyEl = document.querySelector('#commit-learn-copy');
  const learnStepsEl = document.querySelector('#commit-learn-steps');

  const root = document.documentElement;
  const token = name => getComputedStyle(root).getPropertyValue(name).trim();
  const colors = { black: token('--black-02'), green: token('--core-green'), lightGreen: token('--pastel-green'), yellow: token('--core-yellow'), red: token('--core-red'), halfYellow: token('--halftone-yellow'), white: token('--surface-container-lowest'), outlineVariant: token('--outline-variant') };

  // ---------- rules ----------
  const MAX_LIVES = 3;
  const RUN_SECONDS = 120;               // intensity climbs to its peak over two minutes, then stays there
  const PHYSICS = { apex: 124 };         // jump apex in pixels, kept constant
  const HIT_HEIGHT = { pit: 22, beam: 24 }; // height the block must keep to clear each hazard
  const EW = { pit: 74, beam: 138 };     // hazard widths, matching what is drawn
  const MARGIN = .02;                    // safety padding around every hazard: about one frame at 60fps
  const REACT = .25;                     // a jump is never needed sooner than this after its obstacle appears
  const JUMP_BUFFER = .12, SLAM_GRAVITY = 2.5, INVULN = 1.2, CHARGE = .22;
  const SONG = 'commit-rush-bg.mp3';
  const TRAILS = ['FLAME', 'OFF'];
  const LEARN = {
    'MERGE CONFLICT': {
      copy: 'Two branches edited the same lines, so Git cannot pick a version for you. It stops and asks you to choose.',
      steps: ['Open the file Git marks as conflicted.', 'Keep the lines you want and delete the conflict markers.', 'Stage the file and commit to finish the merge.']
    },
    'FORCE PUSH': {
      copy: "A force push overwrites the remote branch, which can erase your teammates' commits.",
      steps: ['Pull the latest changes before you push.', 'If you must rewrite history, use --force-with-lease instead of --force.', 'Tell your team before rewriting a shared branch.']
    }
  };
  // Ranks are decided by the peak intensity reached; SSS needs the full 100%.
  const RANKS = [
    { rank: 'SSS', min: 1, title: 'Extreme Demon cleared', line: 'You survived maximum intensity. Almost nobody gets here.' },
    { rank: 'SS', min: .85, title: 'Extreme Demon reached', line: 'You broke into the final phase. SSS waits at 100% intensity.' },
    { rank: 'S', min: .7, title: 'Demon slayer', line: 'You survived into Demon difficulty. That takes real timing.' },
    { rank: 'A', min: .5, title: 'Insane run', line: 'You cleared Hard and fought into Insane. Demon starts at 70%.' },
    { rank: 'B', min: .35, title: 'Hard mode reached', line: 'Solid timing. The chains after 35% are where the run broke.' },
    { rank: 'C', min: .2, title: 'Normal cleared', line: 'You got past the warm-up. From 20% the obstacles come in runs.' },
    { rank: 'D', min: .1, title: 'Still warming up', line: 'You fell in the Easy phase. Jump just as the hole reaches the block.' },
    { rank: 'F', min: 0, title: 'Not merged yet', line: 'Every repo starts with a first commit. Jump just as each hole reaches the block, and the next run will go further.' }
  ];
  const HIGH_RANKS = new Set(['S', 'SS', 'SSS']);
  // Difficulty tiers named after Geometry Dash, by intensity reached.
  const PHASES = [
    { at: 0, name: 'EASY', pill: 'pill-green' }, { at: .2, name: 'NORMAL', pill: 'pill-green' }, { at: .35, name: 'HARD', pill: 'pill-yellow' },
    { at: .5, name: 'INSANE', pill: 'pill-yellow' }, { at: .7, name: 'DEMON', pill: 'pill-red' }, { at: .85, name: 'EXTREME DEMON', pill: 'pill-red' }
  ];

  // ---------- pacing: Geometry Dash-style difficulty curve ----------
  // Gentle until 20% intensity, a steep climb to 70%, brutal to 90%, then near-impossible up to 100%.
  const intensityAt = t => Math.min(1, t / RUN_SECONDS);
  const lerp = (a, b, k) => a + (b - a) * k;
  function difficultyAt(t) {
    const I = intensityAt(t);
    if (I < .2) return lerp(0, .12, I / .2);
    if (I < .7) return lerp(.12, .6, (I - .2) / .5);
    if (I < .9) return lerp(.6, .88, (I - .7) / .2);
    return lerp(.88, 1, (I - .9) / .1);
  }
  const phaseAt = I => PHASES.reduce((found, phase) => (I >= phase.at ? phase : found), PHASES[0]);
  const pitPx = t => lerp(190, 430, difficultyAt(t));      // pixels per second
  const beamPx = t => lerp(520, 1250, difficultyAt(t));
  const pitShare = t => lerp(.5, .75, difficultyAt(t));    // share of hazards that are holes
  const restGap = t => lerp(1.9, .3, difficultyAt(t));     // breathing room between obstacle runs
  // Timing room each jump gets on top of the safety padding. With the padding, the player's window is about
  // ±120ms in Easy, ±55ms entering Insane, ±40ms entering Demon, ±28ms in Extreme Demon and ±20ms at 100%.
  function timingSlack(t) {
    const I = intensityAt(t);
    if (I < .2) return lerp(.2, .14, I / .2);
    if (I < .5) return lerp(.14, .07, (I - .2) / .3);
    if (I < .7) return lerp(.07, .04, (I - .5) / .2);
    if (I < .85) return lerp(.04, .016, (I - .7) / .15);
    return lerp(.016, .008, (I - .85) / .15);
  }
  // Obstacles that arrive back to back, like a Geometry Dash spike run.
  function patternSize(t) {
    const d = difficultyAt(t); const extra = Math.random() < .5 ? 1 : 0;
    if (d < .12) return 1;
    if (d < .35) return 1 + extra;
    if (d < .6) return 2 + extra;
    if (d < .85) return 3 + extra;
    return 4 + extra + (Math.random() < .5 ? 1 : 0);
  }

  // ---------- jump maths: measured with the same frame step the game uses ----------
  const FRAME = 1 / 60;
  const SPACING = .05;                   // slack between one landing and the next takeoff
  // Jump tuning at a given run time: air time shrinks from 0.83s to 0.66s, so the block gets snappier.
  function jumpTuning(t) { const T = lerp(.83, .66, difficultyAt(t)); const g = 8 * PHYSICS.apex / (T * T); return { g, v: g * T / 2 }; }
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
  function hazardWindow(type, spawnAt, w, ew = EW[type]) {
    const RX = runner.x * w + 5, RR = runner.x * w + 23;
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
  let currentPhase = null; let flashText = ''; let flashSub = ''; let flashLeft = 0; let maxAnnounced = false; let deathRank = null;
  let jumpY = 0; let jumpV = 0; let jumpAge = 0; let jumpDuration = .82; let jumpG = 1450; let runnerAngle = 0; let jumpStartAngle = 0; let jumpBuffer = 0; let slamming = false;
  let trailHistory = []; let trailAge = 0; let trailStyle = 0;
  let toastTimer = 0; let failureAge = 0; let countRaf = 0; let audioCtx = null; let musicOn = true; let musicTrack = 0;
  const music = new Audio(SONG); music.loop = true; music.volume = .16;

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
  // One song, a different part for each difficulty phase: phase k starts k/N of the way through the track.
  function seekPhase(index) {
    const seek = () => { if (Number.isFinite(music.duration)) music.currentTime = index * music.duration / PHASES.length; };
    if (music.readyState >= 1) seek(); else music.addEventListener('loadedmetadata', seek, { once: true });
  }
  function updateMusic(I) {
    const index = PHASES.indexOf(phaseAt(I));
    if (index === musicTrack) return;
    musicTrack = index;
    seekPhase(index);
  }

  // ---------- obstacle planner: every obstacle is covered by a jump the planner has already committed to ----------
  // Committed takeoffs never move, so a schedule the player can follow stays valid as new obstacles arrive.
  // Each jump keeps at least timingSlack() of room, which is what makes later phases demand precise timing.
  let commits = []; let patternLeft = 0;
  function placeObstacle(type, earliest, w) {
    let t = earliest;
    for (let tries = 0; tries < 200; tries += 1, t += .03) {
      const speed = type === 'beam' ? beamPx(t) : pitPx(t);
      const rough = jumpProfile(t + 1.5)[type];
      const span = rough.t2 - rough.t1 - 2 * MARGIN;
      // Holes widen until clearing one takes exactly the timing this phase allows (long jumps, Geometry Dash style).
      const width = type === 'pit' ? Math.max(50, Math.min(230, speed * (span - timingSlack(t)) - 18)) : EW.beam;
      const need = Math.max(0, Math.min(timingSlack(t), .9 * (span - (width + 18) / speed))); // never ask for more room than the hazard allows
      const win = hazardWindow(type, t, w, width);
      if (!win) continue;
      const c = jumpProfile(win.a)[type];
      const lo = win.b + MARGIN - c.t2; const hi = win.a - MARGIN - c.t1;
      if (commits.some(s => s - lo >= need / 2 && hi - s >= need / 2)) return { type, t, win, width, takeoff: null, spawned: false };
      const last = commits[commits.length - 1];
      const next = last === undefined ? 0 : last + jumpProfile(last).T + SPACING;
      const from = Math.max(lo, next, t + REACT);
      if (hi - from >= need) return { type, t, win, width, takeoff: (from + hi) / 2, spawned: false };
    }
    return null;
  }
  function planObstacles(w) {
    plan = plan.filter(item => !item.spawned || item.win.b > elapsed - 1);
    commits = commits.filter(s => s > elapsed - 2);
    while (nextSpawnAt < elapsed + 4) {
      if (patternLeft <= 0) patternLeft = patternSize(nextSpawnAt);
      const type = Math.random() < pitShare(nextSpawnAt) ? 'pit' : 'beam';
      const placed = placeObstacle(type, Math.max(nextSpawnAt, elapsed), w);
      if (!placed) break;
      if (placed.takeoff !== null) commits.push(placed.takeoff);
      plan.push(placed);
      patternLeft -= 1;
      nextSpawnAt = placed.t + (patternLeft > 0 ? .05 : restGap(placed.t) * (.85 + Math.random() * .4));
    }
  }
  // `lead` is how far past its planned spawn time this frame already is, minus the step it will move this frame,
  // so the obstacle sits exactly where the planner expects it (the plan has no slack to spare at max intensity).
  function spawnEntity(type, width, lead, w) {
    if (type === 'beam') playWarningSound();
    const speed = type === 'beam' ? beamPx(elapsed) : pitPx(elapsed);
    entities.push({ type, width, x: 1.08 - speed * lead / w, charge: type === 'beam' ? CHARGE - lead : 0, collected: false, hit: false, trail: [], trailAge: 0 });
  }
  function spawnDue(w, dt) {
    plan.forEach(item => { if (!item.spawned && item.t <= elapsed) { item.spawned = true; spawnEntity(item.type, item.width, (elapsed - item.t) - dt, w); } });
    if (elapsed >= nextCoinAt) { nextCoinAt = elapsed + lerp(1.1, 2.2, Math.random()); entities.push({ type: 'pickup', x: 1.08, collected: false, hit: false, charge: 0, trail: [], trailAge: 0 }); }
  }

  // ---------- collisions ----------
  function collides(entity, w) {
    const rx = runner.x * w + 5; const rw = runner.w - 10; const rh = runner.h;
    const ry = runner.ground - rh - jumpY + 4;
    const ex = entity.x * w;
    const ew = entity.type === 'pickup' ? 32 : entity.type === 'beam' ? EW.beam : (entity.width || EW.pit);
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
    entity.hit = true; lives -= 1; lastHit = entity.type; invulnLeft = lerp(INVULN, .5, difficultyAt(elapsed)); // shorter grace period in the hard phases score = Math.max(0, score - 10);
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
    spawnDue(w, dt);

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
    const phase = phaseAt(I);
    if (phase !== currentPhase) {
      if (currentPhase) { flashText = phase.name; flashSub = 'DIFFICULTY UP'; flashLeft = 1.6; }
      currentPhase = phase;
    }
    if (I >= 1 && !maxAnnounced) { maxAnnounced = true; flashText = 'MAX INTENSITY'; flashSub = 'SSS UNLOCKED · SURVIVE'; flashLeft = 2; }
    flashLeft = Math.max(0, flashLeft - dt);
    intensityEl.textContent = `${phase.name} · ${Math.round(I * 100)}%`;
    intensityEl.className = `code-pill ${phase.pill}`;
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
      const holeW = e.width || EW.pit;
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
      } else if (fx.type === 'confetti') {
        ctx.save(); ctx.globalAlpha = 1 - progress; ctx.translate(fx.x + fx.dx * progress, fx.y + fx.dy * progress + progress * progress * 100); ctx.rotate(fx.spin + progress * 4);
        ctx.fillStyle = [colors.green, colors.yellow, colors.red, colors.white][Math.floor(fx.spin * 3) % 4]; ctx.fillRect(-3, -6, 6, 12);
        ctx.strokeStyle = colors.black; ctx.lineWidth = 1; ctx.strokeRect(-3, -6, 6, 12); ctx.restore();
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
    if (state === 'playing' && flashLeft > 0) {
      const fy = Math.round(h * .36);
      ctx.save(); ctx.globalAlpha = Math.min(1, flashLeft * 2); ctx.fillStyle = colors.black; ctx.textAlign = 'center';
      ctx.font = '700 22px monospace'; ctx.fillText(flashText, w / 2, fy);
      ctx.font = '600 11px monospace'; ctx.fillText(flashSub, w / 2, fy + 18);
      ctx.restore();
    }
    if (state === 'failure') {
      ctx.save(); ctx.globalAlpha = Math.min(1, failureAge * 3); ctx.fillStyle = colors.black; ctx.textAlign = 'center';
      ctx.font = '700 19px monospace'; ctx.fillText(`OUT OF LIVES · RANK ${deathRank ? deathRank.rank : 'F'}`, w / 2, 54);
      ctx.font = '600 11px monospace'; ctx.fillText(deathRank ? deathRank.title.toUpperCase() : 'TRY AGAIN', w / 2, 74);
      ctx.restore();
    }
  }

  // ---------- run lifecycle ----------
  function reset() {
    cancelAnimationFrame(rafId); clearTimeout(toastTimer); cancelAnimationFrame(countRaf);
    music.pause(); musicTrack = 0; music.currentTime = 0;
    state = 'idle'; last = 0; elapsed = 0; score = 0; coins = 0; lives = MAX_LIVES; peak = 0; lastHit = null; invulnLeft = 0;
    entities = []; effects = []; plan = []; commits = []; patternLeft = 0; currentPhase = null; flashText = ''; flashSub = ''; flashLeft = 0; maxAnnounced = false; deathRank = null; nextSpawnAt = 2; nextCoinAt = 1.5; trailHistory = []; trailAge = 0;
    jumpY = 0; jumpV = 0; jumpAge = 0; jumpBuffer = 0; slamming = false; runnerAngle = 0; jumpStartAngle = 0; failureAge = 0;
    result.hidden = true; result.classList.remove('is-revealed'); start.hidden = false;
    setStatus('IDLE', ''); scoreEl.textContent = 'SCORE 0'; livesEl.textContent = `LIVES ${MAX_LIVES}/${MAX_LIVES}`;
    intensityEl.textContent = 'EASY · 0%'; intensityEl.className = 'code-pill pill-green'; progressEl.textContent = 'RUN 0:00';
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
    state = 'failure'; failureAge = 0; music.pause();
    deathRank = RANKS.find(item => peak >= item.min) || RANKS[RANKS.length - 1];
    showToast(`GAME OVER · RANK ${deathRank.rank}`);
    if (HIGH_RANKS.has(deathRank.rank)) {
      const w = stage.clientWidth;
      for (let i = 0; i < 30; i += 1) effects.push({ type: 'confetti', x: runner.x * w + runner.w / 2, y: runner.ground - 60, age: 0, duration: 1.6 + (i % 4) * .1, dx: (i - 15) * 9, dy: -90 - (i % 6) * 12, spin: i * .35 });
    }
    rafId = requestAnimationFrame(failureLoop);
  }
  function failureLoop(now) {
    if (state !== 'failure') return;
    const dt = Math.min((now - last) / 1000, .05); last = now;
    failureAge += dt;
    effects.forEach(fx => { fx.age += dt; });
    effects = effects.filter(fx => fx.age < fx.duration);
    draw();
    if (failureAge >= (HIGH_RANKS.has(deathRank.rank) ? 1.8 : 1.1)) end(); else rafId = requestAnimationFrame(failureLoop);
  }
  function countUp(el, target) { const startAt = performance.now(); const step = now => { const k = Math.min(1, (now - startAt) / 900); el.textContent = String(Math.round(target * k)); if (k < 1) countRaf = requestAnimationFrame(step); }; countRaf = requestAnimationFrame(step); }
  function end() {
    state = 'ended'; cancelAnimationFrame(rafId); music.pause();
    const rank = deathRank || RANKS.find(item => peak >= item.min) || RANKS[RANKS.length - 1];
    setStatus('GAME OVER', 'red');
    resultStatus.className = 'status status-red'; resultStatus.querySelector('span:last-child').textContent = 'GAME OVER';
    rankEl.textContent = rank.rank; rankBox.dataset.rank = rank.rank;
    resultTitle.textContent = rank.title; resultCopy.textContent = rank.line;
    statCoins.textContent = String(coins); statTime.textContent = fmt(elapsed); statIntensity.textContent = `${Math.round(peak * 100)}%`; statPhase.textContent = phaseAt(peak).name;
    const topic = lastHit === 'beam' ? 'FORCE PUSH' : 'MERGE CONFLICT';
    learnTopicEl.textContent = topic; learnCopyEl.textContent = LEARN[topic].copy;
    learnStepsEl.replaceChildren(...LEARN[topic].steps.map(step => { const li = document.createElement('li'); li.textContent = step; return li; }));
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

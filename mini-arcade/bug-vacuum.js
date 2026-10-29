(() => {
  'use strict';
  const stage = document.querySelector('#vacuum-stage');
  const entitiesEl = document.querySelector('#vacuum-entities');
  const ventGrid = document.querySelector('#vent-grid');
  const hammer = document.querySelector('#vacuum-hammer');
  const start = document.querySelector('#vacuum-start');
  const play = document.querySelector('#vacuum-play');
  const again = document.querySelector('#vacuum-again');
  const result = document.querySelector('#vacuum-result');
  const flash = document.querySelector('#vacuum-flash');
  const scoreEl = document.querySelector('#vacuum-score');
  const finalScoreEl = document.querySelector('#vacuum-final-score');
  const roundEl = document.querySelector('#vacuum-round');
  const caughtEl = document.querySelector('#vacuum-caught');
  const streakEl = document.querySelector('#vacuum-streak');
  const missesEl = document.querySelector('#vacuum-misses');
  const powerEl = document.querySelector('#vacuum-power');
  const statusEl = document.querySelector('#vacuum-status');
  const learningLabel = document.querySelector('#vacuum-learning-label');
  const explanationEl = document.querySelector('#vacuum-explanation');
  const resultCopy = document.querySelector('#vacuum-result-copy');
  const musicToggle = document.querySelector('#vacuum-music');
  const timeUpEl = document.querySelector('#vacuum-timeup');
  const rankBox = document.querySelector('#vacuum-result .round-rank');
  const rankEl = document.querySelector('#vacuum-rank');
  const resultTitle = document.querySelector('#vacuum-result-title');
  const statWhacked = document.querySelector('#vacuum-stat-whacked');
  const statAccuracy = document.querySelector('#vacuum-stat-accuracy');
  const statCombo = document.querySelector('#vacuum-stat-combo');
  const statPackets = document.querySelector('#vacuum-stat-packets');
  const statPowers = document.querySelector('#vacuum-stat-powers');
  const RANK_TITLES = { S: 'Flawless. The board is clean.', A: 'Solid run. Tighten the misses.', B: 'Pipeline stable, a few bugs slipped.', C: 'Bugs got away. Run it back.' };
  const bugTypes = [
    { name: 'NULL REF', tier: 'danger', points: 20, description: 'A value was never set, so the program crashes when it tries to use it.' },
    { name: 'RACE COND.', tier: 'danger', points: 20, description: 'Two actions happen in an unsafe order, creating a result that changes from run to run.' },
    { name: 'MEMORY LEAK', tier: 'danger', points: 20, description: 'A program keeps taking memory and never gives it back.' },
    { name: 'OFF-BY-ONE', tier: 'moderate', points: 12, description: 'A loop runs one time too many or one time too few.' },
    { name: '∞ LOOP', tier: 'moderate', points: 12, description: 'A loop never reaches its exit condition, so it never stops.' },
    { name: 'STALE CACHE', tier: 'moderate', points: 12, description: 'Old data is still being shown instead of the latest version.' },
    { name: 'TYPO', tier: 'easy', points: 8, description: 'One misspelled word or symbol breaks the program.' },
    { name: 'GIT TRUSTY', tier: 'easy', points: 8, description: 'A friendly guide bug: make small commits, test them, and keep your history trustworthy.' }
  ];
  const glyphs = { 'NULL REF': '∅', 'RACE COND.': '⇄', 'MEMORY LEAK': '≋', 'OFF-BY-ONE': '±1', '∞ LOOP': '∞', 'STALE CACHE': '⟳', 'TYPO': 'Aa', 'GIT TRUSTY': '✦' };
  const powerUps = [
    { id: 'freeze', name: 'HOTFIX FREEZE', glyph: 'FRZ', duration: 4, hint: 'bugs stop retreating for 4s' },
    { id: 'boost', name: 'BUILD BOOST', glyph: 'x2', duration: 6, hint: 'double points for 6s' },
    { id: 'rollback', name: 'ROLLBACK', glyph: 'RB', duration: 0, hint: 'next miss or packet hit is forgiven' }
  ];
  const ventPositions = [[18, 24], [50, 19], [82, 26], [26, 70], [57, 76], [84, 67]];
  const packetSvg = `<svg class="packet-svg" viewBox="0 0 70 70" aria-hidden="true"><rect x="10" y="10" width="50" height="50" rx="12"/><path d="m24 36 8 8 15-18"/></svg>`;
  let state = 'idle'; let rafId = 0; let spawnTimer = 0; let flashTimer = 0; let last = 0; let elapsed = 0; let score = 0; let captured = 0; let streak = 0; let misses = 0; let entities = []; let nozzlePoint = { x: 50, y: 50 }; let counts = new Map(); let mostRecent = null; let audioCtx = null;
  let activePower = null; let powerLeft = 0; let shield = false; let maxCombo = 0; let packetHits = 0; let bugsMissed = 0; let powersCollected = 0; let finishTimer = 0; let countRaf = 0;
  const music = new Audio('bug-vacuum-theme.mp3'); music.loop = true; music.volume = 0.18; let musicOn = true;

  function bugArt(bug) {
    const spikes = bug.tier === 'danger' ? '<path class="bug-spike" d="M22 30 13 24M64 30l9-6M22 44l-10 2M64 44l10 2"/>' : '';
    return `<svg class="bug-svg tier-${bug.tier}" viewBox="0 0 86 76" aria-hidden="true"><path class="bug-antenna bug-antenna-l" d="M33 22 22 10"/><path class="bug-antenna bug-antenna-r" d="M53 22 64 10"/><circle class="bug-dot" cx="21" cy="9" r="3"/><circle class="bug-dot" cx="65" cy="9" r="3"/><g class="bug-legs"><path class="bug-leg" d="M24 34 10 27M24 42 8 46M26 50 14 58"/><path class="bug-leg" d="M62 34l14-7M62 42l16 4M60 50l12 8"/></g>${spikes}<rect class="bug-body" x="22" y="20" width="42" height="35" rx="14"/><path class="bug-shine" d="M29 27h6"/><text class="bug-glyph" x="43" y="45" text-anchor="middle">${glyphs[bug.name] || '?'}</text><g class="bug-eyes"><circle class="bug-eye" cx="33" cy="27" r="2"/><circle class="bug-eye" cx="53" cy="27" r="2"/></g></svg>`;
  }
  function powerArt(power) {
    return `<svg class="power-svg power-${power.id}" viewBox="0 0 70 70" aria-hidden="true"><circle class="power-ring" cx="35" cy="35" r="32"/><rect class="power-body" x="12" y="12" width="46" height="46" rx="10"/><text class="power-glyph" x="35" y="41" text-anchor="middle">${power.glyph}</text></svg>`;
  }
  function setStatus(text, tone) { statusEl.querySelector('span:last-child').textContent = `${text}`; statusEl.className = `status ${tone ? `status-${tone}` : ''}`; }
  function getAudioCtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); return audioCtx; }
  function tone(type) { try { const ctx = getAudioCtx(); const now = ctx.currentTime; const osc = ctx.createOscillator(); const gain = ctx.createGain(); osc.type = type === 'whack' ? 'square' : type === 'packet' ? 'sawtooth' : 'sine'; const startFreq = type === 'whack' ? 420 : type === 'packet' ? 160 : 220; const endFreq = type === 'whack' ? 980 : type === 'packet' ? 70 : 110; osc.frequency.setValueAtTime(startFreq, now); osc.frequency.exponentialRampToValueAtTime(endFreq, now + (type === 'whack' ? .1 : .2)); gain.gain.setValueAtTime(type === 'whack' ? .12 : .08, now); gain.gain.exponentialRampToValueAtTime(.001, now + (type === 'whack' ? .13 : .24)); osc.connect(gain).connect(ctx.destination); osc.start(now); osc.stop(now + .26); } catch (err) { /* audio is optional */ } }
  function playWhackSound() { tone('whack'); }
  function playMissSound() { tone('miss'); }
  function playPacketSound() { tone('packet'); }
  function playPowerSound() { try { const ctx = getAudioCtx(); const now = ctx.currentTime; [523.25, 783.99, 1046.5].forEach((frequency, index) => { const osc = ctx.createOscillator(); const gain = ctx.createGain(); const t = now + index * .07; osc.type = 'square'; osc.frequency.setValueAtTime(frequency, t); gain.gain.setValueAtTime(.001, t); gain.gain.exponentialRampToValueAtTime(.08, t + .01); gain.gain.exponentialRampToValueAtTime(.001, t + .14); osc.connect(gain).connect(ctx.destination); osc.start(t); osc.stop(t + .15); }); } catch (err) { /* audio is optional */ } }
  function refreshHud() { scoreEl.textContent = `SCORE ${String(score).padStart(3, '0')}`; caughtEl.textContent = `WHACKED ${captured}`; streakEl.textContent = `COMBO x${streak}`; missesEl.textContent = `MISSES ${misses}`; }
  function updatePowerHud() { const parts = []; if (activePower) parts.push(`${activePower.name} ${Math.ceil(powerLeft)}s`); if (shield) parts.push('ROLLBACK READY'); powerEl.textContent = parts.length ? parts.join(' · ') : 'POWER —'; powerEl.className = `code-pill ${parts.length ? 'pill-yellow' : 'pill-blue'}`; }
  function reset() { cancelAnimationFrame(rafId); clearTimeout(spawnTimer); clearTimeout(flashTimer); music.pause(); music.currentTime = 0; state = 'idle'; last = 0; elapsed = 0; score = 0; captured = 0; streak = 0; misses = 0; entities = []; counts = new Map(); mostRecent = null; activePower = null; powerLeft = 0; shield = false; maxCombo = 0; packetHits = 0; bugsMissed = 0; powersCollected = 0; clearTimeout(finishTimer); cancelAnimationFrame(countRaf); timeUpEl.hidden = true; result.classList.remove('is-revealed'); nozzlePoint = { x: 50, y: 50 }; entitiesEl.replaceChildren(); ventGrid.replaceChildren(); ventPositions.forEach(([x, y]) => { const vent = document.createElement('span'); vent.className = 'vent'; vent.style.left = `${x}%`; vent.style.top = `${y}%`; ventGrid.append(vent); }); hammer.style.left = '50%'; hammer.style.top = '50%'; hammer.classList.remove('is-swinging'); result.hidden = true; start.hidden = false; refreshHud(); roundEl.textContent = 'ROUND 00s'; setStatus('IDLE', ''); updatePowerHud(); musicToggle.textContent = '♫ MUSIC ON'; }
  function begin() { reset(); state = 'playing'; start.hidden = true; setStatus('PLAYING', 'green'); last = performance.now(); if (musicOn) music.play().catch(() => {}); getAudioCtx(); scheduleSpawn(250); rafId = requestAnimationFrame(loop); }
  function scheduleSpawn(delay) { clearTimeout(spawnTimer); spawnTimer = setTimeout(() => { if (state !== 'playing') return; spawnBatch(); scheduleSpawn(Math.max(420, 980 - elapsed * 12) + Math.random() * 260); }, delay); }
  function moveHammer(event) { const rect = stage.getBoundingClientRect(); nozzlePoint = { x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)), y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)) }; hammer.style.left = `${nozzlePoint.x}%`; hammer.style.top = `${nozzlePoint.y}%`; }
  function spawnBatch() { const open = ventPositions.filter(([x, y]) => !entities.some(item => !item.captured && item.x === x && item.y === y)); const count = Math.min(open.length, elapsed > 18 ? 3 : elapsed > 8 ? 2 : 1); open.sort(() => Math.random() - .5).slice(0, count).forEach(([x, y], index) => { if (index === 0 && elapsed > 6 && !entities.some(item => item.power) && Math.random() < .14) spawnPower(x, y); else spawnEntity(x, y); }); }
  function addItem(item) { item.age = 0; item.captured = false; item.retreating = false; item.el.style.left = `${item.x}%`; item.el.style.top = `${item.y}%`; item.el.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); if (state === 'playing') { moveHammer(event); if (item.power) collectPower(item); else whack(item); } }, { passive: false }); entitiesEl.append(item.el); entities.push(item); }
  function spawnEntity(x, y) { const friendly = Math.random() < .16; const bug = bugTypes[Math.floor(Math.random() * bugTypes.length)]; const label = friendly ? 'FRIENDLY PACKET' : bug.name; const el = document.createElement('div'); el.className = `vacuum-entity ${friendly ? 'is-friendly' : `is-bug tier-${bug.tier}`}`; el.innerHTML = `${friendly ? packetSvg : bugArt(bug)}<span class="entity-badge">${label}</span><span class="particle-trail" aria-hidden="true"></span>`; addItem({ x, y, friendly, bug, label, el, visibleFor: friendly ? .95 + Math.random() * .2 : Math.max(.55, ({ danger: .78, moderate: 1.0, easy: 1.2 }[bug.tier] || 1) - elapsed * .012) + Math.random() * .2 }); }
  function spawnPower(x, y) { const power = powerUps[Math.floor(Math.random() * powerUps.length)]; const el = document.createElement('div'); el.className = `vacuum-entity is-power power-${power.id}`; el.innerHTML = `${powerArt(power)}<span class="entity-badge">${power.name}</span>`; addItem({ x, y, power, el, visibleFor: 1.9 }); }
  function whack(item) { if (!item || item.captured || item.retreating) return; item.captured = true; hammer.classList.remove('is-swinging'); requestAnimationFrame(() => hammer.classList.add('is-swinging')); setTimeout(() => hammer.classList.remove('is-swinging'), 190); item.el.classList.add(item.friendly ? 'is-packet-captured' : 'is-captured'); if (item.friendly) { playPacketSound(); if (shield) { shield = false; setStatus('ROLLBACK · PACKET SAFE', 'green'); updatePowerHud(); } else { score = Math.max(0, score - 12); streak = 0; misses += 1; packetHits += 1; flash.classList.add('show'); clearTimeout(flashTimer); flashTimer = setTimeout(() => flash.classList.remove('show'), 220); setStatus('PACKET HIT -12', 'red'); } } else { streak += 1; captured += 1; maxCombo = Math.max(maxCombo, streak); const base = item.bug.points; const bonus = Math.min(20, (streak - 1) * 2); const gain = (base + bonus) * (activePower?.id === 'boost' ? 2 : 1); score += gain; counts.set(item.label, (counts.get(item.label) || 0) + 1); mostRecent = item.label; playWhackSound(); setStatus(`WHACK +${gain}`, 'green'); } refreshHud(); setTimeout(() => item.el.remove(), 220); }
  function collectPower(item) { if (!item || item.captured) return; item.captured = true; item.el.classList.add('is-packet-captured'); playPowerSound(); powersCollected += 1; if (item.power.id === 'rollback') { shield = true; } else { activePower = item.power; powerLeft = item.power.duration; } setStatus(`POWER · ${item.power.name} — ${item.power.hint}`, 'green'); updatePowerHud(); setTimeout(() => item.el.remove(), 220); }
  function miss() { if (state !== 'playing') return; if (shield) { shield = false; setStatus('ROLLBACK · COMBO SAVED', 'yellow'); updatePowerHud(); return; } streak = 0; misses += 1; playMissSound(); setStatus('MISS', 'yellow'); refreshHud(); }
  function update(dt) { elapsed += dt; const frozen = activePower?.id === 'freeze'; if (activePower) { powerLeft = Math.max(0, powerLeft - dt); if (powerLeft === 0) activePower = null; updatePowerHud(); } const ageStep = frozen ? 0 : dt; entities.forEach(item => { if (item.captured) return; item.age += ageStep; item.el.style.setProperty('--bob', `${Math.sin(item.age * 8) * 3}px`); if (!item.retreating && item.age >= item.visibleFor) { item.retreating = true; item.el.classList.add('is-retreating'); } }); entities = entities.filter(item => { if (item.captured) return false; if (item.age >= item.visibleFor + .22) { item.el.remove(); if (!item.friendly && !item.power) { bugsMissed += 1; miss(); } return false; } return true; }); roundEl.textContent = `ROUND ${String(Math.floor(elapsed)).padStart(2, '0')}s`; if (elapsed >= 30) end(); }
  function loop(now) { if (state !== 'playing') return; const dt = Math.min((now - last) / 1000, .05); last = now; update(dt); if (state === 'playing') rafId = requestAnimationFrame(loop); }
  function end() { if (state !== 'playing') return; state = 'winding'; clearTimeout(spawnTimer); music.pause(); setStatus('TIME UP', 'yellow'); timeUpEl.hidden = false; entities.forEach(item => { if (!item.captured) { item.retreating = true; item.el.classList.add('is-retreating'); } }); finishTimer = setTimeout(finishRound, 1100); }
  function countUp(el, target) { const startAt = performance.now(); const step = now => { const k = Math.min(1, (now - startAt) / 900); el.textContent = String(Math.round(target * k)).padStart(3, '0'); if (k < 1) countRaf = requestAnimationFrame(step); }; countRaf = requestAnimationFrame(step); }
  function finishRound() { state = 'ended'; entities.forEach(item => item.el.remove()); entities = []; timeUpEl.hidden = true; setStatus('ROUND OVER', 'green'); const attempts = captured + bugsMissed + packetHits; const accuracy = attempts ? Math.round(100 * captured / attempts) : 0; const rank = accuracy >= 90 && captured >= 30 ? 'S' : accuracy >= 75 ? 'A' : accuracy >= 55 ? 'B' : 'C'; rankEl.textContent = rank; rankBox.dataset.rank = rank; resultTitle.textContent = RANK_TITLES[rank]; resultCopy.textContent = `You whacked ${captured} bug${captured === 1 ? '' : 's'} and let ${bugsMissed} slip. ${packetHits ? `${packetHits} packet${packetHits === 1 ? '' : 's'} hit.` : 'No packets hit.'}`; statWhacked.textContent = String(captured); statAccuracy.textContent = `${accuracy}%`; statCombo.textContent = `x${maxCombo}`; statPackets.textContent = String(packetHits); statPowers.textContent = String(powersCollected); const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]); const learned = ranked[0]?.[0] || mostRecent || bugTypes[0].name; const definition = bugTypes.find(item => item.name === learned)?.description || bugTypes[0].description; learningLabel.textContent = learned; explanationEl.textContent = definition; result.hidden = false; void result.offsetWidth; result.classList.add('is-revealed'); countUp(finalScoreEl, score); }
  stage.addEventListener('pointerdown', event => { event.preventDefault(); if (state === 'idle') { begin(); return; } if (state === 'playing') { moveHammer(event); if (event.target === stage) miss(); stage.setPointerCapture?.(event.pointerId); } }, { passive: false });
  stage.addEventListener('pointermove', event => { if (state === 'playing') { event.preventDefault(); moveHammer(event); } }, { passive: false });
  stage.addEventListener('pointerup', event => { if (state === 'playing') stage.releasePointerCapture?.(event.pointerId); }, { passive: false });
  play.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); begin(); }, { passive: false }); again.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); begin(); }, { passive: false });
  musicToggle.addEventListener('pointerdown', event => { event.preventDefault(); musicOn = !musicOn; if (musicOn && state === 'playing') music.play().catch(() => {}); else music.pause(); musicToggle.textContent = musicOn ? '♫ MUSIC ON' : '♫ MUSIC OFF'; }, { passive: false });
  reset();
})();

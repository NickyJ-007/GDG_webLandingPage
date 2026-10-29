/* ============================================================================
   GDG UVCE — SHIP THE WEB (Mini-Game)
   "Catch the stack. Build the web. Ship it."

   Mechanics:
   - Basket represents the player's "Web Stack" browser container.
   - Developer tags (HTML -> CSS -> JS -> Git -> Deploy) fall from top.
   - Player catches them to build the stack.
   - Hazards (404, BUG, ERROR, NaN) subtract points and reset combo.
   - Caught items visibly accumulate inside the basket container!
   - 18 seconds total round (strictly <= 20s).
   - Ends with a seamless transition into the GDG Workshop announcement.
   - Audio: "tidin" catch sound extracted from reference video, triggered
     ONLY upon collision. Zero autoplay, zero background music loop.
   ============================================================================ */

(function () {
  "use strict";

  // DOM Elements
  const stage = document.getElementById("game-stage");
  const canvas = document.getElementById("game-canvas");
  const hud = document.getElementById("game-hud");
  const scoreEl = document.getElementById("game-score");
  const comboEl = document.getElementById("game-combo");
  const timerEl = document.getElementById("game-timer");
  const startScreen = document.getElementById("game-start-screen");
  const startBtn = document.getElementById("game-start-btn");
  const endScreen = document.getElementById("game-end-screen");
  const finalScoreEl = document.getElementById("game-final-score");
  const maxComboEl = document.getElementById("game-max-combo");
  const replayBtn = document.getElementById("game-replay-btn");

  // Stack badges in HUD
  const badges = {
    html: document.getElementById("badge-html"),
    css: document.getElementById("badge-css"),
    js: document.getElementById("badge-js"),
    git: document.getElementById("badge-git"),
    deploy: document.getElementById("badge-deploy")
  };

  // Checklist items in end screen
  const checkItems = {
    html: document.querySelector('.end-check-item[data-check="html"]'),
    css: document.querySelector('.end-check-item[data-check="css"]'),
    js: document.querySelector('.end-check-item[data-check="js"]'),
    git: document.querySelector('.end-check-item[data-check="git"]'),
    deploy: document.querySelector('.end-check-item[data-check="deploy"]')
  };

  if (!canvas || !canvas.getContext || !stage) return;
  const ctx = canvas.getContext("2d");

  // Game Constants
  const ROUND_DURATION_MS = 18000; // 18 seconds maximum
  const GOOGLE_COLORS = {
    blue: "#4285F4",
    green: "#34A853",
    yellow: "#FBBC05",
    red: "#EA4335",
    dark: "#1E1E1E",
    surface: "#FFFFFF",
    hazard: "#BA1A1A"
  };

  // Vocabulary & Categories
  const VOCABULARY = {
    html: [
      { label: "<div>", points: 10, color: GOOGLE_COLORS.blue, textColor: "#FFF" },
      { label: "<header>", points: 10, color: GOOGLE_COLORS.blue, textColor: "#FFF" },
      { label: "<main>", points: 10, color: GOOGLE_COLORS.blue, textColor: "#FFF" },
      { label: "<section>", points: 10, color: GOOGLE_COLORS.blue, textColor: "#FFF" },
      { label: "<a>", points: 10, color: GOOGLE_COLORS.blue, textColor: "#FFF" },
      { label: "<form>", points: 10, color: GOOGLE_COLORS.blue, textColor: "#FFF" }
    ],
    css: [
      { label: "display:flex", points: 10, color: GOOGLE_COLORS.green, textColor: "#FFF" },
      { label: "grid", points: 10, color: GOOGLE_COLORS.green, textColor: "#FFF" },
      { label: "margin", points: 10, color: GOOGLE_COLORS.green, textColor: "#FFF" },
      { label: "padding", points: 10, color: GOOGLE_COLORS.green, textColor: "#FFF" },
      { label: "color", points: 10, color: GOOGLE_COLORS.green, textColor: "#FFF" },
      { label: "@media", points: 10, color: GOOGLE_COLORS.green, textColor: "#FFF" }
    ],
    js: [
      { label: "const", points: 15, color: GOOGLE_COLORS.yellow, textColor: "#1E1E1E" },
      { label: "function()", points: 15, color: GOOGLE_COLORS.yellow, textColor: "#1E1E1E" },
      { label: "addEventListener", points: 15, color: GOOGLE_COLORS.yellow, textColor: "#1E1E1E" },
      { label: "fetch()", points: 15, color: GOOGLE_COLORS.yellow, textColor: "#1E1E1E" },
      { label: "async", points: 15, color: GOOGLE_COLORS.yellow, textColor: "#1E1E1E" },
      { label: "DOM", points: 15, color: GOOGLE_COLORS.yellow, textColor: "#1E1E1E" }
    ],
    git: [
      { label: "git", points: 15, color: GOOGLE_COLORS.red, textColor: "#FFF" },
      { label: "commit", points: 15, color: GOOGLE_COLORS.red, textColor: "#FFF" },
      { label: "push", points: 15, color: GOOGLE_COLORS.red, textColor: "#FFF" },
      { label: "GitHub", points: 15, color: "#6e40c9", textColor: "#FFF" },
      { label: "deploy", points: 20, color: GOOGLE_COLORS.red, textColor: "#FFF" }
    ],
    hazards: [
      { label: "404", points: -15, color: GOOGLE_COLORS.dark, textColor: "#FF6B6B", isHazard: true },
      { label: "BUG", points: -15, color: GOOGLE_COLORS.dark, textColor: "#FF6B6B", isHazard: true },
      { label: "ERROR", points: -15, color: GOOGLE_COLORS.dark, textColor: "#FF6B6B", isHazard: true },
      { label: "NaN", points: -15, color: GOOGLE_COLORS.dark, textColor: "#FF6B6B", isHazard: true }
    ]
  };

  /* ============================================================================
     AUDIO ENGINE
     - Plays a soft, ASMR-style mouth pop on item collision, rotating 5 variants
       with slight pitch drift so repeated catches never sound identical.
       ("Pop sounds", CC0, opengameart.org/content/pop-sounds; low-passed and level-matched)
     - Zero autoplay (unlocked strictly on user gesture).
     - Controlled concurrency pool with Web Audio synthesis fallback.
     ============================================================================ */
  const SFX_VOLUME = 0.25; // master level for every sound effect (was too loud at full gain)
  const CATCH_VOLUME = 0.35; // pops are pre-normalized ~6dB quieter than the old chime, so this lands softer still

  // Calm background loop: "First Light Particles" (CC0, opengameart.org), ambient piano.
  // Routed through a Web Audio gain so fades and volume also work on iOS (where audio.volume is read-only).
  const BGM_VOLUME = 0.08; // kept low: a quiet bed under the catch pops
  const bgMusic = new Audio("assets/ship-bgm.mp3");
  bgMusic.loop = true;
  bgMusic.preload = "none";
  let bgmGain = null;
  let musicOn = true;
  let musicTarget = 0;
  let musicPauseTimer = 0;

  function initMusic() {
    if (bgmGain || !audioCtx) return;
    try {
      bgmGain = audioCtx.createGain();
      bgmGain.gain.value = 0;
      audioCtx.createMediaElementSource(bgMusic).connect(bgmGain).connect(audioCtx.destination);
    } catch (e) {
      bgmGain = null; // fall back to element volume below
    }
  }

  // Ramp the music to `target` over `seconds`; pauses the element once fully faded out
  function fadeMusic(target, seconds) {
    musicTarget = target;
    clearTimeout(musicPauseTimer);
    if (target > 0) bgMusic.play().catch(() => {});
    if (bgmGain) {
      const now = audioCtx.currentTime;
      bgmGain.gain.cancelScheduledValues(now);
      bgmGain.gain.setValueAtTime(bgmGain.gain.value, now);
      bgmGain.gain.linearRampToValueAtTime(target, now + seconds);
    } else {
      bgMusic.volume = target;
    }
    if (target === 0) {
      musicPauseTimer = setTimeout(() => { if (musicTarget === 0) bgMusic.pause(); }, seconds * 1000 + 60);
    }
  }
  let audioCtx = null;
  let sfxOut = null;
  let catchAudioPool = [];
  let catchPoolIdx = 0;
  let lastCatchSoundTime = 0;

  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        // Synth sounds route through one master gain so they match the catch sample's level
        sfxOut = audioCtx.createGain();
        sfxOut.gain.value = SFX_VOLUME;
        sfxOut.connect(audioCtx.destination);
        if (audioCtx.state === "suspended") {
          audioCtx.resume();
        }
      }
    } catch (e) {
      // AudioContext unavailable
    }

    // Two voices per pop variant, so overlapping catches don't cut each other off
    for (let i = 0; i < 10; i++) {
      const a = new Audio(`assets/catch-pop${(i % 5) + 1}.mp3`);
      a.volume = CATCH_VOLUME;
      a.preload = "auto";
      a.preservesPitch = false; // let playbackRate nudge the pitch
      catchAudioPool.push(a);
    }
  }

  // Synth fallback: a soft, low sine "bloop" in the same spirit as the pop samples
  function synthCatchSound() {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(260, now + 0.09);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.35, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(sfxOut);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch (e) {
      // Audio synth silent fallback
    }
  }

  function playCatchSound() {
    const now = performance.now();
    // Controlled concurrency throttle: prevent harsh clipping if multi-catch
    if (now - lastCatchSoundTime < 45) return;
    lastCatchSoundTime = now;

    if (catchAudioPool.length > 0) {
      // Random voice (never the one just played) with ±6% pitch drift
      catchPoolIdx = (catchPoolIdx + 1 + Math.floor(Math.random() * (catchAudioPool.length - 1))) % catchAudioPool.length;
      const audio = catchAudioPool[catchPoolIdx];
      try {
        audio.currentTime = 0;
        audio.playbackRate = 0.94 + Math.random() * 0.12;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => { synthCatchSound(); });
        }
      } catch (e) {
        synthCatchSound();
      }
    } else {
      synthCatchSound();
    }
  }

  function playHazardSound() {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(sfxOut);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {}
  }

  function playComboSound() {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(784, now); // G5: warm, not shrill like the old C7
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.015); // soft attack, no click
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(sfxOut);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  function playCompleteSound() {
    if (!audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5]; // C Major arpeggio
      chord.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const start = now + idx * 0.08;
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.22, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
        osc.connect(gain);
        gain.connect(sfxOut);
        osc.start(start);
        osc.stop(start + 0.35);
      });
    } catch (e) {}
  }

  /* ============================================================================
     GAME STATE & LOGIC
     ============================================================================ */
  let W = 0;
  let H = 0;
  let DPR = 1;
  let running = false;
  let roundStart = 0;
  let lastSpawn = 0;
  let lastFrame = 0;
  let rafId = null;

  let score = 0;
  let streak = 0;
  let maxCombo = 1;
  let caughtCounts = { html: 0, css: 0, js: 0, git: 0, deploy: 0 };

  let fallingItems = [];
  let floatingPopups = [];

  // Basket / Player Object
  const basket = {
    x: 0,
    y: 0,
    w: 136,
    h: 72,
    vx: 0,
    targetX: 0,
    bounceY: 0,
    shakeX: 0,
    tilt: 0,
    stack: [] // Visibly accumulated code tags
  };

  // Keyboard input state
  const keys = { left: false, right: false };

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const rect = stage.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // Responsive basket sizing
    if (W < 440) {
      basket.w = 112;
      basket.h = 64;
    } else {
      basket.w = 136;
      basket.h = 72;
    }
    basket.y = H - basket.h - 14;
    basket.x = Math.max(0, Math.min(W - basket.w, basket.x || (W - basket.w) / 2));
    basket.targetX = basket.x;
  }

  resize();
  window.addEventListener("resize", resize);

  /* ============================================================================
     CONTROLS: Mouse, Keyboard, Touch/Drag
     ============================================================================ */
  function onPointerMove(e) {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const canvasX = clientX - rect.left;
    basket.targetX = canvasX - basket.w / 2;
  }

  canvas.addEventListener("mousemove", onPointerMove, { passive: true });
  canvas.addEventListener("touchstart", function (e) {
    onPointerMove(e);
  }, { passive: true });
  canvas.addEventListener("touchmove", function (e) {
    if (!running) return; // Idle stage must let the page scroll
    onPointerMove(e);
    e.preventDefault(); // Prevent page scroll while dragging basket
  }, { passive: false });

  window.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = true;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = true;
  });

  window.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keys.left = false;
    if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keys.right = false;
  });

  /* ============================================================================
     FALLING ITEMS
     ============================================================================ */
  class FallingItem {
    constructor(data, category, speed) {
      this.label = data.label;
      this.points = data.points;
      this.color = data.color;
      this.textColor = data.textColor;
      this.isHazard = Boolean(data.isHazard);
      this.category = category;

      // Measure width according to label
      const basePadding = 16;
      const charWidth = 7.5;
      this.w = Math.max(54, this.label.length * charWidth + basePadding);
      this.h = 28;

      this.x = Math.random() * (W - this.w - 24) + 12;
      this.y = -this.h - 10;
      this.vy = speed * Math.max(0.8, H / 450); // same fall time on short mobile stages
      this.wobblePhase = Math.random() * Math.PI * 2;
      this.wobbleSpeed = 1.8 + Math.random() * 1.5;
      this.rotation = (Math.random() - 0.5) * 0.12;
      this.dead = false;
    }

    update(dt) {
      this.y += this.vy * (dt / 1000);
      this.x += Math.sin(this.wobblePhase) * 0.45;
      this.wobblePhase += this.wobbleSpeed * (dt / 1000);

      // Keep inside bounds
      this.x = Math.max(4, Math.min(W - this.w - 4, this.x));

      // Fell past bottom
      if (this.y > H + 40) {
        this.dead = true;
      }
    }

    draw() {
      ctx.save();
      ctx.translate(this.x + this.w / 2, this.y + this.h / 2);
      ctx.rotate(this.rotation);

      const hw = this.w / 2;
      const hh = this.h / 2;

      // Hard neo-brutalist shadow
      ctx.fillStyle = "#1E1E1E";
      roundRect(ctx, -hw + 2.5, -hh + 2.5, this.w, this.h, 6);
      ctx.fill();

      // Card body
      ctx.fillStyle = this.color;
      ctx.strokeStyle = "#1E1E1E";
      ctx.lineWidth = 2;
      roundRect(ctx, -hw, -hh, this.w, this.h, 6);
      ctx.fill();
      ctx.stroke();

      // Monospace label
      ctx.fillStyle = this.textColor;
      ctx.font = 'bold 11.5px "Google Sans Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.label, 0, 1);

      ctx.restore();
    }
  }

  // Floating score feedback popups
  class FloatingPopup {
    constructor(x, y, text, color) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.opacity = 1;
      this.vy = -38;
      this.life = 0;
      this.maxLife = 650;
    }

    update(dt) {
      this.life += dt;
      this.y += this.vy * (dt / 1000);
      this.opacity = Math.max(0, 1 - (this.life / this.maxLife));
    }

    draw() {
      if (this.opacity <= 0) return;
      ctx.save();
      ctx.globalAlpha = this.opacity;
      ctx.font = 'bold 13px "Google Sans Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      // Black text outline for crisp readability
      ctx.strokeStyle = "#1E1E1E";
      ctx.lineWidth = 3;
      ctx.strokeText(this.text, this.x, this.y);

      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  /* ============================================================================
     BASKET RENDERING & ACCUMULATED STACK
     ============================================================================ */
  function drawBasket() {
    const bx = basket.x + basket.shakeX;
    const by = basket.y + basket.bounceY;
    const bw = basket.w;
    const bh = basket.h;

    ctx.save();
    ctx.translate(bx + bw / 2, by + bh / 2);
    ctx.rotate(basket.tilt);
    const hw = bw / 2;
    const hh = bh / 2;

    // 1. Neo-Brutalist Hard Drop Shadow
    ctx.fillStyle = "#1E1E1E";
    roundRect(ctx, -hw + 3.5, -hh + 3.5, bw, bh, 8);
    ctx.fill();

    // 2. Browser Window Container Body
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = "#1E1E1E";
    ctx.lineWidth = 2.5;
    roundRect(ctx, -hw, -hh, bw, bh, 8);
    ctx.fill();
    ctx.stroke();

    // 3. Title Bar / Header
    const titleH = 20;
    ctx.fillStyle = "#F1EFEF";
    ctx.beginPath();
    ctx.moveTo(-hw, -hh + 8);
    ctx.arcTo(-hw, -hh, -hw + 8, -hh, 8);
    ctx.arcTo(hw, -hh, hw, -hh + 8, 8);
    ctx.lineTo(hw, -hh + titleH);
    ctx.lineTo(-hw, -hh + titleH);
    ctx.closePath();
    ctx.fill();

    // Title bar divider line
    ctx.beginPath();
    ctx.moveTo(-hw, -hh + titleH);
    ctx.lineTo(hw, -hh + titleH);
    ctx.strokeStyle = "#1E1E1E";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Title Bar Text: WEB STACK
    ctx.fillStyle = "#1E1E1E";
    ctx.font = 'bold 9px "Google Sans Mono", monospace';
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("WEB STACK", -hw + 8, -hh + titleH / 2);

    // Colored Window Dots
    const dotR = 3;
    const dotY = -hh + titleH / 2;
    [GOOGLE_COLORS.red, GOOGLE_COLORS.yellow, GOOGLE_COLORS.green].forEach((col, idx) => {
      ctx.beginPath();
      ctx.arc(hw - 24 + idx * 8, dotY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = col;
      ctx.fill();
      ctx.strokeStyle = "#1E1E1E";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 4. Interior: Accumulated Stack of Caught Items
    // Mini code pills stacked inside the container
    const stackAreaX = -hw + 4;
    const stackAreaY = -hh + titleH + 2;
    const stackAreaW = bw - 8;
    const stackAreaH = bh - titleH - 4;

    ctx.save();
    // Clip inside window body
    ctx.beginPath();
    ctx.rect(stackAreaX, stackAreaY, stackAreaW, stackAreaH);
    ctx.clip();

    // Render caught mini tags
    const stack = basket.stack;
    const tagH = 13;
    const tagsPerRow = bw > 120 ? 3 : 2;
    const tagW = Math.floor((stackAreaW - 6) / tagsPerRow);

    stack.forEach((item, idx) => {
      const col = idx % tagsPerRow;
      const row = Math.floor(idx / tagsPerRow);
      const ix = stackAreaX + 3 + col * tagW;
      const iy = stackAreaY + stackAreaH - (row + 1) * (tagH + 2);

      // Mini pill background
      ctx.fillStyle = item.color;
      ctx.strokeStyle = "#1E1E1E";
      ctx.lineWidth = 1;
      roundRect(ctx, ix, iy, tagW - 2, tagH, 3);
      ctx.fill();
      ctx.stroke();

      // Mini label
      ctx.fillStyle = item.textColor;
      ctx.font = 'bold 7.5px "Google Sans Mono", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const shortText = item.label.replace(/<|>/g, "").substring(0, 5);
      ctx.fillText(shortText, ix + (tagW - 2) / 2, iy + tagH / 2);
    });

    ctx.restore();

    ctx.restore();
  }

  /* ============================================================================
     GAMEPLAY LOOP & SPAWNING
     ============================================================================ */
  function getSpawnConfig(elapsed) {
    // 0s–5s: HTML introduction
    if (elapsed < 5000) {
      return {
        categories: ["html"],
        interval: 620,
        speed: 115,
        hazardChance: 0
      };
    }
    // 5s–9.5s: CSS joins
    if (elapsed < 9500) {
      return {
        categories: ["html", "css"],
        interval: 520,
        speed: 135,
        hazardChance: 0.14
      };
    }
    // 9.5s–13.5s: JavaScript joins
    if (elapsed < 13500) {
      return {
        categories: ["html", "css", "js"],
        interval: 440,
        speed: 160,
        hazardChance: 0.18
      };
    }
    // 13.5s–18s: Git & Deploy finale!
    return {
      categories: ["html", "css", "js", "git"],
      interval: 360,
      speed: 185,
      hazardChance: 0.22
    };
  }

  function spawnItem(elapsed) {
    const config = getSpawnConfig(elapsed);

    // Hazard spawn
    if (Math.random() < config.hazardChance) {
      const hazardList = VOCABULARY.hazards;
      const data = hazardList[Math.floor(Math.random() * hazardList.length)];
      fallingItems.push(new FallingItem(data, "hazard", config.speed));
      return;
    }

    // Stack item spawn based on current phase
    const category = config.categories[Math.floor(Math.random() * config.categories.length)];
    const list = VOCABULARY[category];
    const data = list[Math.floor(Math.random() * list.length)];
    fallingItems.push(new FallingItem(data, category, config.speed));
  }

  function updateBasketPhysics(dt) {
    // Keyboard velocity
    const speed = 720;
    if (keys.left) basket.targetX -= speed * (dt / 1000);
    if (keys.right) basket.targetX += speed * (dt / 1000);

    // Clamp target within stage
    basket.targetX = Math.max(0, Math.min(W - basket.w, basket.targetX));

    // Smooth position interpolation, frame-rate independent so 60Hz/120Hz phones feel the same
    const prevX = basket.x;
    basket.x += (basket.targetX - basket.x) * (1 - Math.pow(0.6, dt / 16.67));
    basket.vx = basket.x - prevX;

    // Subtle tilt based on velocity
    const maxTilt = 0.05; // ~3 degrees
    basket.tilt = Math.max(-maxTilt, Math.min(maxTilt, (basket.vx / 16) * maxTilt));

    // Bounce & Shake damping
    if (basket.bounceY > 0) basket.bounceY = Math.max(0, basket.bounceY - 24 * (dt / 1000));
    if (Math.abs(basket.shakeX) > 0.1) basket.shakeX *= 0.82;
    else basket.shakeX = 0;
  }

  function checkCollisions() {
    const bx = basket.x;
    const by = basket.y;
    const bw = basket.w;

    fallingItems.forEach((item) => {
      if (item.dead) return;

      // Item bottom edge hits basket top rim
      const itemBottom = item.y + item.h;
      const itemCenter = item.x + item.w / 2;

      if (
        itemBottom >= by &&
        itemBottom <= by + 18 &&
        itemCenter >= bx - 8 &&
        itemCenter <= bx + bw + 8
      ) {
        item.dead = true;

        if (item.isHazard) {
          // Hazard hit!
          playHazardSound();
          score = Math.max(0, score + item.points);
          streak = 0;
          scoreEl.textContent = `Score: ${score}`;
          comboEl.hidden = true;

          basket.shakeX = (Math.random() > 0.5 ? 1 : -1) * 8;
          floatingPopups.push(new FloatingPopup(itemCenter, by - 6, `${item.label}! -15`, "#FF4D4D"));
        } else {
          // Successful Catch!
          playCatchSound();
          streak++;
          if (streak > maxCombo) maxCombo = streak;

          // Multiplier
          let mult = 1;
          if (streak >= 10) mult = 10;
          else if (streak >= 8) mult = 5;
          else if (streak >= 5) mult = 3;
          else if (streak >= 3) mult = 2;

          const pts = item.points * mult;
          score += pts;
          scoreEl.textContent = `Score: ${score}`;

          // Combo HUD
          if (mult > 1) {
            comboEl.textContent = `Combo ×${mult}!`;
            comboEl.hidden = false;
            if (streak === 3 || streak === 5 || streak === 10) {
              playComboSound();
            }
          }

          // Accumulate inside basket stack (up to 12 items displayed)
          if (basket.stack.length < 12) {
            basket.stack.push({
              label: item.label,
              color: item.color,
              textColor: item.textColor
            });
          }

          // Update stack progress category
          if (item.label === "deploy") {
            caughtCounts.deploy++;
            if (badges.deploy) badges.deploy.classList.add("active");
          } else if (item.category === "git") {
            caughtCounts.git++;
            if (badges.git) badges.git.classList.add("active");
          } else if (item.category === "js") {
            caughtCounts.js++;
            if (badges.js) badges.js.classList.add("active");
          } else if (item.category === "css") {
            caughtCounts.css++;
            if (badges.css) badges.css.classList.add("active");
          } else if (item.category === "html") {
            caughtCounts.html++;
            if (badges.html) badges.html.classList.add("active");
          }

          // Tactile bounce
          basket.bounceY = 5;

          // Floating popup feedback
          const text = mult > 1 ? `+${pts} (×${mult})` : `+${pts}`;
          floatingPopups.push(new FloatingPopup(itemCenter, by - 6, text, GOOGLE_COLORS.green));
        }
      }
    });
  }

  function loop(now) {
    if (!running) return;
    const dt = lastFrame ? Math.min(now - lastFrame, 50) : 16;
    lastFrame = now;

    const elapsed = now - roundStart;
    const remaining = Math.max(0, ROUND_DURATION_MS - elapsed);
    timerEl.textContent = `${Math.ceil(remaining / 1000)}s`;

    // End round when timer hits 0
    if (remaining <= 0) {
      endRound();
      return;
    }

    // Spawning
    const spawnConfig = getSpawnConfig(elapsed);
    if (now - lastSpawn > spawnConfig.interval) {
      lastSpawn = now;
      spawnItem(elapsed);
    }

    // Updates
    updateBasketPhysics(dt);
    fallingItems.forEach((item) => item.update(dt));
    fallingItems = fallingItems.filter((item) => !item.dead);
    checkCollisions();

    floatingPopups.forEach((popup) => popup.update(dt));
    floatingPopups = floatingPopups.filter((p) => p.opacity > 0);

    // Draw frame
    ctx.clearRect(0, 0, W, H);
    drawBasket();
    fallingItems.forEach((item) => item.draw());
    floatingPopups.forEach((popup) => popup.draw());

    rafId = requestAnimationFrame(loop);
  }

  /* ============================================================================
     START & END SEQUENCES
     ============================================================================ */
  function startRound() {
    if (rafId) cancelAnimationFrame(rafId); // restart mid-round without doubling the loop
    initAudio();
    initMusic();
    if (musicOn) fadeMusic(BGM_VOLUME, 1.5);
    resize();

    score = 0;
    streak = 0;
    maxCombo = 1;
    caughtCounts = { html: 0, css: 0, js: 0, git: 0, deploy: 0 };
    fallingItems = [];
    floatingPopups = [];
    basket.stack = [];
    basket.bounceY = 0;
    basket.shakeX = 0;

    // Reset badges
    Object.values(badges).forEach((b) => {
      if (b) b.classList.remove("active");
    });

    scoreEl.textContent = "Score: 0";
    comboEl.hidden = true;
    timerEl.textContent = "18s";

    startScreen.hidden = true;
    endScreen.hidden = true;
    hud.hidden = false;
    stage.classList.add("is-playing");

    running = true;
    roundStart = performance.now();
    lastSpawn = performance.now();
    lastFrame = performance.now();

    rafId = requestAnimationFrame(loop);
  }

  function endRound() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    ctx.clearRect(0, 0, W, H);
    hud.hidden = true;
    stage.classList.remove("is-playing");
    fadeMusic(0, 3); // gentle tail over the end screen

    playCompleteSound();

    // Populate final scores
    finalScoreEl.textContent = String(score);
    maxComboEl.textContent = `×${maxCombo}`;

    // Reveal checklist in end screen
    Object.entries(checkItems).forEach(([cat, el]) => {
      if (el) {
        if (caughtCounts[cat] > 0 || cat === "deploy") {
          el.style.opacity = "1";
          el.style.background = "#d4f8d3";
        } else {
          el.style.opacity = "0.75";
        }
      }
    });

    endScreen.hidden = false;
  }

  // Mini Arcade: when the player switches to another game, end this round cleanly
  window.addEventListener("arcade:stop", function () {
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    keys.left = false;
    keys.right = false;
    hud.hidden = true;
    stage.classList.remove("is-playing");
    fadeMusic(0, 0.3);
    startScreen.hidden = false;
  });

  // Event Listeners
  startBtn.addEventListener("click", startRound);
  replayBtn.addEventListener("click", startRound);
  const restartBtn = document.getElementById("game-restart-btn");
  if (restartBtn) restartBtn.addEventListener("click", startRound);
  const musicBtn = document.getElementById("game-music-btn");
  if (musicBtn) {
    musicBtn.addEventListener("click", function () {
      musicOn = !musicOn;
      musicBtn.textContent = musicOn ? "♫ Music on" : "♫ Music off";
      musicBtn.setAttribute("aria-pressed", String(musicOn));
      if (musicOn && running) { initAudio(); initMusic(); }
      fadeMusic(musicOn && running ? BGM_VOLUME : 0, 0.4);
    });
  }

})();

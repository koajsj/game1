(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const livesEl = document.getElementById('lives');
  const stageEl = document.getElementById('stage');
  const comboEl = document.getElementById('combo');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const overlaySummary = document.getElementById('overlaySummary');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const bossPanel = document.getElementById('bossPanel');
  const bossName = document.getElementById('bossName');
  const bossValue = document.getElementById('bossValue');
  const bossFill = document.getElementById('bossFill');
  const fireBtn = document.getElementById('fireBtn');
  const perfPanel = document.getElementById('perfPanel');
  const moveStick = document.getElementById('moveStick');
  const moveKnob = document.getElementById('moveKnob');
  const aimStick = document.getElementById('aimStick');
  const aimKnob = document.getElementById('aimKnob');
  const modeButtons = Array.from(document.querySelectorAll('.mode-btn'));
  const buffShield = document.getElementById('buffShield');
  const buffMagnet = document.getElementById('buffMagnet');
  const buffSlow = document.getElementById('buffSlow');
  const buffBoost = document.getElementById('buffBoost');

  const audio = {
    ctx: null,
    master: null,
    musicGain: null,
    sfxGain: null,
    duckGain: null,
    step: 0,
    enabled: false,
    duckTimer: 0,
  };

  const telemetry = {
    shotsHit: 0,
    deathCause: 'none',
    runStartedAt: 0,
  };

  const meta = {
    coresBank: Number(localStorage.getItem('starRingCoresBank') || 0),
    lifeLevel: Number(localStorage.getItem('starRingLifeLevel') || 0),
    fireLevel: Number(localStorage.getItem('starRingFireLevel') || 0),
    magnetLevel: Number(localStorage.getItem('starRingMagnetLevel') || 0),
  };

  const state = {
    running: false,
    paused: false,
    over: false,
    scoreValue: 0,
    score: 0,
    best: Number(localStorage.getItem('starRingBest') || 0),
    lives: 3,
    combo: 1,
    comboTimer: 0,
    stage: 1,
    stageTransition: 0,
    shield: 0,
    magnet: 0,
    slow: 0,
    boost: 0,
    shieldHits: 0,
    spawnTimer: 0,
    powerTimer: 0,
    musicTimer: 0,
    fireTimer: 0,
    shake: 0,
    flash: 0,
    time: 0,
    coresCollected: 0,
    shotsFired: 0,
    bossSpawnCooldown: 0,
    fireHeld: false,
    pulseCooldown: 0,
    dangerBlink: 0,
    hitStop: 0,
    hitVignette: 0,
  };

  const settings = {
    mode: localStorage.getItem('starRingMode') || 'normal',
    easy: { lives: 5, stageStep: 150, spawnScale: 0.82, bossStep: 4, scoreScale: 0.92 },
    normal: { lives: 3, stageStep: 120, spawnScale: 1.0, bossStep: 3, scoreScale: 1.0 },
    hard: { lives: 2, stageStep: 95, spawnScale: 1.18, bossStep: 2, scoreScale: 1.08 },
  };

  const input = {
    targetX: 0,
    targetY: 0,
    keys: new Set(),
    pointerActive: false,
    moveAxisX: 0,
    moveAxisY: 0,
    aimAxisX: 0,
    aimAxisY: -1,
    movePointerId: null,
    aimPointerId: null,
  };

  const perf = {
    dtAvg: 0,
    fps: 0,
    timer: 0,
    frames: 0,
  };

  const world = {
    w: 0,
    h: 0,
    dpr: 1,
    stars: [],
    particles: [],
    bullets: [],
    meteors: [],
    cores: [],
    powerups: [],
    rings: [],
    boss: null,
    particlePool: [],
    ringPool: [],
    bulletPool: [],
    meteorPool: [],
    corePool: [],
    powerupPool: [],
  };

  const ship = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 18,
    aimDx: 0,
    aimDy: -1,
  };

  const corePalette = [
    { fill: '#8cffc1', glow: 'rgba(140,255,193,0.9)' },
    { fill: '#78d9ff', glow: 'rgba(120,217,255,0.9)' },
  ];

  const powerupDefs = {
    shield: { label: 'Shield', fill: '#8cffc1', glow: 'rgba(140,255,193,0.92)' },
    magnet: { label: 'Magnet', fill: '#79d7ff', glow: 'rgba(121,215,255,0.92)' },
    slow: { label: 'Slow', fill: '#ffd66a', glow: 'rgba(255,214,106,0.92)' },
    boost: { label: 'Boost', fill: '#ff8c9b', glow: 'rgba(255,140,155,0.92)' },
  };

  const hudState = {
    score: null,
    best: null,
    lives: null,
    stage: null,
    combo: null,
    shield: null,
    magnet: null,
    slow: null,
    boost: null,
    bossText: null,
    bossWidth: null,
  };

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function dist(ax, ay, bx, by) {
    const dx = ax - bx;
    const dy = ay - by;
    return Math.hypot(dx, dy);
  }

  function saveMeta() {
    localStorage.setItem('starRingCoresBank', String(meta.coresBank));
    localStorage.setItem('starRingLifeLevel', String(meta.lifeLevel));
    localStorage.setItem('starRingFireLevel', String(meta.fireLevel));
    localStorage.setItem('starRingMagnetLevel', String(meta.magnetLevel));
  }

  function applyMetaUpgrades() {
    const spent = Math.max(0, meta.lifeLevel + meta.fireLevel + meta.magnetLevel);
    const baseLives = modeConfig().lives + Math.min(3, meta.lifeLevel);
    state.lives = baseLives;
    state.fireTimer = Math.max(0.07, 0.16 - meta.fireLevel * 0.01);
    if (spent > 0) {
      setOverlay(
        'MISSION BRIEF',
        'Spend collected cores to improve survivability and fire rate between runs.',
        `Best: ${state.best} | Bank: ${meta.coresBank} | Upgrades L${meta.lifeLevel} F${meta.fireLevel} M${meta.magnetLevel}`
      );
    }
  }

  function setKnob(knob, x, y) {
    knob.style.transform = `translate(${x}px, ${y}px)`;
  }

  function updatePerf(dt) {
    perf.dtAvg = perf.dtAvg === 0 ? dt : perf.dtAvg * 0.92 + dt * 0.08;
    perf.timer += dt;
    perf.frames += 1;
    if (perf.timer >= 0.3) {
      perf.fps = Math.round(perf.frames / perf.timer);
      const frameTime = (perf.dtAvg * 1000).toFixed(1);
      perfPanel.textContent = `FPS: ${perf.fps} | FT: ${frameTime}ms`;
      perf.timer = 0;
      perf.frames = 0;
    }
  }

  function updateHud() {
    const scoreText = String(state.score);
    const bestText = String(state.best);
    const livesText = String(state.lives);
    const stageText = String(state.stage);
    const comboText = `x${state.combo}`;
    const shieldText = `Shield: ${state.shieldHits > 0 ? '1' : '0'}`;
    const magnetText = `Magnet: ${state.magnet > 0 ? state.magnet.toFixed(0) : '0'} (+${meta.magnetLevel})`;
    const slowText = `Slow: ${state.slow > 0 ? state.slow.toFixed(0) : '0'}`;
    const boostText = `Boost: ${state.boost > 0 ? state.boost.toFixed(0) : '0'}`;

    if (hudState.score !== scoreText) {
      scoreEl.textContent = scoreText;
      hudState.score = scoreText;
    }
    if (hudState.best !== bestText) {
      bestEl.textContent = bestText;
      hudState.best = bestText;
    }
    if (hudState.lives !== livesText) {
      livesEl.textContent = livesText;
      hudState.lives = livesText;
    }
    if (hudState.stage !== stageText) {
      stageEl.textContent = stageText;
      hudState.stage = stageText;
    }
    if (hudState.combo !== comboText) {
      comboEl.textContent = comboText;
      hudState.combo = comboText;
    }
    if (hudState.shield !== shieldText) {
      buffShield.textContent = shieldText;
      hudState.shield = shieldText;
    }
    if (hudState.magnet !== magnetText) {
      buffMagnet.textContent = magnetText;
      hudState.magnet = magnetText;
    }
    if (hudState.slow !== slowText) {
      buffSlow.textContent = slowText;
      hudState.slow = slowText;
    }
    if (hudState.boost !== boostText) {
      buffBoost.textContent = boostText;
      hudState.boost = boostText;
    }

    if (world.boss) {
      const bossText = `${Math.max(0, Math.ceil(world.boss.health))} / ${world.boss.maxHealth}`;
      const bossWidth = `${clamp(world.boss.health / world.boss.maxHealth, 0, 1) * 100}%`;
      bossPanel.classList.add('visible');
      if (hudState.bossText !== bossText) {
        bossValue.textContent = bossText;
        hudState.bossText = bossText;
      }
      if (hudState.bossWidth !== bossWidth) {
        bossFill.style.width = bossWidth;
        hudState.bossWidth = bossWidth;
      }
      if (bossName.textContent !== world.boss.name) {
        bossName.textContent = world.boss.name;
      }
    } else {
      bossPanel.classList.remove('visible');
      hudState.bossText = null;
      hudState.bossWidth = null;
    }
  }

  function fireInterval() {
    return Math.max(0.07, (state.boost > 0 ? 0.1 : 0.16) - meta.fireLevel * 0.01);
  }

  function magnetRadius() {
    return 180 + meta.magnetLevel * 20;
  }

  function magnetPullSpeed() {
    return 160 + meta.magnetLevel * 18;
  }

  function setOverlay(title, text, summary) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    overlaySummary.textContent = summary;
  }

  function modeConfig() {
    return settings[settings.mode] || settings.normal;
  }

  function refreshModeButtons() {
    modeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.mode === settings.mode);
    });
  }

  function applyMode(mode) {
    if (!settings[mode]) return;
    settings.mode = mode;
    localStorage.setItem('starRingMode', mode);
    refreshModeButtons();
    if (!state.running) {
      setOverlay(
        'MISSION BRIEF',
        'Start the ship, collect cores, dodge hazards, and use powerups to survive longer.',
        `Best score: ${state.best} | Stage: 1 | Cores collected: 0 | Mode: ${mode.toUpperCase()}`
      );
    }
  }

  function ensureAudio() {
    if (audio.ctx) return;
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return;
    audio.ctx = new AudioContextCtor();
    audio.master = audio.ctx.createGain();
    audio.musicGain = audio.ctx.createGain();
    audio.sfxGain = audio.ctx.createGain();
    audio.duckGain = audio.ctx.createGain();
    audio.master.gain.value = 0.85;
    audio.musicGain.gain.value = 0.18;
    audio.sfxGain.gain.value = 0.55;
    audio.musicGain.connect(audio.duckGain);
    audio.duckGain.gain.value = 1;
    audio.duckGain.connect(audio.master);
    audio.sfxGain.connect(audio.master);
    audio.master.connect(audio.ctx.destination);
    audio.enabled = true;

    const ambient = audio.ctx.createOscillator();
    const ambientGain = audio.ctx.createGain();
    const ambientFilter = audio.ctx.createBiquadFilter();
    ambient.type = 'sine';
    ambient.frequency.value = 82;
    ambientFilter.type = 'lowpass';
    ambientFilter.frequency.value = 320;
    ambientGain.gain.value = 0.035;
    ambient.connect(ambientFilter);
    ambientFilter.connect(ambientGain);
    ambientGain.connect(audio.musicGain);
    ambient.start();

    const lfo = audio.ctx.createOscillator();
    const lfoGain = audio.ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.11;
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(ambientGain.gain);
    lfo.start();
  }

  function resumeAudio() {
    ensureAudio();
    if (audio.ctx && audio.ctx.state === 'suspended') {
      audio.ctx.resume().catch(() => {});
    }
  }

  function playTone(freq, duration, type, gain, targetFreq = null, dest = audio.sfxGain) {
    if (!audio.ctx || !dest) return;
    const now = audio.ctx.currentTime;
    const osc = audio.ctx.createOscillator();
    const g = audio.ctx.createGain();
    const filter = audio.ctx.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (targetFreq) {
      osc.frequency.exponentialRampToValueAtTime(targetFreq, now + duration);
    }
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(filter);
    filter.connect(g);
    g.connect(dest);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  function playEffect(name) {
    if (!audio.enabled || !audio.ctx) return;
    audio.duckTimer = Math.max(audio.duckTimer, 0.08);
    if (name === 'pickup') {
      playTone(780, 0.14, 'triangle', 0.08, 980);
      playTone(1560, 0.08, 'sine', 0.03, 1320);
    } else if (name === 'hit') {
      playTone(180, 0.24, 'sawtooth', 0.1, 72);
      playTone(96, 0.18, 'square', 0.05, 52);
    } else if (name === 'power') {
      playTone(420, 0.16, 'triangle', 0.07, 840);
      playTone(660, 0.18, 'sine', 0.03, 990);
    } else if (name === 'level') {
      playTone(330, 0.16, 'triangle', 0.07, 660);
      playTone(495, 0.22, 'triangle', 0.06, 990);
    } else if (name === 'start') {
      playTone(260, 0.18, 'triangle', 0.08, 520);
      playTone(390, 0.2, 'sine', 0.05, 780);
    } else if (name === 'gameover') {
      playTone(220, 0.28, 'sawtooth', 0.08, 88);
      playTone(130, 0.34, 'square', 0.05, 66);
    }
  }

  function musicStep() {
    if (!audio.enabled || !audio.ctx) return;
    const scale = [0, 3, 5, 7, 10, 12];
    const base = 174.61 * Math.pow(1.04, state.stage - 1);
    const step = audio.step++ % 8;
    const note = scale[step % scale.length] + (step >= 4 ? 12 : 0);
    const beat = base * Math.pow(2, note / 12);
    const bass = base * Math.pow(2, [0, -5, 0, -7][step % 4] / 12);
    playTone(beat, 0.16, 'triangle', 0.028, beat * 1.08, audio.musicGain);
    if (step % 2 === 0) {
      playTone(bass, 0.22, 'sine', 0.02, bass * 0.98, audio.musicGain);
    }
  }

  function resize() {
    world.dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    world.w = Math.round(window.visualViewport?.width || window.innerWidth);
    world.h = Math.round(window.visualViewport?.height || window.innerHeight);
    canvas.width = Math.floor(world.w * world.dpr);
    canvas.height = Math.floor(world.h * world.dpr);
    canvas.style.width = world.w + 'px';
    canvas.style.height = world.h + 'px';
    ctx.setTransform(world.dpr, 0, 0, world.dpr, 0, 0);

    if (!state.running && !state.over) {
      ship.x = world.w * 0.5;
      ship.y = world.h * 0.66;
      ship.vx = 0;
      ship.vy = 0;
      ship.aimDx = 0;
      ship.aimDy = -1;
      input.targetX = ship.x;
      input.targetY = ship.y;
    } else {
      ship.x = clamp(ship.x, 24, world.w - 24);
      ship.y = clamp(ship.y, 24, world.h - 24);
    }

    if (world.stars.length === 0) {
      for (let i = 0; i < 140; i++) {
        world.stars.push({
          x: Math.random() * world.w,
          y: Math.random() * world.h,
          z: rand(0.25, 1),
          twinkle: Math.random() * Math.PI * 2,
        });
      }
    }
  }

  function resetGame() {
    refreshModeButtons();
    state.running = false;
    state.paused = false;
    state.over = false;
    state.scoreValue = 0;
    state.score = 0;
    state.lives = modeConfig().lives;
    state.combo = 1;
    state.comboTimer = 0;
    state.stage = 1;
    state.stageTransition = 0;
    state.shield = 0;
    state.magnet = 0;
    state.slow = 0;
    state.boost = 0;
    state.shieldHits = 0;
    state.spawnTimer = 0;
    state.powerTimer = 0;
    state.musicTimer = 0;
    state.shake = 0;
    state.flash = 0;
    state.time = 0;
    state.coresCollected = 0;
    state.shotsFired = 0;
    state.bossSpawnCooldown = 0;
    state.fireTimer = 0;
    state.fireHeld = false;
    state.pulseCooldown = 0;
    state.dangerBlink = 0;
    state.hitStop = 0;
    state.hitVignette = 0;
    telemetry.shotsHit = 0;
    telemetry.deathCause = 'none';
    telemetry.runStartedAt = performance.now();
    ship.vx = 0;
    ship.vy = 0;
    ship.aimDx = 0;
    ship.aimDy = -1;
    while (world.particles.length) world.particlePool.push(world.particles.pop());
    while (world.bullets.length) world.bulletPool.push(world.bullets.pop());
    while (world.meteors.length) world.meteorPool.push(world.meteors.pop());
    while (world.cores.length) world.corePool.push(world.cores.pop());
    while (world.powerups.length) world.powerupPool.push(world.powerups.pop());
    while (world.rings.length) world.ringPool.push(world.rings.pop());
    world.boss = null;
    overlay.classList.remove('hidden');
    setOverlay(
      'MISSION BRIEF',
      'Start the ship, collect cores, dodge hazards, and use powerups to survive longer.',
      `Best score: ${state.best} | Stage: 1 | Cores collected: 0 | Mode: ${settings.mode.toUpperCase()}`
    );
    startBtn.textContent = 'Start Game';
    pauseBtn.textContent = 'Pause';
    pauseBtn.disabled = true;
    bossPanel.classList.remove('visible');
    bossValue.textContent = '0 / 0';
    bossFill.style.width = '0%';
    updateHud();
    applyMetaUpgrades();
  }

  function acquire(pool) {
    return pool.length > 0 ? pool.pop() : {};
  }

  function startGame() {
    if (state.over) {
      resetGame();
    }
    resumeAudio();
    state.running = true;
    state.paused = false;
    state.over = false;
    pauseBtn.disabled = false;
    pauseBtn.textContent = 'Pause';
    overlay.classList.add('hidden');
    playEffect('start');
  }

  function triggerPulse() {
    if (!state.running || state.paused || state.over || state.pulseCooldown > 0) return;
    state.pulseCooldown = 8;
    let cleared = 0;
    for (let i = world.meteors.length - 1; i >= 0; i--) {
      const meteor = world.meteors[i];
      if (dist(ship.x, ship.y, meteor.x, meteor.y) < 210) {
        const deadMeteor = world.meteors.splice(i, 1)[0];
        world.meteorPool.push(deadMeteor);
        cleared += 1;
      }
    }
    if (cleared > 0) {
      state.scoreValue += cleared * 3;
      state.score = Math.floor(state.scoreValue);
    }
    state.flash = 0.2;
    state.shake = Math.max(state.shake, 8);
    burst(ship.x, ship.y, 'rgba(121,215,255,1)', 22, 6.2);
    addRing(ship.x, ship.y, 'rgba(121,215,255,1)');
    playEffect('power');
  }

  function gameOver() {
    state.running = false;
    state.paused = false;
    state.over = true;
    state.fireHeld = false;
    state.best = Math.max(state.best, state.score);
    localStorage.setItem('starRingBest', String(state.best));
    const runSeconds = Math.max(1, Math.floor((performance.now() - telemetry.runStartedAt) / 1000));
    const runBank = Math.floor(state.coresCollected * 0.8 + state.stage * 1.5 + runSeconds / 20);
    meta.coresBank += runBank;
    while (meta.coresBank >= 8 && meta.lifeLevel < 3) {
      meta.coresBank -= 8;
      meta.lifeLevel += 1;
    }
    while (meta.coresBank >= 10 && meta.fireLevel < 5) {
      meta.coresBank -= 10;
      meta.fireLevel += 1;
    }
    while (meta.coresBank >= 12 && meta.magnetLevel < 5) {
      meta.coresBank -= 12;
      meta.magnetLevel += 1;
    }
    saveMeta();
    world.boss = null;
    overlay.classList.remove('hidden');
    const acc =
      state.shotsFired > 0 ? Math.round((telemetry.shotsHit / state.shotsFired) * 100) : 0;
    setOverlay(
      'MISSION FAILED',
      'The ship was overwhelmed. Restart to try a different route through the field and beat the stage record.',
      `Score: ${state.score} | Stage: ${state.stage} | Cores: +${runBank} (Bank ${meta.coresBank}) | ACC: ${acc}% | Cause: ${telemetry.deathCause}`
    );
    startBtn.textContent = 'Restart';
    pauseBtn.disabled = true;
    playEffect('gameover');
    updateHud();
  }

  function addRing(x, y, color) {
    const ring = acquire(world.ringPool);
    ring.x = x;
    ring.y = y;
    ring.radius = 6;
    ring.alpha = 1;
    ring.color = color;
    world.rings.push(ring);
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = rand(speed * 0.35, speed);
      const p = acquire(world.particlePool);
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * velocity;
      p.vy = Math.sin(angle) * velocity;
      p.life = rand(0.35, 0.95);
      p.size = rand(1.2, 3.6);
      p.color = color;
      world.particles.push(p);
    }
  }

  function spawnMeteor() {
    const side = Math.floor(Math.random() * 4);
    const margin = 50;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = rand(0, world.w);
      y = -margin;
    } else if (side === 1) {
      x = world.w + margin;
      y = rand(0, world.h);
    } else if (side === 2) {
      x = rand(0, world.w);
      y = world.h + margin;
    } else {
      x = -margin;
      y = rand(0, world.h);
    }

    const aimX = ship.x + rand(-100, 100);
    const aimY = ship.y + rand(-80, 80);
    const dx = aimX - x;
    const dy = aimY - y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = rand(1.8, 3.2) + state.stage * 0.16 + state.time * 0.01;
    const roll = Math.random();
    const archetype = roll < 0.16 ? 'charger' : roll < 0.34 ? 'orbiter' : 'meteor';
    const meteor = acquire(world.meteorPool);
    meteor.type = archetype;
    meteor.x = x;
    meteor.y = y;
    meteor.vx = (dx / len) * speed;
    meteor.vy = (dy / len) * speed;
    meteor.radius = rand(16, 30);
    meteor.angle = Math.random() * Math.PI * 2;
    meteor.spin = rand(-0.16, 0.16);
    meteor.hue = Math.random() < 0.5 ? 16 : 206;
    meteor.dashTimer = rand(0.8, 1.5);
    meteor.orbitDir = Math.random() < 0.5 ? -1 : 1;
    meteor.health = 1;
    world.meteors.push(meteor);
  }

  function spawnCore() {
    const core = acquire(world.corePool);
    core.x = rand(80, world.w - 80);
    core.y = rand(80, world.h - 80);
    core.radius = 12;
    core.pulse = Math.random() * Math.PI * 2;
    core.life = rand(5.0, 7.4);
    core.tint = Math.random() < 0.5 ? 0 : 1;
    world.cores.push(core);
  }

  function spawnPowerup() {
    const types = ['shield', 'magnet', 'slow', 'boost'];
    const type = types[Math.floor(Math.random() * types.length)];
    const powerup = acquire(world.powerupPool);
    powerup.type = type;
    powerup.x = rand(90, world.w - 90);
    powerup.y = rand(90, world.h - 90);
    powerup.radius = 15;
    powerup.life = rand(6.0, 9.0);
    powerup.pulse = Math.random() * Math.PI * 2;
    powerup.spin = rand(-0.08, 0.08);
    powerup.angle = Math.random() * Math.PI * 2;
    world.powerups.push(powerup);
  }

  function spawnDrone(x, y, angle = Math.random() * Math.PI * 2) {
    const speed = rand(2.2, 3.4) + state.stage * 0.08;
    const meteor = acquire(world.meteorPool);
    meteor.type = 'drone';
    meteor.x = x;
    meteor.y = y;
    meteor.vx = Math.cos(angle) * speed;
    meteor.vy = Math.sin(angle) * speed;
    meteor.radius = rand(12, 18);
    meteor.angle = angle;
    meteor.spin = rand(-0.08, 0.08);
    meteor.health = 2;
    meteor.hue = Math.random() < 0.5 ? 172 : 210;
    meteor.dashTimer = 0;
    meteor.orbitDir = 1;
    world.meteors.push(meteor);
  }

  function spawnBoss() {
    const edge = Math.floor(Math.random() * 4);
    const margin = 180;
    const boss = {
      type: 'boss',
      name: `Sentinel ${state.stage}`,
      x:
        edge === 0
          ? world.w * 0.5
          : edge === 1
            ? world.w + margin
            : edge === 2
              ? world.w * 0.5
              : -margin,
      y:
        edge === 0
          ? -margin
          : edge === 1
            ? world.h * 0.45
            : edge === 2
              ? world.h + margin
              : world.h * 0.45,
      vx: 0,
      vy: 0,
      radius: 56,
      angle: 0,
      spin: 0.015,
      health: 30 + state.stage * 8,
      maxHealth: 30 + state.stage * 8,
      phase: 0,
      shotTimer: 1.2,
      shotCount: 0,
    };
    world.boss = boss;
    bossPanel.classList.add('visible');
    bossName.textContent = boss.name;
    bossValue.textContent = `${boss.health} / ${boss.maxHealth}`;
    bossFill.style.width = '100%';
    state.bossSpawnCooldown = 16;
    state.flash = Math.max(state.flash, 0.18);
    burst(boss.x, boss.y, 'rgba(255,214,106,1)', 30, 6.2);
    playEffect('level');
  }

  function shootBullet() {
    const dx = ship.aimDx;
    const dy = ship.aimDy;
    const len = Math.hypot(dx, dy) || 1;
    const baseAngle = Math.atan2(dy / len, dx / len);
    const spread = state.boost > 0 ? 0.04 : 0.07;
    const angle = baseAngle + rand(-spread, spread);
    const speed = 9.5 + (state.boost > 0 ? 2.5 : 0);
    const bullet = acquire(world.bulletPool);
    bullet.x = ship.x + Math.cos(angle) * 22;
    bullet.y = ship.y + Math.sin(angle) * 22;
    bullet.vx = Math.cos(angle) * speed;
    bullet.vy = Math.sin(angle) * speed;
    bullet.radius = 3.5;
    bullet.life = 1.2;
    bullet.damage = 1;
    world.bullets.push(bullet);
    state.shotsFired += 1;
    burst(ship.x, ship.y, 'rgba(121,215,255,1)', 3, 2.6);
    playTone(920, 0.06, 'square', 0.03, 1240);
  }

  function destroyBoss() {
    if (!world.boss) return;
    const boss = world.boss;
    burst(boss.x, boss.y, 'rgba(255,214,106,1)', 48, 7.4);
    burst(boss.x, boss.y, 'rgba(121,215,255,1)', 24, 6.0);
    addRing(boss.x, boss.y, 'rgba(255,214,106,1)');
    addRing(boss.x, boss.y, 'rgba(121,215,255,1)');
    world.boss = null;
    state.bossSpawnCooldown = 14;
    state.scoreValue += 90 + state.stage * 25;
    state.score = Math.floor(state.scoreValue);
    state.best = Math.max(state.best, state.score);
    for (let i = 0; i < 4; i++) {
      spawnCore();
    }
    for (let i = 0; i < 2; i++) {
      spawnPowerup();
    }
    playEffect('level');
  }

  function updateBoss(dt) {
    const boss = world.boss;
    if (!boss) return;

    boss.phase += dt;
    boss.angle += boss.spin * 60 * dt;
    boss.shotTimer -= dt;
    boss.x += (ship.x - boss.x) * 0.018 * (1 + state.stage * 0.05) * 60 * dt;
    boss.y += (ship.y - boss.y) * 0.018 * (1 + state.stage * 0.05) * 60 * dt;
    boss.x = clamp(boss.x, 70, world.w - 70);
    boss.y = clamp(boss.y, 70, world.h - 70);

    if (boss.shotTimer <= 0) {
      boss.shotTimer = Math.max(0.72, 1.8 - state.stage * 0.08);
      boss.shotCount += 1;
      const phase = boss.shotCount % 3;
      if (phase === 0) {
        const burstCount = 4 + Math.min(4, Math.floor(state.stage / 3));
        for (let i = 0; i < burstCount; i++) {
          const angle = (Math.PI * 2 * i) / burstCount + boss.phase * 0.8;
          spawnDrone(
            boss.x + Math.cos(angle) * (boss.radius + 16),
            boss.y + Math.sin(angle) * (boss.radius + 16),
            angle + Math.PI * 0.5
          );
        }
      } else if (phase === 1) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.atan2(ship.y - boss.y, ship.x - boss.x) + rand(-0.35, 0.35);
          spawnDrone(boss.x + Math.cos(angle) * 32, boss.y + Math.sin(angle) * 32, angle);
        }
      } else {
        const dash = Math.atan2(ship.y - boss.y, ship.x - boss.x);
        boss.vx = Math.cos(dash) * 8;
        boss.vy = Math.sin(dash) * 8;
        state.shake = Math.max(state.shake, 8);
      }
      burst(boss.x, boss.y, 'rgba(255,140,155,1)', 16, 4.6);
      playEffect('level');
    }
    boss.vx *= Math.pow(0.12, dt);
    boss.vy *= Math.pow(0.12, dt);
    boss.x += boss.vx;
    boss.y += boss.vy;
  }

  function applyPowerup(type) {
    if (type === 'shield') {
      state.shieldHits = 1;
      state.shield = 12;
    } else if (type === 'magnet') {
      state.magnet = 10;
    } else if (type === 'slow') {
      state.slow = 7;
    } else if (type === 'boost') {
      state.boost = 8;
    }
    state.flash = Math.max(state.flash, 0.18);
    burst(ship.x, ship.y, powerupDefs[type].glow, 18, 5.2);
    addRing(ship.x, ship.y, powerupDefs[type].glow);
    playEffect('power');
  }

  function setPaused(paused) {
    if (!state.running) return;
    state.paused = paused;
    if (paused) {
      overlay.classList.remove('hidden');
      setOverlay(
        'PAUSED',
        'The game is paused. Press continue or hit P again to resume.',
        `Score: ${state.score} | Stage: ${state.stage} | Cores collected: ${state.coresCollected} | Mode: ${settings.mode.toUpperCase()}`
      );
      startBtn.textContent = 'Continue';
      pauseBtn.textContent = 'Continue';
    } else {
      overlay.classList.add('hidden');
      startBtn.textContent = 'Start Game';
      pauseBtn.textContent = 'Pause';
    }
  }

  function handleKeyboardMovement(dt) {
    let ax = 0;
    let ay = 0;
    if (input.keys.has('ArrowLeft') || input.keys.has('a') || input.keys.has('A')) ax -= 1;
    if (input.keys.has('ArrowRight') || input.keys.has('d') || input.keys.has('D')) ax += 1;
    if (input.keys.has('ArrowUp') || input.keys.has('w') || input.keys.has('W')) ay -= 1;
    if (input.keys.has('ArrowDown') || input.keys.has('s') || input.keys.has('S')) ay += 1;
    ax += input.moveAxisX;
    ay += input.moveAxisY;
    const aimActive = Math.hypot(input.aimAxisX, input.aimAxisY) > 0.2;
    if (aimActive) {
      const aimLen = Math.hypot(input.aimAxisX, input.aimAxisY) || 1;
      ship.aimDx = input.aimAxisX / aimLen;
      ship.aimDy = input.aimAxisY / aimLen;
    }

    if (ax !== 0 || ay !== 0) {
      const len = Math.hypot(ax, ay) || 1;
      const maxSpeed = 620 * (state.boost > 0 ? 1.08 : 1);
      const accel = 14;
      const targetVx = (ax / len) * maxSpeed;
      const targetVy = (ay / len) * maxSpeed;
      if (!aimActive) {
        ship.aimDx = ax / len;
        ship.aimDy = ay / len;
      }
      ship.vx += (targetVx - ship.vx) * clamp(accel * dt, 0, 1);
      ship.vy += (targetVy - ship.vy) * clamp(accel * dt, 0, 1);
      ship.x += ship.vx * dt;
      ship.y += ship.vy * dt;
      ship.x = clamp(ship.x, 20, world.w - 20);
      ship.y = clamp(ship.y, 20, world.h - 20);
      input.targetX = ship.x;
      input.targetY = ship.y;
      return true;
    }
    ship.vx *= Math.pow(0.001, dt);
    ship.vy *= Math.pow(0.001, dt);
    input.targetX = clamp(input.targetX, 24, world.w - 24);
    input.targetY = clamp(input.targetY, 24, world.h - 24);
    return false;
  }

  function updateBuffTimers(dt) {
    state.shield = Math.max(0, state.shield - dt);
    state.magnet = Math.max(0, state.magnet - dt);
    state.slow = Math.max(0, state.slow - dt);
    state.boost = Math.max(0, state.boost - dt);
    state.bossSpawnCooldown = Math.max(0, state.bossSpawnCooldown - dt);
    if (state.shield <= 0) {
      state.shieldHits = 0;
    }
  }

  function updateStage() {
    const targetStage = 1 + Math.floor(state.scoreValue / modeConfig().stageStep);
    while (targetStage > state.stage) {
      state.stage += 1;
      state.stageTransition = 1.2;
      playEffect('level');
      burst(ship.x, ship.y, 'rgba(121,215,255,1)', 12, 4.8);
      if (
        state.stage % modeConfig().bossStep === 0 &&
        !world.boss &&
        state.bossSpawnCooldown <= 0
      ) {
        spawnBoss();
      }
    }
  }

  function updateMusic(dt) {
    if (!audio.enabled || !state.running || state.paused) return;
    audio.duckTimer = Math.max(0, audio.duckTimer - dt);
    if (audio.duckGain) {
      const target = audio.duckTimer > 0 ? 0.72 : 1;
      audio.duckGain.gain.value += (target - audio.duckGain.gain.value) * Math.min(1, dt * 14);
    }
    state.musicTimer += dt;
    const beatInterval = Math.max(0.22, 0.48 - state.stage * 0.02);
    while (state.musicTimer >= beatInterval) {
      state.musicTimer -= beatInterval;
      musicStep();
    }
  }

  function update(dt) {
    if (!state.running || state.paused) return;

    state.time += dt;
    state.scoreValue +=
      dt * ((2 + state.combo * 0.2 + (state.boost > 0 ? 1.0 : 0)) * modeConfig().scoreScale);
    state.score = Math.min(999999, Math.floor(state.scoreValue));
    state.best = Math.max(state.best, state.score);
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) {
      state.combo = 1;
    }

    updateStage();
    updateBuffTimers(dt);
    state.fireTimer = Math.max(0, state.fireTimer - dt);
    if (state.fireHeld && state.fireTimer <= 0) {
      shootBullet();
      state.fireTimer = fireInterval();
    }
    if (world.boss) {
      updateBoss(dt);
    }

    const difficulty =
      (1 + (state.stage - 1) * 0.45 + state.time * 0.012) * modeConfig().spawnScale;
    const keyboardActive = handleKeyboardMovement(dt);
    if (!keyboardActive) {
      const follow = 1 - Math.pow(0.0002, dt);
      ship.x += (input.targetX - ship.x) * (0.08 + follow * 0.92);
      ship.y += (input.targetY - ship.y) * (0.08 + follow * 0.92);
      ship.x = clamp(ship.x, 20, world.w - 20);
      ship.y = clamp(ship.y, 20, world.h - 20);
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnMeteor();
      if (Math.random() < 0.32) spawnMeteor();
      if (world.cores.length < 4 && Math.random() < 0.8) spawnCore();
      if (world.powerups.length < 2 && Math.random() < 0.35 && !world.boss) spawnPowerup();
      state.spawnTimer = Math.max(0.28, 1.0 - difficulty * 0.055);
    }

    if (world.cores.length < 2 && Math.random() < 0.025) spawnCore();
    if (
      world.powerups.length < 1 &&
      state.powerTimer <= 0 &&
      Math.random() < 0.015 &&
      !world.boss
    ) {
      spawnPowerup();
      state.powerTimer = rand(5, 8);
    }
    state.powerTimer = Math.max(0, state.powerTimer - dt);

    for (const meteor of world.meteors) {
      const slowFactor = state.slow > 0 ? 0.45 : 1;
      if (meteor.type === 'drone') {
        const dx = ship.x - meteor.x;
        const dy = ship.y - meteor.y;
        const len = Math.hypot(dx, dy) || 1;
        meteor.vx += (dx / len) * 0.025 * 60 * dt;
        meteor.vy += (dy / len) * 0.025 * 60 * dt;
        const speed = Math.hypot(meteor.vx, meteor.vy) || 1;
        const maxSpeed = 4.2 + state.stage * 0.05;
        if (speed > maxSpeed) {
          meteor.vx = (meteor.vx / speed) * maxSpeed;
          meteor.vy = (meteor.vy / speed) * maxSpeed;
        }
      } else if (meteor.type === 'orbiter') {
        const dx = ship.x - meteor.x;
        const dy = ship.y - meteor.y;
        const len = Math.hypot(dx, dy) || 1;
        const tx = (-dy / len) * meteor.orbitDir;
        const ty = (dx / len) * meteor.orbitDir;
        meteor.vx += tx * 0.05 * 60 * dt;
        meteor.vy += ty * 0.05 * 60 * dt;
      } else if (meteor.type === 'charger') {
        meteor.dashTimer -= dt;
        if (meteor.dashTimer <= 0) {
          meteor.dashTimer = rand(1, 1.8);
          const dash = Math.atan2(ship.y - meteor.y, ship.x - meteor.x);
          meteor.vx += Math.cos(dash) * 1.8;
          meteor.vy += Math.sin(dash) * 1.8;
        }
      }
      meteor.x += meteor.vx * 60 * dt * slowFactor;
      meteor.y += meteor.vy * 60 * dt * slowFactor;
      meteor.angle += meteor.spin * 60 * dt;
    }

    for (let i = world.bullets.length - 1; i >= 0; i--) {
      const bullet = world.bullets[i];
      bullet.x += bullet.vx * 60 * dt;
      bullet.y += bullet.vy * 60 * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) {
        world.bullets.splice(i, 1);
        world.bulletPool.push(bullet);
        continue;
      }

      let consumed = false;
      if (
        world.boss &&
        dist(bullet.x, bullet.y, world.boss.x, world.boss.y) < world.boss.radius + bullet.radius
      ) {
        telemetry.shotsHit += 1;
        world.boss.health -= bullet.damage;
        world.boss.phase += 0.12;
        world.bullets.splice(i, 1);
        world.bulletPool.push(bullet);
        burst(bullet.x, bullet.y, 'rgba(255,214,106,1)', 6, 3.8);
        playTone(1260, 0.05, 'triangle', 0.03, 880);
        if (world.boss.health <= 0) {
          destroyBoss();
        }
        consumed = true;
      }

      if (consumed) continue;

      for (let j = world.meteors.length - 1; j >= 0; j--) {
        const meteor = world.meteors[j];
        const hitRadius = meteor.radius + bullet.radius;
        if (dist(bullet.x, bullet.y, meteor.x, meteor.y) < hitRadius) {
          telemetry.shotsHit += 1;
          world.bullets.splice(i, 1);
          world.bulletPool.push(bullet);
          burst(
            meteor.x,
            meteor.y,
            meteor.type === 'drone' ? 'rgba(121,215,255,1)' : 'rgba(255,140,155,1)',
            10,
            4.2
          );
          if (meteor.type === 'drone') {
            meteor.health -= bullet.damage;
            if (meteor.health <= 0) {
              const deadMeteor = world.meteors.splice(j, 1)[0];
              world.meteorPool.push(deadMeteor);
              state.scoreValue += 6;
              state.score = Math.floor(state.scoreValue);
            }
          } else {
            const deadMeteor = world.meteors.splice(j, 1)[0];
            world.meteorPool.push(deadMeteor);
            state.scoreValue += 4;
            state.score = Math.floor(state.scoreValue);
          }
          playTone(760, 0.04, 'square', 0.02, 520);
          break;
        }
      }
    }

    for (const core of world.cores) {
      core.life -= dt;
      core.pulse += dt * 3;
      if (
        (state.magnet > 0 || meta.magnetLevel > 0) &&
        dist(ship.x, ship.y, core.x, core.y) < magnetRadius()
      ) {
        const dx = ship.x - core.x;
        const dy = ship.y - core.y;
        const len = Math.hypot(dx, dy) || 1;
        core.x += (dx / len) * magnetPullSpeed() * dt;
        core.y += (dy / len) * magnetPullSpeed() * dt;
      }
    }

    for (const powerup of world.powerups) {
      powerup.life -= dt;
      powerup.pulse += dt * 3.2;
      powerup.angle += powerup.spin * 60 * dt;
    }

    for (let i = world.meteors.length - 1; i >= 0; i--) {
      const meteor = world.meteors[i];
      if (
        meteor.x <= -180 ||
        meteor.x >= world.w + 180 ||
        meteor.y <= -180 ||
        meteor.y >= world.h + 180
      ) {
        world.meteors.splice(i, 1);
        world.meteorPool.push(meteor);
      }
    }
    for (let i = world.cores.length - 1; i >= 0; i--) {
      const core = world.cores[i];
      if (core.life <= 0) {
        world.cores.splice(i, 1);
        world.corePool.push(core);
      }
    }
    for (let i = world.powerups.length - 1; i >= 0; i--) {
      const powerup = world.powerups[i];
      if (powerup.life <= 0) {
        world.powerups.splice(i, 1);
        world.powerupPool.push(powerup);
      }
    }

    for (let i = world.particles.length - 1; i >= 0; i--) {
      const p = world.particles[i];
      p.x += p.vx * 60 * dt;
      p.y += p.vy * 60 * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.life -= dt;
      if (p.life <= 0) {
        world.particles.splice(i, 1);
        world.particlePool.push(p);
      }
    }

    for (let i = world.rings.length - 1; i >= 0; i--) {
      const r = world.rings[i];
      r.radius += 220 * dt;
      r.alpha -= dt * 1.6;
      if (r.alpha <= 0) {
        world.rings.splice(i, 1);
        world.ringPool.push(r);
      }
    }

    for (let i = world.cores.length - 1; i >= 0; i--) {
      const core = world.cores[i];
      if (dist(ship.x, ship.y, core.x, core.y) < ship.radius + core.radius) {
        const coreHit = world.cores.splice(i, 1)[0];
        world.corePool.push(coreHit);
        const gain = 10 * state.combo * (state.boost > 0 ? 2 : 1);
        state.scoreValue += gain;
        state.score = Math.floor(state.scoreValue);
        state.coresCollected += 1;
        state.combo = Math.min(8, state.combo + 1);
        state.comboTimer = 3.2;
        state.flash = 0.2;
        state.shake = Math.min(8, state.shake + 2.5);
        burst(core.x, core.y, corePalette[core.tint].glow, 18, 5.5);
        addRing(core.x, core.y, corePalette[core.tint].glow);
        playEffect('pickup');
      }
    }

    for (let i = world.powerups.length - 1; i >= 0; i--) {
      const powerup = world.powerups[i];
      if (dist(ship.x, ship.y, powerup.x, powerup.y) < ship.radius + powerup.radius) {
        const powerupHit = world.powerups.splice(i, 1)[0];
        world.powerupPool.push(powerupHit);
        applyPowerup(powerup.type);
      }
    }

    if (
      world.boss &&
      dist(ship.x, ship.y, world.boss.x, world.boss.y) < ship.radius + world.boss.radius
    ) {
      if (state.shieldHits > 0) {
        state.shieldHits = 0;
        state.shield = 0;
        state.flash = 0.28;
        state.shake = 15;
        burst(ship.x, ship.y, 'rgba(255,214,106,1)', 18, 6.0);
        addRing(ship.x, ship.y, 'rgba(255,214,106,1)');
        playEffect('power');
      } else {
        state.lives -= 2;
        telemetry.deathCause = 'boss impact';
        state.combo = 1;
        state.comboTimer = 0;
        state.flash = 0.35;
        state.shake = 18;
        state.hitStop = 0.06;
        state.hitVignette = 0.55;
        burst(ship.x, ship.y, 'rgba(255,140,155,1)', 30, 7.4);
        addRing(ship.x, ship.y, 'rgba(255,140,155,1)');
        playEffect('hit');
        if (state.lives <= 0) {
          gameOver();
          return;
        }
      }
    }

    for (let i = world.meteors.length - 1; i >= 0; i--) {
      const meteor = world.meteors[i];
      if (dist(ship.x, ship.y, meteor.x, meteor.y) < meteor.radius + ship.radius * 0.9) {
        const meteorHit = world.meteors.splice(i, 1)[0];
        world.meteorPool.push(meteorHit);
        if (state.shieldHits > 0) {
          state.shieldHits = 0;
          state.shield = 0;
          state.flash = 0.25;
          state.shake = 12;
          burst(ship.x, ship.y, 'rgba(140,255,193,1)', 20, 5.8);
          addRing(ship.x, ship.y, 'rgba(140,255,193,1)');
          playEffect('power');
        } else {
          state.lives -= 1;
          telemetry.deathCause = meteor.type === 'drone' ? 'drone impact' : 'meteor impact';
          state.combo = 1;
          state.comboTimer = 0;
          state.flash = 0.3;
          state.shake = 14;
          state.hitStop = 0.04;
          state.hitVignette = 0.45;
          burst(ship.x, ship.y, 'rgba(255,140,155,1)', 24, 7);
          addRing(ship.x, ship.y, 'rgba(255,140,155,1)');
          playEffect('hit');
          if (state.lives <= 0) {
            gameOver();
            return;
          }
        }
      }
    }

    state.shake = Math.max(0, state.shake - dt * 20);
    state.flash = Math.max(0, state.flash - dt * 1.8);
    state.hitVignette = Math.max(0, state.hitVignette - dt * 1.35);
    state.stageTransition = Math.max(0, state.stageTransition - dt);
    state.pulseCooldown = Math.max(0, state.pulseCooldown - dt);
    state.dangerBlink = Math.max(0, state.dangerBlink - dt);
    for (const meteor of world.meteors) {
      if (dist(ship.x, ship.y, meteor.x, meteor.y) < 130) {
        state.dangerBlink = 0.25;
        break;
      }
    }
    state.best = Math.max(state.best, state.score);
    updateHud();
    updateMusic(dt);
  }

  function drawBackground(time) {
    const stageHue = (200 - state.stage * 9 + 360) % 360;
    const top = `hsla(${stageHue}, 60%, 12%, 1)`;
    const bottom = '#050816';
    const grad = ctx.createLinearGradient(0, 0, 0, world.h);
    grad.addColorStop(0, top);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, world.w, world.h);

    const vignette = ctx.createRadialGradient(
      world.w * 0.5,
      world.h * 0.42,
      Math.min(world.w, world.h) * 0.12,
      world.w * 0.5,
      world.h * 0.5,
      Math.max(world.w, world.h) * 0.72
    );
    vignette.addColorStop(0, `hsla(${stageHue + 10}, 65%, 35%, 0.18)`);
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.52)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, world.w, world.h);

    for (const star of world.stars) {
      star.twinkle += 0.02 + star.z * 0.02;
      const x = (star.x + time * (6 + star.z * 18)) % world.w;
      const y = star.y + Math.sin(star.twinkle) * 0.9;
      const alpha = 0.18 + star.z * 0.6 + Math.sin(star.twinkle * 1.5) * 0.1;
      const size = 0.8 + star.z * 1.8;
      ctx.fillStyle = `rgba(230, 245, 255, ${clamp(alpha, 0.08, 0.95)})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const nebulaA = ctx.createRadialGradient(
      world.w * 0.18 + Math.sin(time * 0.1) * 50,
      world.h * 0.3,
      10,
      world.w * 0.18,
      world.h * 0.3,
      world.w * 0.48
    );
    nebulaA.addColorStop(0, 'rgba(88,160,255,0.15)');
    nebulaA.addColorStop(1, 'rgba(88,160,255,0)');
    ctx.fillStyle = nebulaA;
    ctx.fillRect(0, 0, world.w, world.h);

    const nebulaB = ctx.createRadialGradient(
      world.w * 0.82 + Math.cos(time * 0.08) * 45,
      world.h * 0.65,
      12,
      world.w * 0.82,
      world.h * 0.65,
      world.w * 0.44
    );
    nebulaB.addColorStop(0, 'rgba(90,255,198,0.12)');
    nebulaB.addColorStop(1, 'rgba(90,255,198,0)');
    ctx.fillStyle = nebulaB;
    ctx.fillRect(0, 0, world.w, world.h);

    ctx.strokeStyle = 'rgba(127, 217, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < world.w; x += 80) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, world.h);
    }
    for (let y = 0; y < world.h; y += 80) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(world.w, y + 0.5);
    }
    ctx.stroke();
  }

  function draw() {
    const time = performance.now() * 0.001;
    ctx.save();
    if (state.shake > 0) {
      ctx.translate(rand(-state.shake, state.shake), rand(-state.shake, state.shake));
    }

    drawBackground(time);

    for (const ring of world.rings) {
      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 6;
      ctx.shadowColor = ring.color;
      ctx.shadowBlur = 24;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const powerup of world.powerups) {
      const def = powerupDefs[powerup.type];
      const pulse = 1 + Math.sin(powerup.pulse) * 0.08;
      ctx.save();
      ctx.translate(powerup.x, powerup.y);
      ctx.rotate(powerup.angle);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = def.glow;
      ctx.shadowBlur = 26;
      ctx.fillStyle = def.fill;
      ctx.beginPath();
      ctx.moveTo(0, -powerup.radius * 1.35);
      ctx.lineTo(powerup.radius, 0);
      ctx.lineTo(0, powerup.radius * 1.35);
      ctx.lineTo(-powerup.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(2.2, powerup.radius * 0.28), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (world.boss) {
      const boss = world.boss;
      const pulse = 1 + Math.sin(boss.phase * 3) * 0.04;
      ctx.save();
      ctx.translate(boss.x, boss.y);
      ctx.rotate(boss.angle);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = 'rgba(255,214,106,0.8)';
      ctx.shadowBlur = 40;
      const body = ctx.createRadialGradient(0, 0, 12, 0, 0, boss.radius + 20);
      body.addColorStop(0, 'rgba(255,214,106,0.95)');
      body.addColorStop(0.45, 'rgba(121,215,255,0.88)');
      body.addColorStop(1, 'rgba(255,140,155,0.22)');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.38)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, boss.radius * 0.68, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-boss.radius * 0.9, 0);
      ctx.lineTo(boss.radius * 0.9, 0);
      ctx.moveTo(0, -boss.radius * 0.9);
      ctx.lineTo(0, boss.radius * 0.9);
      ctx.stroke();
      ctx.restore();
    }

    for (const core of world.cores) {
      const pulse = 1 + Math.sin(core.pulse) * 0.08;
      ctx.save();
      ctx.translate(core.x, core.y);
      ctx.scale(pulse, pulse);
      ctx.shadowColor = corePalette[core.tint].glow;
      ctx.shadowBlur = 24;
      ctx.fillStyle = corePalette[core.tint].fill;
      ctx.beginPath();
      ctx.moveTo(0, -core.radius * 1.5);
      ctx.lineTo(core.radius, 0);
      ctx.lineTo(0, core.radius * 1.5);
      ctx.lineTo(-core.radius, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    for (const bullet of world.bullets) {
      ctx.save();
      ctx.globalAlpha = clamp(bullet.life, 0, 1);
      ctx.shadowColor = 'rgba(121,215,255,0.85)';
      ctx.shadowBlur = 16;
      const g = ctx.createRadialGradient(bullet.x, bullet.y, 0, bullet.x, bullet.y, 10);
      g.addColorStop(0, 'rgba(255,255,255,0.98)');
      g.addColorStop(0.4, 'rgba(121,215,255,0.95)');
      g.addColorStop(1, 'rgba(121,215,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (const meteor of world.meteors) {
      ctx.save();
      ctx.translate(meteor.x, meteor.y);
      ctx.rotate(meteor.angle);
      ctx.shadowColor = meteor.hue === 16 ? 'rgba(255,120,120,0.8)' : 'rgba(120,190,255,0.8)';
      ctx.shadowBlur = 24;
      const body = ctx.createLinearGradient(
        -meteor.radius,
        -meteor.radius,
        meteor.radius,
        meteor.radius
      );
      if (meteor.type === 'drone') {
        body.addColorStop(0, '#9ef0ff');
        body.addColorStop(1, '#77a5ff');
      } else if (meteor.hue === 16) {
        body.addColorStop(0, '#ffad85');
        body.addColorStop(1, '#ff667d');
      } else {
        body.addColorStop(0, '#8bd8ff');
        body.addColorStop(1, '#5a7dff');
      }
      ctx.fillStyle = body;
      if (meteor.type === 'drone') {
        ctx.beginPath();
        ctx.moveTo(-meteor.radius, 0);
        ctx.lineTo(meteor.radius * 0.75, -meteor.radius * 0.4);
        ctx.lineTo(meteor.radius * 0.45, meteor.radius * 0.78);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,220,255,0.95)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.arc(meteor.radius * 0.14, 0, Math.max(1.6, meteor.radius * 0.12), 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(-meteor.radius, 0);
        ctx.lineTo(-meteor.radius * 0.2, -meteor.radius * 0.65);
        ctx.lineTo(meteor.radius * 0.9, -meteor.radius * 0.2);
        ctx.lineTo(meteor.radius * 0.55, meteor.radius * 0.75);
        ctx.lineTo(-meteor.radius * 0.3, meteor.radius * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,130,130,0.95)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.beginPath();
        ctx.arc(
          meteor.radius * 0.18,
          -meteor.radius * 0.04,
          Math.max(1.8, meteor.radius * 0.12),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.restore();
    }

    for (const p of world.particles) {
      ctx.save();
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(ship.x, ship.y);
    const tilt = clamp((ship.vx || 0) / 220, -0.32, 0.32);
    ctx.rotate(tilt);

    const thrustPulse = 0.72 + Math.sin(performance.now() * 0.028) * 0.24;
    ctx.shadowColor = 'rgba(255,170,90,0.7)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(255,180,110,${0.78 * thrustPulse})`;
    ctx.beginPath();
    ctx.roundRect(-28, -7, 14, 5, 3);
    ctx.roundRect(-28, 2, 14, 5, 3);
    ctx.fill();

    ctx.shadowColor = 'rgba(120,220,255,0.85)';
    ctx.shadowBlur = 30;
    const fuselage = ctx.createLinearGradient(-22, -14, 28, 14);
    fuselage.addColorStop(0, '#7ce9ff');
    fuselage.addColorStop(0.45, '#87b8ff');
    fuselage.addColorStop(1, '#8cffc1');
    ctx.fillStyle = fuselage;
    ctx.beginPath();
    ctx.roundRect(-18, -10, 34, 20, 8);
    ctx.fill();

    ctx.fillStyle = '#8fd8ff';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(24, -4);
    ctx.lineTo(24, 4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(110,200,255,0.9)';
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.lineTo(-23, -19);
    ctx.lineTo(-14, -7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-6, 10);
    ctx.lineTo(-23, 19);
    ctx.lineTo(-14, 7);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(90,175,255,0.88)';
    ctx.beginPath();
    ctx.roundRect(-16, -8, 6, 5, 2);
    ctx.roundRect(-16, 3, 6, 5, 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    const canopy = ctx.createLinearGradient(0, -5, 13, 5);
    canopy.addColorStop(0, 'rgba(255,255,255,0.95)');
    canopy.addColorStop(1, 'rgba(120,180,255,0.8)');
    ctx.fillStyle = canopy;
    ctx.beginPath();
    ctx.ellipse(7, 0, 7, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-16, 0);
    ctx.lineTo(16, 0);
    ctx.moveTo(-2, -7);
    ctx.lineTo(12, -7);
    ctx.moveTo(-2, 7);
    ctx.lineTo(12, 7);
    ctx.stroke();
    ctx.restore();

    if (state.stageTransition > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(state.stageTransition / 1.2, 0, 1) * 0.85;
      ctx.fillStyle = 'rgba(121,215,255,0.08)';
      ctx.fillRect(0, 0, world.w, world.h);
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.textAlign = 'center';
      ctx.font = '700 28px Segoe UI, sans-serif';
      ctx.fillText(`STAGE ${state.stage}`, world.w * 0.5, world.h * 0.18);
      ctx.font = '500 14px Segoe UI, sans-serif';
      ctx.fillText('Tempo increased', world.w * 0.5, world.h * 0.18 + 26);
      ctx.restore();
    }

    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${state.flash * 0.2})`;
      ctx.fillRect(0, 0, world.w, world.h);
    }
    if (state.hitVignette > 0) {
      const v = ctx.createRadialGradient(
        world.w * 0.5,
        world.h * 0.5,
        world.h * 0.2,
        world.w * 0.5,
        world.h * 0.5,
        world.w * 0.8
      );
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, `rgba(255,80,104,${clamp(state.hitVignette * 0.35, 0, 0.35)})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, world.w, world.h);
    }

    if (!state.running && !state.over) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.68)';
      ctx.font = '600 18px Segoe UI, sans-serif';
      ctx.fillText(
        'Collect cores. Trigger powerups. Pilot your spaceship to survive.',
        world.w * 0.5,
        world.h * 0.88
      );
      ctx.restore();
    }
    if (state.dangerBlink > 0) {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,105,120,0.95)';
      ctx.font = '800 30px Segoe UI, sans-serif';
      ctx.fillText('DANGER', world.w * 0.5, world.h * 0.22);
      ctx.restore();
    }

    ctx.restore();
  }

  let last = performance.now();
  let accumulator = 0;
  const fixedDt = 1 / 60;
  function loop(now) {
    const frameDt = Math.min(0.05, (now - last) / 1000);
    last = now;
    updatePerf(frameDt);
    accumulator += frameDt;
    while (accumulator >= fixedDt) {
      if (state.hitStop <= 0) {
        update(fixedDt);
      } else {
        state.hitStop = Math.max(0, state.hitStop - fixedDt);
      }
      accumulator -= fixedDt;
    }
    draw();
    requestAnimationFrame(loop);
  }

  function pointerToTarget(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    input.targetX = clientX - rect.left;
    input.targetY = clientY - rect.top;
    const dx = input.targetX - ship.x;
    const dy = input.targetY - ship.y;
    const len = Math.hypot(dx, dy) || 1;
    ship.aimDx = dx / len;
    ship.aimDy = dy / len;
    input.pointerActive = true;
  }

  function updateVirtualStick(stickEl, knobEl, clientX, clientY, kind) {
    const rect = stickEl.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const maxR = rect.width * 0.34;
    const len = Math.hypot(dx, dy) || 1;
    const clamped = Math.min(maxR, len);
    const nx = (dx / len) * clamped;
    const ny = (dy / len) * clamped;
    setKnob(knobEl, nx, ny);
    if (kind === 'move') {
      input.moveAxisX = nx / maxR;
      input.moveAxisY = ny / maxR;
    } else {
      input.aimAxisX = nx / maxR;
      input.aimAxisY = ny / maxR;
    }
  }

  function resetVirtualStick(kind) {
    if (kind === 'move') {
      input.moveAxisX = 0;
      input.moveAxisY = 0;
      setKnob(moveKnob, 0, 0);
    } else {
      input.aimAxisX = 0;
      input.aimAxisY = -1;
      setKnob(aimKnob, 0, 0);
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    resumeAudio();
    canvas.setPointerCapture?.(event.pointerId);
    pointerToTarget(event.clientX, event.clientY);
    if (state.running && !state.paused) {
      shootBullet();
      state.fireTimer = fireInterval();
    } else if (!state.running && !state.over) {
      startGame();
    }
  });

  canvas.addEventListener('pointermove', (event) => {
    if (event.buttons === 0 && !input.pointerActive) return;
    pointerToTarget(event.clientX, event.clientY);
  });

  canvas.addEventListener('pointerup', () => {
    input.pointerActive = false;
  });

  canvas.addEventListener('pointercancel', () => {
    input.pointerActive = false;
  });

  window.addEventListener(
    'pointermove',
    (event) => {
      if (event.pointerType === 'mouse') {
        pointerToTarget(event.clientX, event.clientY);
      }
    },
    { passive: true }
  );

  window.addEventListener('keydown', (event) => {
    input.keys.add(event.key);
    if (event.key === ' ') {
      state.fireHeld = true;
    }
    if (event.key === 'p' || event.key === 'P') {
      if (state.running) {
        setPaused(!state.paused);
      }
    }
    if (event.key === 'r' || event.key === 'R') {
      resetGame();
      startGame();
    }
    if (event.key === 'q' || event.key === 'Q') {
      triggerPulse();
    }
    if ((event.key === ' ' || event.key === 'Enter') && !state.running && !state.over) {
      startGame();
    }
  });

  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key);
    if (event.key === ' ') {
      state.fireHeld = false;
    }
  });

  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);

  fireBtn.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    resumeAudio();
    if (!state.running) {
      startGame();
      return;
    }
    state.fireHeld = true;
    shootBullet();
    state.fireTimer = fireInterval();
  });

  fireBtn.addEventListener('pointerup', () => {
    state.fireHeld = false;
  });

  fireBtn.addEventListener('pointerleave', () => {
    state.fireHeld = false;
  });

  fireBtn.addEventListener('pointercancel', () => {
    state.fireHeld = false;
  });

  window.addEventListener('pointerup', () => {
    state.fireHeld = false;
  });

  moveStick.addEventListener('pointerdown', (event) => {
    input.movePointerId = event.pointerId;
    moveStick.setPointerCapture?.(event.pointerId);
    updateVirtualStick(moveStick, moveKnob, event.clientX, event.clientY, 'move');
  });
  moveStick.addEventListener('pointermove', (event) => {
    if (input.movePointerId !== event.pointerId) return;
    updateVirtualStick(moveStick, moveKnob, event.clientX, event.clientY, 'move');
  });
  moveStick.addEventListener('pointerup', (event) => {
    if (input.movePointerId !== event.pointerId) return;
    input.movePointerId = null;
    resetVirtualStick('move');
  });
  moveStick.addEventListener('pointercancel', () => {
    input.movePointerId = null;
    resetVirtualStick('move');
  });

  aimStick.addEventListener('pointerdown', (event) => {
    input.aimPointerId = event.pointerId;
    aimStick.setPointerCapture?.(event.pointerId);
    updateVirtualStick(aimStick, aimKnob, event.clientX, event.clientY, 'aim');
  });
  aimStick.addEventListener('pointermove', (event) => {
    if (input.aimPointerId !== event.pointerId) return;
    updateVirtualStick(aimStick, aimKnob, event.clientX, event.clientY, 'aim');
  });
  aimStick.addEventListener('pointerup', (event) => {
    if (input.aimPointerId !== event.pointerId) return;
    input.aimPointerId = null;
    resetVirtualStick('aim');
  });
  aimStick.addEventListener('pointercancel', () => {
    input.aimPointerId = null;
    resetVirtualStick('aim');
  });

  modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyMode(button.dataset.mode);
      resetGame();
    });
  });

  startBtn.addEventListener('click', () => {
    if (state.paused) {
      setPaused(false);
    } else if (state.over) {
      resetGame();
      startGame();
    } else {
      startGame();
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (!state.running) return;
    setPaused(!state.paused);
  });

  applyMode(settings.mode);
  resize();
  resetGame();
  requestAnimationFrame(loop);
})();

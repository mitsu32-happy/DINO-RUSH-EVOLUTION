(function () {
  "use strict";

  const WIDTH = 390;
  const HEIGHT = 844;
  const SAVE_KEY = "dinoRushEvolution.save.v1";
  const ASSET_VERSION = "20260509-bgm-sfx-balance1";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const appShell = document.querySelector(".app-shell");
  const overlay = document.getElementById("overlay");
  const panel = document.getElementById("panel");
  const joystick = document.getElementById("joystick");
  const joystickKnob = document.getElementById("joystickKnob");
  const specialButton = document.getElementById("specialButton");
  const specialIcon = document.getElementById("specialIcon");
  const specialCooldown = document.getElementById("specialCooldown");
  const pauseButton = document.getElementById("pauseButton");

  let data = {};
  let images = new Map();
  let meta = loadMeta();
  let run = null;
  let lastFrame = 0;
  let keys = new Set();
  let joystickPointerId = null;
  let joystickVector = { x: 0, y: 0 };
  let skillHudBounds = [];
  let audio = null;
  let bgmTrack = null;
  let bgmKind = null;
  let bgmSourceNode = null;
  let titleVideoRef = null;
  let titleVideoUnlockHandler = null;
  let titleOpenHomeHandler = null;
  const sfxBuffers = new Map();
  const sfxBufferPromises = new Map();
  const activeSfxNodes = new Set();
  const sfxLastPlayed = {};
  const MAX_ACTIVE_SFX = 14;

  const AUDIO_FILES = {
    gameBgm: "assets/audio/bgm-rumble-jungle.ogg",
    homeBgm: "assets/audio/bgm-home-calm.ogg",
    bite: "assets/audio/sfx-bite.mp3",
    target: "assets/audio/sfx-bite.mp3",
    claw: "assets/audio/sfx-claw.mp3",
    tail: "assets/audio/sfx-tail.mp3",
    rush: "assets/audio/sfx-rush.mp3",
    fire: "assets/audio/sfx-fire.mp3",
    crystal: "assets/audio/sfx-crystal.mp3",
    roar: "assets/audio/sfx-roar.mp3",
    lightning: "assets/audio/sfx-lightning.mp3",
    toxic: "assets/audio/sfx-toxic.mp3",
    meteor: "assets/audio/sfx-meteor.mp3",
    impact: "assets/audio/sfx-impact.mp3",
    area: "assets/audio/sfx-impact.mp3",
    line: "assets/audio/sfx-rush.mp3",
    cone: "assets/audio/sfx-fire.mp3",
    special: "assets/audio/sfx-special.mp3",
    tyrant_crash: "assets/audio/sfx-impact.mp3",
    inferno_burst: "assets/audio/sfx-fire.mp3",
    gaia_break: "assets/audio/sfx-meteor.mp3",
    storm_crash: "assets/audio/sfx-lightning.mp3",
    venom_inferno: "assets/audio/sfx-toxic.mp3",
    iron_roar: "assets/audio/sfx-roar.mp3",
    raptor_pounce: "assets/audio/sfx-rush.mp3",
    guardian_charge: "assets/audio/sfx-impact.mp3",
    pickup: "assets/audio/sfx-pickup.mp3",
    buy: "assets/audio/sfx-buy.mp3",
    heal: "assets/audio/sfx-heal.mp3",
    level: "assets/audio/sfx-level.mp3",
    clear: "assets/audio/sfx-clear.mp3",
    result: "assets/audio/sfx-result.mp3",
    evolve: "assets/audio/sfx-evolve.mp3",
    damage: "assets/audio/sfx-damage.mp3",
    ui: "assets/audio/sfx-ui.mp3"
  };

  const SFX_VOLUME = {
    bite: 0.5,
    target: 0.5,
    claw: 0.5,
    tail: 0.46,
    rush: 0.42,
    fire: 0.5,
    crystal: 0.48,
    roar: 0.46,
    lightning: 0.46,
    toxic: 0.45,
    meteor: 0.5,
    impact: 0.5,
    area: 0.48,
    line: 0.42,
    cone: 0.5,
    special: 0.56,
    tyrant_crash: 0.58,
    inferno_burst: 0.56,
    gaia_break: 0.54,
    storm_crash: 0.55,
    venom_inferno: 0.52,
    iron_roar: 0.52,
    raptor_pounce: 0.48,
    guardian_charge: 0.52,
    pickup: 0.3,
    buy: 0.38,
    heal: 0.35,
    level: 0.32,
    clear: 0.42,
    result: 0.36,
    evolve: 0.54,
    damage: 0.38,
    ui: 0.2
  };

  const SFX_MIN_INTERVAL = {
    bite: 70,
    target: 70,
    pickup: 80,
    damage: 160,
    fire: 130,
    lightning: 130,
    toxic: 130,
    ui: 45
  };

  const SFX_MAX_DURATION = {
    bite: 0.42,
    target: 0.42,
    claw: 0.48,
    tail: 0.62,
    rush: 0.72,
    fire: 0.95,
    crystal: 0.9,
    roar: 1.05,
    lightning: 0.9,
    toxic: 0.88,
    meteor: 1.05,
    impact: 0.82,
    area: 0.82,
    line: 0.72,
    cone: 0.95,
    special: 1.15,
    tyrant_crash: 1.05,
    inferno_burst: 1.05,
    gaia_break: 1.05,
    storm_crash: 0.95,
    venom_inferno: 0.95,
    iron_roar: 1.05,
    raptor_pounce: 0.78,
    guardian_charge: 0.95,
    pickup: 0.75,
    buy: 0.95,
    heal: 1,
    level: 1.05,
    clear: 1.35,
    result: 1.05,
    evolve: 1.45,
    damage: 0.55,
    ui: 0.28
  };

  const ENEMY_BOSS_ID = "ancient_spino";
  const SPRITE_MOTION = {
    player: { bob: 3.2, squash: 0.045, tilt: 0.08, cadence: 9 },
    enemy: { bob: 2.2, squash: 0.035, tilt: 0.06, cadence: 7 },
    pickup: { bob: 3.4, squash: 0.025, tilt: 0.05, cadence: 5.4 }
  };

  function loadMeta() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
      return {
        dna: Number(saved.dna || 0),
        runs: Number(saved.runs || 0),
        discoveredEvolutions: Array.isArray(saved.discoveredEvolutions) ? saved.discoveredEvolutions : [],
        discoveredSkills: Array.isArray(saved.discoveredSkills) ? saved.discoveredSkills : [],
        discoveredDinosaurs: Array.isArray(saved.discoveredDinosaurs) ? saved.discoveredDinosaurs : ["tyranno"],
        unlockedSkills: Array.isArray(saved.unlockedSkills) ? saved.unlockedSkills : [],
        unlockedDinosaurs: Array.isArray(saved.unlockedDinosaurs) ? saved.unlockedDinosaurs : ["tyranno"],
        selectedDinosaur: saved.selectedDinosaur || "tyranno",
        selectedMap: saved.selectedMap || "triassic",
        clears: saved.clears && typeof saved.clears === "object" ? saved.clears : {},
        endlessBestTime: Number(saved.endlessBestTime || 0),
        endlessBestBosses: Number(saved.endlessBestBosses || 0),
        endlessRecords: saved.endlessRecords && typeof saved.endlessRecords === "object" ? saved.endlessRecords : {},
        settings: {
          audio: saved.settings && saved.settings.audio === false ? false : true,
          bgmVolume: clampVolume(saved.settings && saved.settings.bgmVolume, 0.72),
          sfxVolume: clampVolume(saved.settings && saved.settings.sfxVolume, 0.78),
          controlsSwapped: Boolean(saved.settings && saved.settings.controlsSwapped)
        }
      };
    } catch (_error) {
      return {
        dna: 0,
        runs: 0,
        discoveredEvolutions: [],
        discoveredSkills: [],
        discoveredDinosaurs: ["tyranno"],
        unlockedSkills: [],
        unlockedDinosaurs: ["tyranno"],
        selectedDinosaur: "tyranno",
        selectedMap: "triassic",
        clears: {},
        endlessBestTime: 0,
        endlessBestBosses: 0,
        endlessRecords: {},
        settings: { audio: true, bgmVolume: 0.72, sfxVolume: 0.78, controlsSwapped: false }
      };
    }
  }

  function clampVolume(value, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return fallback;
    }
    return Math.max(0, Math.min(1, number));
  }

  function getBgmVolume() {
    if (!meta.settings) {
      return 0.72;
    }
    meta.settings.bgmVolume = clampVolume(meta.settings.bgmVolume, 0.72);
    return meta.settings.bgmVolume;
  }

  function getSfxVolume() {
    if (!meta.settings) {
      return 0.78;
    }
    meta.settings.sfxVolume = clampVolume(meta.settings.sfxVolume, 0.78);
    return meta.settings.sfxVolume;
  }

  function saveMeta() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(meta));
  }

  function setPanelVariant(variant) {
    panel.classList.toggle("title-panel", variant === "title");
  }

  function applyControlLayout() {
    appShell.classList.toggle("controls-swapped", Boolean(meta.settings && meta.settings.controlsSwapped));
  }


  function panelHeader(label) {
    return `
      <div class="panel-toolbar">
        <span class="brand-kicker">${label}</span>
        <button class="secondary-button panel-home-button" type="button" data-home-button>\u30db\u30fc\u30e0</button>
      </div>
    `;
  }

  function bindPanelHomeButtons() {
    panel.querySelectorAll("[data-home-button]").forEach((button) => {
      button.addEventListener("click", showHome);
    });
  }

  function showConfirmDialog(options) {
    setPanelVariant();
    const dangerClass = options.danger ? " danger-button" : "";
    panel.innerHTML = `
      <div class="confirm-panel">
        <div class="brand-kicker">${options.kicker || "\u78ba\u8a8d"}</div>
        <h2>${options.title}</h2>
        <p>${options.message}</p>
        <div class="button-row">
          <button id="confirmYesButton" class="primary-button${dangerClass}" type="button">${options.confirmLabel || "OK"}</button>
          <button id="confirmNoButton" class="secondary-button" type="button">${options.cancelLabel || "\u30ad\u30e3\u30f3\u30bb\u30eb"}</button>
        </div>
      </div>
    `;
    showOverlay();
    document.getElementById("confirmYesButton").addEventListener("click", () => options.onConfirm && options.onConfirm());
    document.getElementById("confirmNoButton").addEventListener("click", () => {
      if (options.onCancel) {
        options.onCancel();
      } else {
        showHome();
      }
    });
  }

  async function loadJson(name) {
    const response = await fetch(withVersion(`data/${name}.json`), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`${name}.json を読み込めませんでした`);
    }
    return response.json();
  }

  async function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`${src} を読み込めませんでした`));
      image.src = withVersion(src);
    });
  }

  function withVersion(src) {
    if (!src || src.startsWith("data:") || src.startsWith("blob:")) {
      return src;
    }
    return `${src}${src.includes("?") ? "&" : "?"}v=${ASSET_VERSION}`;
  }

  function collectSpritePaths(item, assetPaths) {
    if (!item) {
      return;
    }
    addSpritePath(item.sprite, assetPaths);
    addSpritePath(item.icon, assetPaths);
    addSpritePath(item.projectileSprite, assetPaths);
    addSpritePath(item.effectSprite, assetPaths);
    addFramePaths(item.frames, assetPaths);

    if (!item.animations) {
      return;
    }

    Object.values(item.animations).forEach((animation) => {
      addFramePaths(Array.isArray(animation) ? animation : animation.frames, assetPaths);
    });
  }

  function addFramePaths(frames, assetPaths) {
    if (!Array.isArray(frames)) {
      return;
    }

    frames.forEach((frame) => addSpritePath(frame, assetPaths));
  }

  function addSpritePath(sprite, assetPaths) {
    const src = getSpriteSrc(sprite);
    if (src) {
      assetPaths.add(src);
    }
  }

  function getSpriteSrc(sprite) {
    if (typeof sprite === "string") {
      return sprite;
    }
    if (!sprite || typeof sprite !== "object") {
      return "";
    }
    return sprite.src || sprite.sprite || sprite.image || sprite.path || "";
  }

  async function init() {
    showLoading();
    data = {
      dinosaurs: await loadJson("dinosaurs"),
      evolutions: await loadJson("evolutions"),
      skills: await loadJson("skills"),
      items: await loadJson("items"),
      maps: await loadJson("maps"),
      modes: await loadJson("modes"),
      enemies: await loadJson("enemies"),
      specials: await loadJson("specials")
    };

    const assetPaths = new Set();
    data.dinosaurs.forEach((item) => collectSpritePaths(item, assetPaths));
    data.enemies.forEach((item) => collectSpritePaths(item, assetPaths));
    data.evolutions.forEach((item) => {
      collectSpritePaths(item, assetPaths);
      collectSpritePaths(item.special, assetPaths);
    });
    data.items.forEach((item) => collectSpritePaths(item, assetPaths));
    data.skills.forEach((item) => collectSpritePaths(item, assetPaths));
    data.specials.forEach((item) => collectSpritePaths(item, assetPaths));
    data.maps.forEach((item) => addSpritePath(item.background, assetPaths));
    assetPaths.add("assets/ui/title-hero-20260509.png");
    assetPaths.add("assets/ui/home-stage-icon-20260509.png");
    await Promise.all([...assetPaths].map(async (src) => images.set(src, await loadImage(src))));

    panel.addEventListener("click", (event) => {
      if (event.target.closest("button")) {
        playSound("ui");
      }
    });
    bindInput();
    applyControlLayout();
    showTitle();
    requestAnimationFrame(loop);
  }

  function byId(collection, id) {
    return collection.find((item) => item.id === id);
  }

  function createRun(modeId = "normal", mapId = "triassic", dinosaurId = meta.selectedDinosaur) {
    stopTitleVideo();
    const dinosaur = getPlayableDinosaur(dinosaurId);
    const mode = byId(data.modes, modeId) || byId(data.modes, "normal");
    const map = byId(data.maps, mapId) || byId(data.maps, "triassic");
    const specialTemplate = byId(data.specials, dinosaur.specialId || "primal_roar") || data.specials[0];
    const stats = dinosaur.baseStats;
    if (!meta.discoveredDinosaurs.includes(dinosaur.id)) {
      meta.discoveredDinosaurs.push(dinosaur.id);
      saveMeta();
    }
    markSkillDiscovered(dinosaur.basicAttack || "bite");

    run = {
      screen: "playing",
      dinosaur,
      mode,
      map,
      elapsed: 0,
      spawnTimer: 0,
      bossTimer: 0,
      bossSpawned: false,
      bossActive: false,
      bossDefeated: false,
      bossKills: 0,
      endlessBossIndex: 0,
      nextRandomBossAt: 0,
      saved: false,
      alertText: "",
      alertTimer: 0,
      level: 1,
      xp: 0,
      xpToNext: 26,
      dnaRun: 0,
      evolved: null,
      damageMultiplier: 1,
      speedMultiplier: 1,
      specialCooldownMultiplier: 1,
      auraDamage: 0,
      evolutionSequence: null,
      player: {
        x: 0,
        y: 0,
        hp: stats.hp,
        maxHp: stats.hp,
        speed: stats.speed,
        damage: stats.damage,
        armor: stats.armor,
        size: stats.size,
        facingX: 1,
        facingY: 0,
        invulnerable: 0,
        movePhase: 0,
        moveAmount: 0,
        attackPulse: 0,
        hitFlash: 0,
        action: null,
        actionPose: null,
        evolutionSprite: null,
        displayScale: 1,
        pickupRange: 92,
        statUpgrades: {
          hp: 0,
          damage: 0,
          speed: 0,
          pickup: 0
        }
      },
      camera: { x: 0, y: 0 },
      basicAttack: {
        ...byId(data.skills, dinosaur.basicAttack || "bite"),
        timer: 0.35
      },
      skillPool: getRunSkillPool(dinosaur),
      skills: [],
      special: { ...specialTemplate, cooldown: 0, maxCooldown: specialTemplate.cooldown },
      enemies: [],
      pickups: [],
      projectiles: [],
      enemyProjectiles: [],
      effects: []
    };

    configureSpecialButton();
    startAudio();
    hideOverlay();
    setControlsVisible(true);
  }

  function getPlayableDinosaur(id) {
    const fallback = byId(data.dinosaurs, "tyranno") || data.dinosaurs[0];
    const dinosaur = byId(data.dinosaurs, id) || fallback;
    if (!meta.unlockedDinosaurs.includes(dinosaur.id)) {
      meta.selectedDinosaur = fallback.id;
      return fallback;
    }
    meta.selectedDinosaur = dinosaur.id;
    saveMeta();
    return dinosaur;
  }

  function createSkill(id) {
    markSkillDiscovered(id);
    return {
      ...byId(data.skills, id),
        level: 1,
        timer: 0.25 + Math.random() * 0.6
    };
  }

  function getRunSkillPool(dinosaur) {
    const base = dinosaur.skillPool || data.skills.filter((skill) => skill.id !== (dinosaur.basicAttack || "bite") && !skill.unlockCost).map((skill) => skill.id);
    return [...new Set([...base, ...meta.unlockedSkills])];
  }

  function markSkillDiscovered(id) {
    if (!id || meta.discoveredSkills.includes(id)) {
      return;
    }
    meta.discoveredSkills.push(id);
    saveMeta();
  }

  function configureSpecialButton() {
    if (!run || !run.special) {
      return;
    }
    specialButton.setAttribute("aria-label", run.special.name);
    specialIcon.src = withVersion(run.special.icon || "");
    specialIcon.hidden = !run.special.icon;
  }

  function bindInput() {
    window.addEventListener("keydown", (event) => {
      unlockAudioFromGesture();
      keys.add(event.key.toLowerCase());
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(event.key.toLowerCase())) {
        event.preventDefault();
      }
      if (event.key === "Escape") {
        togglePause();
      }
      if (event.key === " " && run && run.screen === "playing") {
        ensureAudio();
        triggerSpecial();
      }
    });

    window.addEventListener("keyup", (event) => {
      keys.delete(event.key.toLowerCase());
    });

    appShell.addEventListener("pointerdown", (event) => {
      unlockAudioFromGesture();
      if (!run || run.screen !== "playing" || joystickPointerId !== null || shouldIgnoreGameplayPointer(event)) {
        return;
      }

      const skillSlot = getSkillSlotAt(event.clientX, event.clientY);
      if (skillSlot) {
        event.preventDefault();
        showSkillDetail(skillSlot);
        return;
      }
      if (isCanvasHudPoint(event.clientX, event.clientY)) {
        return;
      }

      event.preventDefault();
      joystickPointerId = event.pointerId;
      appShell.setPointerCapture(event.pointerId);
      placeJoystick(event.clientX, event.clientY);
      updateJoystick(event.clientX, event.clientY);
    });

    appShell.addEventListener("pointermove", (event) => {
      if (event.pointerId === joystickPointerId) {
        unlockAudioFromGesture();
        event.preventDefault();
        updateJoystick(event.clientX, event.clientY);
      }
    });

    appShell.addEventListener("pointerup", endJoystick);
    appShell.addEventListener("pointercancel", endJoystick);

    specialButton.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      unlockAudioFromGesture();
      ensureAudio();
      triggerSpecial();
    });

    pauseButton.addEventListener("click", togglePause);
  }

  function shouldIgnoreGameplayPointer(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return true;
    }
    return Boolean(target.closest("#specialButton, #pauseButton, #overlay, button"));
  }

  function placeJoystick(clientX, clientY) {
    const rect = appShell.getBoundingClientRect();
    const size = joystick.offsetWidth || 118;
    const half = size / 2;
    const left = clamp(clientX - rect.left - half, 8, rect.width - size - 8);
    const top = clamp(clientY - rect.top - half, 8, rect.height - size - 8);
    joystick.classList.add("is-floating");
    joystick.style.left = `${left}px`;
    joystick.style.top = `${top}px`;
    joystick.style.bottom = "auto";
  }

  function updateJoystick(clientX, clientY) {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const max = rect.width * 0.34;
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const length = Math.hypot(dx, dy) || 1;
    const distance = Math.min(max, length);
    const x = (dx / length) * distance;
    const y = (dy / length) * distance;
    joystickVector = { x: x / max, y: y / max };
    joystickKnob.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
  }

  function endJoystick(event) {
    if (event.pointerId !== joystickPointerId) {
      return;
    }
    endActiveJoystick();
  }

  function endActiveJoystick() {
    joystickPointerId = null;
    joystickVector = { x: 0, y: 0 };
    joystickKnob.style.transform = "translate(-50%, -50%)";
    joystick.classList.remove("is-floating");
    joystick.style.left = "";
    joystick.style.top = "";
    joystick.style.bottom = "";
  }

  function loop(timestamp) {
    const dt = Math.min(0.033, (timestamp - lastFrame) / 1000 || 0);
    lastFrame = timestamp;

    if (run && run.screen === "playing") {
      update(dt);
    } else if (run && run.screen === "evolving") {
      updateEvolutionSequence(dt);
    }

    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    run.elapsed += dt;
    run.alertTimer = Math.max(0, run.alertTimer - dt);
    updateMovement(dt);
    updateSkills(dt);
    updateSkillActions(dt);
    updateProjectiles(dt);
    updateEnemyProjectiles(dt);
    updateEnemies(dt);
    updatePickups(dt);
    updateEffects(dt);
    updateSpawns(dt);
    updateBossSpawns();
    updateSpecial(dt);

    if (run.player.hp <= 0) {
      finishRun(false);
    }
  }

  function updateMovement(dt) {
    const input = getInputVector();
    const player = run.player;
    const speed = player.speed * run.speedMultiplier;
    player.x += input.x * speed * dt;
    player.y += input.y * speed * dt;

    const movementAmount = Math.hypot(input.x, input.y);
    if (movementAmount > 0.1) {
      player.facingX = input.x;
      player.facingY = input.y;
    }

    player.moveAmount = clamp(movementAmount, 0, 1);
    player.movePhase += dt * SPRITE_MOTION.player.cadence * player.moveAmount;
    player.invulnerable = Math.max(0, player.invulnerable - dt);
    player.attackPulse = Math.max(0, (player.attackPulse || 0) - dt);
    player.hitFlash = Math.max(0, (player.hitFlash || 0) - dt);
    run.camera.x += (player.x - run.camera.x) * 0.18;
    run.camera.y += (player.y - run.camera.y) * 0.18;
  }

  function getInputVector() {
    let x = joystickVector.x;
    let y = joystickVector.y;

    if (keys.has("a") || keys.has("arrowleft")) x -= 1;
    if (keys.has("d") || keys.has("arrowright")) x += 1;
    if (keys.has("w") || keys.has("arrowup")) y -= 1;
    if (keys.has("s") || keys.has("arrowdown")) y += 1;

    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    return { x, y };
  }

  function updateSkills(dt) {
    run.basicAttack.timer -= dt;
    if (run.basicAttack.timer <= 0) {
      useBasicAttack();
      run.basicAttack.timer += getBasicCooldown();
    }

    run.skills.forEach((skill) => {
      skill.timer -= dt;
      if (skill.timer <= 0) {
        useSkill(skill);
        skill.timer += getSkillCooldown(skill);
      }
    });

    if (run.auraDamage > 0) {
      run.enemies.forEach((enemy) => {
        const distance = getDistance(run.player, enemy);
        if (distance < 70) {
          damageEnemy(enemy, run.auraDamage * dt, "aura");
        }
      });
    }
  }

  function getBasicCooldown() {
    return Math.max(0.34, run.basicAttack.cooldown);
  }

  function getBasicDamage() {
    return (run.basicAttack.damage + run.player.damage * 0.28) * run.damageMultiplier;
  }

  function useBasicAttack() {
    const target = nearestEnemy(run.basicAttack.range);
    if (!target) {
      return;
    }

    run.player.attackPulse = 0.16;
    playSound("bite");
    damageEnemy(target, getBasicDamage(), "basic");
    run.effects.push({
      type: "slash",
      x: target.x,
      y: target.y,
      life: 0.16,
      maxLife: 0.16,
      radius: 30,
      color: "#fff0b8"
    });
  }

  function getSkillCooldown(skill) {
    const levelBonus = 1 - (skill.level - 1) * 0.045;
    return Math.max(0.25, skill.cooldown * levelBonus);
  }

  function getSkillDamage(skill) {
    const levelScale = 1 + (skill.level - 1) * 0.24;
    return (skill.damage + run.player.damage * 0.34) * levelScale * run.damageMultiplier;
  }

  function useSkill(skill) {
    markSkillDiscovered(skill.id);
    run.player.attackPulse = Math.max(run.player.attackPulse || 0, 0.2);
    playSound(skill.sound || skill.type || "skill");

    if (skill.type === "target") {
      const target = nearestEnemy(skill.range + skill.level * 7);
      if (!target) return;
      damageEnemy(target, getSkillDamage(skill), skill.id);
      if (skill.id === "rending_claw") {
        run.effects.push({
          type: "clawSlash",
          x: target.x,
          y: target.y,
          angle: Math.atan2(target.y - run.player.y, target.x - run.player.x),
          life: 0.24,
          maxLife: 0.24,
          radius: 42 + skill.level * 3,
          color: "#ffdf72"
        });
        burstParticles(target.x, target.y, 7 + skill.level, 36, "#ff7a2d");
      } else {
        run.effects.push({
          type: "slash",
          x: target.x,
          y: target.y,
          life: 0.18,
          maxLife: 0.18,
          radius: 38 + skill.level * 2,
          color: "#fff0b8"
        });
      }
    }

    if (skill.type === "area" && skill.action === "tail_sweep") {
      performTailSweep(skill);
    } else if (skill.type === "area") {
      performPulseAreaSkill(skill);
    }

    if (skill.type === "line") {
      startRushAction(skill);
    }

    if (skill.type === "cone") {
      fireBreathProjectiles(skill);
    }
  }

  function performTailSweep(skill) {
    const player = run.player;
    const radius = skill.range + skill.level * 9;
    const facing = normalize(player.facingX, player.facingY);
    const centerAngle = Math.atan2(facing.y, facing.x) + Math.PI;
    const halfAngle = 1.95;
    const damage = getSkillDamage(skill);
    player.actionPose = {
      type: "tail_sweep",
      elapsed: 0,
      duration: 0.42,
      direction: centerAngle
    };

    run.enemies.forEach((enemy) => {
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const distance = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      if (distance < radius && Math.abs(angleDelta(angle, centerAngle)) < halfAngle) {
        damageEnemy(enemy, damage, skill.id);
        pushEnemy(enemy, player, 58 + skill.level * 8);
      }
    });

    run.effects.push({
      type: "tailSweep",
      x: player.x,
      y: player.y,
      angle: centerAngle,
      halfAngle,
      life: 0.42,
      maxLife: 0.42,
      radius,
      color: "#60d5c8"
    });
    burstParticles(player.x, player.y, 18 + skill.level * 2, radius * 0.55, "#60d5c8");
  }

  function performPulseAreaSkill(skill) {
    const player = run.player;
    const radius = skill.range + skill.level * 8;
    const damage = getSkillDamage(skill);
    const color = getSkillEffectColor(skill);

    run.enemies.forEach((enemy) => {
      const distance = getDistance(player, enemy);
      if (distance < radius + enemy.size) {
        const falloff = 1 - Math.min(1, distance / radius);
        damageEnemy(enemy, damage * (0.6 + falloff * 0.55), skill.id);
        pushEnemy(enemy, player, 42 + skill.level * 5);
      }
    });

    if (skill.effectSprite) {
      run.effects.push({
        type: "skillSprite",
        sprite: skill.effectSprite,
        x: player.x,
        y: player.y,
        life: 0.5,
        maxLife: 0.5,
        radius: skill.id === "crystal_spikes" ? radius * 1.34 : radius * 1.5,
        color
      });
    }

    if (skill.id === "guard_roar") {
      run.effects.push({
        type: "roarWave",
        x: player.x,
        y: player.y,
        life: 0.58,
        maxLife: 0.58,
        radius,
        color
      });
    } else if (skill.id === "meteor_stomp") {
      run.effects.push({
        type: "stompCrater",
        x: player.x,
        y: player.y,
        life: 0.6,
        maxLife: 0.6,
        radius,
        color
      });
    }

    run.effects.push({
      type: "ring",
      x: player.x,
      y: player.y,
      life: 0.45,
      maxLife: 0.45,
      radius,
      color
    });
    burstParticles(player.x, player.y, 16 + skill.level * 2, radius * 0.52, color);
  }

  function getSkillEffectColor(skill) {
    return {
      crystal_spikes: "#60d5c8",
      guard_roar: "#ffdf72",
      lightning_dash: "#72dfff",
      toxic_spit: "#8cff46",
      meteor_stomp: "#ff7a2d"
    }[skill.id] || "#f3b13d";
  }

  function startRushAction(skill) {
    const player = run.player;
    const facing = normalize(player.facingX, player.facingY);
    const range = skill.range + skill.level * 12;
    const duration = 0.24 + skill.level * 0.015;
    const color = getSkillEffectColor(skill);
    player.action = {
      type: "rush",
      skillId: skill.id,
      dx: facing.x,
      dy: facing.y,
      elapsed: 0,
      duration,
      speed: range / duration,
      width: 24 + skill.level * 4,
      color,
      damage: getSkillDamage(skill),
      hitEnemies: new Set()
    };
    player.invulnerable = Math.max(player.invulnerable, duration);
    run.effects.push({
      type: "rushPath",
      x: player.x,
      y: player.y,
      dx: facing.x,
      dy: facing.y,
      life: duration,
      maxLife: duration,
      radius: range,
      color,
      skillId: skill.id
    });
    if (skill.effectSprite) {
      run.effects.push({
        type: "dashSprite",
        sprite: skill.effectSprite,
        x: player.x + facing.x * 30,
        y: player.y + facing.y * 30,
        dx: facing.x,
        dy: facing.y,
        life: duration,
        maxLife: duration,
        radius: Math.min(178, range * 0.72),
        color
      });
    }
    sprayParticles(player.x, player.y, facing.x, facing.y, 16 + skill.level * 2, color);
  }

  function fireBreathProjectiles(skill) {
    const player = run.player;
    const facing = normalize(player.facingX, player.facingY);
    const baseAngle = Math.atan2(facing.y, facing.x);
    const count = Math.min(7, 2 + skill.level);
    const spread = 0.18 + skill.level * 0.055;
    const startDistance = player.size + 16;
    player.actionPose = {
      type: "fire_breath",
      elapsed: 0,
      duration: 0.32,
      direction: baseAngle
    };

    for (let i = 0; i < count; i += 1) {
      const t = count === 1 ? 0.5 : i / (count - 1);
      const angle = baseAngle + (t - 0.5) * spread * 2;
      const speed = 235 + skill.level * 18;
      const color = getSkillEffectColor(skill);
      run.projectiles.push({
        type: skill.id === "toxic_spit" ? "toxic" : "fireball",
        sprite: skill.projectileSprite,
        skillId: skill.id,
        color,
        x: player.x + Math.cos(angle) * startDistance,
        y: player.y + Math.sin(angle) * startDistance,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        life: 0.58 + skill.level * 0.04,
        maxLife: 0.58 + skill.level * 0.04,
        radius: 18 + skill.level * 1.6,
        damage: getSkillDamage(skill) * 0.72,
        hitEnemies: new Set()
      });
    }

    run.effects.push({
      type: "fireMuzzle",
      x: player.x + facing.x * startDistance,
      y: player.y + facing.y * startDistance,
      dx: facing.x,
      dy: facing.y,
      life: 0.28,
      maxLife: 0.28,
      radius: skill.range * 0.42,
      color: getSkillEffectColor(skill)
    });
    sprayParticles(player.x + facing.x * 24, player.y + facing.y * 24, facing.x, facing.y, 16 + skill.level * 3, getSkillEffectColor(skill));
  }

  function updateSkillActions(dt) {
    const pose = run.player.actionPose;
    if (pose) {
      pose.elapsed += dt;
      if (pose.elapsed >= pose.duration) {
        run.player.actionPose = null;
      }
    }

    const action = run.player.action;
    if (!action) {
      return;
    }

    if (action.type === "rush") {
      const previous = { x: run.player.x, y: run.player.y };
      const distance = action.speed * dt;
      run.player.x += action.dx * distance;
      run.player.y += action.dy * distance;
      run.player.facingX = action.dx;
      run.player.facingY = action.dy;
      run.player.attackPulse = Math.max(run.player.attackPulse || 0, 0.18);
      damageEnemiesAlongSegment(previous, run.player, action.width, action.damage, action.skillId, action.hitEnemies);
      if (Math.random() < 0.75) {
        run.effects.push({
          type: "afterimage",
          x: previous.x,
          y: previous.y,
          dx: action.dx,
          dy: action.dy,
          life: 0.18,
          maxLife: 0.18,
          radius: run.player.size * 2.25,
          color: action.color || "#f3b13d"
        });
      }
      action.elapsed += dt;
      if (action.elapsed >= action.duration) {
        run.player.action = null;
      }
      run.camera.x += (run.player.x - run.camera.x) * 0.28;
      run.camera.y += (run.player.y - run.camera.y) * 0.28;
    }
  }

  function updateProjectiles(dt) {
    for (let i = run.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = run.projectiles[i];
      const previous = { x: projectile.x, y: projectile.y };
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      damageEnemiesAlongSegment(previous, projectile, projectile.radius, projectile.damage, projectile.skillId, projectile.hitEnemies);
      run.effects.push({
        type: "particle",
        x: projectile.x,
        y: projectile.y,
        vx: -projectile.vx * 0.08 + randomBetween(-10, 10),
        vy: -projectile.vy * 0.08 + randomBetween(-10, 10),
        life: 0.22,
        maxLife: 0.22,
        radius: randomBetween(2.2, 4.2),
        color: projectile.color || "#ff7a2d"
      });
      if (projectile.life <= 0) {
        burstParticles(projectile.x, projectile.y, 7, 32, projectile.color || "#ff7a2d");
        run.projectiles.splice(i, 1);
      }
    }
  }

  function updateEnemyProjectiles(dt) {
    if (!run.enemyProjectiles || run.enemyProjectiles.length === 0) {
      return;
    }

    for (let i = run.enemyProjectiles.length - 1; i >= 0; i -= 1) {
      const projectile = run.enemyProjectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      projectile.life -= dt;
      projectile.angle = Math.atan2(projectile.vy, projectile.vx);

      run.effects.push({
        type: "particle",
        x: projectile.x,
        y: projectile.y,
        vx: -projectile.vx * 0.07 + randomBetween(-12, 12),
        vy: -projectile.vy * 0.07 + randomBetween(-12, 12),
        life: 0.18,
        maxLife: 0.18,
        radius: randomBetween(2.4, 4.8),
        color: projectile.color || "#72eaff"
      });

      if (getDistance(run.player, projectile) < run.player.size + projectile.radius) {
        applyPlayerDamage(projectile.damage, projectile.x, projectile.y, projectile.knockback || 38, 0.58, projectile.color || "#72eaff");
        burstParticles(projectile.x, projectile.y, 9, 34, projectile.color || "#72eaff");
        run.enemyProjectiles.splice(i, 1);
        continue;
      }

      if (projectile.life <= 0) {
        burstParticles(projectile.x, projectile.y, 6, 26, projectile.color || "#72eaff");
        run.enemyProjectiles.splice(i, 1);
      }
    }
  }

  function damageEnemiesAlongSegment(start, end, width, damage, skillId, hitEnemies) {
    run.enemies.forEach((enemy) => {
      if (hitEnemies && hitEnemies.has(enemy)) {
        return;
      }
      const distance = distanceToSegment(enemy, start, end);
      if (distance <= width + enemy.size) {
        damageEnemy(enemy, damage, skillId);
        pushEnemy(enemy, start, Math.max(18, width * 0.9));
        if (hitEnemies) {
          hitEnemies.add(enemy);
        }
      }
    });
  }

  function updateBossSpecialAttack(enemy, dt) {
    if (!enemy.boss || !enemy.attackPattern) {
      return;
    }

    enemy.specialTimer = Math.max(0, (enemy.specialTimer ?? enemy.attackInterval ?? 4.2) - dt);
    const distance = getDistance(run.player, enemy);
    if (enemy.specialTimer > 0 || distance > (enemy.attackRange || 420)) {
      return;
    }

    enemy.specialTimer = (enemy.attackInterval || 4.2) * randomBetween(0.86, 1.16);
    enemy.attackPulse = 0.3;

    if (enemy.attackPattern === "obsidian_spikes") {
      triggerObsidianSpikes(enemy);
      return;
    }
    if (enemy.attackPattern === "storm_bolts") {
      fireStormBolts(enemy);
    }
  }

  function triggerObsidianSpikes(enemy) {
    playSound(enemy.attackSound || "crystal");
    const player = run.player;
    const drift = normalize(player.x - enemy.x, player.y - enemy.y);
    const radius = enemy.attackRadius || 72;
    run.effects.push({
      type: "bossSpikeTelegraph",
      x: player.x + drift.x * 18,
      y: player.y + drift.y * 18,
      life: 0.84,
      maxLife: 0.84,
      delay: 0.5,
      radius,
      damage: enemy.damage * (enemy.attackDamageMultiplier || 1.05),
      sprite: enemy.effectSprite,
      color: "#ff5538",
      triggered: false
    });
  }

  function fireStormBolts(enemy) {
    playSound(enemy.attackSound || "lightning");
    const origin = {
      x: enemy.x + Math.sign(run.player.x - enemy.x || 1) * enemy.size * 0.8,
      y: enemy.y - enemy.size * 0.18
    };
    const baseAngle = Math.atan2(run.player.y - origin.y, run.player.x - origin.x);
    const count = clamp(2 + Math.floor(run.bossKills / 2), 2, 4);
    const spread = count === 2 ? 0.18 : 0.24;
    for (let i = 0; i < count; i += 1) {
      const offset = count === 1 ? 0 : (i - (count - 1) / 2) * spread;
      const angle = baseAngle + offset;
      const speed = enemy.projectileSpeed || 226;
      run.enemyProjectiles.push({
        type: "stormBolt",
        sprite: enemy.projectileSprite,
        x: origin.x,
        y: origin.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        life: 2.35,
        maxLife: 2.35,
        radius: enemy.projectileRadius || 19,
        damage: enemy.damage * (enemy.attackDamageMultiplier || 0.82),
        knockback: 46,
        color: "#72eaff"
      });
    }
    run.effects.push({
      type: "bossCast",
      x: origin.x,
      y: origin.y,
      life: 0.38,
      maxLife: 0.38,
      radius: enemy.size * 1.8,
      color: "#72eaff"
    });
  }

  function updateEnemies(dt) {
    const player = run.player;

    run.enemies.forEach((enemy) => {
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      updateBossSpecialAttack(enemy, dt);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distanceBeforeMove = Math.hypot(dx, dy) || 1;
      const direction = { x: dx / distanceBeforeMove, y: dy / distanceBeforeMove };
      enemy.x += direction.x * enemy.speed * dt;
      enemy.y += direction.y * enemy.speed * dt;
      enemy.wobble += dt * enemy.wobbleSpeed;
      enemy.hitFlash = Math.max(0, (enemy.hitFlash || 0) - dt);
      enemy.attackPulse = Math.max(0, (enemy.attackPulse || 0) - dt);

      const distance = getDistance(player, enemy);
      if (distance < player.size + enemy.size) {
        handleEnemyContact(enemy, distance);
      }
    });

    for (let i = run.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = run.enemies[i];
      if (enemy.hp <= 0) {
        defeatEnemy(enemy);
        run.enemies.splice(i, 1);
      }
    }
  }

  function handleEnemyContact(enemy, distance) {
    const player = run.player;
    const overlap = player.size + enemy.size - distance;
    const direction = normalize(player.x - enemy.x, player.y - enemy.y);
    player.x += direction.x * Math.max(1, overlap * 0.18);
    player.y += direction.y * Math.max(1, overlap * 0.18);
    enemy.x -= direction.x * Math.max(1, overlap * 0.12);
    enemy.y -= direction.y * Math.max(1, overlap * 0.12);

    if (enemy.attackTimer > 0 || player.invulnerable > 0) {
      return;
    }

    const rawDamage = enemy.damage * (enemy.boss ? 0.9 : 0.76);
    const damage = Math.max(2, Math.round(rawDamage - player.armor * 1.7));
    playSound("damage");
    player.hp -= damage;
    player.invulnerable = enemy.boss ? 0.68 : 0.56;
    player.hitFlash = 0.22;
    enemy.attackPulse = 0.2;
    enemy.attackTimer = enemy.boss ? 1.18 : 1.02;
    player.x += direction.x * (enemy.boss ? 40 : 27);
    player.y += direction.y * (enemy.boss ? 40 : 27);
    enemy.x -= direction.x * 12;
    enemy.y -= direction.y * 12;
    run.effects.push({
      type: "hit",
      x: player.x,
      y: player.y,
      life: 0.28,
      maxLife: 0.28,
      radius: 36,
      color: "#e45c34"
    });
  }

  function applyPlayerDamage(rawDamage, sourceX, sourceY, knockback, invulnerableTime, color) {
    const player = run.player;
    if (player.invulnerable > 0) {
      return false;
    }

    const damage = Math.max(2, Math.round(rawDamage - player.armor * 1.6));
    const direction = normalize(player.x - sourceX, player.y - sourceY);
    playSound("damage");
    player.hp -= damage;
    player.invulnerable = invulnerableTime;
    player.hitFlash = 0.24;
    player.x += direction.x * knockback;
    player.y += direction.y * knockback;
    run.effects.push({
      type: "hit",
      x: player.x,
      y: player.y,
      life: 0.3,
      maxLife: 0.3,
      radius: 38,
      color: color || "#e45c34"
    });
    return true;
  }

  function updatePickups(dt) {
    const player = run.player;
    const pickupRange = player.pickupRange || 92;
    const pickupSpeed = 170 + (player.statUpgrades.pickup || 0) * 12;
    run.pickups.forEach((pickup) => {
      const distance = getDistance(player, pickup);
      if (distance < pickupRange) {
        const direction = normalize(player.x - pickup.x, player.y - pickup.y);
        pickup.x += direction.x * pickupSpeed * dt;
        pickup.y += direction.y * pickupSpeed * dt;
      }
    });

    for (let i = run.pickups.length - 1; i >= 0; i -= 1) {
      const pickup = run.pickups[i];
      if (getDistance(player, pickup) < player.size + 15) {
        collectPickup(pickup);
        run.pickups.splice(i, 1);
      }
    }
  }

  function updateEffects(dt) {
    for (let i = run.effects.length - 1; i >= 0; i -= 1) {
      const effect = run.effects[i];
      effect.life -= dt;
      if (effect.type === "bossSpikeTelegraph" && !effect.triggered && effect.life <= effect.maxLife - (effect.delay || 0.5)) {
        effect.triggered = true;
        applyBossAreaDamage(effect);
        burstParticles(effect.x, effect.y, 14, effect.radius, effect.color || "#ff5538");
        effect.type = "bossSpikeBurst";
        effect.life = 0.42;
        effect.maxLife = 0.42;
      }
      if (effect.life <= 0) {
        run.effects.splice(i, 1);
      }
    }
  }

  function applyBossAreaDamage(effect) {
    const distance = getDistance(run.player, effect);
    if (distance <= run.player.size + effect.radius) {
      applyPlayerDamage(effect.damage, effect.x, effect.y, 44, 0.62, effect.color || "#ff5538");
    }
  }

  function updateSpawns(dt) {
    run.spawnTimer -= dt;
    if (run.spawnTimer > 0) {
      return;
    }

    const difficulty = getModeDifficulty();
    const interval = Math.max(0.38, (1.45 - run.elapsed / 240) * (run.mode.spawnIntervalMultiplier || 1) / difficulty);
    run.spawnTimer = interval;
    const count = run.elapsed > 135 ? 3 : run.elapsed > 75 ? 2 : 1;
    for (let i = 0; i < count; i += 1) {
      spawnEnemy(chooseEnemyId());
    }
  }

  function getModeDifficulty() {
    if (!run || run.mode.clearType !== "endless") {
      return 1;
    }
    return 1 + Math.min(2.4, run.elapsed / 360 + run.bossKills * 0.18);
  }

  function updateSpecial(dt) {
    run.special.cooldown = Math.max(0, run.special.cooldown - dt);
    specialButton.disabled = run.special.cooldown > 0;
    specialCooldown.textContent = run.special.cooldown > 0 ? run.special.cooldown.toFixed(1) : "";
  }

  function chooseEnemyId() {
    const table = run.map.spawnTable.filter((item) => run.elapsed >= (item.minElapsed || 0));
    const total = table.reduce((sum, item) => sum + item.weight, 0);
    let roll = Math.random() * total;
    for (const item of table) {
      roll -= item.weight;
      if (roll <= 0) {
        return item.enemyId;
      }
    }
    return table[0].enemyId;
  }

  function spawnEnemy(enemyId) {
    const template = byId(data.enemies, enemyId);
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.max(WIDTH, HEIGHT) * 0.58;
    const difficulty = getModeDifficulty();
    const scale = (1 + run.elapsed / 360) * (run.mode.enemyHpMultiplier || 1) * difficulty;
    run.enemies.push({
      ...template,
      x: run.player.x + Math.cos(angle) * distance,
      y: run.player.y + Math.sin(angle) * distance,
      hp: template.hp * scale,
      maxHp: template.hp * scale,
      speed: template.speed * (1 + run.elapsed / 620) * (run.mode.enemySpeedMultiplier || 1) * Math.min(1.55, 1 + (difficulty - 1) * 0.22),
      damage: template.damage * (1 + run.elapsed / 780) * (run.mode.enemyDamageMultiplier || 1) * Math.min(1.9, 1 + (difficulty - 1) * 0.3),
      wobble: Math.random() * 8,
      wobbleSpeed: 4 + Math.random() * 3,
      attackTimer: 0.65 + Math.random() * 0.35
    });
  }

  function updateBossSpawns() {
    if (run.bossActive) {
      return;
    }

    if (run.mode.clearType === "endless") {
      const schedule = run.mode.endlessBosses || [];
      const next = schedule[run.endlessBossIndex];
      if (next && run.elapsed >= next.at) {
        spawnBoss(next.enemyId || ENEMY_BOSS_ID);
        run.endlessBossIndex += 1;
        return;
      }
      if (!next && !run.nextRandomBossAt) {
        run.nextRandomBossAt = run.elapsed + (run.mode.randomBossInterval || 180);
      }
      if (!next && run.elapsed >= run.nextRandomBossAt) {
        spawnBoss(chooseRandomBossId());
        run.nextRandomBossAt = run.elapsed + Math.max(90, (run.mode.randomBossInterval || 180) - run.bossKills * 8);
      }
      return;
    }

    if (run.elapsed >= run.mode.bossAt && !run.bossSpawned) {
      spawnBoss(ENEMY_BOSS_ID);
    }
  }

  function chooseRandomBossId() {
    const bosses = data.enemies.filter((enemy) => enemy.boss);
    return (bosses[Math.floor(Math.random() * bosses.length)] || byId(data.enemies, ENEMY_BOSS_ID)).id;
  }

  function spawnBoss(enemyId = ENEMY_BOSS_ID) {
    const template = byId(data.enemies, enemyId) || byId(data.enemies, ENEMY_BOSS_ID);
    const difficulty = getModeDifficulty();
    const bossScale = (run.mode.clearType === "endless" ? 1 + run.bossKills * 0.22 + run.elapsed / 900 : 1) * (run.mode.enemyHpMultiplier || 1);
    run.bossSpawned = true;
    run.bossActive = true;
    run.alertText = `${template.name} 出現`;
    run.alertTimer = 3.2;
    run.enemies.push({
      ...template,
      x: run.player.x + WIDTH * 0.62,
      y: run.player.y - HEIGHT * 0.38,
      hp: template.hp * bossScale,
      maxHp: template.hp * bossScale,
      speed: template.speed * (run.mode.enemySpeedMultiplier || 1) * Math.min(1.45, 1 + (difficulty - 1) * 0.18),
      damage: template.damage * (run.mode.enemyDamageMultiplier || 1) * Math.min(1.8, 1 + (difficulty - 1) * 0.26),
      wobble: 0,
      wobbleSpeed: 2.2,
      attackTimer: 1.1,
      specialTimer: (template.attackInterval || 4.2) * randomBetween(0.72, 1.08)
    });
  }

  function triggerSpecial() {
    if (!run || run.screen !== "playing" || run.special.cooldown > 0) {
      return;
    }

    playSound(run.special.effect || run.special.sound || "special");
    if (run.special.effect === "tyrant_crash") {
      performTyrantCrashSpecial();
    } else if (run.special.effect === "inferno_burst") {
      performInfernoBurstSpecial();
    } else if (run.special.effect === "raptor_pounce") {
      performRaptorPounceSpecial();
    } else if (run.special.effect === "guardian_charge") {
      performGuardianChargeSpecial();
    } else if (["gaia_break", "storm_crash", "venom_inferno", "iron_roar"].includes(run.special.effect)) {
      performSpriteRadialSpecial();
    } else {
      performPrimalRoarSpecial();
    }
    run.special.cooldown = run.special.maxCooldown * run.specialCooldownMultiplier;
  }

  function performPrimalRoarSpecial() {
    const radius = run.special.range || 150;
    const damage = (run.special.damage || 62) * run.damageMultiplier;
    run.enemies.forEach((enemy) => {
      const distance = getDistance(run.player, enemy);
      if (distance < radius) {
        const falloff = 1 - distance / radius;
        damageEnemy(enemy, damage * (0.55 + falloff), "special");
        pushEnemy(enemy, run.player, 120 * (0.5 + falloff));
      }
    });

    run.player.attackPulse = 0.28;
    run.effects.push({
      type: "specialBurst",
      x: run.player.x,
      y: run.player.y,
      life: 0.75,
      maxLife: 0.75,
      radius,
      color: "#e45c34",
      sprite: run.special.effectSprite
    });
    burstParticles(run.player.x, run.player.y, 32, radius, "#ffdf72");
  }

  function performRaptorPounceSpecial() {
    const player = run.player;
    const facing = normalize(player.facingX, player.facingY);
    const radius = run.special.range || 190;
    const damage = (run.special.damage || 72) * run.damageMultiplier;
    const lineEnd = { x: player.x + facing.x * radius, y: player.y + facing.y * radius };

    run.enemies.forEach((enemy) => {
      const lineDistance = distanceToSegment(enemy, player, lineEnd);
      if (lineDistance < enemy.size + 42) {
        damageEnemy(enemy, damage * 1.15, "special");
        pushEnemy(enemy, player, 135);
      }
    });

    player.attackPulse = 0.34;
    player.invulnerable = Math.max(player.invulnerable, 0.42);
    run.effects.push({
      type: "specialDash",
      sprite: run.special.effectSprite,
      x: player.x,
      y: player.y,
      dx: facing.x,
      dy: facing.y,
      life: 0.62,
      maxLife: 0.62,
      radius,
      color: "#72dfff"
    });
    sprayParticles(player.x, player.y, facing.x, facing.y, 40, "#72dfff");
  }

  function performGuardianChargeSpecial() {
    const player = run.player;
    const facing = normalize(player.facingX, player.facingY);
    const radius = run.special.range || 170;
    const damage = (run.special.damage || 76) * run.damageMultiplier;
    const lineEnd = { x: player.x + facing.x * radius * 0.82, y: player.y + facing.y * radius * 0.82 };

    run.enemies.forEach((enemy) => {
      const radialDistance = getDistance(player, enemy);
      const lineDistance = distanceToSegment(enemy, player, lineEnd);
      if (lineDistance < enemy.size + 58 || radialDistance < radius * 0.58) {
        const falloff = Math.max(0.35, 1 - radialDistance / radius);
        damageEnemy(enemy, damage * (0.72 + falloff * 0.42), "special");
        pushEnemy(enemy, player, 145 * falloff);
      }
    });

    player.attackPulse = 0.32;
    player.invulnerable = Math.max(player.invulnerable, 0.58);
    run.effects.push({
      type: "guardianWall",
      sprite: run.special.effectSprite,
      x: player.x + facing.x * 22,
      y: player.y + facing.y * 22,
      dx: facing.x,
      dy: facing.y,
      life: 0.72,
      maxLife: 0.72,
      radius,
      color: "#ffdf72",
      sprite: run.special.effectSprite
    });
    burstParticles(player.x, player.y, 34, radius * 0.58, "#ffdf72");
  }

  function performSpriteRadialSpecial() {
    const player = run.player;
    const radius = run.special.range || 180;
    const damage = (run.special.damage || 80) * run.damageMultiplier;
    const color = getSpecialEffectColor(run.special.effect);

    run.enemies.forEach((enemy) => {
      const distance = getDistance(player, enemy);
      if (distance < radius) {
        const falloff = 1 - distance / radius;
        damageEnemy(enemy, damage * (0.55 + falloff * 0.72), "special");
        pushEnemy(enemy, player, 110 * (0.45 + falloff));
      }
    });

    player.attackPulse = 0.34;
    run.effects.push({
      type: "specialBurst",
      sprite: run.special.effectSprite,
      x: player.x,
      y: player.y,
      life: 0.86,
      maxLife: 0.86,
      radius,
      color
    });
    burstParticles(player.x, player.y, 30, radius * 0.68, color);
  }

  function getSpecialEffectColor(effect) {
    return {
      gaia_break: "#9ee35a",
      storm_crash: "#72dfff",
      venom_inferno: "#8cff46",
      iron_roar: "#d8dccb",
      guardian_charge: "#ffdf72",
      raptor_pounce: "#72dfff"
    }[effect] || "#ff7a2d";
  }

  function performTyrantCrashSpecial() {
    const player = run.player;
    const facing = normalize(player.facingX, player.facingY);
    const radius = run.special.range || 205;
    const damage = (run.special.damage || 96) * run.damageMultiplier;
    const lineEnd = {
      x: player.x + facing.x * radius,
      y: player.y + facing.y * radius
    };

    run.enemies.forEach((enemy) => {
      const radialDistance = getDistance(player, enemy);
      const lineDistance = distanceToSegment(enemy, player, lineEnd);
      if (radialDistance < radius * 0.68) {
        const falloff = 1 - radialDistance / (radius * 0.68);
        damageEnemy(enemy, damage * (0.45 + falloff * 0.55), "special");
        pushEnemy(enemy, player, 95 * (0.55 + falloff));
      }
      if (lineDistance < enemy.size + 56) {
        damageEnemy(enemy, damage * 1.22, "special");
        pushEnemy(enemy, player, 150);
      }
    });

    player.attackPulse = 0.36;
    player.invulnerable = Math.max(player.invulnerable, 0.42);
    run.effects.push({
      type: "tyrantShock",
      x: player.x,
      y: player.y,
      dx: facing.x,
      dy: facing.y,
      life: 0.72,
      maxLife: 0.72,
      radius,
      color: "#ffdf72"
    });
    run.effects.push({
      type: "specialBurst",
      x: player.x,
      y: player.y,
      life: 0.9,
      maxLife: 0.9,
      radius: radius * 0.95,
      color: "#f3b13d",
      sprite: run.special.effectSprite
    });
    sprayParticles(player.x, player.y, facing.x, facing.y, 36, "#ffdf72");
    burstParticles(player.x, player.y, 28, radius * 0.7, "#f3b13d");
  }

  function performInfernoBurstSpecial() {
    const player = run.player;
    const radius = run.special.range || 185;
    const damage = (run.special.damage || 82) * run.damageMultiplier;

    run.enemies.forEach((enemy) => {
      const distance = getDistance(player, enemy);
      if (distance < radius) {
        const falloff = 1 - distance / radius;
        damageEnemy(enemy, damage * (0.62 + falloff * 0.72), "special");
        pushEnemy(enemy, player, 92 * (0.4 + falloff));
      }
    });

    const count = 12;
    for (let i = 0; i < count; i += 1) {
      const angle = i * Math.PI * 2 / count + run.elapsed * 0.2;
      const speed = 250;
      run.projectiles.push({
        type: "fireball",
        sprite: run.special.projectileSprite || "assets/effects/projectile-fireball.png",
        skillId: run.special.id,
        x: player.x + Math.cos(angle) * 34,
        y: player.y + Math.sin(angle) * 34,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        angle,
        life: 0.72,
        maxLife: 0.72,
        radius: 22,
        damage: damage * 0.48,
        hitEnemies: new Set()
      });
    }

    player.attackPulse = 0.34;
    run.effects.push({
      type: "infernoWave",
      x: player.x,
      y: player.y,
      life: 0.86,
      maxLife: 0.86,
      radius,
      color: "#ff7a2d",
      sprite: run.special.effectSprite
    });
    run.effects.push({
      type: "specialBurst",
      x: player.x,
      y: player.y,
      life: 1.05,
      maxLife: 1.05,
      radius: radius * 1.15,
      color: "#e45c34",
      sprite: run.special.effectSprite
    });
    burstParticles(player.x, player.y, 56, radius, "#ff7a2d");
  }

  function nearestEnemy(range) {
    let best = null;
    let bestDistance = range;
    run.enemies.forEach((enemy) => {
      const distance = getDistance(run.player, enemy);
      if (distance < bestDistance) {
        best = enemy;
        bestDistance = distance;
      }
    });
    return best;
  }

  function damageEnemy(enemy, amount, type) {
    enemy.hp -= amount;
    enemy.hitFlash = 0.12;
    enemy.attackPulse = Math.max(enemy.attackPulse || 0, type === "special" ? 0.18 : 0.1);
    if (type !== "aura") {
      run.effects.push({
        type: "spark",
        x: enemy.x,
        y: enemy.y,
        life: 0.16,
        maxLife: 0.16,
        radius: enemy.size + 12,
        color: type === "special" ? "#ffdf72" : "#fff3c2"
      });
    }
  }

  function defeatEnemy(enemy) {
    run.dnaRun += enemy.dna || 0;
    addPickup("dna_shard", enemy.x, enemy.y);
    const meatDropRate = run.mode.id === "hard" ? 0.045 : run.mode.clearType === "endless" ? 0.05 : 0.07;
    if (Math.random() < meatDropRate && !enemy.boss) {
      addPickup("meat", enemy.x + randomBetween(-18, 18), enemy.y + randomBetween(-18, 18));
    }

    if (enemy.boss) {
      run.bossDefeated = true;
      run.bossActive = false;
      run.bossKills += 1;
      run.alertText = "ボス撃破";
      run.alertTimer = 2.4;
      for (let i = 0; i < 6; i += 1) {
        addPickup("dna_shard", enemy.x + randomBetween(-45, 45), enemy.y + randomBetween(-45, 45));
      }
      if (run.mode.clearType === "boss") {
        finishRun(true);
        return;
      }
      if (!run.evolved) {
        triggerEvolution();
      }
    }
  }

  function addPickup(itemId, x, y) {
    const template = byId(data.items, itemId);
    run.pickups.push({
      ...template,
      x,
      y,
      pulse: Math.random() * Math.PI * 2
    });
  }

  function collectPickup(pickup) {
    const effect = pickup.effect;
    if (effect.heal) {
      playSound("heal");
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + effect.heal);
      run.effects.push({
        type: "spark",
        x: run.player.x,
        y: run.player.y,
        life: 0.3,
        maxLife: 0.3,
        radius: 40,
        color: "#77d870"
      });
    }
    if (effect.xp) {
      playSound("pickup");
      gainXp(effect.xp * (run.mode.xpMultiplier || 1));
    }
    if (effect.dna) {
      run.dnaRun += effect.dna;
    }
  }

  function gainXp(amount) {
    run.xp += amount;
    while (run.xp >= run.xpToNext && run.screen === "playing") {
      run.xp -= run.xpToNext;
      run.level += 1;
      run.xpToNext = Math.floor(24 + run.level * 9 + run.level * run.level);
      playSound("level");
      triggerLevelUp();
    }
  }

  function triggerLevelUp() {
    run.screen = "levelup";
    setControlsVisible(false);
    const choices = chooseLevelUpChoices(buildLevelUpChoices(), 3);
    const cards = choices.map(renderLevelUpChoice).join("");

    panel.innerHTML = `
      <h2>スキル習得</h2>
      <p>Lv${run.level} 到達</p>
      <div class="cards">${cards}</div>
    `;
    showOverlay();

    panel.querySelectorAll("[data-skill]").forEach((button) => {
      button.addEventListener("click", () => {
        const skill = run.skills.find((item) => item.id === button.dataset.skill);
        skill.level += 1;
        completeLevelUpSelection();
      });
    });

    panel.querySelectorAll("[data-learn]").forEach((button) => {
      button.addEventListener("click", () => {
        if (run.skills.length < 3) {
          run.skills.push(createSkill(button.dataset.learn));
        }
        completeLevelUpSelection();
      });
    });

    panel.querySelectorAll("[data-stat]").forEach((button) => {
      button.addEventListener("click", () => {
        applyStatUpgrade(button.dataset.stat);
        completeLevelUpSelection();
      });
    });

    panel.querySelectorAll("[data-heal]").forEach((button) => {
      button.addEventListener("click", () => {
        healPlayerByRatio(0.35);
        completeLevelUpSelection();
      });
    });
  }

  function buildLevelUpChoices() {
    const choices = [];
    if (run.skills.length < 3) {
      run.skillPool
      .filter((id) => !run.skills.some((skill) => skill.id === id))
      .forEach((id) => {
        const skill = byId(data.skills, id);
        choices.push({
          type: "learn",
          id: skill.id,
          title: `${skill.name} を習得`,
          description: skill.description,
          icon: skill.icon
        });
      });
    }

    let hasMaxedSkill = false;
    run.skills.forEach((skill) => {
      if (skill.level < skill.maxLevel) {
        choices.push({
          type: "skill",
          id: skill.id,
          title: `${skill.name} Lv${skill.level} → Lv${skill.level + 1}`,
          description: skill.description,
          icon: skill.icon
        });
      } else {
        hasMaxedSkill = true;
      }
    });

    if (hasMaxedSkill) {
      choices.push(createHealChoice());
    }

    choices.push(...getStatUpgradeChoices());
    return choices;
  }

  function chooseLevelUpChoices(choices, count) {
    const picked = shuffle(choices).slice(0, count);
    while (picked.length < count) {
      picked.push(createHealChoice());
    }
    return picked;
  }

  function renderLevelUpChoice(choice) {
    if (choice.type === "learn") {
      return createChoiceCard("data-learn", choice.id, choice);
    }
    if (choice.type === "skill") {
      return createChoiceCard("data-skill", choice.id, choice);
    }
    if (choice.type === "stat") {
      return createChoiceCard("data-stat", choice.id, choice, "stat-card-button");
    }
    return createChoiceCard("data-heal", choice.id, choice);
  }

  function createChoiceCard(attribute, value, choice, extraClass = "") {
    return `
      <button class="card-button skill-card-button ${extraClass}" type="button" ${attribute}="${value}">
        <img class="skill-card-icon" src="${withVersion(choice.icon)}" alt="">
        <span class="skill-card-copy">
          <strong>${choice.title}</strong>
          <span>${choice.description}</span>
        </span>
      </button>
    `;
  }

  function getStatUpgradeChoices() {
    return [
      {
        id: "hp",
        title: "最大HPアップ",
        description: "最大HPを増やし、増加分だけ回復する。",
        icon: "assets/upgrades/upgrade-hp.png"
      },
      {
        id: "damage",
        title: "攻撃力アップ",
        description: "通常技・スキル・必殺技の基礎火力を底上げする。",
        icon: "assets/upgrades/upgrade-damage.png"
      },
      {
        id: "speed",
        title: "スピードアップ",
        description: "移動速度を上げ、敵との距離を取りやすくする。",
        icon: "assets/upgrades/upgrade-speed.png"
      },
      {
        id: "pickup",
        title: "回収範囲アップ",
        description: "DNA結晶や肉を引き寄せる範囲を広げる。",
        icon: "assets/upgrades/upgrade-pickup.png"
      }
    ].map((choice) => ({ ...choice, type: "stat" }));
  }

  function createHealChoice() {
    return {
      type: "heal",
      id: `heal-${run.level}-${Math.random().toString(36).slice(2)}`,
      title: "HP回復",
      description: "最大HPの35%を回復する。",
      icon: "assets/upgrades/upgrade-hp.png"
    };
  }

  function applyStatUpgrade(type) {
    const upgrades = run.player.statUpgrades;
    if (type === "hp") {
      const amount = 18 + run.level * 3;
      run.player.maxHp += amount;
      run.player.hp = Math.min(run.player.maxHp, run.player.hp + amount);
      upgrades.hp += 1;
      run.alertText = `最大HP +${amount}`;
    } else if (type === "damage") {
      const amount = 2 + Math.floor(run.level / 4);
      run.player.damage += amount;
      upgrades.damage += 1;
      run.alertText = `攻撃力 +${amount}`;
    } else if (type === "speed") {
      const amount = 5;
      run.player.speed += amount;
      upgrades.speed += 1;
      run.alertText = `速度 +${amount}`;
    } else if (type === "pickup") {
      const amount = 24;
      run.player.pickupRange += amount;
      upgrades.pickup += 1;
      run.alertText = `回収範囲 +${amount}`;
    }
    run.alertTimer = 1.7;
  }

  function healPlayerByRatio(ratio) {
    run.player.hp = Math.min(run.player.maxHp, run.player.hp + run.player.maxHp * ratio);
  }

  function completeLevelUpSelection() {
    const evolutions = getEligibleEvolutions();
    if (evolutions.length) {
      triggerEvolution(evolutions);
      return;
    }
    resumePlaying();
  }

  function getEligibleEvolutions() {
    if (!run || run.evolved) {
      return [];
    }
    return data.evolutions.filter((item) => item.baseDinosaur === run.dinosaur.id && isEvolutionUnlocked(item));
  }

  function isEvolutionUnlocked(evolution) {
    const requirements = evolution.requirements || {};
    const requiredLevel = requirements.level || parseLevelCondition(evolution.condition);
    if (requiredLevel && run.level < requiredLevel) {
      return false;
    }
    if (requirements.skills && !requirements.skills.every((id) => hasSkill(id))) {
      return false;
    }
    if (requirements.anySkills && !requirements.anySkills.some((id) => hasSkill(id))) {
      return false;
    }
    if (requirements.skillLevels) {
      const entries = Object.entries(requirements.skillLevels);
      if (!entries.every(([id, level]) => getSkillLevel(id) >= level)) {
        return false;
      }
    }
    if (requirements.anySkillLevels) {
      const entries = Object.entries(requirements.anySkillLevels);
      if (!entries.some(([id, level]) => getSkillLevel(id) >= level)) {
        return false;
      }
    }
    return true;
  }

  function parseLevelCondition(condition) {
    const match = String(condition || "").match(/Lv\s*(\d+)/i);
    return match ? Number(match[1]) : 0;
  }

  function hasSkill(id) {
    return run.skills.some((skill) => skill.id === id);
  }

  function getSkillLevel(id) {
    const skill = run.skills.find((item) => item.id === id);
    return skill ? skill.level : 0;
  }

  function triggerEvolution(eligibleEvolutions = getEligibleEvolutions()) {
    if (!eligibleEvolutions.length) {
      return false;
    }
    run.screen = "evolution";
    setControlsVisible(false);
    endActiveJoystick();
    const cards = eligibleEvolutions.map((evolution) => `
      <button class="card-button evolution-card-button" type="button" data-evolution="${evolution.id}">
        ${evolution.icon ? `<img class="evolution-card-icon" src="${withVersion(evolution.icon)}" alt="">` : ""}
        <span class="evolution-card-copy">
          <strong>${evolution.name}</strong>
          <span>${evolution.description}</span>
          <small>${evolution.condition}</small>
        </span>
      </button>
    `).join("");

    panel.innerHTML = `
      <h2>進化選択</h2>
      <p>条件を満たした進化先を選択してください。</p>
      <div class="cards">${cards}</div>
    `;
    showOverlay();

    panel.querySelectorAll("[data-evolution]").forEach((button) => {
      button.addEventListener("click", () => {
        const evolution = byId(data.evolutions, button.dataset.evolution);
        startEvolutionSequence(evolution);
      });
    });
    return true;
  }

  function startEvolutionSequence(evolution) {
    hideOverlay();
    endActiveJoystick();
    setControlsVisible(false);
    run.screen = "evolving";
    run.evolutionSequence = {
      evolution,
      elapsed: 0,
      duration: 1.55,
      applied: false
    };
    run.player.invulnerable = Math.max(run.player.invulnerable, 1.7);
    run.alertText = "進化開始";
    run.alertTimer = 1.1;
    run.effects.push({
      type: "ring",
      x: run.player.x,
      y: run.player.y,
      life: 0.8,
      maxLife: 0.8,
      radius: 118,
      color: "#60d5c8"
    });
    run.effects.push({
      type: "specialBurst",
      x: run.player.x,
      y: run.player.y,
      life: 0.82,
      maxLife: 0.82,
      radius: 136,
      color: "#ffdf72"
    });
  }

  function updateEvolutionSequence(dt) {
    const sequence = run.evolutionSequence;
    if (!sequence) {
      resumePlaying();
      return;
    }

    run.alertTimer = Math.max(0, run.alertTimer - dt);
    sequence.elapsed += dt;
    run.player.movePhase += dt * SPRITE_MOTION.player.cadence * 0.35;
    run.player.attackPulse = Math.max(run.player.attackPulse || 0, 0.12);

    if (Math.random() < 0.82) {
      const progress = clamp(sequence.elapsed / sequence.duration, 0, 1);
      const angle = run.elapsed * 8 + progress * Math.PI * 6 + Math.random() * 0.7;
      const radius = randomBetween(34, 92) * (1 - progress * 0.35);
      const x = run.player.x + Math.cos(angle) * radius;
      const y = run.player.y + Math.sin(angle) * radius;
      run.effects.push({
        type: "particle",
        x,
        y,
        vx: (run.player.x - x) * 1.6,
        vy: (run.player.y - y) * 1.6,
        life: 0.34,
        maxLife: 0.34,
        radius: randomBetween(2.6, 5.2),
        color: sequence.evolution.id === "blaze_rex" ? "#ff7a2d" : "#ffdf72"
      });
    }

    if (!sequence.applied && sequence.elapsed >= 0.72) {
      applyEvolution(sequence.evolution);
      sequence.applied = true;
      run.effects.push({
        type: "specialBurst",
        x: run.player.x,
        y: run.player.y,
        life: 0.95,
        maxLife: 0.95,
        radius: 174,
        color: sequence.evolution.id === "blaze_rex" ? "#e45c34" : "#f3b13d"
      });
      burstParticles(run.player.x, run.player.y, 34, 130, sequence.evolution.id === "blaze_rex" ? "#ff7a2d" : "#ffdf72");
    }

    updateEffects(dt);
    if (sequence.elapsed >= sequence.duration) {
      run.evolutionSequence = null;
      resumePlaying();
    }
  }

  function applyEvolution(evolution) {
    const effects = evolution.effects;
    const hpRatio = run.player.hp / run.player.maxHp;
    run.evolved = evolution;
    run.player.evolutionSprite = evolution.sprite || null;
    run.player.displayScale = evolution.displayScale || 1;
    playSound("evolve");
    run.damageMultiplier *= effects.damageMultiplier || 1;
    run.speedMultiplier *= effects.speedMultiplier || 1;
    run.specialCooldownMultiplier *= effects.specialCooldownMultiplier || 1;
    run.auraDamage = effects.auraDamage || 0;
    if (evolution.special) {
      run.special = {
        ...run.special,
        ...evolution.special,
        cooldown: 0,
        maxCooldown: evolution.special.cooldown || run.special.maxCooldown
      };
      configureSpecialButton();
    }
    run.player.maxHp = Math.floor(run.player.maxHp * (effects.hpMultiplier || 1));
    run.player.hp = Math.min(run.player.maxHp, Math.floor(run.player.maxHp * hpRatio + 28));
    run.alertText = `${evolution.name} へ進化`;
    run.alertTimer = 2.8;

    if (!meta.discoveredEvolutions.includes(evolution.id)) {
      meta.discoveredEvolutions.push(evolution.id);
      saveMeta();
    }
  }

  function resumePlaying() {
    hideOverlay();
    setControlsVisible(true);
    run.screen = "playing";
  }

  function showSkillDetail(slot) {
    if (!run || run.screen !== "playing") {
      return;
    }

    run.screen = "skillDetail";
    endActiveJoystick();
    setControlsVisible(false);
    const levelText = slot.isBasic ? "通常技" : `Lv${slot.level}`;
    panel.innerHTML = `
      ${slot.icon ? `<img class="skill-detail-icon" src="${slot.icon}" alt="">` : ""}
      <h2>${slot.fullName || slot.name}</h2>
      <p>${levelText} / ${getSkillTypeLabel(slot.type)}</p>
      <div class="stats-grid">
        <div class="stat-tile"><b>${slot.damage}</b><span>基礎威力</span></div>
        <div class="stat-tile"><b>${slot.range}</b><span>射程</span></div>
        <div class="stat-tile"><b>${slot.cooldown.toFixed(1)}秒</b><span>間隔</span></div>
        <div class="stat-tile"><b>${slot.maxLevel || "-"}</b><span>最大Lv</span></div>
      </div>
      <p>${slot.description}</p>
      <div class="button-row">
        <button id="resumeButton" class="primary-button" type="button">再開</button>
      </div>
    `;
    showOverlay();
    document.getElementById("resumeButton").addEventListener("click", resumePlaying);
  }

  function getSkillTypeLabel(type) {
    return {
      target: "単体攻撃",
      area: "範囲攻撃",
      line: "直線攻撃",
      cone: "扇形攻撃"
    }[type] || "スキル";
  }

  function finishRun(victory) {
    if (run.saved) {
      return;
    }

    run.saved = true;
    run.screen = "gameover";
    setControlsVisible(false);
    meta.dna += run.dnaRun;
    meta.runs += 1;
    if (victory && run.mode.clearType === "boss") {
      meta.clears[getClearKey(run.map.id, run.mode.id)] = true;
    }
    if (run.mode.clearType === "endless") {
      meta.endlessBestTime = Math.max(meta.endlessBestTime || 0, run.elapsed);
      meta.endlessBestBosses = Math.max(meta.endlessBestBosses || 0, run.bossKills);
      const record = meta.endlessRecords[run.map.id] || { time: 0, bosses: 0 };
      meta.endlessRecords[run.map.id] = {
        time: Math.max(Number(record.time || 0), run.elapsed),
        bosses: Math.max(Number(record.bosses || 0), run.bossKills)
      };
    }
    saveMeta();
    playSound(victory ? "clear" : "result");

    panel.innerHTML = `
      <h2>${victory ? "討伐成功" : "探索終了"}</h2>
      <p>${run.map.name} / ${run.mode.name}</p>
      <div class="stats-grid">
        <div class="stat-tile"><b>${formatTime(run.elapsed)}</b><span>生存時間</span></div>
        <div class="stat-tile"><b>${run.dnaRun}</b><span>獲得DNA</span></div>
        <div class="stat-tile"><b>Lv${run.level}</b><span>到達レベル</span></div>
        <div class="stat-tile"><b>${run.bossKills}</b><span>ボス撃破</span></div>
      </div>
      <div class="button-row">
        <button id="restartButton" class="primary-button" type="button">再挑戦</button>
        <button id="titleButton" class="secondary-button" type="button">タイトルへ</button>
      </div>
    `;
    showOverlay();
    document.getElementById("restartButton").addEventListener("click", () => createRun(run.mode.id, run.map.id, run.dinosaur.id));
    document.getElementById("titleButton").addEventListener("click", showTitle);
  }

  function getClearKey(mapId, modeId) {
    return `${mapId}:${modeId}`;
  }

  function togglePause() {
    if (!run) {
      return;
    }

    if (run.screen === "playing") {
      run.screen = "paused";
      setControlsVisible(false);
      panel.innerHTML = `
        <h2>一時停止</h2>
        <p>${run.map.name} / ${formatTime(run.elapsed)}</p>
        ${volumeControlsHtml()}
        <div class="button-row">
          <button id="resumeButton" class="primary-button" type="button">再開</button>
          <button id="quitButton" class="secondary-button" type="button">探索終了</button>
        </div>
      `;
      showOverlay();
      bindVolumeControls();
      document.getElementById("resumeButton").addEventListener("click", resumePlaying);
      document.getElementById("quitButton").addEventListener("click", () => finishRun(false));
      return;
    }

    if (run.screen === "paused") {
      resumePlaying();
    }
  }

  function showLoading() {
    setControlsVisible(false);
    panel.innerHTML = `
      <div class="brand-kicker">DINO RUSH: EVOLUTION</div>
      <h1>ロード中</h1>
      <p>DNAデータを解析しています。</p>
    `;
    showOverlay();
  }

  function isModeUnlocked(mapId, modeId) {
    if (modeId === "normal") {
      const mapIndex = data.maps.findIndex((map) => map.id === mapId);
      if (mapIndex <= 0) {
        return true;
      }
      const previousMap = data.maps[mapIndex - 1];
      return Boolean(previousMap && meta.clears[getClearKey(previousMap.id, "hard")]);
    }
    if (modeId === "hard") {
      return Boolean(meta.clears[getClearKey(mapId, "normal")]);
    }
    if (modeId === "endless") {
      return Boolean(meta.clears[getClearKey(mapId, "hard")]);
    }
    return false;
  }

  function getModeStatusText(mapId, mode) {
    if (!isModeUnlocked(mapId, mode.id)) {
      return mode.id === "hard" ? "\u30ce\u30fc\u30de\u30eb\u30af\u30ea\u30a2\u3067\u89e3\u653e" : "\u30cf\u30fc\u30c9\u30af\u30ea\u30a2\u3067\u89e3\u653e";
    }
    if (mode.clearType === "endless") {
      const time = formatTime(meta.endlessBestTime || 0);
      const bosses = meta.endlessBestBosses || 0;
      return bosses > 0 ? `\u6700\u9ad8 ${time} / \u30dc\u30b9${bosses}\u4f53` : "\u30cf\u30a4\u30b9\u30b3\u30a2\u672a\u8a18\u9332";
    }
    return meta.clears[getClearKey(mapId, mode.id)] ? "\u30af\u30ea\u30a2\u6e08\u307f" : "\u672a\u30af\u30ea\u30a2";
  }

  function volumeControlsHtml() {
    return `
      <div class="volume-controls">
        <label class="volume-control">
          <span>BGM音量 <b data-volume-label="bgm">${Math.round(getBgmVolume() * 100)}</b></span>
          <input data-volume-input="bgm" type="range" min="0" max="100" step="1" value="${Math.round(getBgmVolume() * 100)}">
        </label>
        <label class="volume-control">
          <span>効果音音量 <b data-volume-label="sfx">${Math.round(getSfxVolume() * 100)}</b></span>
          <input data-volume-input="sfx" type="range" min="0" max="100" step="1" value="${Math.round(getSfxVolume() * 100)}">
        </label>
      </div>
    `;
  }

  function bindVolumeControls() {
    panel.querySelectorAll("[data-volume-input]").forEach((input) => {
      input.addEventListener("input", () => {
        const kind = input.dataset.volumeInput;
        const value = clampVolume(Number(input.value) / 100, kind === "bgm" ? 0.72 : 0.78);
        if (kind === "bgm") {
          meta.settings.bgmVolume = value;
        } else {
          meta.settings.sfxVolume = value;
          playSound("ui");
        }
        const label = panel.querySelector(`[data-volume-label="${kind}"]`);
        if (label) {
          label.textContent = Math.round(value * 100);
        }
        updateLiveAudioVolumes();
        saveMeta();
      });
    });
  }

  function showTitle() {
    clearTitleOpenHomeHandler();
    stopTitleVideo();
    run = null;
    stopAudio();
    setControlsVisible(false);
    setPanelVariant("title");
    panel.innerHTML = `
      <div class="title-hero-screen" style="background-image: url('${withVersion("assets/ui/title-hero-20260509.png")}')">
        <video id="titleVideo" class="title-hero-video" autoplay muted loop playsinline preload="auto" poster="${withVersion("assets/ui/title-hero-20260509.png")}">
          <source src="${withVersion("assets/ui/titlemovie.mp4")}" type="video/mp4">
        </video>
        <div class="title-hero-shade"></div>
        <div class="title-hero-copy">
          <div class="brand-kicker">DINO RUSH: EVOLUTION</div>
          <h1>DINO RUSH:<br>EVOLUTION</h1>
          <button id="titleStartButton" class="primary-button title-start" type="button">START</button>
          <button id="titleAudioButton" class="secondary-button title-audio-button" type="button">音声 OFF</button>
          <small>\u753b\u9762\u30bf\u30c3\u30d7\u3067\u30db\u30fc\u30e0\u3078</small>
        </div>
      </div>
    `;
    showOverlay();

    const titleVideo = document.getElementById("titleVideo");
    armTitleVideoAudio(titleVideo);
    const titleAudioButton = document.getElementById("titleAudioButton");
    updateTitleAudioButton(titleVideo, titleAudioButton);
    titleAudioButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const nextAudioEnabled = !(meta.settings.audio && titleVideo && !titleVideo.muted);
      meta.settings.audio = nextAudioEnabled;
      saveMeta();
      setTitleVideoAudio(titleVideo, nextAudioEnabled);
      updateTitleAudioButton(titleVideo, titleAudioButton);
    });
    const openHome = () => {
      clearTitleOpenHomeHandler();
      showHome();
    };
    document.getElementById("titleStartButton").addEventListener("click", (event) => {
      event.stopPropagation();
      openHome();
    });
    titleOpenHomeHandler = (event) => {
      if (event.target.closest("#titleAudioButton")) {
        return;
      }
      openHome();
    };
    overlay.addEventListener("click", titleOpenHomeHandler);
  }

  function clearTitleOpenHomeHandler() {
    if (titleOpenHomeHandler) {
      overlay.removeEventListener("click", titleOpenHomeHandler);
      titleOpenHomeHandler = null;
    }
  }

  function armTitleVideoAudio(video) {
    if (!video) {
      return;
    }
    titleVideoRef = video;
    video.muted = true;
    video.volume = meta.settings.audio ? 0.62 * getBgmVolume() : 0;
    video.play().catch(() => {});

    if (titleVideoUnlockHandler) {
      window.removeEventListener("keydown", titleVideoUnlockHandler, true);
    }
    titleVideoUnlockHandler = () => setTitleVideoAudio(video, meta.settings.audio);

    window.addEventListener("keydown", titleVideoUnlockHandler, { once: true, capture: true });
  }

  function setTitleVideoAudio(video, enabled) {
    if (!video || !video.isConnected || video !== titleVideoRef) {
      return;
    }
    video.muted = !enabled;
    video.volume = enabled ? 0.62 * getBgmVolume() : 0;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => {});
    });
  }

  function updateTitleAudioButton(video, button) {
    if (!button) {
      return;
    }
    const audioOn = Boolean(meta.settings.audio && video && !video.muted);
    button.textContent = audioOn ? "音声 ON" : "音声 OFF";
    button.classList.toggle("is-active", audioOn);
  }

  function stopTitleVideo() {
    clearTitleOpenHomeHandler();
    if (titleVideoUnlockHandler) {
      window.removeEventListener("keydown", titleVideoUnlockHandler, true);
      titleVideoUnlockHandler = null;
    }
    const video = titleVideoRef || document.getElementById("titleVideo");
    if (video) {
      video.pause();
      video.muted = true;
      video.currentTime = 0;
      video.removeAttribute("src");
      video.querySelectorAll("source").forEach((source) => source.removeAttribute("src"));
      video.load();
    }
    titleVideoRef = null;
  }

  function showHome() {
    stopTitleVideo();
    run = null;
    stopAudio();
    setControlsVisible(false);
    setPanelVariant();
    panel.innerHTML = `
      <div class="brand-kicker">\u30db\u30fc\u30e0</div>
      <div class="home-menu">
        <button id="stageButton" class="card-button home-menu-button" type="button">
          <img class="home-menu-icon" src="${withVersion("assets/ui/home-stage-icon-20260509.png")}" alt="">
          <strong>\u30b9\u30c6\u30fc\u30b8</strong>
        </button>
        <button id="shopButton" class="card-button home-menu-button" type="button">
          <img class="home-menu-icon" src="${withVersion("assets/items/item-dna-stylized.png")}" alt="">
          <strong>\u30b7\u30e7\u30c3\u30d7</strong>
        </button>
        <button id="codexButton" class="card-button home-menu-button" type="button">
          <img class="home-menu-icon" src="${withVersion("assets/characters/tyranno-game-sample-sprite.png")}" alt="">
          <strong>\u56f3\u9451</strong>
        </button>
        <button id="scoreButton" class="card-button home-menu-button" type="button">
          <img class="home-menu-icon" src="${withVersion("assets/specials/special-primal-roar.png")}" alt="">
          <strong>\u30cf\u30a4\u30b9\u30b3\u30a2</strong>
        </button>
        <button id="settingsButton" class="card-button home-menu-button" type="button">
          <img class="home-menu-icon" src="${withVersion("assets/upgrades/upgrade-speed.png")}" alt="">
          <strong>\u8a2d\u5b9a</strong>
        </button>
      </div>
    `;
    showOverlay();
    startHomeAudio();
    document.getElementById("stageButton").addEventListener("click", showStageSelect);
    document.getElementById("shopButton").addEventListener("click", showShop);
    document.getElementById("codexButton").addEventListener("click", showCodex);
    document.getElementById("scoreButton").addEventListener("click", showHighScores);
    document.getElementById("settingsButton").addEventListener("click", showSettings);
  }

  function showStageSelect() {
    run = null;
    setControlsVisible(false);
    setPanelVariant();
    const availableMaps = data.maps.filter((map) => isModeUnlocked(map.id, "normal"));
    const fallbackMap = availableMaps[0] || data.maps[0] || byId(data.maps, "triassic");
    const selectedMapId = availableMaps.some((map) => map.id === meta.selectedMap) ? meta.selectedMap : fallbackMap.id;
    const map = byId(data.maps, selectedMapId) || fallbackMap;
    meta.selectedMap = map.id;
    saveMeta();

    const mapCards = data.maps.map((stage) => {
      const unlocked = isModeUnlocked(stage.id, "normal");
      const selected = stage.id === map.id;
      const hardClear = meta.clears[getClearKey(stage.id, "hard")];
      const status = unlocked ? (hardClear ? "\u30cf\u30fc\u30c9\u30af\u30ea\u30a2\u6e08\u307f" : selected ? "\u9078\u629e\u4e2d" : "\u51fa\u6483\u53ef\u80fd") : "\u524d\u30b9\u30c6\u30fc\u30b8\u306e\u30cf\u30fc\u30c9\u30af\u30ea\u30a2\u3067\u89e3\u653e";
      return `
        <button class="card-button stage-card-button ${selected ? "is-selected" : ""}" type="button" data-map="${stage.id}" ${unlocked ? "" : "disabled"}>
          <img class="stage-card-thumb" src="${withVersion(stage.background)}" alt="">
          <strong>${stage.name}</strong>
          <small>${status}</small>
        </button>
      `;
    }).join("");

    const purchasedDinosaurs = data.dinosaurs.filter((dinosaur) => meta.unlockedDinosaurs.includes(dinosaur.id));
    if (!purchasedDinosaurs.some((dinosaur) => dinosaur.id === meta.selectedDinosaur)) {
      meta.selectedDinosaur = purchasedDinosaurs[0] ? purchasedDinosaurs[0].id : "tyranno";
      saveMeta();
    }
    const dinosaurCards = purchasedDinosaurs.map((dinosaur) => {
      const selected = meta.selectedDinosaur === dinosaur.id;
      return `
        <button class="card-button dinosaur-scroll-card ${selected ? "is-selected" : ""}" type="button" data-dinosaur="${dinosaur.id}">
          <img class="dinosaur-scroll-icon" src="${withVersion(dinosaur.icon || dinosaur.sprite)}" alt="">
          <strong>${dinosaur.name}</strong>
          <small>${dinosaur.role}</small>
        </button>
      `;
    }).join("");

    const modeCards = data.modes.map((mode) => {
      const unlocked = isModeUnlocked(map.id, mode.id);
      return `
        <button class="card-button mode-card-button" type="button" data-mode="${mode.id}" ${unlocked ? "" : "disabled"}>
          <strong>${mode.name}</strong>
          <span>${mode.description}</span>
          <small>${getModeStatusText(map.id, mode)}</small>
        </button>
      `;
    }).join("");

    panel.innerHTML = `
      ${panelHeader("\u30b9\u30c6\u30fc\u30b8\u9078\u629e")}
      <div class="section-label">\u30b9\u30c6\u30fc\u30b8</div>
      <div class="horizontal-scroll stage-scroll">${mapCards}</div>
      <div class="section-label">\u4f7f\u7528\u6050\u7adc</div>
      <div class="horizontal-scroll dinosaur-scroll">${dinosaurCards}</div>
      <div class="section-label">\u30e2\u30fc\u30c9</div>
      <div class="cards compact-mode-list">${modeCards}</div>
    `;
    showOverlay();
    bindPanelHomeButtons();
    const selectMap = (button) => {
      meta.selectedMap = button.dataset.map;
      saveMeta();
      showStageSelect();
    };
    const selectDinosaur = (button) => {
      meta.selectedDinosaur = button.dataset.dinosaur;
      saveMeta();
      panel.querySelectorAll("[data-dinosaur]").forEach((card) => {
        card.classList.toggle("is-selected", card.dataset.dinosaur === meta.selectedDinosaur);
      });
    };
    bindDragScroll(panel.querySelector(".stage-scroll"), "[data-map]", selectMap);
    bindDragScroll(panel.querySelector(".dinosaur-scroll"), "[data-dinosaur]", selectDinosaur);
    panel.querySelectorAll("[data-map]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.pointerTapHandled === "true") {
          button.dataset.pointerTapHandled = "false";
          return;
        }
        selectMap(button);
      });
    });
    panel.querySelectorAll("[data-dinosaur]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.pointerTapHandled === "true") {
          button.dataset.pointerTapHandled = "false";
          return;
        }
        selectDinosaur(button);
      });
    });
    panel.querySelectorAll("[data-mode]").forEach((button) => {
      button.addEventListener("click", () => createRun(button.dataset.mode, map.id, meta.selectedDinosaur));
    });
  }

  function bindDragScroll(scroller, tapSelector, onTap) {
    if (!scroller) {
      return;
    }
    let pointerId = null;
    let startX = 0;
    let scrollLeft = 0;
    let dragging = false;
    let startButton = null;

    scroller.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }
      pointerId = event.pointerId;
      startX = event.clientX;
      scrollLeft = scroller.scrollLeft;
      dragging = false;
      startButton = tapSelector ? event.target.closest(tapSelector) : null;
      scroller.classList.add("is-dragging");
      if (scroller.setPointerCapture) {
        scroller.setPointerCapture(pointerId);
      }
    });

    scroller.addEventListener("pointermove", (event) => {
      if (pointerId !== event.pointerId) {
        return;
      }
      const deltaX = event.clientX - startX;
      if (Math.abs(deltaX) > 6) {
        dragging = true;
      }
      if (dragging) {
        scroller.scrollLeft = scrollLeft - deltaX;
        event.preventDefault();
      }
    });

    const finishDrag = (event) => {
      if (pointerId !== event.pointerId) {
        return;
      }
      const wasDragging = dragging;
      const tapButton = startButton;
      if (wasDragging) {
        scroller.dataset.suppressClick = "true";
        window.setTimeout(() => {
          scroller.dataset.suppressClick = "false";
        }, 0);
      }
      scroller.classList.remove("is-dragging");
      if (scroller.releasePointerCapture) {
        scroller.releasePointerCapture(pointerId);
      }
      pointerId = null;
      startButton = null;
      if (!wasDragging && tapButton && scroller.contains(tapButton) && !tapButton.disabled && onTap) {
        event.preventDefault();
        tapButton.dataset.pointerTapHandled = "true";
        onTap(tapButton);
      }
    };

    scroller.addEventListener("click", (event) => {
      if (scroller.dataset.suppressClick === "true") {
        event.preventDefault();
        event.stopPropagation();
        scroller.dataset.suppressClick = "false";
      }
    }, true);
    scroller.addEventListener("pointerup", finishDrag);
    scroller.addEventListener("pointercancel", finishDrag);
    scroller.addEventListener("pointerleave", (event) => {
      if (pointerId === event.pointerId && dragging) {
        finishDrag(event);
      }
    });
  }

  function showShop() {
    run = null;
    setControlsVisible(false);
    setPanelVariant();
    const skillCards = data.skills
      .filter((skill) => skill.unlockCost)
      .map((skill) => {
        const unlocked = meta.unlockedSkills.includes(skill.id);
        const affordable = meta.dna >= skill.unlockCost;
        const status = unlocked ? "\u89e3\u653e\u6e08\u307f" : `${skill.unlockCost} DNA`;
        return `
          <button class="card-button skill-card-button shop-card-button" type="button" data-buy-skill="${skill.id}" ${unlocked || !affordable ? "disabled" : ""}>
            <img class="skill-card-icon" src="${withVersion(skill.icon)}" alt="">
            <span class="skill-card-copy">
              <strong>${skill.name}</strong>
              <span>${skill.description}</span>
              <small>${status}</small>
            </span>
          </button>
        `;
      }).join("");
    const dinosaurCards = data.dinosaurs.map((dinosaur) => {
      const unlocked = meta.unlockedDinosaurs.includes(dinosaur.id);
      const cost = dinosaur.unlockCost || 0;
      const affordable = meta.dna >= cost;
      const status = unlocked ? "\u89e3\u653e\u6e08\u307f" : `${cost} DNA`;
      return `
        <button class="card-button skill-card-button shop-card-button" type="button" data-buy-dinosaur="${dinosaur.id}" ${unlocked || !affordable ? "disabled" : ""}>
          <img class="skill-card-icon" src="${withVersion(dinosaur.icon || dinosaur.sprite)}" alt="">
          <span class="skill-card-copy">
            <strong>${dinosaur.name}</strong>
            <span>${dinosaur.role}</span>
            <small>${status}</small>
          </span>
        </button>
      `;
    }).join("");

    panel.innerHTML = `
      ${panelHeader("\u30b7\u30e7\u30c3\u30d7")}
      <h2>DNA\u89e3\u653e</h2>
      <div class="stats-grid">
        <div class="stat-tile"><b>${meta.dna}</b><span>\u6240\u6301DNA</span></div>
        <div class="stat-tile"><b>${meta.unlockedSkills.length}</b><span>\u89e3\u653e\u30b9\u30ad\u30eb</span></div>
      </div>
      <div class="section-label">\u30b9\u30ad\u30eb</div>
      <div class="cards">${skillCards}</div>
      <div class="section-label">\u6050\u7adc</div>
      <div class="cards">${dinosaurCards}</div>
    `;
    showOverlay();
    bindPanelHomeButtons();
    panel.querySelectorAll("[data-buy-skill]").forEach((button) => {
      button.addEventListener("click", () => {
        const skill = byId(data.skills, button.dataset.buySkill);
        if (!skill || meta.unlockedSkills.includes(skill.id) || meta.dna < skill.unlockCost) {
          return;
        }
        showConfirmDialog({
          kicker: "\u30b7\u30e7\u30c3\u30d7",
          title: "\u8cfc\u5165\u78ba\u8a8d",
          message: `${skill.name}\u3092 ${skill.unlockCost} DNA \u3067\u8cfc\u5165\u3057\u307e\u3059\u304b\uff1f`,
          confirmLabel: "\u8cfc\u5165\u3059\u308b",
          onCancel: showShop,
          onConfirm: () => {
            if (meta.unlockedSkills.includes(skill.id) || meta.dna < skill.unlockCost) {
              showShop();
              return;
            }
            meta.dna -= skill.unlockCost;
            meta.unlockedSkills.push(skill.id);
            markSkillDiscovered(skill.id);
            saveMeta();
            playSound("buy");
            showShop();
          }
        });
      });
    });
    panel.querySelectorAll("[data-buy-dinosaur]").forEach((button) => {
      button.addEventListener("click", () => {
        const dinosaur = byId(data.dinosaurs, button.dataset.buyDinosaur);
        const cost = dinosaur ? dinosaur.unlockCost || 0 : 0;
        if (!dinosaur || meta.unlockedDinosaurs.includes(dinosaur.id) || meta.dna < cost) {
          return;
        }
        showConfirmDialog({
          kicker: "\u30b7\u30e7\u30c3\u30d7",
          title: "\u8cfc\u5165\u78ba\u8a8d",
          message: `${dinosaur.name}\u3092 ${cost} DNA \u3067\u8cfc\u5165\u3057\u307e\u3059\u304b\uff1f`,
          confirmLabel: "\u8cfc\u5165\u3059\u308b",
          onCancel: showShop,
          onConfirm: () => {
            if (meta.unlockedDinosaurs.includes(dinosaur.id) || meta.dna < cost) {
              showShop();
              return;
            }
            meta.dna -= cost;
            meta.unlockedDinosaurs.push(dinosaur.id);
            if (!meta.discoveredDinosaurs.includes(dinosaur.id)) {
              meta.discoveredDinosaurs.push(dinosaur.id);
            }
            meta.selectedDinosaur = dinosaur.id;
            saveMeta();
            playSound("buy");
            showShop();
          }
        });
      });
    });
  }

  function showCodex(tabId = "skills", selectedDinosaurId = null) {
    run = null;
    setControlsVisible(false);
    setPanelVariant();
    const activeTab = tabId === "dinosaurs" ? "dinosaurs" : "skills";
    const knownDinosaurs = data.dinosaurs.filter((dinosaur) => meta.discoveredDinosaurs.includes(dinosaur.id));
    const fallbackDinosaur = byId(data.dinosaurs, meta.selectedDinosaur) || knownDinosaurs[0] || data.dinosaurs[0];
    const selectedDinosaur = byId(data.dinosaurs, selectedDinosaurId) || fallbackDinosaur;
    const selectedKnown = selectedDinosaur && meta.discoveredDinosaurs.includes(selectedDinosaur.id);
    const dinosaurCards = data.dinosaurs.map((dinosaur) => {
      const known = meta.discoveredDinosaurs.includes(dinosaur.id);
      const selected = selectedDinosaur && dinosaur.id === selectedDinosaur.id;
      return createDinosaurCodexButton(dinosaur, known, selected);
    }).join("");
    const evolutionCards = selectedDinosaur
      ? data.evolutions
        .filter((evolution) => evolution.baseDinosaur === selectedDinosaur.id)
        .map((evolution) => {
          const known = meta.discoveredEvolutions.includes(evolution.id);
          return createCodexCard(known ? evolution.name : "???", known ? evolution.description : "\u307e\u3060\u9032\u5316\u3057\u3066\u3044\u306a\u3044\u59ff\u3067\u3059\u3002", known ? evolution.icon : null, known ? evolution.condition : "\u672a\u767a\u898b");
        }).join("")
      : "";
    const groups = {
      skills: {
        label: "\u30b9\u30ad\u30eb",
        body: `<div class="cards codex-grid">${data.skills.map((skill) => {
          const known = meta.discoveredSkills.includes(skill.id);
          return createCodexCard(known ? skill.name : "???", known ? skill.description : "\u307e\u3060\u4f7f\u7528\u3057\u3066\u3044\u306a\u3044\u30b9\u30ad\u30eb\u3067\u3059\u3002", known ? skill.icon : null, known ? getSkillTypeLabel(skill.type) : "\u672a\u767a\u898b");
        }).join("")}</div>`
      },
      dinosaurs: {
        label: "\u6050\u7adc",
        body: `
          <div class="cards codex-grid codex-dinosaur-list">${dinosaurCards}</div>
          <div class="section-label">${selectedKnown ? selectedDinosaur.name : "???"}\u306e\u9032\u5316\u5148</div>
          <div class="cards codex-grid">${evolutionCards || `<div class="stat-tile"><span>\u9032\u5316\u5148\u306f\u307e\u3060\u767b\u9332\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002</span></div>`}</div>
        `
      }
    };
    const tabs = Object.entries(groups).map(([id, group]) => `
      <button class="codex-tab ${id === activeTab ? "is-active" : ""}" type="button" data-codex-tab="${id}">${group.label}</button>
    `).join("");

    panel.innerHTML = `
      ${panelHeader("\u56f3\u9451")}
      <h2>\u767a\u898b\u8a18\u9332</h2>
      <div class="codex-tabs">${tabs}</div>
      <div class="section-label">${groups[activeTab].label}</div>
      ${groups[activeTab].body}
    `;
    showOverlay();
    bindPanelHomeButtons();
    panel.querySelectorAll("[data-codex-tab]").forEach((button) => {
      button.addEventListener("click", () => showCodex(button.dataset.codexTab, selectedDinosaur && selectedDinosaur.id));
    });
    panel.querySelectorAll("[data-codex-dinosaur]").forEach((button) => {
      button.addEventListener("click", () => showCodex("dinosaurs", button.dataset.codexDinosaur));
    });
  }

  function createDinosaurCodexButton(dinosaur, known, selected) {
    return `
      <button class="card-button skill-card-button codex-card codex-dinosaur-button ${selected ? "is-selected" : ""}" type="button" data-codex-dinosaur="${dinosaur.id}">
        ${known ? `<img class="skill-card-icon" src="${withVersion(dinosaur.icon || dinosaur.sprite)}" alt="">` : `<span class="skill-card-icon codex-unknown">?</span>`}
        <span class="skill-card-copy">
          <strong>${known ? dinosaur.name : "???"}</strong>
          <span>${known ? dinosaur.description : "\u307e\u3060\u4f7f\u7528\u3057\u3066\u3044\u306a\u3044\u6050\u7adc\u3067\u3059\u3002"}</span>
          <small>${known ? dinosaur.role : "\u672a\u767a\u898b"}</small>
        </span>
      </button>
    `;
  }

  function createCodexCard(title, description, icon, note) {
    return `
      <div class="card-button skill-card-button codex-card">
        ${icon ? `<img class="skill-card-icon" src="${withVersion(icon)}" alt="">` : `<span class="skill-card-icon codex-unknown">?</span>`}
        <span class="skill-card-copy">
          <strong>${title}</strong>
          <span>${description}</span>
          <small>${note}</small>
        </span>
      </div>
    `;
  }

  function showHighScores() {
    run = null;
    setControlsVisible(false);
    setPanelVariant();
    const rows = data.maps.map((map) => {
      const record = meta.endlessRecords[map.id] || {};
      const time = record.time || (map.id === "triassic" ? meta.endlessBestTime : 0);
      const bosses = record.bosses || (map.id === "triassic" ? meta.endlessBestBosses : 0);
      return `
        <div class="stat-tile score-row">
          <b>${map.name}</b>
          <span>\u751f\u5b58 ${formatTime(time || 0)} / \u30dc\u30b9 ${bosses || 0}\u4f53</span>
        </div>
      `;
    }).join("");

    panel.innerHTML = `
      ${panelHeader("\u30cf\u30a4\u30b9\u30b3\u30a2")}
      <h2>\u30a8\u30f3\u30c9\u30ec\u30b9\u8a18\u9332</h2>
      <div class="score-list">${rows}</div>
    `;
    showOverlay();
    bindPanelHomeButtons();
  }

  function showSettings() {
    run = null;
    setControlsVisible(false);
    setPanelVariant();
    const controlLabel = meta.settings.controlsSwapped ? "\u53f3\u30d1\u30c3\u30c9 / \u5de6\u5fc5\u6bba" : "\u5de6\u30d1\u30c3\u30c9 / \u53f3\u5fc5\u6bba";
    panel.innerHTML = `
      ${panelHeader("\u8a2d\u5b9a")}
      <h2>\u30aa\u30d7\u30b7\u30e7\u30f3</h2>
      ${volumeControlsHtml()}
      <div class="cards">
        <button id="audioToggleButton" class="card-button settings-toggle" type="button">
          <strong>\u97f3\u58f0</strong>
          <span>BGM\u30fb\u52b9\u679c\u97f3</span>
          <small>${meta.settings.audio ? "ON" : "OFF"}</small>
        </button>
        <button id="controlSwapButton" class="card-button settings-toggle" type="button">
          <strong>\u30dc\u30bf\u30f3\u914d\u7f6e</strong>
          <span>${controlLabel}</span>
          <small>\u30bf\u30c3\u30d7\u3067\u5165\u308c\u66ff\u3048</small>
        </button>
        <button id="titleMenuButton" class="card-button settings-toggle" type="button">
          <strong>\u30bf\u30a4\u30c8\u30eb\u753b\u9762</strong>
          <span>\u30bf\u30a4\u30c8\u30eb\u3078\u623b\u308b</span>
          <small>START\u753b\u9762\u3078</small>
        </button>
      </div>
      <div class="button-row">
        <button id="resetButton" class="secondary-button danger-button" type="button">\u30bb\u30fc\u30d6\u521d\u671f\u5316</button>
      </div>
    `;
    showOverlay();
    bindPanelHomeButtons();
    bindVolumeControls();
    document.getElementById("audioToggleButton").addEventListener("click", () => {
      meta.settings.audio = !meta.settings.audio;
      if (!meta.settings.audio) {
        stopAudio();
      } else {
        updateLiveAudioVolumes();
        startHomeAudio();
      }
      saveMeta();
      showSettings();
    });
    document.getElementById("controlSwapButton").addEventListener("click", () => {
      meta.settings.controlsSwapped = !meta.settings.controlsSwapped;
      saveMeta();
      applyControlLayout();
      showSettings();
    });
    document.getElementById("titleMenuButton").addEventListener("click", (event) => {
      event.stopPropagation();
      showTitle();
    });
    document.getElementById("resetButton").addEventListener("click", () => {
      showConfirmDialog({
        kicker: "\u8a2d\u5b9a",
        title: "\u30bb\u30fc\u30d6\u521d\u671f\u5316",
        message: "\u30bb\u30fc\u30d6\u30c7\u30fc\u30bf\u3092\u521d\u671f\u5316\u3057\u307e\u3059\u304b\uff1f\u3000\u30b7\u30e7\u30c3\u30d7\u89e3\u653e\u3084\u30af\u30ea\u30a2\u60c5\u5831\u3082\u524a\u9664\u3055\u308c\u307e\u3059\u3002",
        confirmLabel: "\u521d\u671f\u5316\u3078\u9032\u3080",
        cancelLabel: "\u3084\u3081\u308b",
        danger: true,
        onCancel: showSettings,
        onConfirm: () => {
          showConfirmDialog({
            kicker: "\u6700\u7d42\u78ba\u8a8d",
            title: "\u672c\u5f53\u306b\u521d\u671f\u5316\u3057\u307e\u3059\u304b\uff1f",
            message: "\u3053\u306e\u64cd\u4f5c\u306f\u53d6\u308a\u6d88\u305b\u307e\u305b\u3093\u3002\u3059\u3079\u3066\u306e\u9032\u884c\u72b6\u6cc1\u3092\u524a\u9664\u3057\u307e\u3059\u3002",
            confirmLabel: "\u3059\u3079\u3066\u524a\u9664",
            cancelLabel: "\u3084\u3081\u308b",
            danger: true,
            onCancel: showSettings,
            onConfirm: () => {
              localStorage.removeItem(SAVE_KEY);
              meta = loadMeta();
              applyControlLayout();
              showTitle();
            }
          });
        }
      });
    });
  }

  function ensureAudio() {
    if (audio && audio.context) {
      if (audio.context.state === "suspended") {
        audio.context.resume();
      }
      return audio;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      return null;
    }

    const context = new AudioContextClass();
    const master = context.createGain();
    const musicGain = context.createGain();
    const sfxGain = context.createGain();
    master.gain.value = 0.42;
    musicGain.gain.value = getMusicGainValue(bgmKind);
    sfxGain.gain.value = getSfxVolume();
    musicGain.connect(master);
    sfxGain.connect(master);
    master.connect(context.destination);
    audio = { context, master, musicGain, sfxGain, musicTimer: null, beat: 0 };
    return audio;
  }

  function stopAudio() {
    if (audio && audio.musicTimer) {
      window.clearInterval(audio.musicTimer);
      audio.musicTimer = null;
    }
    if (bgmTrack) {
      bgmTrack.pause();
      bgmTrack.currentTime = 0;
    }
    if (bgmSourceNode) {
      try {
        bgmSourceNode.disconnect();
      } catch (_error) {
        // Already disconnected.
      }
      bgmSourceNode = null;
    }
    bgmTrack = null;
    activeSfxNodes.forEach((node) => {
      stopSfxNode(node);
    });
    activeSfxNodes.clear();
    bgmKind = null;
  }

  function startAudio() {
    if (!meta.settings.audio) {
      return;
    }
    const engine = ensureAudio();
    warmSfxBuffers(engine);
    if (startBgmTrack("game")) {
      return;
    }
    if (!engine || engine.musicTimer) {
      return;
    }

    const pattern = [110, 0, 147, 0, 165, 147, 110, 196];
    engine.musicTimer = window.setInterval(() => {
      if (!run || run.screen === "gameover") {
        return;
      }
      const frequency = pattern[engine.beat % pattern.length];
      const time = engine.context.currentTime;
      if (frequency) {
        playTone(frequency, 0.18, "triangle", 0.07, engine.musicGain, time);
        if (engine.beat % 4 === 0) {
          playTone(frequency / 2, 0.28, "sine", 0.08, engine.musicGain, time);
        }
      }
      if (engine.beat % 8 === 0) {
        playNoise(0.06, 0.035, engine.musicGain, time);
      }
      engine.beat += 1;
    }, 420);
  }

  function startHomeAudio() {
    if (!meta.settings.audio) {
      return;
    }
    const engine = ensureAudio();
    warmSfxBuffers(engine);
    startBgmTrack("home");
  }

  function unlockAudioFromGesture() {
    if (!meta.settings.audio) {
      return;
    }
    const engine = ensureAudio();
    if (engine && engine.context && engine.context.state === "suspended") {
      engine.context.resume().catch(() => {});
    }
    if (bgmTrack && bgmTrack.paused && bgmKind) {
      bgmTrack.play().catch(() => {});
    }
  }

  function startBgmTrack(kind) {
    const src = kind === "home" ? AUDIO_FILES.homeBgm : AUDIO_FILES.gameBgm;
    if (!src) {
      return false;
    }
    const engine = ensureAudio();
    if (!engine) {
      return false;
    }
    if (!bgmTrack || bgmKind !== kind) {
      if (bgmTrack) {
        bgmTrack.pause();
      }
      if (bgmSourceNode) {
        try {
          bgmSourceNode.disconnect();
        } catch (_error) {
          // Already disconnected.
        }
        bgmSourceNode = null;
      }
      bgmTrack = new Audio(withVersion(src));
      bgmTrack.loop = true;
      bgmTrack.preload = "auto";
      bgmKind = kind;
      try {
        bgmSourceNode = engine.context.createMediaElementSource(bgmTrack);
        bgmSourceNode.connect(engine.musicGain);
      } catch (_error) {
        bgmSourceNode = null;
      }
    }
    engine.musicGain.gain.value = getMusicGainValue(kind);
    bgmTrack.volume = bgmSourceNode ? 1 : getMusicGainValue(kind);
    const playPromise = bgmTrack.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(() => {});
    }
    return true;
  }

  function getTrackVolume(kind) {
    const base = kind === "home" ? 0.22 : 0.34;
    return base * getBgmVolume();
  }

  function getMusicGainValue(kind) {
    if (!meta.settings.audio) {
      return 0;
    }
    return getTrackVolume(kind || bgmKind || "game");
  }

  function updateLiveAudioVolumes() {
    if (audio && audio.musicGain && audio.sfxGain) {
      audio.musicGain.gain.value = getMusicGainValue(bgmKind);
      audio.sfxGain.gain.value = getSfxVolume();
    }
    if (bgmTrack) {
      bgmTrack.volume = bgmSourceNode ? 1 : getMusicGainValue(bgmKind);
    }
    const titleVideo = document.getElementById("titleVideo");
    if (titleVideo) {
      titleVideo.volume = meta.settings.audio ? 0.62 * getBgmVolume() : 0;
      titleVideo.muted = !meta.settings.audio || titleVideo.muted;
    }
  }

  function playAudioClip(key) {
    const src = AUDIO_FILES[key] || AUDIO_FILES.special;
    if (!src) {
      return false;
    }
    const now = performance.now();
    const minInterval = SFX_MIN_INTERVAL[key] || 0;
    if (minInterval && sfxLastPlayed[key] && now - sfxLastPlayed[key] < minInterval) {
      return true;
    }
    sfxLastPlayed[key] = now;

    const engine = ensureAudio();
    if (!engine) {
      return false;
    }

    const cached = sfxBuffers.get(key);
    if (cached) {
      playSfxBuffer(key, cached);
      return true;
    }
    if (cached === null) {
      playProceduralSound(key);
      return true;
    }

    loadSfxBuffer(key, src, engine);
    playProceduralSound(key);
    return true;
  }

  function loadSfxBuffer(key, src, engine) {
    if (sfxBufferPromises.has(key) || sfxBuffers.has(key)) {
      return;
    }
    const promise = fetch(withVersion(src))
      .then((response) => {
        if (!response.ok) {
          throw new Error(`SFX load failed: ${src}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => engine.context.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        sfxBuffers.set(key, buffer);
      })
      .catch(() => {
        sfxBuffers.set(key, null);
      })
      .finally(() => {
        sfxBufferPromises.delete(key);
      });
    sfxBufferPromises.set(key, promise);
  }

  function warmSfxBuffers(engine) {
    if (!engine) {
      return;
    }
    Object.entries(AUDIO_FILES).forEach(([key, src]) => {
      if (key === "gameBgm" || key === "homeBgm") {
        return;
      }
      loadSfxBuffer(key, src, engine);
    });
  }

  function playSfxBuffer(key, buffer) {
    const engine = ensureAudio();
    if (!engine || !buffer) {
      return false;
    }
    if (engine.context.state === "suspended") {
      engine.context.resume().catch(() => {});
    }
    while (activeSfxNodes.size >= MAX_ACTIVE_SFX) {
      const oldest = activeSfxNodes.values().next().value;
      if (!oldest) {
        break;
      }
      stopSfxNode(oldest);
    }

    const source = engine.context.createBufferSource();
    const gain = engine.context.createGain();
    const node = { source, gain, timeoutId: null };
    const cleanup = () => {
      if (node.timeoutId) {
        window.clearTimeout(node.timeoutId);
        node.timeoutId = null;
      }
      activeSfxNodes.delete(node);
    };
    source.buffer = buffer;
    gain.gain.value = (SFX_VOLUME[key] ?? 0.4) * 1.15;
    source.connect(gain);
    gain.connect(engine.sfxGain);
    source.onended = cleanup;
    activeSfxNodes.add(node);
    source.start();
    const maxDuration = SFX_MAX_DURATION[key] || 1.1;
    node.timeoutId = window.setTimeout(() => {
      stopSfxNode(node);
    }, Math.round(maxDuration * 1000));
    return true;
  }

  function stopSfxNode(node) {
    if (!node || !activeSfxNodes.has(node)) {
      return;
    }
    if (node.timeoutId) {
      window.clearTimeout(node.timeoutId);
      node.timeoutId = null;
    }
    activeSfxNodes.delete(node);
    try {
      node.source.onended = null;
      node.source.stop();
    } catch (_error) {
      // Source nodes can only be stopped once.
    }
    try {
      node.source.disconnect();
      node.gain.disconnect();
    } catch (_error) {
      // Already disconnected.
    }
  }

  function playSound(key) {
    if (!meta.settings.audio) {
      return;
    }
    unlockAudioFromGesture();
    if (playAudioClip(key)) {
      return;
    }
    playProceduralSound(key);
  }

  function playProceduralSound(key) {
    if (!meta.settings.audio) {
      return;
    }
    const engine = ensureAudio();
    if (!engine) {
      return;
    }
    const now = engine.context.currentTime;
    const gain = engine.sfxGain;
    if (key === "bite" || key === "target") {
      playTone(220, 0.08, "sawtooth", 0.1, gain, now);
      playNoise(0.05, 0.08, gain, now + 0.02);
    } else if (key === "area") {
      playTone(180, 0.13, "triangle", 0.12, gain, now);
      playTone(260, 0.1, "triangle", 0.08, gain, now + 0.04);
    } else if (key === "line") {
      playTone(330, 0.08, "square", 0.08, gain, now);
      playTone(520, 0.1, "square", 0.06, gain, now + 0.05);
    } else if (key === "cone") {
      playNoise(0.18, 0.11, gain, now);
      playTone(120, 0.18, "sawtooth", 0.08, gain, now);
    } else if (key === "special") {
      playTone(90, 0.22, "sawtooth", 0.22, gain, now);
      playTone(180, 0.32, "triangle", 0.16, gain, now + 0.04);
      playNoise(0.28, 0.18, gain, now + 0.08);
    } else if (key === "pickup") {
      playTone(660, 0.06, "sine", 0.07, gain, now);
      playTone(990, 0.08, "sine", 0.05, gain, now + 0.05);
    } else if (key === "heal") {
      playTone(440, 0.08, "sine", 0.06, gain, now);
      playTone(740, 0.12, "sine", 0.05, gain, now + 0.06);
    } else if (key === "level" || key === "evolve") {
      playTone(523, 0.08, "triangle", 0.08, gain, now);
      playTone(784, 0.11, "triangle", 0.07, gain, now + 0.08);
      playTone(1046, 0.14, "triangle", 0.06, gain, now + 0.17);
    } else if (key === "damage") {
      playNoise(0.08, 0.1, gain, now);
      playTone(95, 0.1, "sawtooth", 0.06, gain, now);
    }
  }

  function playTone(frequency, duration, type, volume, destination, startTime) {
    const engine = audio;
    if (!engine) {
      return;
    }
    const oscillator = engine.context.createOscillator();
    const gain = engine.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.03);
  }

  function playNoise(duration, volume, destination, startTime) {
    const engine = audio;
    if (!engine) {
      return;
    }
    const length = Math.max(1, Math.floor(engine.context.sampleRate * duration));
    const buffer = engine.context.createBuffer(1, length, engine.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = engine.context.createBufferSource();
    const gain = engine.context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    source.connect(gain);
    gain.connect(destination);
    source.start(startTime);
  }

  function showOverlay() {
    overlay.classList.add("is-visible");
  }

  function hideOverlay() {
    overlay.classList.remove("is-visible");
  }

  function setControlsVisible(visible) {
    applyControlLayout();
    const display = visible ? "" : "none";
    joystick.style.display = display;
    specialButton.style.display = display;
    pauseButton.style.display = visible && run ? "" : "none";
  }

  function render() {
    if (!run) {
      renderTitleBackdrop();
      return;
    }

    renderWorld();
    renderHud();
  }

  function renderTitleBackdrop() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawTerrainBackground(0, 0, byId(data.maps || [], "triassic") || {
      terrain: { base: "#184839", deep: "#0f2a24", grass: "#77a653", stone: "#786f5f", water: "#287c83" }
    });
    const dinosaur = data.dinosaurs && data.dinosaurs[0];
    if (dinosaur) {
      drawSpriteAsset(dinosaur, WIDTH / 2, HEIGHT * 0.35, 154, false, 0.9, {
        kind: "player",
        phase: lastFrame * 0.004,
        moving: 0.2,
        time: lastFrame / 1000
      });
    }
    ctx.fillStyle = "rgba(4, 12, 10, 0.35)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function renderWorld() {
    const camera = run.camera;
    drawTerrainBackground(camera.x, camera.y, run.map);

    run.pickups.forEach((pickup) => {
      const position = toScreen(pickup.x, pickup.y);
      const pickupSize = pickup.displaySize || 30;
      drawSpriteAsset(pickup, position.x, position.y, pickupSize, false, 1, {
        kind: "pickup",
        phase: run.elapsed * SPRITE_MOTION.pickup.cadence + pickup.pulse,
        moving: 0.55,
        time: run.elapsed
      });
    });

    run.projectiles.forEach((projectile) => {
      const position = toScreen(projectile.x, projectile.y);
      const image = images.get(projectile.sprite);
      const age = 1 - projectile.life / projectile.maxLife;
      drawSprite(image, position.x, position.y, projectile.radius * 2.1, false, 1 - age * 0.25, {
        rotation: projectile.angle || 0,
        scaleX: 1 + Math.sin(run.elapsed * 18) * 0.05,
        scaleY: 1 - Math.sin(run.elapsed * 18) * 0.04
      });
    });

    (run.enemyProjectiles || []).forEach((projectile) => {
      const position = toScreen(projectile.x, projectile.y);
      const image = images.get(projectile.sprite);
      const age = 1 - projectile.life / projectile.maxLife;
      if (image) {
        drawSprite(image, position.x, position.y, projectile.radius * 4.4, false, 1 - age * 0.18, {
          rotation: projectile.angle || 0,
          scaleX: 1 + Math.sin(run.elapsed * 22) * 0.04,
          scaleY: 0.88 + Math.sin(run.elapsed * 22) * 0.04
        });
      } else {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = projectile.color || "#72eaff";
        ctx.lineWidth = projectile.radius * 0.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(position.x - Math.cos(projectile.angle) * projectile.radius * 1.6, position.y - Math.sin(projectile.angle) * projectile.radius * 1.6);
        ctx.lineTo(position.x + Math.cos(projectile.angle) * projectile.radius * 1.6, position.y + Math.sin(projectile.angle) * projectile.radius * 1.6);
        ctx.stroke();
        ctx.restore();
      }
    });

    run.enemies.forEach((enemy) => {
      const position = toScreen(enemy.x, enemy.y);
      const size = (enemy.boss ? enemy.size * 2.25 : enemy.size * 2.1) * (enemy.displayScale || 1);
      const flip = enemy.x > run.player.x;
      drawSpriteAsset(enemy, position.x, position.y, size, flip, enemy.hitFlash > 0 ? 0.72 : 1, {
        kind: "enemy",
        phase: enemy.wobble,
        moving: 1,
        facingX: run.player.x - enemy.x,
        attackPulse: enemy.attackPulse,
        hitFlash: enemy.hitFlash,
        time: run.elapsed
      });
      if (enemy.boss) {
        drawEnemyHp(enemy, position.x, position.y - size * 0.45, size);
      }
    });

    renderEffects();

    const playerPosition = toScreen(run.player.x, run.player.y);
    if (run.evolved) {
      ctx.save();
      ctx.globalAlpha = 0.28 + Math.sin(run.elapsed * 7) * 0.07;
      ctx.fillStyle = run.evolved.id === "blaze_rex" ? "#e45c34" : "#f3b13d";
      ctx.beginPath();
      ctx.arc(playerPosition.x, playerPosition.y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const playerFlip = run.player.facingX < -0.08;
    const playerAlpha = run.player.invulnerable > 0 ? 0.78 : 1;
    const playerAsset = run.player.evolutionSprite ? { sprite: run.player.evolutionSprite } : run.dinosaur;
    drawSpriteAsset(playerAsset, playerPosition.x, playerPosition.y, run.player.size * 2.55 * (run.player.displayScale || 1), playerFlip, playerAlpha, {
      kind: "player",
      phase: run.player.movePhase,
      moving: run.player.moveAmount,
      facingX: run.player.facingX,
      facingY: run.player.facingY,
      action: run.player.action,
      actionPose: run.player.actionPose,
      attackPulse: run.player.attackPulse,
      hitFlash: run.player.hitFlash,
      time: run.elapsed
    });

    if (run.screen === "evolving") {
      renderEvolutionOverlay(playerPosition);
    }
  }

  function renderEvolutionOverlay(playerPosition) {
    const sequence = run.evolutionSequence;
    if (!sequence) {
      return;
    }
    const progress = clamp(sequence.elapsed / sequence.duration, 0, 1);
    const pulse = Math.sin(progress * Math.PI);
    const color = sequence.evolution.id === "blaze_rex" ? "228, 92, 52" : "243, 177, 61";

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const gradient = ctx.createRadialGradient(playerPosition.x, playerPosition.y, 8, playerPosition.x, playerPosition.y, 170);
    gradient.addColorStop(0, `rgba(255, 255, 210, ${0.38 + pulse * 0.22})`);
    gradient.addColorStop(0.42, `rgba(${color}, ${0.18 + pulse * 0.22})`);
    gradient.addColorStop(1, `rgba(${color}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(playerPosition.x, playerPosition.y, 170, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 240, 184, ${0.7 * pulse})`;
    ctx.lineWidth = 3;
    for (let i = 0; i < 10; i += 1) {
      const angle = i * Math.PI * 2 / 10 + progress * 5.2;
      ctx.beginPath();
      ctx.moveTo(playerPosition.x + Math.cos(angle) * 42, playerPosition.y + Math.sin(angle) * 42);
      ctx.lineTo(playerPosition.x + Math.cos(angle) * (110 + pulse * 42), playerPosition.y + Math.sin(angle) * (110 + pulse * 42));
      ctx.stroke();
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.textAlign = "center";
    ctx.font = "900 24px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillStyle = "#fff0b8";
    ctx.strokeStyle = "rgba(0, 0, 0, 0.55)";
    ctx.lineWidth = 5;
    ctx.strokeText("進化", WIDTH / 2, HEIGHT / 2 - 112);
    ctx.fillText("進化", WIDTH / 2, HEIGHT / 2 - 112);
    ctx.restore();
  }

  function drawTerrainBackground(cameraX, cameraY, map) {
    const terrain = map.terrain;
    ctx.fillStyle = terrain.base;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const background = map.background && images.get(map.background);
    if (background) {
      const tileSize = 640;
      const scrollX = cameraX;
      const scrollY = cameraY;
      const offsetX = -positiveModulo(scrollX, tileSize);
      const offsetY = -positiveModulo(scrollY, tileSize);
      const baseCol = Math.floor(scrollX / tileSize);
      const baseRow = Math.floor(scrollY / tileSize);
      const cols = Math.ceil(WIDTH / tileSize) + 3;
      const rows = Math.ceil(HEIGHT / tileSize) + 3;

      for (let colOffset = -1; colOffset < cols; colOffset += 1) {
        for (let rowOffset = -1; rowOffset < rows; rowOffset += 1) {
          const col = baseCol + colOffset;
          const row = baseRow + rowOffset;
          drawMirroredTile(
            background,
            offsetX + colOffset * tileSize,
            offsetY + rowOffset * tileSize,
            tileSize,
            Math.abs(col) % 2 === 1,
            Math.abs(row) % 2 === 1
          );
        }
      }
      ctx.fillStyle = "rgba(5, 17, 13, 0.16)";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }

    ctx.save();
    ctx.translate(-cameraX * 0.15, -cameraY * 0.15);
    ctx.fillStyle = terrain.deep;
    for (let i = -3; i < 8; i += 1) {
      ctx.beginPath();
      ctx.ellipse(i * 94 + 40, 120 + Math.sin(i) * 38, 72, 24, -0.45, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const grid = 92;
    const startX = Math.floor((cameraX - WIDTH / 2) / grid) * grid;
    const endX = cameraX + WIDTH / 2 + grid;
    const startY = Math.floor((cameraY - HEIGHT / 2) / grid) * grid;
    const endY = cameraY + HEIGHT / 2 + grid;

    for (let x = startX; x < endX; x += grid) {
      for (let y = startY; y < endY; y += grid) {
        const seed = hash(x, y);
        const position = toScreen(x + seed * 48, y + hash(y, x) * 48);
        if (seed < 0.42) {
          drawFern(position.x, position.y, terrain.grass, 0.72 + seed * 0.55);
        } else if (seed < 0.6) {
          drawStone(position.x, position.y, terrain.stone, 0.8 + seed * 0.45);
        } else if (seed > 0.9) {
          ctx.fillStyle = terrain.water;
          ctx.globalAlpha = 0.22;
          ctx.beginPath();
          ctx.ellipse(position.x, position.y, 28, 12, seed * Math.PI, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  function drawFern(x, y, color, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.quadraticCurveTo(i * 8, -4, i * 18, -24);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawMirroredTile(image, x, y, size, flipX, flipY) {
    ctx.save();
    ctx.translate(x + (flipX ? size : 0), y + (flipY ? size : 0));
    ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);
    ctx.drawImage(image, 0, 0, size, size);
    ctx.restore();
  }

  function drawStone(x, y, color, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 10, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function renderEffects() {
    run.effects.forEach((effect) => {
      const progress = 1 - effect.life / effect.maxLife;
      const position = toScreen(effect.x, effect.y);
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.strokeStyle = effect.color;
      ctx.fillStyle = effect.color;
      ctx.lineWidth = effect.type === "line" ? 17 : 5;
      ctx.lineCap = "round";

      if (effect.type === "ring") {
        ctx.beginPath();
        ctx.arc(position.x, position.y, effect.radius * (0.35 + progress * 0.65), 0, Math.PI * 2);
        ctx.stroke();
      }

      if (effect.type === "skillSprite" || effect.type === "dashSprite") {
        const image = images.get(effect.sprite);
        if (image) {
          ctx.globalCompositeOperation = "lighter";
          const angle = effect.type === "dashSprite" ? Math.atan2(effect.dy, effect.dx) : 0;
          const scale = effect.type === "dashSprite" ? 1 - progress * 0.18 : 0.86 + Math.sin(progress * Math.PI) * 0.22;
          drawSprite(image, position.x, position.y, effect.radius * scale, false, Math.max(0, 1 - progress * 0.25), {
            rotation: angle,
            scaleX: effect.type === "dashSprite" ? 1.15 : 1,
            scaleY: effect.type === "dashSprite" ? 0.72 : 1
          });
        }
      }

      if (effect.type === "bossSpikeTelegraph") {
        ctx.globalCompositeOperation = "lighter";
        const pulse = 0.55 + Math.sin(run.elapsed * 18) * 0.18;
        ctx.globalAlpha = 0.42 + pulse * 0.18;
        ctx.lineWidth = 5;
        ctx.strokeStyle = effect.color || "#ff5538";
        ctx.beginPath();
        ctx.ellipse(position.x, position.y + 8, effect.radius * (0.78 + progress * 0.12), effect.radius * 0.34, -0.06, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#fff0b8";
        for (let i = 0; i < 8; i += 1) {
          const angle = i * Math.PI * 2 / 8 + progress * 1.4;
          ctx.beginPath();
          ctx.moveTo(position.x + Math.cos(angle) * effect.radius * 0.28, position.y + Math.sin(angle) * effect.radius * 0.14);
          ctx.lineTo(position.x + Math.cos(angle) * effect.radius * 0.74, position.y + Math.sin(angle) * effect.radius * 0.3);
          ctx.stroke();
        }
      }

      if (effect.type === "bossSpikeBurst") {
        ctx.globalCompositeOperation = "lighter";
        const image = images.get(effect.sprite);
        if (image) {
          drawSprite(image, position.x, position.y + 2, effect.radius * (2.05 + Math.sin(progress * Math.PI) * 0.28), false, Math.max(0, 0.95 - progress * 0.18));
        }
        ctx.lineWidth = 12 * (1 - progress) + 3;
        ctx.strokeStyle = "#ffdf72";
        ctx.beginPath();
        ctx.ellipse(position.x, position.y + 8, effect.radius * (0.35 + progress * 0.86), effect.radius * (0.16 + progress * 0.28), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (effect.type === "bossCast") {
        ctx.globalCompositeOperation = "lighter";
        const radius = effect.radius * (0.22 + progress * 0.78);
        ctx.lineWidth = 7 * (1 - progress) + 2;
        ctx.strokeStyle = effect.color || "#72eaff";
        ctx.beginPath();
        ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#fff0b8";
        for (let i = 0; i < 6; i += 1) {
          const angle = i * Math.PI * 2 / 6 + progress * 2.2;
          ctx.beginPath();
          ctx.moveTo(position.x, position.y);
          ctx.lineTo(position.x + Math.cos(angle) * radius * 0.92, position.y + Math.sin(angle) * radius * 0.92);
          ctx.stroke();
        }
      }

      if (effect.type === "clawSlash") {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineCap = "round";
        const angle = effect.angle || 0;
        for (let i = -1; i <= 1; i += 1) {
          const offset = i * effect.radius * 0.24;
          const cx = position.x - Math.sin(angle) * offset;
          const cy = position.y + Math.cos(angle) * offset;
          ctx.lineWidth = 9 * (1 - progress) + 3;
          ctx.strokeStyle = i === 0 ? "#fff0b8" : effect.color;
          ctx.beginPath();
          ctx.moveTo(cx - Math.cos(angle + 0.58) * effect.radius * 0.7, cy - Math.sin(angle + 0.58) * effect.radius * 0.7);
          ctx.quadraticCurveTo(cx, cy, cx + Math.cos(angle - 0.58) * effect.radius * 0.7, cy + Math.sin(angle - 0.58) * effect.radius * 0.7);
          ctx.stroke();
        }
      }

      if (effect.type === "roarWave") {
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 3; i += 1) {
          const radius = effect.radius * (0.25 + progress * 0.72 + i * 0.12);
          ctx.lineWidth = 10 * (1 - progress) + 2;
          ctx.strokeStyle = i === 1 ? "#fff0b8" : effect.color;
          ctx.beginPath();
          ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.lineWidth = 5;
        ctx.strokeStyle = "rgba(255, 240, 184, 0.75)";
        ctx.beginPath();
        ctx.moveTo(position.x, position.y - effect.radius * 0.38);
        ctx.lineTo(position.x + effect.radius * 0.32, position.y - effect.radius * 0.12);
        ctx.lineTo(position.x + effect.radius * 0.24, position.y + effect.radius * 0.34);
        ctx.lineTo(position.x, position.y + effect.radius * 0.52);
        ctx.lineTo(position.x - effect.radius * 0.24, position.y + effect.radius * 0.34);
        ctx.lineTo(position.x - effect.radius * 0.32, position.y - effect.radius * 0.12);
        ctx.closePath();
        ctx.stroke();
      }

      if (effect.type === "stompCrater") {
        ctx.globalCompositeOperation = "lighter";
        const radius = effect.radius * (0.34 + progress * 0.62);
        ctx.lineWidth = 12 * (1 - progress) + 3;
        ctx.strokeStyle = "#ffdf72";
        ctx.beginPath();
        ctx.ellipse(position.x, position.y + 6, radius, radius * 0.46, -0.08, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = effect.color;
        ctx.lineWidth = 4;
        for (let i = 0; i < 12; i += 1) {
          const angle = i * Math.PI * 2 / 12 + 0.18;
          ctx.beginPath();
          ctx.moveTo(position.x + Math.cos(angle) * radius * 0.28, position.y + Math.sin(angle) * radius * 0.18);
          ctx.lineTo(position.x + Math.cos(angle) * radius * (0.75 + progress * 0.2), position.y + Math.sin(angle) * radius * (0.35 + progress * 0.24));
          ctx.stroke();
        }
      }

      if (effect.type === "tailSweep") {
        const sweep = effect.halfAngle * (0.25 + progress * 0.75);
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = 16 * (1 - progress) + 5;
        ctx.strokeStyle = "#60d5c8";
        ctx.beginPath();
        ctx.arc(position.x, position.y, effect.radius * (0.45 + progress * 0.45), effect.angle - sweep, effect.angle + sweep);
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#fff0b8";
        ctx.beginPath();
        ctx.arc(position.x, position.y, effect.radius * 0.64, effect.angle - sweep * 0.85, effect.angle + sweep * 0.85);
        ctx.stroke();
      }

      if (effect.type === "specialBurst") {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        if (effect.sprite) {
          const image = images.get(effect.sprite);
          if (image) {
            drawSprite(image, position.x, position.y, effect.radius * (1.15 + Math.sin(progress * Math.PI) * 0.22), false, Math.max(0, 0.96 - progress * 0.28), {
              rotation: progress * 0.25,
              scaleX: 1,
              scaleY: 1
            });
          }
        }
        ctx.lineWidth = 8 * (1 - progress) + 2;
        ctx.strokeStyle = "#ffdf72";
        ctx.beginPath();
        ctx.arc(position.x, position.y, effect.radius * (0.2 + progress * 0.9), 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = "#e45c34";
        ctx.lineWidth = 3;
        for (let i = 0; i < 18; i += 1) {
          const angle = i * Math.PI * 2 / 18 + progress * 1.8;
          const inner = effect.radius * (0.18 + progress * 0.55);
          const outer = effect.radius * (0.28 + progress * 0.78);
          ctx.beginPath();
          ctx.moveTo(position.x + Math.cos(angle) * inner, position.y + Math.sin(angle) * inner);
          ctx.lineTo(position.x + Math.cos(angle) * outer, position.y + Math.sin(angle) * outer);
          ctx.stroke();
        }
        ctx.restore();
      }

      if (effect.type === "specialDash" || effect.type === "guardianWall") {
        const angle = Math.atan2(effect.dy, effect.dx);
        const image = images.get(effect.sprite);
        ctx.globalCompositeOperation = "lighter";
        if (image) {
          drawSprite(image, position.x + effect.dx * effect.radius * 0.38, position.y + effect.dy * effect.radius * 0.38, effect.radius * 1.34, false, Math.max(0, 1 - progress * 0.18), {
            rotation: angle,
            scaleX: effect.type === "specialDash" ? 1.15 : 0.95,
            scaleY: effect.type === "specialDash" ? 0.68 : 0.9
          });
        }
        ctx.lineWidth = effect.type === "specialDash" ? 24 * (1 - progress) + 5 : 32 * (1 - progress) + 8;
        ctx.strokeStyle = effect.color || "#ffdf72";
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(position.x + effect.dx * effect.radius, position.y + effect.dy * effect.radius);
        ctx.stroke();
        if (effect.type === "guardianWall") {
          ctx.lineWidth = 5;
          ctx.strokeStyle = "#fff0b8";
          ctx.beginPath();
          ctx.arc(position.x, position.y, effect.radius * (0.25 + progress * 0.55), angle - 0.85, angle + 0.85);
          ctx.stroke();
        }
      }

      if (effect.type === "tyrantShock") {
        const angle = Math.atan2(effect.dy, effect.dx);
        ctx.globalCompositeOperation = "lighter";
        if (effect.sprite) {
          const image = images.get(effect.sprite);
          if (image) {
            drawSprite(image, position.x + effect.dx * effect.radius * 0.32, position.y + effect.dy * effect.radius * 0.32, effect.radius * 1.18, false, Math.max(0, 0.86 - progress * 0.2), {
              rotation: angle,
              scaleX: 1.12,
              scaleY: 0.72
            });
          }
        }
        ctx.lineCap = "round";
        ctx.lineWidth = 28 * (1 - progress) + 7;
        ctx.strokeStyle = "#ffdf72";
        ctx.beginPath();
        ctx.moveTo(position.x - effect.dx * 12, position.y - effect.dy * 12);
        ctx.lineTo(position.x + effect.dx * effect.radius * (0.62 + progress * 0.38), position.y + effect.dy * effect.radius * (0.62 + progress * 0.38));
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#fff0b8";
        for (let i = -3; i <= 3; i += 1) {
          const offset = i * 0.18;
          const crackAngle = angle + offset;
          const length = effect.radius * (0.22 + Math.abs(i) * 0.07 + progress * 0.26);
          ctx.beginPath();
          ctx.moveTo(position.x + Math.cos(angle) * effect.radius * 0.25, position.y + Math.sin(angle) * effect.radius * 0.25);
          ctx.lineTo(position.x + Math.cos(crackAngle) * length, position.y + Math.sin(crackAngle) * length);
          ctx.stroke();
        }
      }

      if (effect.type === "infernoWave") {
        ctx.globalCompositeOperation = "lighter";
        const radius = effect.radius * (0.25 + progress * 0.86);
        if (effect.sprite) {
          const image = images.get(effect.sprite);
          if (image) {
            drawSprite(image, position.x, position.y, effect.radius * (1.05 + Math.sin(progress * Math.PI) * 0.18), false, Math.max(0, 0.9 - progress * 0.18), {
              rotation: progress * 0.35,
              scaleX: 1,
              scaleY: 1
            });
          }
        }
        const gradient = ctx.createRadialGradient(position.x, position.y, radius * 0.12, position.x, position.y, radius);
        gradient.addColorStop(0, "rgba(255, 240, 184, 0.55)");
        gradient.addColorStop(0.36, "rgba(255, 122, 45, 0.38)");
        gradient.addColorStop(1, "rgba(228, 92, 52, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(position.x, position.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 8 * (1 - progress) + 2;
        ctx.strokeStyle = "#ffdf72";
        ctx.beginPath();
        ctx.arc(position.x, position.y, radius * 0.86, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (effect.type === "slash") {
        ctx.beginPath();
        ctx.arc(position.x, position.y, effect.radius, -0.9, 1.1);
        ctx.stroke();
      }

      if (effect.type === "spark") {
        ctx.beginPath();
        ctx.arc(position.x, position.y, effect.radius * (0.2 + progress), 0, Math.PI * 2);
        ctx.fill();
      }

      if (effect.type === "particle") {
        const driftX = (effect.vx || 0) * progress;
        const driftY = (effect.vy || 0) * progress;
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.arc(position.x + driftX, position.y + driftY, effect.radius * (1 - progress), 0, Math.PI * 2);
        ctx.fill();
      }

      if (effect.type === "hit") {
        ctx.beginPath();
        ctx.arc(position.x, position.y, effect.radius * (0.45 + progress * 0.55), 0, Math.PI * 2);
        ctx.stroke();
      }

      if (effect.type === "line") {
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(position.x + effect.dx * effect.radius * (0.6 + progress * 0.4), position.y + effect.dy * effect.radius * (0.6 + progress * 0.4));
        ctx.stroke();
      }

      if (effect.type === "rushPath") {
        ctx.globalCompositeOperation = "lighter";
        ctx.lineWidth = 22 * (1 - progress) + 4;
        ctx.strokeStyle = effect.color || "#f3b13d";
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.lineTo(position.x + effect.dx * effect.radius, position.y + effect.dy * effect.radius);
        ctx.stroke();
        ctx.lineWidth = 5;
        ctx.strokeStyle = "#fff0b8";
        ctx.stroke();
        if (effect.skillId === "lightning_dash") {
          ctx.lineWidth = 3;
          ctx.strokeStyle = "#ffef55";
          for (let i = 1; i <= 4; i += 1) {
            const t = i / 5;
            const side = i % 2 === 0 ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(position.x + effect.dx * effect.radius * t, position.y + effect.dy * effect.radius * t);
            ctx.lineTo(
              position.x + effect.dx * effect.radius * (t + 0.12) - effect.dy * side * 18,
              position.y + effect.dy * effect.radius * (t + 0.12) + effect.dx * side * 18
            );
            ctx.stroke();
          }
        }
      }

      if (effect.type === "afterimage") {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = effect.color || "rgba(243, 177, 61, 0.32)";
        ctx.beginPath();
        ctx.ellipse(position.x - effect.dx * 8, position.y - effect.dy * 8, effect.radius * 0.7, effect.radius * 0.34, Math.atan2(effect.dy, effect.dx), 0, Math.PI * 2);
        ctx.fill();
      }

      if (effect.type === "cone") {
        const angle = Math.atan2(effect.dy, effect.dx);
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.arc(position.x, position.y, effect.radius * (0.45 + progress * 0.45), angle - 0.58, angle + 0.58);
        ctx.closePath();
        ctx.fill();
      }

      if (effect.type === "fireMuzzle") {
        const angle = Math.atan2(effect.dy, effect.dx);
        ctx.globalCompositeOperation = "lighter";
        ctx.beginPath();
        ctx.moveTo(position.x, position.y);
        ctx.arc(position.x, position.y, effect.radius * (0.45 + progress * 0.4), angle - 0.42, angle + 0.42);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    });
  }

  function burstParticles(x, y, count, radius, color) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = radius * randomBetween(0.35, 0.95);
      const life = randomBetween(0.34, 0.72);
      run.effects.push({
        type: "particle",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        radius: randomBetween(2.5, 5.5),
        color
      });
    }
  }

  function sprayParticles(x, y, dx, dy, count, color) {
    const base = Math.atan2(dy, dx);
    for (let i = 0; i < count; i += 1) {
      const angle = base + randomBetween(-0.55, 0.55);
      const speed = randomBetween(58, 150);
      const life = randomBetween(0.28, 0.58);
      run.effects.push({
        type: "particle",
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life,
        maxLife: life,
        radius: randomBetween(2, 4.5),
        color
      });
    }
  }

  function renderHud() {
    const hpRatio = clamp(run.player.hp / run.player.maxHp, 0, 1);
    const xpRatio = clamp(run.xp / run.xpToNext, 0, 1);

    ctx.save();
    ctx.fillStyle = "rgba(8, 21, 17, 0.7)";
    roundRect(12, 12, 284, 55, 8);
    ctx.fill();
    drawBar(22, 24, 188, 11, hpRatio, "#e45c34", "#381d19");
    drawBar(22, 43, 188, 9, xpRatio, "#60d5c8", "#153532");

    ctx.fillStyle = "#f4f2de";
    ctx.font = "700 13px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText(`HP ${Math.ceil(run.player.hp)}/${run.player.maxHp}`, 218, 33);
    ctx.fillText(`Lv${run.level}`, 218, 54);

    ctx.textAlign = "center";
    ctx.font = "800 18px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillText(formatTime(run.elapsed), WIDTH / 2, 88);

    ctx.textAlign = "left";
    ctx.font = "700 13px Yu Gothic UI, Meiryo, sans-serif";
    ctx.fillStyle = "#ffdf72";
    ctx.fillText(`DNA ${run.dnaRun}`, 16, 88);

    drawSkillTimers();
    if (run.alertTimer > 0) {
      ctx.textAlign = "center";
      ctx.font = "900 22px Yu Gothic UI, Meiryo, sans-serif";
      ctx.fillStyle = "#fff0b8";
      ctx.strokeStyle = "rgba(0,0,0,0.55)";
      ctx.lineWidth = 5;
      ctx.strokeText(run.alertText, WIDTH / 2, 132);
      ctx.fillText(run.alertText, WIDTH / 2, 132);
    }
    ctx.restore();
  }

  function drawSkillTimers() {
    const y = 102;
    const slots = [
      {
        id: run.basicAttack.id,
        name: "通常",
        fullName: run.basicAttack.name,
        description: run.basicAttack.description,
        type: run.basicAttack.type,
        damage: run.basicAttack.damage,
        range: run.basicAttack.range,
        level: 1,
        maxLevel: run.basicAttack.maxLevel,
        icon: run.basicAttack.icon,
        isBasic: true,
        timer: run.basicAttack.timer,
        cooldown: getBasicCooldown()
      },
      ...run.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
        fullName: skill.name,
        description: skill.description,
        type: skill.type,
        damage: Math.round(getSkillDamage(skill)),
        range: skill.range,
        level: skill.level,
        maxLevel: skill.maxLevel,
        icon: skill.icon,
        isBasic: false,
        timer: skill.timer,
        cooldown: getSkillCooldown(skill)
      }))
    ];

    skillHudBounds = [];
    slots.forEach((slot, index) => {
      const x = 16 + index * 49;
      const size = 40;
      const ratio = clamp(1 - slot.timer / slot.cooldown, 0, 1);
      skillHudBounds.push({ x, y, width: size, height: size, slot });
      drawSkillIcon(slot, x, y, size, ratio);
    });
  }

  function drawSkillIcon(slot, x, y, size, ratio) {
    const cx = x + size / 2;
    const cy = y + size / 2;
    ctx.save();
    ctx.fillStyle = "rgba(8, 21, 17, 0.72)";
    roundRect(x, y, size, size, 8);
    ctx.fill();
    ctx.strokeStyle = "rgba(244, 242, 222, 0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    const iconImage = slot.icon && images.get(slot.icon);
    if (iconImage) {
      ctx.save();
      ctx.beginPath();
      roundRect(x + 3, y + 3, size - 6, size - 6, 7);
      ctx.clip();
      ctx.globalAlpha = 0.92;
      ctx.drawImage(iconImage, x + 4, y + 4, size - 8, size - 8);
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.39, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = ratio >= 1 ? "#ffdf72" : "#60d5c8";
    ctx.lineWidth = 4;
    ctx.stroke();

    if (iconImage) {
      if (!slot.isBasic) {
        ctx.fillStyle = "#f4f2de";
        ctx.font = "800 10px Yu Gothic UI, Meiryo, sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(String(slot.level), x + size - 5, y + size - 5);
      }
      ctx.restore();
      return;
    }

    ctx.fillStyle = getSkillIconColor(slot.type);
    ctx.strokeStyle = "#fff4cf";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (slot.type === "target") {
      ctx.beginPath();
      ctx.moveTo(cx - 11, cy - 5);
      ctx.quadraticCurveTo(cx - 2, cy + 9, cx + 10, cy - 5);
      ctx.stroke();
      for (let i = 0; i < 3; i += 1) {
        const tx = cx - 5 + i * 6;
        ctx.beginPath();
        ctx.moveTo(tx, cy - 2);
        ctx.lineTo(tx + 2, cy + 6);
        ctx.lineTo(tx + 5, cy - 2);
        ctx.stroke();
      }
    } else if (slot.type === "area") {
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0.25, Math.PI * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 10, cy - 8);
      ctx.lineTo(cx + 15, cy - 6);
      ctx.lineTo(cx + 11, cy - 2);
      ctx.stroke();
    } else if (slot.type === "line") {
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy + 8);
      ctx.lineTo(cx + 9, cy - 8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 9, cy - 8);
      ctx.lineTo(cx + 4, cy - 9);
      ctx.moveTo(cx + 9, cy - 8);
      ctx.lineTo(cx + 8, cy - 3);
      ctx.stroke();
    } else if (slot.type === "cone") {
      ctx.beginPath();
      ctx.moveTo(cx - 10, cy + 9);
      ctx.quadraticCurveTo(cx + 1, cy - 15, cx + 7, cy + 2);
      ctx.quadraticCurveTo(cx + 12, cy - 4, cx + 11, cy + 12);
      ctx.quadraticCurveTo(cx, cy + 8, cx - 10, cy + 9);
      ctx.fill();
      ctx.stroke();
    }

    if (!slot.isBasic) {
      ctx.fillStyle = "#f4f2de";
      ctx.font = "800 10px Yu Gothic UI, Meiryo, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(slot.level), x + size - 5, y + size - 5);
    }
    ctx.restore();
  }

  function getSkillIconColor(type) {
    return {
      target: "#f4f2de",
      area: "#60d5c8",
      line: "#f3b13d",
      cone: "#e45c34"
    }[type] || "#f4f2de";
  }

  function getSkillSlotAt(clientX, clientY) {
    if (!skillHudBounds.length) {
      return null;
    }
    const point = getCanvasPoint(clientX, clientY);
    return (skillHudBounds.find((bound) => (
      point.x >= bound.x &&
      point.x <= bound.x + bound.width &&
      point.y >= bound.y &&
      point.y <= bound.y + bound.height
    )) || {}).slot || null;
  }

  function isCanvasHudPoint(clientX, clientY) {
    const point = getCanvasPoint(clientX, clientY);
    return point.y < 150 && point.x < 310;
  }

  function getCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * WIDTH,
      y: ((clientY - rect.top) / rect.height) * HEIGHT
    };
  }

  function drawBar(x, y, width, height, ratio, fill, back) {
    ctx.fillStyle = back;
    roundRect(x, y, width, height, height / 2);
    ctx.fill();
    ctx.fillStyle = fill;
    roundRect(x, y, width * ratio, height, height / 2);
    ctx.fill();
  }

  function drawEnemyHp(enemy, x, y, width) {
    const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
    ctx.save();
    drawBar(x - width / 2, y, width, 6, ratio, "#e45c34", "rgba(0,0,0,0.45)");
    ctx.restore();
  }

  function roundRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawSpriteAsset(asset, x, y, size, flip, alpha, motion) {
    const frame = resolveSpriteFrame(asset, motion);
    const transform = createSpriteTransform(motion);
    drawSprite(frame.image, x, y, size, flip, alpha, {
      ...transform,
      frame: frame.rect
    });
  }

  function resolveSpriteFrame(asset, motion = {}) {
    const fallbackSrc = getSpriteSrc(asset && asset.sprite ? asset.sprite : asset);
    const animationName = motion.animation || (motion.moving > 0.1 ? "walk" : "idle");
    const frames = getAnimationFrames(asset, animationName);

    if (!frames.length) {
      return { image: images.get(fallbackSrc), rect: null };
    }

    const animation = getAnimationConfig(asset, animationName);
    const fps = Number(animation.fps || animation.frameRate || asset.fps || asset.frameRate || 8);
    const frame = frames[Math.floor((motion.time || 0) * fps) % frames.length];
    const src = getSpriteSrc(frame) || fallbackSrc;
    return {
      image: images.get(src),
      rect: getFrameRect(frame)
    };
  }

  function getAnimationConfig(asset, animationName) {
    if (!asset || !asset.animations) {
      return {};
    }
    const animation = asset.animations[animationName] || asset.animations.idle || asset.animations.default;
    return animation && !Array.isArray(animation) ? animation : {};
  }

  function getAnimationFrames(asset, animationName) {
    if (!asset) {
      return [];
    }

    if (asset.animations) {
      const animation = asset.animations[animationName] || asset.animations.idle || asset.animations.default;
      if (Array.isArray(animation)) {
        return animation;
      }
      if (animation && Array.isArray(animation.frames)) {
        return animation.frames;
      }
    }

    return Array.isArray(asset.frames) ? asset.frames : [];
  }

  function getFrameRect(frame) {
    if (!frame || typeof frame !== "object") {
      return null;
    }

    const width = frame.w || frame.width;
    const height = frame.h || frame.height;
    if ([frame.x, frame.y, width, height].every((value) => Number.isFinite(value))) {
      return { x: frame.x, y: frame.y, width, height };
    }
    return null;
  }

  function createSpriteTransform(motion = {}) {
    const profile = SPRITE_MOTION[motion.kind] || SPRITE_MOTION.enemy;
    const moving = clamp(motion.moving || 0, 0, 1);
    const phase = motion.phase || 0;
    const step = Math.sin(phase);
    const squash = Math.abs(Math.cos(phase)) * moving * profile.squash;
    const attack = clamp((motion.attackPulse || 0) / 0.22, 0, 1);
    const hit = clamp((motion.hitFlash || 0) / 0.22, 0, 1);
    const facing = normalize(motion.facingX || 0, motion.facingY || 0);
    const tiltDirection = facing.x || (motion.flip ? -1 : 1);
    const pose = motion.actionPose;
    const poseProgress = pose ? clamp(pose.elapsed / pose.duration, 0, 1) : 0;
    const poseWave = Math.sin(poseProgress * Math.PI);
    const tailSweep = pose && pose.type === "tail_sweep" ? Math.sin(poseProgress * Math.PI * 2) : 0;
    const fireBreath = pose && pose.type === "fire_breath" ? poseWave : 0;
    const rush = motion.action && motion.action.type === "rush" ? 1 : 0;

    return {
      offsetX: facing.x * (attack * 5 + rush * 15 + fireBreath * 6 - Math.abs(tailSweep) * 5),
      offsetY: step * profile.bob * moving - attack * 2 + hit * 2 - rush * 3,
      rotation: tiltDirection * profile.tilt * moving + step * profile.tilt * 0.28 * moving + hit * tiltDirection * 0.08 + rush * tiltDirection * 0.16 + tailSweep * 0.22,
      scaleX: 1 + squash + attack * 0.1 + hit * 0.08 + rush * 0.18 + Math.abs(tailSweep) * 0.08 + fireBreath * 0.08,
      scaleY: 1 - squash * 0.75 - attack * 0.05 + hit * 0.07 - rush * 0.08 - fireBreath * 0.04
    };
  }

  function drawSprite(image, x, y, size, flip, alpha, options = {}) {
    if (!image) return;
    const frame = options.frame;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + (options.offsetX || 0), y + (options.offsetY || 0));
    ctx.rotate(options.rotation || 0);
    ctx.scale((flip ? -1 : 1) * (options.scaleX || 1), options.scaleY || 1);

    if (frame) {
      const ratio = frame.width / frame.height || 1;
      const drawWidth = size * ratio;
      const drawHeight = size;
      ctx.drawImage(image, frame.x, frame.y, frame.width, frame.height, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    } else {
      const ratio = image.width / image.height || 1;
      const drawWidth = size * ratio;
      const drawHeight = size;
      ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    }
    ctx.restore();
  }

  function toScreen(x, y) {
    const camera = run ? run.camera : { x: 0, y: 0 };
    return {
      x: x - camera.x + WIDTH / 2,
      y: y - camera.y + HEIGHT / 2
    };
  }

  function getDistance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function normalize(x, y) {
    const length = Math.hypot(x, y) || 1;
    return { x: x / length, y: y / length };
  }

  function angleDelta(angle, centerAngle) {
    return Math.atan2(Math.sin(angle - centerAngle), Math.cos(angle - centerAngle));
  }

  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSq = dx * dx + dy * dy;
    if (lengthSq <= 0.0001) {
      return getDistance(point, start);
    }
    const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSq, 0, 1);
    const closest = {
      x: start.x + dx * t,
      y: start.y + dy * t
    };
    return getDistance(point, closest);
  }

  function pushEnemy(enemy, origin, strength) {
    const direction = normalize(enemy.x - origin.x, enemy.y - origin.y);
    enemy.x += direction.x * strength;
    enemy.y += direction.y * strength;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function hash(x, y) {
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return value - Math.floor(value);
  }

  function positiveModulo(value, divisor) {
    return ((value % divisor) + divisor) % divisor;
  }

  function formatTime(seconds) {
    const safe = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safe / 60);
    const rest = String(safe % 60).padStart(2, "0");
    return `${minutes}:${rest}`;
  }

  init().catch((error) => {
    panel.innerHTML = `
      <h2>起動エラー</h2>
      <p>${error.message}</p>
    `;
    showOverlay();
    console.error(error);
  });
})();

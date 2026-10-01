import { CONFIG, PONDS, FOREST, LEVELS, TARGET_TYPES, radiusFor, expToNext, stageFor } from './config.js';
import { TAU, clamp, rand, randInt, angleTo, hash2 } from './utils.js';
import { World } from './world.js';
import { Player } from './player.js';
import { Camera } from './camera.js';
import { Particles, Texts } from './particles.js';
import { Target, drawType } from './target.js';
import { storage } from './storage.js';

export class Game {
  constructor() {
    this.state = 'menu';
    this.world = new World();
    this.player = new Player();
    this.camera = new Camera(this.world.W, this.world.H);
    this.particles = new Particles(420);
    this.texts = new Texts(40);
    this.targets = [];
    const poolSize = CONFIG.game.maxTargets + 60;
    for (let i = 0; i < poolSize; i++) this.targets.push(new Target());
    this.aliveCount = 0;
    this.time = 0;
    this.gameTime = 0;
    this.timer = CONFIG.game.duration;
    this.endless = false;
    this.score = 0;
    this.spawnTimer = 0;
    this.ambientTimer = 0;
    this.attractT = 0;
    this.mouseWX = 0;
    this.mouseWY = 0;
    this.lastStageName = '小朵朵';
    this.prevInWater = false;
    this.level = 1;
    this.levelName = LEVELS[0].name;
    this.quest = { slimes: 0, goal: FOREST.slimeGoal, coins: 0 };
    this.gateOpen = false;
    this.gateT = 0;
    this.gateHintT = 0;
    this.respawn = { x: LEVELS[1].startX, y: LEVELS[1].startY };
    this.checkpoints = [];
    this.input = null;
    this.audio = null;
    this.ui = null;
    this.scatterInitial();
    this.camera.snapTo(this.player.x, this.player.y);
  }

  scatterInitial() {
    for (const t of this.targets) t.alive = false;
    this.aliveCount = 0;
    const m = CONFIG.world.margin + 80;
    const W = this.world.W - m;
    const H = this.world.H - m;
    const count = this.level === 2 ? 95 : CONFIG.game.initialScatter;
    for (let i = 0; i < count; i++) {
      const x = rand(m, W);
      const y = rand(m, H);
      const type = this.pickTypeFor(x, y, 5);
      if (!type) continue;
      const t = this.firstInactive();
      if (!t) break;
      t.spawn(type, x, y);
      this.aliveCount++;
    }
    if (this.level === 2) {
      this.setupForest();
    }
  }

  setupForest() {
    for (const s of FOREST.slimes) {
      const t = this.firstInactive();
      if (!t) break;
      const type = TARGET_TYPES.find((tt) => tt.id === 'slime');
      t.spawn(type, s.x, s.y);
      this.aliveCount++;
    }
    const coinType = TARGET_TYPES.find((tt) => tt.id === 'coin');
    for (let i = 0; i < FOREST.coinCount; i++) {
      const t = this.firstInactive();
      if (!t) break;
      const hx = hash2(i * 7 + 1, 3);
      const hy = hash2(i * 13 + 5, 9);
      const cx = 700 + (i % 8) * 730 + hx * 260;
      const cy = 750 + hy * 1300;
      t.spawn(coinType, clamp(cx, 200, this.world.W - 200), clamp(cy, 220, this.world.H - 220));
      this.aliveCount++;
    }
    this.checkpoints = FOREST.checkpoints.map((c) => ({ x: c.x, y: c.y, taken: false }));
    this.respawn = { x: LEVELS[1].startX, y: LEVELS[1].startY };
    this.quest.slimes = 0;
    this.quest.coins = 0;
    this.quest.goal = FOREST.slimeGoal;
    this.gateOpen = false;
    this.gateT = 0;
    this.gateHintT = 0;
  }

  firstInactive() {
    for (const t of this.targets) {
      if (!t.alive) return t;
    }
    return null;
  }

  pickTypeFor(x, y, maxTier) {
    const water = this.world.waterAt(x, y);
    const pool = [];
    let total = 0;
    for (const type of TARGET_TYPES) {
      if (type.tier > maxTier) continue;
      if (!type.levels || !type.levels.includes(this.level)) continue;
      if (type.collectible || type.hostile) continue;
      let ok = false;
      if (type.habitat === 'any') ok = true;
      else if (water && type.habitat === 'water') ok = true;
      else if (!water && type.habitat === 'land') ok = true;
      else if (!water && type.habitat === 'shore' && this.world.shoreDist(x, y) < 80) ok = true;
      if (!ok) continue;
      let w = Math.max(1, 10 - type.tier * 1.7 + (type.speed === 0 ? 2.2 : 0));
      if (type.tier >= 4) w *= 0.3;
      pool.push({ type, w });
      total += w;
    }
    if (total <= 0) return null;
    let r = Math.random() * total;
    for (const p of pool) {
      r -= p.w;
      if (r <= 0) return p.type;
    }
    return pool[pool.length - 1].type;
  }

  bindIO(input, audio, ui) {
    this.input = input;
    this.audio = audio;
    this.ui = ui;
  }

  start() {
    this.startLevel(1);
  }

  startLevel(lv) {
    const L = LEVELS.find((l) => l.id === lv) || LEVELS[0];
    this.level = L.id;
    this.levelName = L.name;
    this.world.setTheme(L.theme);
    this.camera.worldW = this.world.W;
    this.camera.worldH = this.world.H;
    this.player.reset();
    this.player.x = L.startX;
    this.player.y = L.startY;
    this.score = 0;
    this.gameTime = 0;
    this.timer = L.duration > 0 ? L.duration : -1;
    this.endless = false;
    this.spawnTimer = 0;
    this.time = 0;
    this.lastStageName = stageFor(1).name;
    this.prevInWater = false;
    this.scatterInitial();
    this.camera.snapTo(this.player.x, this.player.y);
    this.camera.zoomTarget = CONFIG.zoom.base - this.player.visualR * CONFIG.zoom.shrink;
    this.state = 'playing';
    if (this.ui) this.ui.showLevelTitle(L.title, L.name);
    if (this.audio) this.audio.levelStart();
  }

  pause() {
    if (this.state === 'playing') this.state = 'paused';
  }

  resume() {
    if (this.state === 'paused') this.state = 'playing';
  }

  toMenu() {
    this.state = 'menu';
    this.level = 1;
    this.levelName = LEVELS[0].name;
    this.world.setTheme('meadow');
    this.camera.worldW = this.world.W;
    this.camera.worldH = this.world.H;
    this.player.reset();
    this.attractT = 0;
    this.scatterInitial();
  }

  continueEndless() {
    this.endless = true;
    this.state = 'playing';
  }

  gameover(reason) {
    this.state = 'gameover';
    const s = this.player.stats;
    const bestExp = storage.getBestExp();
    const isRecord = s.totalExp > bestExp;
    if (isRecord) storage.setBestExp(s.totalExp);
    storage.setBestLevel(Math.max(storage.getBestLevel(), s.maxLevel));
    storage.setBestSize(Math.max(storage.getBestSize(), Math.round(s.maxSize)));
    storage.setGames(storage.getGames() + 1);
    if (this.ui) {
      this.ui.showGameover(
        {
          exp: s.totalExp,
          score: this.score,
          eaten: s.eaten,
          level: s.maxLevel,
          size: Math.round(s.maxSize),
          time: this.gameTime,
        },
        reason,
        isRecord
      );
    }
  }

  levelComplete(lv) {
    if (this.state !== 'playing') return;
    this.state = 'levelcomplete';
    const s = this.player.stats;
    const bestExp = storage.getBestExp();
    const isRecord = s.totalExp > bestExp;
    if (isRecord) storage.setBestExp(s.totalExp);
    storage.setBestLevel(Math.max(storage.getBestLevel(), s.maxLevel));
    storage.setBestSize(Math.max(storage.getBestSize(), Math.round(s.maxSize)));
    storage.setGames(storage.getGames() + 1);
    storage.setTotalCoins(storage.getTotalCoins() + this.quest.coins);
    storage.setUnlocked(Math.max(storage.getUnlocked(), lv + 1));
    if (this.ui) {
      this.ui.showLevelComplete(lv, {
        exp: s.totalExp,
        score: this.score,
        coins: this.quest.coins,
        slimes: this.quest.slimes,
        eaten: s.eaten,
        time: this.gameTime,
      });
    }
    if (this.audio) this.audio.levelClear();
  }

  update(dt, view) {
    if (this.state === 'playing') this.updatePlay(dt, view);
    else if (this.state === 'menu') this.updateMenu(dt, view);
    else if (this.state === 'dying') {
      this.world.update(dt);
      for (const t of this.targets) if (t.alive) t.update(dt, this.player, this.world);
      this.particles.update(dt);
      this.texts.update(dt);
      this.player.animTime += dt;
      this.player.deadT += dt;
      if (this.player.deadT > 1.7) this.gameover('death');
    } else if (this.state === 'gameover' || this.state === 'levelcomplete') {
      this.world.update(dt);
      for (const t of this.targets) if (t.alive) t.update(dt, this.player, this.world);
      this.particles.update(dt);
      this.texts.update(dt);
      if (this.level === 2) this.ambientFireflies(dt, view);
    }
  }

  updateMenu(dt, view) {
    this.world.update(dt);
    this.attractT += dt;
    const cx = this.world.W / 2 + Math.cos(this.attractT * 0.1) * 800;
    const cy = this.world.H / 2 + Math.sin(this.attractT * 0.07) * 520;
    this.camera.follow(cx, cy, dt, view.w, view.h);
    this.camera.zoomTarget = 0.62;
    this.player.x = this.camera.x + this.camera.shakeX;
    this.player.y = this.camera.y + this.camera.shakeY;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.idle(dt);
    for (const t of this.targets) if (t.alive) t.update(dt, this.player, this.world);
    this.particles.update(dt);
    this.texts.update(dt);
    this.ambientBubbles(dt, view);
  }

  updatePlay(dt, view) {
    if (window.__frames !== undefined) window.__frames++;
    this.time += dt;
    this.gameTime += dt;
    if (!this.endless && this.timer > 0) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = 0;
        if (this.level === 1) {
          this.levelComplete(1);
          return;
        }
      }
    }

    this.mouseWX = this.camera.x + (this.input.mouse.x - view.w / 2) / this.camera.zoom;
    this.mouseWY = this.camera.y + (this.input.mouse.y - view.h / 2) / this.camera.zoom;

    this.player.update(dt, this.input, this.world, this);
    this.camera.follow(
      this.player.x + this.player.vx * 0.12,
      this.player.y + this.player.vy * 0.12,
      dt,
      view.w,
      view.h
    );
    this.camera.zoomTarget = clamp(
      CONFIG.zoom.base - this.player.visualR * CONFIG.zoom.shrink,
      CONFIG.zoom.min,
      CONFIG.zoom.max
    );
    this.world.update(dt);

    if (this.player.inWater && !this.prevInWater) {
      this.particles.splash(this.player.x, this.player.y, this.player.visualR * 0.8);
      if (this.audio) this.audio.splash();
    }
    if (!this.player.inWater && this.prevInWater) {
      this.particles.splash(this.player.x, this.player.y, this.player.visualR * 0.6);
    }
    this.prevInWater = this.player.inWater;

    if (!this.player.inWater && Math.hypot(this.player.vx, this.player.vy) > 150 && Math.random() < dt * 7) {
      this.particles.dust(this.player.x, this.player.y + this.player.visualR * 0.8);
    }

    this.spawnTargets(dt);
    for (const t of this.targets) {
      if (t.alive) t.update(dt, this.player, this.world);
    }
    this.collisions();
    this.processEatAnims();

    if (this.level === 2 && this.state === 'playing') {
      this.updateCheckpoints();
      this.updateGate(dt);
      this.ambientFireflies(dt, view);
    }

    this.particles.update(dt);
    this.texts.update(dt);
    if (this.level === 1) this.ambientBubbles(dt, view);

    if (this.ui) this.ui.updateHud(this);
  }

  spawnTargets(dt) {
    this.spawnTimer -= dt;
    const m = CONFIG.world.margin + 60;
    const W = this.world.W - m;
    const H = this.world.H - m;
    while (this.spawnTimer <= 0 && this.aliveCount < CONFIG.game.maxTargets) {
      this.spawnTimer += CONFIG.game.spawnInterval;
      for (let attempt = 0; attempt < 8; attempt++) {
        let x, y;
        if (attempt >= 5) {
          x = rand(m, W);
          y = rand(m, H);
        } else {
          const a = rand(TAU);
          const d = rand(CONFIG.game.spawnDistMin, CONFIG.game.spawnDistMax);
          x = clamp(this.player.x + Math.cos(a) * d, m, W);
          y = clamp(this.player.y + Math.sin(a) * d, m, H);
        }
        const type = this.pickTypeFor(x, y, 5);
        if (!type) continue;
        const t = this.firstInactive();
        if (!t) return;
        t.spawn(type, x, y);
        this.aliveCount++;
        break;
      }
    }
  }

  collisions() {
    const p = this.player;
    for (const t of this.targets) {
      if (!t.alive) continue;
      const dx = p.x - t.x;
      const dy = p.y - t.y;
      const rr = p.visualR * 0.75 + t.r;
      if (dx * dx + dy * dy >= rr * rr) continue;

      if (t.type.collectible) {
        this.collectCoin(t);
        continue;
      }
      if (t.type.hostile) {
        this.slimeCombat(t);
        continue;
      }

      if (p.visualR >= t.r * CONFIG.eat.threshold) {
        this.eat(t);
      } else {
        const a = angleTo(t.x, t.y, p.x, p.y);
        p.x = t.x + Math.cos(a) * (rr + 2);
        p.y = t.y + Math.sin(a) * (rr + 2);
        p.vx += Math.cos(a) * CONFIG.player.knockback * 0.55;
        p.vy += Math.sin(a) * CONFIG.player.knockback * 0.55;
        t.fleeT = 1.2;
        this.texts.add(t.x, t.y - t.r - 12, '还吃不了…', '#ffb04a', 15, 0.9);
        this.camera.shake(0.12);
        if (this.audio) this.audio.deny();
        if (t.r > p.visualR * 1.15 && p.damageCd <= 0) {
          this.damage(t);
        }
      }
    }
  }

  collectCoin(t) {
    t.alive = false;
    this.aliveCount--;
    this.quest.coins++;
    this.score += t.type.score;
    this.player.stats.totalExp += 1;
    this.player.stats.eaten++;
    this.particles.eatPop(t.x, t.y, '#ffd23e', 9);
    this.texts.add(t.x, t.y - 14, '+1 🪙', '#ffd84a', 16, 0.9);
    if (this.audio) this.audio.coin();
    this.checkLevelUp();
  }

  slimeCombat(t) {
    const p = this.player;
    const a = angleTo(t.x, t.y, p.x, p.y);
    const push = (dist) => {
      p.x = t.x + Math.cos(a) * dist;
      p.y = t.y + Math.sin(a) * dist;
      t.x -= Math.cos(a) * 20;
      t.y -= Math.sin(a) * 20;
    };
    const canAttack = p.visualR >= t.r * 1.05;
    if (canAttack) {
      push(p.visualR * 0.75 + t.r + 6);
      if (t.hitCd <= 0) {
        t.hitCd = 0.42;
        t.hp--;
        t.flash = 0.18;
        t.vx += Math.cos(a) * 260;
        t.vy += Math.sin(a) * 260;
        p.vx -= Math.cos(a) * 60;
        p.vy -= Math.sin(a) * 60;
        this.texts.add(t.x, t.y - t.r - 26, '咚！', '#ffe9a0', 15, 0.6);
        this.particles.sparks(t.x, t.y, '#a8e063', 5, 120);
        if (this.audio) this.audio.slimeHit();
        if (t.hp <= 0) this.defeatSlime(t);
      }
    } else {
      push(p.visualR * 0.75 + t.r + 8);
      if (p.damageCd <= 0 && p.invulnT <= 0) {
        this.damage(t);
        t.vx -= Math.cos(a) * 180;
        t.vy -= Math.sin(a) * 180;
      }
    }
  }

  defeatSlime(t) {
    t.alive = false;
    this.aliveCount--;
    this.quest.slimes++;
    const exp = t.type.exp;
    this.player.exp += exp;
    this.score += t.type.score;
    this.player.stats.totalExp += exp;
    this.player.stats.eaten++;
    this.player.laugh(0.7);
    this.particles.burst(t.x, t.y, '#8fd06a', 16, 220);
    this.particles.ring(t.x, t.y, '#a8e063', t.r * 1.4, 0.6);
    this.texts.add(t.x, t.y - t.r - 30, '史莱姆打败啦！', '#a8e063', 20, 1.2);
    const coinType = TARGET_TYPES.find((tt) => tt.id === 'coin');
    for (let i = 0; i < 4; i++) {
      const c = this.firstInactive();
      if (!c) break;
      const a = rand(TAU);
      const d = rand(30, 80);
      c.spawn(coinType, t.x + Math.cos(a) * d, t.y + Math.sin(a) * d);
      this.aliveCount++;
    }
    if (this.audio) this.audio.slimeDefeat();
    this.checkLevelUp();
    if (this.quest.slimes >= this.quest.goal && !this.gateOpen) {
      this.gateOpen = true;
      this.gateT = 0;
      this.particles.ring(FOREST.gate.x, FOREST.gate.y, '#ffd84a', 120, 1.2);
      this.particles.ring(FOREST.gate.x, FOREST.gate.y, '#ff9cc4', 70, 1.0);
      this.texts.add(FOREST.gate.x, FOREST.gate.y - 240, '终点大门打开啦！', '#ffe9a0', 24, 2);
      if (this.audio) this.audio.gateOpen();
    }
  }

  updateCheckpoints() {
    const p = this.player;
    for (const c of this.checkpoints) {
      if (c.taken) continue;
      if (Math.hypot(p.x - c.x, p.y - c.y) < 85) {
        c.taken = true;
        this.respawn = { x: c.x, y: c.y };
        this.particles.sparks(c.x, c.y, '#ff9cc4', 14, 160);
        this.particles.ring(c.x, c.y, '#ffffff', 40, 0.6);
        this.texts.add(c.x, c.y - 70, '检查点！', '#ffd84a', 18, 1.2);
        if (this.audio) this.audio.checkpoint();
      }
    }
  }

  updateGate(dt) {
    this.gateT += dt;
    if (this.gateHintT > 0) this.gateHintT -= dt;
    const g = FOREST.gate;
    const p = this.player;
    const d = Math.hypot(p.x - g.x, p.y - g.y);
    if (this.gateOpen && d < g.r * 0.9) {
      this.levelComplete(2);
      return;
    }
    if (!this.gateOpen && d < g.r * 1.5 && this.gateHintT <= 0) {
      this.gateHintT = 2;
      const left = this.quest.goal - this.quest.slimes;
      this.texts.add(g.x, g.y - g.r - 60, left > 0 ? '还需要打败 ' + left + ' 只史莱姆哦' : '大门就要打开了！', '#ffe9a0', 16, 1.8);
    }
  }

  ambientFireflies(dt, view) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 0.4;
    const hw = view.w / (2 * this.camera.zoom) + 80;
    const hh = view.h / (2 * this.camera.zoom) + 80;
    const x = this.camera.x + rand(-hw, hw);
    const y = this.camera.y + rand(-hh, hh);
    if (x < 100 || x > this.world.W - 100 || y < 100 || y > this.world.H - 100) return;
    this.particles.add({
      x, y,
      vx: rand(-12, 12),
      vy: rand(-16, 4),
      maxLife: rand(1.6, 3.2),
      size: rand(1.6, 3),
      color: Math.random() < 0.7 ? '#ffe98a' : '#b8ffd8',
      alpha: rand(0.5, 0.9),
      drag: 0.2,
      wob: rand(6, 14),
      wobFreq: rand(2, 5),
    });
  }

  eat(t) {
    const mult = LEVELS.find((l) => l.id === this.level)?.foodExpMult || 1;
    const exp = Math.round(t.type.exp * mult);
    t.alive = false;
    this.aliveCount--;
    this.player.exp += exp;
    this.score += t.type.score;
    this.player.stats.eaten++;
    this.player.stats.totalExp += exp;
    this.player.mouth = 1;
    if (t.r >= 26) this.player.laugh(0.9);
    this.player.eatAnims.push({
      t: 0,
      dur: 0.42,
      x: t.x,
      y: t.y,
      r: t.r,
      type: t.type,
      swallowed: false,
      done: false,
    });
    if (this.audio) {
      if (t.r >= 60) this.audio.bigEat();
      else this.audio.eat(t.r);
      this.audio.vibrate(12);
    }
    this.checkLevelUp();
  }

  processEatAnims() {
    for (const a of this.player.eatAnims) {
      if (a.swallowed && !a.done) {
        a.done = true;
        this.particles.eatPop(a.x, a.y, a.type.colors[0], Math.max(8, a.r * 0.6));
        this.texts.add(this.player.x, this.player.y - this.player.visualR * 1.5, '+' + a.type.exp, '#ffe9a0', Math.min(30, 14 + a.r * 0.28), 1.0);
      }
    }
  }

  checkLevelUp() {
    const p = this.player;
    let leveled = false;
    while (p.level < CONFIG.levels.max && p.exp >= expToNext(p.level)) {
      p.exp -= expToNext(p.level);
      p.level++;
      leveled = true;
    }
    if (p.level >= CONFIG.levels.max) p.exp = Math.min(p.exp, expToNext(p.level - 1) - 1);
    if (leveled) this.onLevelUp();
  }

  onLevelUp() {
    const p = this.player;
    p.stats.maxLevel = Math.max(p.stats.maxLevel, p.level);
    p.stats.maxSize = Math.max(p.stats.maxSize, radiusFor(p.level));
    p.hp = Math.min(CONFIG.player.hpMax, p.hp + 15);
    p.levelUpPop();
    p.laugh(1.2);
    this.camera.shake(0.5);
    this.particles.levelUp(p.x, p.y);
    const st = stageFor(p.level);
    if (st.name !== this.lastStageName) {
      this.lastStageName = st.name;
      if (this.ui) this.ui.banner('LEVEL UP!', '朵朵长大了！成长为「' + st.name + '」');
    } else {
      if (this.ui) this.ui.banner('LEVEL UP!', '朵朵长大了！');
    }
    if (this.audio) {
      this.audio.levelup();
      this.audio.vibrate(40);
    }
  }

  damage(t) {
    const p = this.player;
    p.hp = Math.max(0, p.hp - CONFIG.player.damage);
    p.damageCd = CONFIG.player.damageCooldown;
    p.hpTimer = CONFIG.player.hpRegenDelay;
    p.hurt(0.5);
    this.camera.shake(0.45);
    this.texts.add(p.x, p.y - p.visualR * 1.4, '好痛！', '#ff6b5e', 20, 1.0);
    if (this.audio) {
      this.audio.hurt();
      this.audio.vibrate(60);
    }
    if (this.ui) this.ui.flashDamage();
    if (p.hp <= 0) {
      if (this.level === 2) {
        this.respawnPlayer();
      } else {
        this.state = 'dying';
        p.die();
        this.particles.burst(p.x, p.y, '#ffd9e8', 26, 300);
        this.particles.ring(p.x, p.y, '#ff9cc4', p.visualR * 0.8, 0.7);
        this.particles.ring(p.x, p.y, '#ffffff', p.visualR * 0.4, 0.5);
        this.camera.shake(0.7);
      }
    }
  }

  respawnPlayer() {
    const p = this.player;
    p.hp = CONFIG.player.hpMax;
    p.energy = CONFIG.player.energyMax;
    p.damageCd = 0;
    p.hpTimer = 0;
    p.invulnT = 2.5;
    p.x = this.respawn.x;
    p.y = this.respawn.y;
    p.vx = 0;
    p.vy = 0;
    this.camera.snapTo(p.x, p.y);
    this.particles.ring(p.x, p.y, '#ff9cc4', p.visualR * 1.2, 0.8);
    this.particles.sparks(p.x, p.y, '#ffffff', 18, 220);
    this.texts.add(p.x, p.y - p.visualR * 1.8, '朵朵在检查点复活啦！', '#ffd84a', 22, 1.8);
    if (this.audio) this.audio.respawn();
  }

  ambientBubbles(dt, view) {
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 0.22;
    const p = PONDS[randInt(0, PONDS.length - 1)];
    const a = rand(TAU);
    const d = Math.sqrt(Math.random());
    const bx = p.x + Math.cos(a) * p.rx * d;
    const by = p.y + Math.sin(a) * p.ry * d;
    const hw = view.w / (2 * this.camera.zoom) + 100;
    const hh = view.h / (2 * this.camera.zoom) + 100;
    if (bx < this.camera.x - hw || bx > this.camera.x + hw || by < this.camera.y - hh || by > this.camera.y + hh) return;
    this.particles.bubbles(bx, by, 1);
  }

  drawGate(ctx, time) {
    const g = FOREST.gate;
    const open = this.gateOpen;
    const t = this.gateT;
    ctx.save();
    ctx.translate(g.x, g.y);

    ctx.fillStyle = 'rgba(10,30,20,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, g.r * 0.75, g.r * 1.15, g.r * 0.3, 0, 0, TAU);
    ctx.fill();

    const glow = open ? 0.75 + 0.2 * Math.sin(t * 3) : 0.35 + 0.12 * Math.sin(t * 2);
    ctx.fillStyle = 'rgba(255,190,220,' + (glow * 0.3).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(0, 0, g.r * 1.5, g.r * 1.05, 0, 0, TAU);
    ctx.fill();

    for (const side of [-1, 1]) {
      ctx.fillStyle = '#7a5a48';
      ctx.beginPath();
      ctx.roundRect ? ctx.roundRect(side * g.r - g.r * 0.16, -g.r * 0.85, g.r * 0.32, g.r * 1.6, g.r * 0.12) : ctx.rect(side * g.r - g.r * 0.16, -g.r * 0.85, g.r * 0.32, g.r * 1.6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(40,25,20,0.5)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.strokeStyle = '#8a6a58';
    ctx.lineWidth = g.r * 0.14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, -g.r * 0.62, g.r, Math.PI, 0);
    ctx.stroke();

    for (const side of [-1, 1]) {
      ctx.fillStyle = open ? '#ffd84a' : '#b08a68';
      ctx.beginPath();
      ctx.arc(side * g.r * 0.95, -g.r * 0.62, g.r * 0.14, 0, TAU);
      ctx.fill();
      if (open) {
        ctx.fillStyle = 'rgba(255,240,180,' + (0.4 + 0.3 * Math.sin(t * 4)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(side * g.r * 0.95, -g.r * 0.62, g.r * 0.3, 0, TAU);
        ctx.fill();
      }
    }

    if (open) {
      const gd = ctx.createRadialGradient(0, 0, 5, 0, 0, g.r);
      gd.addColorStop(0, 'rgba(255,240,220,0.95)');
      gd.addColorStop(0.5, 'rgba(255,200,230,0.55)');
      gd.addColorStop(1, 'rgba(255,160,210,0)');
      ctx.fillStyle = gd;
      ctx.beginPath();
      ctx.arc(0, -g.r * 0.05, g.r * 0.95, 0, TAU);
      ctx.fill();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU + t * 0.8;
        ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + 0.4 * Math.sin(t * 5 + i)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(Math.cos(a) * g.r * (0.4 + 0.2 * Math.sin(t * 2 + i * 2)), -g.r * 0.05 + Math.sin(a) * g.r * 0.45, 3, 0, TAU);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = 'rgba(160,110,90,0.8)';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 10]);
      ctx.beginPath();
      ctx.arc(0, -g.r * 0.05, g.r * 0.9, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  drawCheckpoints(ctx, time) {
    for (const c of this.checkpoints) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.fillStyle = 'rgba(10,30,20,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 30, 34, 12, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#8a6a48';
      ctx.beginPath();
      ctx.rect(-5, -40, 10, 70);
      ctx.fill();
      const glow = c.taken ? 1 : 0.45 + 0.25 * Math.sin(time * 3 + c.x);
      ctx.fillStyle = c.taken ? '#ffd84a' : '#ff9cc4';
      ctx.beginPath();
      ctx.arc(0, -52, 14, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35 * glow).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(0, -52, 26 + Math.sin(time * 3 + c.x) * 3, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(-4, -56, 5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  render(ctx, view, dpr) {
    const w = view.w;
    const h = view.h;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.world.drawOcean(ctx, w, h);
    const cam = this.camera;
    const z = cam.zoom;
    ctx.save();
    ctx.setTransform(
      dpr * z,
      0,
      0,
      dpr * z,
      (w / 2 - (cam.x - cam.shakeX) * z) * dpr,
      (h / 2 - (cam.y - cam.shakeY) * z) * dpr
    );
    this.world.drawGround(ctx, cam, view, z);
    this.world.drawPonds(ctx, cam, view, z);
    this.world.drawTrees(ctx, cam, view, z);
    this.world.drawDecor(ctx, cam, view, z, this.world.time);
    this.world.drawCloudShadows(ctx, cam, view, z);

    if (this.level === 2) {
      this.drawGate(ctx, this.world.time);
      this.drawCheckpoints(ctx, this.world.time);
    }

    const hw = w / (2 * z) + 140;
    const hh = h / (2 * z) + 140;
    const showRings = this.state === 'playing' || this.state === 'menu';
    for (const t of this.targets) {
      if (!t.alive) continue;
      if (t.x < cam.x - hw || t.x > cam.x + hw || t.y < cam.y - hh || t.y > cam.y + hh) continue;
      t.draw(ctx, this.world.time, showRings ? this.player : null);
    }

    for (const a of this.player.eatAnims) {
      const f = Math.min(1, a.t / a.dur);
      const ease = f * f;
      const mx = this.player.x + this.player.facing * this.player.visualR * 0.75;
      const my = this.player.y + this.player.visualR * 0.1;
      const px = a.x + (mx - a.x) * ease;
      const py = a.y + (my - a.y) * ease;
      const pr = Math.max(0.5, a.r * (1 - ease * 0.92));
      drawType(ctx, a.type, px, py, pr, this.world.time, { dir: angleTo(a.x, a.y, mx, my), wag: this.world.time * 10, speed: 0, flash: 0, hopT: 0 });
    }

    this.player.draw(ctx, this.world.time);
    this.particles.draw(ctx);
    this.texts.draw(ctx);
    ctx.restore();

    this.world.drawClouds(ctx, view, cam);
    this.world.drawVignette(ctx, w, h);
  }

  targetsAlive() {
    return this.aliveCount;
  }

  debugGain(exp) {
    this.player.exp += exp;
    this.player.stats.totalExp += exp;
    this.checkLevelUp();
  }
}

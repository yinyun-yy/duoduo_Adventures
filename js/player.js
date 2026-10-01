import { CONFIG, radiusFor, speedFor } from './config.js';
import { TAU, clamp, expDamp, rand } from './utils.js';

export class Player {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.visualR = CONFIG.player.baseRadius;
    this.facing = 1;
    this.animTime = 0;
    this.hopPhase = 0;
    this.blinkT = rand(1.5, 4);
    this.blink = 0;
    this.mouth = 0;
    this.boostDelay = 0;
    this.trail = [];
    this.trailTimer = 0;
    this.eatAnims = [];
    this.hurtT = 0;
    this.laughT = 0;
    this.laughDur = 1;
    this.levelPop = 0;
    this.dead = false;
    this.deadT = 0;
    this.reset();
  }

  reset() {
    this.x = 1300;
    this.y = 1500;
    this.vx = 0;
    this.vy = 0;
    this.level = 1;
    this.exp = 0;
    this.visualR = radiusFor(1);
    this.hp = CONFIG.player.hpMax;
    this.energy = CONFIG.player.energyMax;
    this.facing = 1;
    this.mouth = 0;
    this.inWater = false;
    this.boosting = false;
    this.damageCd = 0;
    this.hpTimer = 0;
    this.invulnT = 0;
    this.eatAnims.length = 0;
    this.trail.length = 0;
    this.hurtT = 0;
    this.laughT = 0;
    this.laughDur = 1;
    this.levelPop = 0;
    this.dead = false;
    this.deadT = 0;
    this.stats = { eaten: 0, totalExp: 0, maxLevel: 1, maxSize: CONFIG.player.baseRadius };
  }

  get r() {
    return this.visualR;
  }

  get stageIndex() {
    return STAGE_INDEX_OF(this.level);
  }

  get state() {
    if (this.dead) return 'dead';
    if (this.hurtT > 0) return 'hurt';
    if (this.laughT > 0) return 'laugh';
    if (this.mouth > 0.04) return 'eat';
    if (this.boosting) return 'boost';
    if (this.moving) return 'move';
    return 'idle';
  }

  laugh(dur) {
    this.laughT = Math.max(this.laughT, dur);
    this.laughDur = dur;
  }

  hurt(dur) {
    this.hurtT = Math.max(this.hurtT, dur);
  }

  die() {
    this.dead = true;
    this.deadT = 0;
    this.vx = 0;
    this.vy = 0;
  }

  levelUpPop() {
    this.levelPop = 1;
  }

  laughOpen() {
    if (this.laughT <= 0) return 0;
    const t = this.laughDur - this.laughT;
    const fadeIn = clamp(t / 0.15, 0, 1);
    const fadeOut = clamp(this.laughT / 0.25, 0, 1);
    return Math.min(fadeIn, fadeOut);
  }

  idle(dt) {
    this.animTime += dt;
    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.14;
      this.blinkT = rand(2.2, 5.5);
    }
    if (this.blink > 0) this.blink -= dt;
    this.mouth = Math.max(0, this.mouth - dt * 2.6);
    this.hopPhase += dt * 2.5;
    this.inWater = false;
    this.boosting = false;
    this.vx = 0;
    this.vy = 0;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.laughT > 0) this.laughT -= dt;
    if (this.levelPop > 0) this.levelPop = Math.max(0, this.levelPop - dt * 2.5);
    const targetR = radiusFor(this.level);
    this.visualR += (targetR - this.visualR) * expDamp(dt, 2.6);
    if (this.trail.length > 0) this.trail.shift();
  }

  update(dt, input, world, game) {
    this.animTime += dt;

    let dx = 0;
    let dy = 0;
    const joy = input.joyVector();
    if (joy) {
      dx = joy.x;
      dy = joy.y;
    } else {
      const left = input.key('a') || input.key('arrowleft');
      const right = input.key('d') || input.key('arrowright');
      const up = input.key('w') || input.key('arrowup');
      const down = input.key('s') || input.key('arrowdown');
      dx = (right ? 1 : 0) - (left ? 1 : 0);
      dy = (down ? 1 : 0) - (up ? 1 : 0);
      if (dx !== 0 || dy !== 0) {
        const l = Math.hypot(dx, dy);
        dx /= l;
        dy /= l;
      }
    }

    if (dx === 0 && dy === 0 && input.mouse.down && !joy) {
      const mx = game.mouseWX;
      const my = game.mouseWY;
      const md = Math.hypot(mx - this.x, my - this.y);
      if (md > 16) {
        dx = (mx - this.x) / md;
        dy = (my - this.y) / md;
      }
    }

    this.moving = dx !== 0 || dy !== 0;

    const wantBoost = (input.shiftBoost() || input.boost) && this.energy > 1;
    if (wantBoost && this.energy > 0) {
      this.energy = Math.max(0, this.energy - dt * CONFIG.player.boostDrain);
      this.boostDelay = CONFIG.player.boostRegenDelay;
    } else {
      if (this.boostDelay > 0) this.boostDelay -= dt;
      else this.energy = Math.min(CONFIG.player.energyMax, this.energy + dt * CONFIG.player.boostRegen);
    }
    this.boosting = wantBoost;

    this.inWater = world.waterAt(this.x, this.y);

    const maxSpeed =
      speedFor(this.level) *
      (this.boosting ? CONFIG.player.boostMult : 1) *
      (this.inWater ? CONFIG.player.waterMult : 1);

    const k = expDamp(dt, CONFIG.player.accelK);
    this.vx += (dx * maxSpeed - this.vx) * k;
    this.vy += (dy * maxSpeed - this.vy) * k;
    if (!this.moving) {
      const f = expDamp(dt, CONFIG.player.frictionK);
      this.vx *= 1 - f;
      this.vy *= 1 - f;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const m = CONFIG.world.margin + this.visualR * 0.6;
    this.x = clamp(this.x, m, world.W - m);
    this.y = clamp(this.y, m, world.H - m);

    const speed = Math.hypot(this.vx, this.vy);
    if (Math.abs(this.vx) > 14) this.facing = this.vx > 0 ? 1 : -1;
    if (Math.abs(this.vy) > Math.abs(this.vx) * 1.6 && Math.abs(this.vy) > 20) {
      this.facing = this.vy > 0 ? -1 : 1;
    }

    this.hopPhase += dt * (3.5 + speed * 0.055);

    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blink = 0.14;
      this.blinkT = rand(2.2, 5.5);
    }
    if (this.blink > 0) this.blink -= dt;
    this.mouth = Math.max(0, this.mouth - dt * 2.6);

    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.laughT > 0) {
      this.laughT -= dt;
      if (Math.random() < dt * 9) {
        game.particles.bubbles(
          this.x + rand(-this.visualR * 0.6, this.visualR * 0.6),
          this.y - this.visualR * 0.7,
          1
        );
      }
    }
    if (this.levelPop > 0) this.levelPop = Math.max(0, this.levelPop - dt * 2.5);

    for (const a of this.eatAnims) {
      a.t += dt;
      if (!a.swallowed && a.t >= a.dur * 0.5) {
        a.swallowed = true;
      }
    }
    this.eatAnims = this.eatAnims.filter((a) => a.t < a.dur);

    if (this.damageCd > 0) this.damageCd -= dt;
    if (this.invulnT > 0) this.invulnT -= dt;
    if (this.hpTimer > 0) this.hpTimer -= dt;
    else this.hp = Math.min(CONFIG.player.hpMax, this.hp + dt * CONFIG.player.hpRegen);

    const targetR = radiusFor(this.level);
    this.visualR += (targetR - this.visualR) * expDamp(dt, 2.6);

    if (speed > 40) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.045;
        this.trail.push({ x: this.x, y: this.y, r: this.visualR * 0.9, a: 0.22 });
        if (this.trail.length > 8) this.trail.shift();
      }
    } else if (this.trail.length > 0) {
      this.trail.shift();
    }

    if (this.boosting) {
      const a = Math.atan2(this.vy, this.vx) + Math.PI;
      game.particles.streak(this.x + Math.cos(a) * this.visualR, this.y + Math.sin(a) * this.visualR, a, 'rgba(255,255,255,0.9)', this.visualR * 0.8);
      if (this.inWater) game.particles.bubbles(this.x, this.y - this.visualR * 0.4, 2);
    }

    if (this.inWater && speed > 30 && Math.random() < dt * 5) {
      game.particles.bubbles(this.x + rand(-this.visualR * 0.4, this.visualR * 0.4), this.y, 1);
    }

    if (this.stageIndex >= 5 && Math.random() < dt * 3) {
      game.particles.sparks(this.x + rand(-this.visualR, this.visualR), this.y + rand(-this.visualR, this.visualR), '#ffe9a0', 1, 30);
    }
  }

  draw(ctx, time) {
    const u = this.visualR;

    for (let i = 0; i < this.trail.length; i++) {
      const tr = this.trail[i];
      ctx.fillStyle = 'rgba(255,246,205,' + (tr.a * (i / this.trail.length)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, tr.r * (0.4 + (i / this.trail.length) * 0.6), 0, TAU);
      ctx.fill();
    }

    ctx.fillStyle = 'rgba(30,60,30,0.20)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + u * 1.0, u * 1.25, u * 0.4, 0, 0, TAU);
    ctx.fill();

    const state = this.state;
    const speed = Math.hypot(this.vx, this.vy);
    const speedN = clamp(speed / speedFor(this.level), 0, 1);

    let hopY = 0;
    let legKick = 0;
    if (state === 'dead') {
      hopY = 0;
      legKick = 0;
    } else if (this.inWater) {
      hopY = Math.sin(this.animTime * 2.6) * u * 0.03;
      legKick = Math.sin(this.animTime * 9) * 0.5;
    } else {
      hopY = Math.abs(Math.sin(this.hopPhase * 0.5)) * u * 0.08 * (0.3 + speedN * 0.7);
      legKick = Math.sin(this.hopPhase) * (0.2 + speedN * 0.5);
    }

    const breathe = Math.sin(this.animTime * 2.4) * 0.018;
    let sqX = 1 + breathe * 0.5;
    let sqY = 1 - breathe;
    if (this.levelPop > 0) {
      sqX += this.levelPop * 0.14;
      sqY += this.levelPop * 0.12;
    }
    if (this.eatAnims.length > 0) {
      const a = this.eatAnims[this.eatAnims.length - 1];
      const f = a.t / a.dur;
      const pulse = f < 0.55 ? f / 0.55 : 1 - (f - 0.55) / 0.45;
      sqX += pulse * 0.08;
      sqY += pulse * 0.07;
    }
    if (state === 'boost') {
      sqX += 0.2;
      sqY -= 0.16;
    }

    let rot = 0;
    let facingSign = this.facing;
    if (state === 'dead') {
      const k = Math.min(1, this.deadT / 0.9);
      const e = 1 - Math.pow(1 - k, 3);
      rot = -1.3 * e;
      facingSign = 1;
    } else if (state === 'boost') {
      rot = Math.atan2(this.vy, Math.abs(this.vx) + 0.001);
      facingSign = this.vx < -12 ? -1 : 1;
    } else if (state === 'laugh') {
      rot = Math.sin(this.animTime * 9) * 0.07;
    } else if (state === 'hurt') {
      rot = (Math.random() - 0.5) * 0.16;
    } else if (state === 'move') {
      rot = Math.sin(this.animTime * 7) * 0.05 * speedN + clamp(this.vy / speedFor(this.level), -1, 1) * 0.1;
    }

    let jx = 0;
    let jy = 0;
    if (state === 'hurt') {
      jx = (Math.random() - 0.5) * u * 0.14;
      jy = (Math.random() - 0.5) * u * 0.14;
    }
    let sink = 0;
    if (state === 'dead') {
      sink = Math.min(1, this.deadT / 1.5) * u * 0.22 + Math.sin(this.animTime * 1.6) * u * 0.02;
    }
    let jitter = 0;
    if (state === 'laugh') {
      jitter = Math.abs(Math.sin(this.animTime * 17)) * u * 0.055 * this.laughOpen();
    }

    const blinkF = this.blink > 0 ? Math.abs(Math.sin((1 - this.blink / 0.14) * Math.PI)) : 0;
    const lookX = clamp(this.vx / 300, -1, 1) * u * 0.06;
    const lookY = clamp(this.vy / 300, -1, 1) * u * 0.05;

    drawDuoduo(ctx, {
      x: this.x + jx,
      y: this.y + hopY + jy + sink - jitter,
      scale: u,
      rotation: rot,
      facing: facingSign,
      state,
      time,
      sqX,
      sqY,
      blinkF,
      lookX,
      lookY,
      mouth: state === 'laugh' ? this.laughOpen() : state === 'dead' ? 0.3 : this.mouth,
      inWater: this.inWater && state !== 'dead',
      stageIndex: this.stageIndex,
      animTime: this.animTime,
      legKick,
      hopPhase: this.hopPhase,
      deadK: state === 'dead' ? Math.min(1, this.deadT / 0.9) : 0,
      invuln: this.invulnT > 0 ? Math.sin(this.invulnT * 18) : 0,
    });
  }
}

export function drawDuoduo(ctx, o) {
  const u = o.scale;
  const state = o.state || 'idle';

  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rotation || 0);
  ctx.scale((o.facing || 1) * (o.sqX || 1), o.sqY || 1);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (o.invuln > 0) ctx.globalAlpha = 0.55 + Math.max(0, o.invuln) * 0.45;

  if (o.inWater) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = u * 0.05;
    ctx.beginPath();
    ctx.ellipse(0, u * 0.28, u * 1.25 + Math.sin(o.time * 4) * u * 0.08, u * 0.55 + Math.sin(o.time * 4) * u * 0.04, 0, 0, TAU);
    ctx.stroke();
  }

  if (o.stageIndex >= 3) {
    const pulse = 0.3 + 0.18 * Math.sin(o.time * 3);
    ctx.strokeStyle = 'rgba(255,170,210,' + pulse.toFixed(3) + ')';
    ctx.lineWidth = u * 0.05;
    ctx.beginPath();
    ctx.arc(0, -u * 0.1, u * 1.55 + Math.sin(o.time * 2) * u * 0.05, 0, TAU);
    ctx.stroke();
  }

  const deadK = o.deadK || 0;
  const legKick = o.legKick || 0;
  const speed = Math.hypot(o.vx || 0, o.vy || 0);

  // tail
  const tailX = -u * 0.72;
  const tailY = u * 0.35 + Math.sin(o.animTime * 7) * u * 0.03;
  ctx.fillStyle = '#fff7fb';
  ctx.strokeStyle = 'rgba(230,140,180,0.4)';
  ctx.lineWidth = u * 0.03;
  ctx.beginPath();
  ctx.arc(tailX, tailY, u * 0.26, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(tailX - u * 0.06, tailY - u * 0.06, u * 0.1, 0, TAU);
  ctx.fill();

  // feet
  for (const side of [-1, 1]) {
    const fx = side * u * 0.3;
    const fy = u * 0.78;
    let lift = 0;
    if (state === 'dead') {
      lift = 0;
    } else if (o.inWater) {
      lift = Math.sin(o.animTime * 9 + side) * u * 0.08;
    } else {
      lift = Math.abs(Math.sin(o.hopPhase || 0)) * u * 0.12 * (state === 'move' ? 1 : 0.3);
    }
    ctx.fillStyle = '#ffc9de';
    ctx.strokeStyle = 'rgba(230,140,180,0.45)';
    ctx.lineWidth = u * 0.025;
    ctx.beginPath();
    ctx.ellipse(fx, fy - lift, u * 0.24, u * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  // body
  const bodyGrad = ctx.createRadialGradient(-u * 0.3, -u * 0.35, u * 0.1, 0, 0, u * 1.35);
  bodyGrad.addColorStop(0, '#fff7fb');
  bodyGrad.addColorStop(0.45, '#ffd9e9');
  bodyGrad.addColorStop(0.85, '#ffb9d4');
  bodyGrad.addColorStop(1, '#f79cc2');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(210,110,160,0.5)';
  ctx.lineWidth = u * 0.045;
  ctx.beginPath();
  ctx.moveTo(-u * 0.62, -u * 0.5);
  ctx.bezierCurveTo(-u * 1.02, -u * 0.05, -u * 1.05, u * 0.5, -u * 0.85, u * 0.78);
  ctx.bezierCurveTo(-u * 0.55, u * 1.06, u * 0.55, u * 1.06, u * 0.85, u * 0.78);
  ctx.bezierCurveTo(u * 1.05, u * 0.5, u * 1.02, -u * 0.05, u * 0.62, -u * 0.5);
  ctx.quadraticCurveTo(0, -u * 0.78, -u * 0.62, -u * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // belly
  ctx.fillStyle = 'rgba(255,250,252,0.95)';
  ctx.strokeStyle = 'rgba(230,160,195,0.25)';
  ctx.lineWidth = u * 0.025;
  ctx.beginPath();
  ctx.ellipse(0, u * 0.55, u * 0.6, u * 0.46, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // head
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = 'rgba(210,110,160,0.5)';
  ctx.lineWidth = u * 0.045;
  ctx.beginPath();
  ctx.arc(0, -u * 0.42, u * 0.66, 0, TAU);
  ctx.fill();
  ctx.stroke();

  // ears
  const earBack = state === 'boost' ? 0.8 : 0;
  const earDroop = state === 'dead' ? 0.85 : state === 'hurt' ? 0.45 : o.inWater ? 0.35 : 0;
  for (const side of [-1, 1]) {
    const sway = Math.sin(o.animTime * 4 + side * 1.3) * u * 0.05;
    ctx.save();
    ctx.translate(side * u * 0.32, -u * 1.0);
    ctx.rotate(side * (0.28 - earBack * 0.75) + earDroop * side * 0.9 + sway * 0.4);
    const len = u * 1.05;
    ctx.fillStyle = '#ffc9de';
    ctx.strokeStyle = 'rgba(210,110,160,0.45)';
    ctx.lineWidth = u * 0.035;
    ctx.beginPath();
    ctx.moveTo(-u * 0.16, 0);
    ctx.quadraticCurveTo(-u * 0.3, -len * 0.55, -u * 0.08, -len);
    ctx.quadraticCurveTo(0, -len - u * 0.06, u * 0.1, -len * 0.98);
    ctx.quadraticCurveTo(u * 0.24, -len * 0.5, u * 0.16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff9ec4';
    ctx.beginPath();
    ctx.moveTo(-u * 0.06, -u * 0.06);
    ctx.quadraticCurveTo(-u * 0.14, -len * 0.5, -u * 0.02, -len * 0.86);
    ctx.quadraticCurveTo(u * 0.05, -len * 0.5, u * 0.06, -u * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // eyes
  const blinkF = o.blinkF || 0;
  const eyeRY = u * 0.3 * (1 - blinkF * 0.94);
  for (const side of [-1, 1]) {
    const ex = side * u * 0.3;
    const ey = -u * 0.48;
    if (state === 'dead') {
      ctx.strokeStyle = '#7a4058';
      ctx.lineWidth = u * 0.06;
      const s = u * 0.14;
      ctx.beginPath();
      ctx.moveTo(ex - s, ey - s);
      ctx.lineTo(ex + s, ey + s);
      ctx.moveTo(ex + s, ey - s);
      ctx.lineTo(ex - s, ey + s);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'rgba(200,100,150,0.4)';
      ctx.lineWidth = u * 0.03;
      ctx.beginPath();
      ctx.ellipse(ex, ey, u * 0.3, eyeRY, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (blinkF < 0.85) {
        let px = ex + (o.lookX || 0) * 0.7;
        let py = ey + (o.lookY || 0) * 0.7;
        if (state === 'laugh') py -= u * 0.06;
        ctx.fillStyle = '#4a2b3a';
        ctx.beginPath();
        ctx.arc(px, py, u * 0.15, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.beginPath();
        ctx.arc(px - u * 0.05, py - u * 0.06, u * 0.065, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(px + u * 0.05, py + u * 0.05, u * 0.03, 0, TAU);
        ctx.fill();
      }
    }
  }

  // blush
  ctx.fillStyle = 'rgba(255,140,180,0.45)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * u * 0.6, -u * 0.22, u * 0.16, u * 0.1, 0, 0, TAU);
    ctx.fill();
  }

  // nose + mouth
  const noseX = u * 0.3;
  const noseY = -u * 0.34;
  ctx.fillStyle = '#ff7aa5';
  ctx.beginPath();
  ctx.ellipse(noseX, noseY, u * 0.075, u * 0.055, 0, 0, TAU);
  ctx.fill();

  if (state === 'laugh') {
    const mo = o.mouth || 0;
    const mx = noseX + u * 0.05;
    const my = noseY + u * 0.3 * mo;
    ctx.fillStyle = '#b0476a';
    ctx.beginPath();
    ctx.ellipse(mx, my, u * 0.3 * mo + u * 0.04, u * 0.34 * mo + u * 0.04, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff9db8';
    ctx.beginPath();
    ctx.ellipse(mx, my + u * 0.2 * mo, u * 0.18 * mo, u * 0.12 * mo, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(180,70,110,0.6)';
    ctx.lineWidth = u * 0.03;
    ctx.beginPath();
    ctx.arc(noseX + u * 0.42, noseY + u * 0.16, u * 0.11, -0.6, 0.9);
    ctx.stroke();
  } else if (o.mouth > 0.04) {
    const mo = Math.min(1, o.mouth);
    ctx.fillStyle = '#b0476a';
    ctx.beginPath();
    ctx.ellipse(noseX + u * 0.1 * mo, noseY + u * 0.18, u * 0.2 * mo + u * 0.03, u * 0.22 * mo + u * 0.03, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff9db8';
    ctx.beginPath();
    ctx.ellipse(noseX + u * 0.1 * mo, noseY + u * 0.24, u * 0.11 * mo, u * 0.07 * mo, 0, 0, TAU);
    ctx.fill();
  } else if (state === 'dead') {
    ctx.fillStyle = '#b0476a';
    ctx.beginPath();
    ctx.arc(noseX + u * 0.06, noseY + u * 0.16, u * 0.08, 0, TAU);
    ctx.fill();
  } else {
    ctx.strokeStyle = '#d4688f';
    ctx.lineWidth = u * 0.035;
    ctx.beginPath();
    ctx.moveTo(noseX + u * 0.03, noseY + u * 0.12);
    ctx.quadraticCurveTo(noseX + u * 0.16, noseY + u * 0.24, noseX + u * 0.05, noseY + u * 0.3);
    ctx.stroke();
  }

  // whiskers
  ctx.strokeStyle = 'rgba(210,110,160,0.4)';
  ctx.lineWidth = u * 0.022;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(noseX + side * u * 0.05, noseY + u * 0.1 + i * u * 0.08);
      ctx.quadraticCurveTo(noseX + side * u * 0.5, noseY + u * 0.06 + i * u * 0.12, noseX + side * u * 0.78, noseY + u * 0.02 + i * u * 0.14);
      ctx.stroke();
    }
  }

  if (o.stageIndex >= 5) {
    const cx = 0;
    const cy = -u * 1.12;
    ctx.fillStyle = '#ffb3d2';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * u * 0.14, cy + Math.sin(a) * u * 0.14, u * 0.11, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd84a';
    ctx.beginPath();
    ctx.arc(cx, cy, u * 0.1, 0, TAU);
    ctx.fill();
  }

  ctx.restore();
}

function STAGE_INDEX_OF(level) {
  let idx = 0;
  for (let i = 0; i < 7; i++) {
    if (level >= [1, 4, 7, 10, 13, 16, 19][i]) idx = i;
  }
  return idx;
}

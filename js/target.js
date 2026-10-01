import { CONFIG } from './config.js';
import { TAU, angleTo, clamp, expDamp, rand } from './utils.js';

export class Target {
  constructor() {
    this.type = null;
    this.x = 0;
    this.y = 0;
    this.r = 0;
    this.vx = 0;
    this.vy = 0;
    this.alive = false;
    this.phase = 0;
    this.wanderT = 0;
    this.dir = 0;
    this.dir2 = 0;
    this.fleeT = 0;
  }

  spawn(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.r = type.r;
    this.vx = 0;
    this.vy = 0;
    this.alive = true;
    this.phase = rand(TAU);
    this.wanderT = rand(0.6, 3);
    this.dir = rand(TAU);
    this.dir2 = this.dir;
    this.fleeT = 0;
    if (type.hostile) {
      this.hp = type.hp || 3;
      this.hitCd = 0;
      this.flash = 0;
      this.hopT = rand(TAU);
    }
  }

  update(dt, player, world) {
    if (!this.alive) return;
    const t = this.type;
    this.phase += dt;
    if (this.flash > 0) this.flash -= dt;
    if (this.hitCd > 0) this.hitCd -= dt;

    const px = player.x;
    const py = player.y;
    const d = Math.hypot(px - this.x, py - this.y);
    const edible = player.visualR >= this.r * CONFIG.eat.threshold;

    let tx = Math.cos(this.dir);
    let ty = Math.sin(this.dir);
    let spd = t.speed;

    if (t.hostile) {
      this.hopT += dt * (2.5 + Math.hypot(this.vx, this.vy) * 0.02);
      if (d < t.aggro && d > this.r * 0.9) {
        const a = angleTo(this.x, this.y, px, py);
        tx = Math.cos(a);
        ty = Math.sin(a);
        spd = t.speed;
        this.dir = a;
      } else {
        this.wanderT -= dt;
        if (this.wanderT <= 0) {
          this.wanderT = rand(1.2, 3.2);
          this.dir = rand(TAU);
        }
        tx = Math.cos(this.dir);
        ty = Math.sin(this.dir);
        spd = t.speed * 0.45;
      }
    } else if (this.fleeT > 0) {
      this.fleeT -= dt;
      const a = angleTo(px, py, this.x, this.y);
      tx = Math.cos(a);
      ty = Math.sin(a);
      spd = t.speed * 2.2 + 70;
      this.dir = a;
    } else if (t.flee && edible && d < this.r * 2 + 150) {
      const a = angleTo(px, py, this.x, this.y);
      tx = Math.cos(a);
      ty = Math.sin(a);
      spd = t.speed * 2 + 80;
      this.dir = a;
    } else if (t.approach && !edible && d < 300 && d > this.r) {
      const a = angleTo(this.x, this.y, px, py);
      tx = Math.cos(a);
      ty = Math.sin(a);
      spd = t.speed * 0.8;
      this.dir = a;
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = rand(1.2, 4);
        if (t.speed > 0) this.dir = rand(TAU);
      }
      if (t.speed > 0) {
        tx = Math.cos(this.dir);
        ty = Math.sin(this.dir);
      }
    }

    if (t.habitat === 'water') {
      if (!world.waterAt(this.x + tx * spd * dt * 2, this.y + ty * spd * dt * 2)) {
        const p = world.nearestPond(this.x, this.y);
        if (p) {
          const a = angleTo(this.x, this.y, p.x, p.y);
          tx = Math.cos(a);
          ty = Math.sin(a);
          this.dir = a;
        }
      }
    } else if (t.habitat === 'land') {
      if (world.waterAt(this.x + tx * spd * dt * 2, this.y + ty * spd * dt * 2)) {
        const p = world.nearestPond(this.x, this.y);
        if (p) {
          const a = angleTo(this.x, this.y, p.x, p.y) + Math.PI;
          tx = Math.cos(a);
          ty = Math.sin(a);
          this.dir = a;
        }
      }
    } else if (t.habitat === 'shore') {
      const sd = world.shoreDist(this.x, this.y);
      const p = world.nearestPond(this.x, this.y);
      if (!p) return;
      const toPond = angleTo(this.x, this.y, p.x, p.y);
      if (sd > 95) {
        tx = Math.cos(toPond);
        ty = Math.sin(toPond);
        this.dir = toPond;
      } else if (sd < 15) {
        const a = toPond + Math.PI;
        tx = Math.cos(a);
        ty = Math.sin(a);
        this.dir = a;
      }
    }

    const k = expDamp(dt, 2.5);
    this.vx += (tx * spd - this.vx) * k;
    this.vy += (ty * spd - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const mm = CONFIG.world.margin;
    this.x = clamp(this.x, mm + this.r, world.W - mm - this.r);
    this.y = clamp(this.y, mm + this.r, world.H - mm - this.r);

    const sp = Math.hypot(this.vx, this.vy);
    if (sp > 6) this.dir2 = Math.atan2(this.vy, this.vx);
  }

  draw(ctx, time, player) {
    if (!this.alive) return;
    const t = this.type;
    if (player) {
      const d = Math.hypot(player.x - this.x, player.y - this.y);
      const edible = player.visualR >= this.r * CONFIG.eat.threshold;
      if (t.hostile) {
        if (d < t.aggro * 1.2) {
          const pulse = 0.28 + 0.18 * Math.sin(time * 6);
          ctx.strokeStyle = 'rgba(255,120,90,' + pulse.toFixed(3) + ')';
          ctx.lineWidth = 3;
          ctx.setLineDash([7, 6]);
          ctx.beginPath();
          ctx.arc(this.x, this.y, this.r * 1.35 + Math.sin(time * 6) * 2, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        const hp = Math.max(0, this.hp);
        for (let i = 0; i < Math.max(this.hp, 0); i++) {
          const px = this.x - ((this.hp - 1) / 2) * (this.r * 0.42) + i * this.r * 0.42;
          const py = this.y - this.r * 1.55;
          ctx.fillStyle = i < hp ? '#ff7ab0' : 'rgba(255,255,255,0.35)';
          ctx.strokeStyle = 'rgba(120,20,60,0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(px, py, this.r * 0.13, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
      } else if (!edible && d < 260) {
        const pulse = 0.3 + 0.2 * Math.sin(time * 8);
        ctx.strokeStyle = 'rgba(255,90,70,' + pulse.toFixed(3) + ')';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 6]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r * 1.3 + Math.sin(time * 6) * 2, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    drawType(ctx, this.type, this.x, this.y, this.r, time, { dir: this.dir2, wag: this.phase, speed: Math.hypot(this.vx, this.vy), flash: this.flash || 0, hopT: this.hopT || 0 });
  }
}

export function drawType(ctx, type, x, y, r, time, o) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(30,60,30,0.16)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.7, r * 0.95, r * 0.34, 0, 0, TAU);
  ctx.fill();
  if (o.flash > 0) {
    ctx.globalAlpha = 0.85;
    ctx.globalCompositeOperation = 'screen';
  }
  switch (type.id) {
    case 'bug': drawBug(ctx, r, o); break;
    case 'petal': drawPetal(ctx, r, o); break;
    case 'berry': drawBerry(ctx, r); break;
    case 'mushroom': drawMushroom(ctx, r, o); break;
    case 'butterfly': drawButterfly(ctx, r, o); break;
    case 'droplet': drawDroplet(ctx, r); break;
    case 'tadpole': drawTadpole(ctx, r, o); break;
    case 'shrimp': drawShrimp(ctx, r, o); break;
    case 'jellyfish': drawJellyfish(ctx, r, o); break;
    case 'smallfish':
    case 'bigfish':
    case 'giantfish': drawFish(ctx, r, o, type); break;
    case 'crab': drawCrab(ctx, r, o); break;
    case 'apple': drawApple(ctx, r); break;
    case 'duckling': drawDuckling(ctx, r, o); break;
    case 'bird': drawBird(ctx, r, o); break;
    case 'turtle': drawTurtle(ctx, r, o); break;
    case 'rabbit': drawRabbit(ctx, r, o); break;
    case 'deer': drawDeer(ctx, r, o); break;
    case 'car': drawCar(ctx, r); break;
    case 'house': drawHouse(ctx, r); break;
    case 'giantmushroom': drawGiantMushroom(ctx, r); break;
    case 'coin': drawCoin(ctx, r, o); break;
    case 'slime': drawSlime(ctx, r, o); break;
  }
  ctx.restore();
}

function drawCoin(ctx, r, o) {
  const spin = Math.abs(Math.cos(o.wag * 2.6));
  ctx.save();
  ctx.translate(0, Math.sin(o.wag * 3) * r * 0.25);
  ctx.scale(0.35 + spin * 0.65, 1);
  ctx.fillStyle = '#ffb703';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,95,0,0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.28, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSlime(ctx, r, o) {
  const squish = 1 + Math.sin(o.hopT * 2.2) * 0.06;
  const stretch = 1 / squish;
  const bob = Math.abs(Math.sin(o.hopT * 1.1)) * r * 0.28;
  ctx.save();
  ctx.translate(0, -bob);
  ctx.scale(stretch, squish);

  ctx.fillStyle = 'rgba(20,50,30,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.85, r * 1.05, r * 0.35, 0, 0, TAU);
  ctx.fill();

  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r * 1.25);
  g.addColorStop(0, '#b8e89a');
  g.addColorStop(0.5, '#8fd06a');
  g.addColorStop(1, '#4fa03f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, r * 0.25);
  ctx.bezierCurveTo(-r * 1.05, -r * 0.3, -r * 0.55, -r * 0.9, 0, -r * 0.88);
  ctx.bezierCurveTo(r * 0.55, -r * 0.9, r * 1.05, -r * 0.3, r * 0.95, r * 0.25);
  ctx.bezierCurveTo(r * 0.5, r * 0.85, -r * 0.5, r * 0.85, -r * 0.95, r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(30,80,30,0.45)';
  ctx.lineWidth = r * 0.06;
  ctx.stroke();

  ctx.fillStyle = 'rgba(60,130,60,0.5)';
  ctx.beginPath();
  ctx.arc(-r * 0.45, r * 0.3, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.3, r * 0.42, r * 0.1, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.55, -r * 0.1, r * 0.09, 0, TAU);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.42, -r * 0.42, r * 0.4, r * 0.24, -0.5, 0, TAU);
  ctx.fill();

  const blink = Math.sin(o.wag * 0.7) > 0.92 ? 0.12 : 1;
  for (const s of [-1, 1]) {
    const ex = s * r * 0.38;
    const ey = -r * 0.25;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = 'rgba(40,70,40,0.4)';
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    ctx.ellipse(ex, ey, r * 0.3, r * 0.34 * blink, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    if (blink > 0.3) {
      ctx.fillStyle = '#2c3a2c';
      ctx.beginPath();
      ctx.arc(ex + s * r * 0.08, ey + r * 0.06, r * 0.14, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(ex + s * r * 0.04, ey, r * 0.05, 0, TAU);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(200,80,110,0.35)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.68, r * 0.05, r * 0.14, r * 0.09, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(r * 0.68, r * 0.05, r * 0.14, r * 0.09, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = '#3c6a3c';
  ctx.lineWidth = r * 0.05;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.12, r * 0.18, 0.3, Math.PI - 0.3);
  ctx.stroke();

  ctx.restore();
}

function drawBug(ctx, r, o) {
  const w = Math.sin(o.wag * 10) * 0.25;
  ctx.strokeStyle = '#6b4f35';
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2 + s * w;
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, -r * 0.2 + i * r * 0.35);
      ctx.lineTo(s * r * 0.4 + Math.cos(a) * r * 0.55 * s, -r * 0.2 + i * r * 0.35 + Math.sin(a) * r * 0.35);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#8b6e4e';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.78, r * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#c9a86a';
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.1, r * 0.45, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#6b4f35';
  ctx.lineWidth = r * 0.07;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(r * 0.25 + s * r * 0.18, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.25 + s * r * 0.42, -r * 0.9, r * 0.25 + s * r * 0.62, -r * 1.05);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(r * 0.25 + s * r * 0.24, -r * 0.22, r * 0.11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.25 + s * r * 0.24, -r * 0.22, r * 0.05, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
  }
}

function drawPetal(ctx, r, o) {
  ctx.rotate(Math.sin(o.wag * 0.9) * 0.4 + 0.6);
  ctx.fillStyle = '#f7a8c4';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.3, r * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.3, -r * 0.1, r * 0.4, r * 0.2, 0.4, 0, TAU);
  ctx.fill();
}

function drawBerry(ctx, r) {
  ctx.fillStyle = '#e85d5d';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,40,40,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.32, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#5fa85f';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.9, r * 0.34, r * 0.16, -0.5, 0, TAU);
  ctx.fill();
}

function drawMushroom(ctx, r, o) {
  ctx.rotate(Math.sin(o.wag * 0.7) * 0.07);
  ctx.fillStyle = '#efe6d4';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.5, r * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#e86a5e';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.1, r * 0.95, r * 0.7, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = '#fff6ec';
  for (const [sx, sy] of [[-0.4, -0.35], [0.1, -0.5], [0.42, -0.3]]) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, r * 0.13, 0, TAU);
    ctx.fill();
  }
}

function drawButterfly(ctx, r, o) {
  const flap = Math.sin(o.wag * 9);
  ctx.rotate(Math.sin(o.wag * 0.6) * 0.3);
  ctx.strokeStyle = '#6a5a80';
  ctx.lineWidth = r * 0.14;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.2);
  ctx.lineTo(0, r * 0.5);
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.fillStyle = s < 0 ? '#b48ce8' : '#e8c9ff';
    ctx.beginPath();
    ctx.ellipse(s * r * 0.72, -r * 0.15, r * 0.66, r * 0.5 * Math.max(0.15, Math.abs(flap)), s * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = '#6a5a80';
  ctx.lineWidth = r * 0.06;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.08, -r * 0.2);
    ctx.quadraticCurveTo(s * r * 0.3, -r * 0.6, s * r * 0.5, -r * 0.7);
    ctx.stroke();
  }
}

function drawDroplet(ctx, r) {
  ctx.fillStyle = '#7cc8ee';
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.15);
  ctx.quadraticCurveTo(r * 0.95, -r * 0.1, r * 0.55, r * 0.8);
  ctx.quadraticCurveTo(0, r * 1.1, -r * 0.55, r * 0.8);
  ctx.quadraticCurveTo(-r * 0.95, -r * 0.1, 0, -r * 1.15);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.arc(-r * 0.28, -r * 0.3, r * 0.2, 0, TAU);
  ctx.fill();
}

function drawTadpole(ctx, r, o) {
  ctx.rotate(o.dir + Math.PI / 2);
  ctx.strokeStyle = '#4a4458';
  ctx.lineWidth = r * 0.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, r * 0.4);
  const wag = Math.sin(o.wag * 8) * r * 0.5;
  ctx.quadraticCurveTo(wag, r * 1.3, wag * 1.4, r * 2.0);
  ctx.stroke();
  ctx.fillStyle = '#4a4458';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.85, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.2, r * 0.2, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.2, r * 0.09, 0, TAU);
  ctx.fill();
}

function drawShrimp(ctx, r, o) {
  ctx.rotate(o.dir);
  const wag = Math.sin(o.wag * 9) * 0.3;
  ctx.strokeStyle = '#ff8a66';
  ctx.lineWidth = r * 0.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0);
  ctx.quadraticCurveTo(r * 0.1, -r * 0.55, r * 0.75, -r * 0.35);
  ctx.stroke();
  ctx.fillStyle = '#ff8a66';
  ctx.beginPath();
  ctx.arc(-r * 0.5, 0, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffc2a8';
  ctx.beginPath();
  ctx.moveTo(r * 0.6, -r * 0.35);
  ctx.lineTo(r * 1.15, -r * 0.5 + wag * r * 0.25);
  ctx.lineTo(r * 1.15, -r * 0.2 + wag * r * 0.25);
  ctx.lineTo(r * 0.6, -r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.15, r * 0.07, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ff8a66';
  ctx.lineWidth = r * 0.06;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, s * r * 0.1);
    ctx.lineTo(-r * 0.85, s * r * 0.3);
    ctx.stroke();
  }
}

function drawJellyfish(ctx, r, o) {
  const bob = Math.sin(o.wag * 2.4) * r * 0.12;
  ctx.translate(0, bob);
  const pulse = 0.85 + Math.sin(o.wag * 4) * 0.1;
  ctx.fillStyle = 'rgba(247,168,216,0.75)';
  ctx.beginPath();
  ctx.moveTo(-r * 0.9, 0);
  ctx.quadraticCurveTo(-r * 0.75, -r * 0.85, 0, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.75, -r * 0.85, r * 0.9, 0);
  ctx.quadraticCurveTo(0, r * 0.28, -r * 0.9, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(247,168,216,0.9)';
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const tx = -r * 0.6 + i * r * 0.4;
    const sway = Math.sin(o.wag * 5 + i * 1.7) * r * 0.14;
    ctx.beginPath();
    ctx.moveTo(tx, r * 0.1);
    ctx.quadraticCurveTo(tx + sway, r * 0.5, tx + sway * 1.4, r * 0.85);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.28, -r * 0.42, r * 0.34, r * 0.24, -0.4, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#222';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.32, -r * 0.35, r * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.55, r * 0.05, r * 0.12, 0, TAU);
    ctx.fill();
  }
}

function drawFish(ctx, r, o, type) {
  const colors = {
    smallfish: ['#ff9a5c', '#ffc79e'],
    bigfish: ['#5a86d8', '#8fb4ee'],
    giantfish: ['#3e7e8e', '#6fb4c4'],
  };
  const [main, belly] = colors[type.id];
  ctx.rotate(o.dir);
  const wag = Math.sin(o.wag * 7) * 0.35;
  ctx.fillStyle = main;
  ctx.beginPath();
  ctx.moveTo(-r * 1.0, 0);
  ctx.lineTo(-r * 1.7, -r * 0.5 + wag * r * 0.3);
  ctx.lineTo(-r * 1.7, r * 0.5 + wag * r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.05, r * 0.68, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = belly;
  ctx.beginPath();
  ctx.ellipse(-r * 0.2, r * 0.18, r * 0.7, r * 0.34, 0, 0, TAU);
  ctx.fill();
  if (type.id !== 'giantfish') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.18, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.6, -r * 0.18, r * 0.1, 0, TAU);
    ctx.fill();
  } else {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(r * 0.5, -r * 0.2, r * 0.26, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.2, r * 0.12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (const [sx, sy] of [[-0.5, -0.1], [0.1, 0.15]]) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, r * 0.2, 0, TAU);
      ctx.fill();
    }
  }
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.1, -r * 0.45, r * 0.5, r * 0.18, -0.3, 0, TAU);
  ctx.fill();
}

function drawCrab(ctx, r, o) {
  const sc = Math.sin(o.wag * 6) * 0.3;
  ctx.strokeStyle = '#e8583f';
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const a = s * (0.5 + i * 0.22) + sc;
      ctx.beginPath();
      ctx.moveTo(s * r * 0.4, r * 0.1);
      ctx.lineTo(s * r * 0.4 + Math.cos(a) * r * 0.6 * s, r * 0.1 + Math.sin(Math.abs(a)) * r * 0.55);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#e8583f';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.95, r * 0.7, 0, 0, TAU);
  ctx.fill();
  for (const s of [-1, 1]) {
    ctx.strokeStyle = '#e8583f';
    ctx.lineWidth = r * 0.14;
    ctx.beginPath();
    ctx.moveTo(s * r * 0.5, -r * 0.45);
    ctx.lineTo(s * r * 0.9, -r * 0.8);
    ctx.stroke();
    ctx.fillStyle = '#c9402c';
    ctx.beginPath();
    ctx.arc(s * r * 0.85, -r * 0.72, r * 0.24, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.32, -r * 0.42, r * 0.15, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(s * r * 0.32, -r * 0.42, r * 0.07, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff';
  }
}

function drawApple(ctx, r) {
  ctx.fillStyle = '#e84a4a';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,30,30,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.3, r * 0.22, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#8a5a3b';
  ctx.lineWidth = r * 0.12;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(r * 0.1, -r * 1.15);
  ctx.stroke();
  ctx.fillStyle = '#5fa85f';
  ctx.beginPath();
  ctx.ellipse(r * 0.34, -r * 1.05, r * 0.3, r * 0.14, -0.5, 0, TAU);
  ctx.fill();
}

function drawDuckling(ctx, r, o) {
  const bob = Math.sin(o.wag * 4) * r * 0.06;
  ctx.translate(0, bob);
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.2, r * 0.75, r * 0.6, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.35, r * 0.48, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ff9b4a';
  ctx.beginPath();
  ctx.ellipse(-r * 0.82, -r * 0.28, r * 0.3, r * 0.16, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.45, r * 0.1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#f0b53a';
  ctx.beginPath();
  ctx.ellipse(r * 0.35, r * 0.15, r * 0.34, r * 0.26, -0.4, 0, TAU);
  ctx.fill();
}

function drawBird(ctx, r, o) {
  const flap = Math.sin(o.wag * 11);
  const hop = Math.abs(Math.sin(o.wag * 5)) * r * 0.25;
  ctx.translate(0, -hop);
  ctx.rotate(o.dir + Math.PI);
  ctx.fillStyle = '#6ec6f0';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.8, r * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#4f9ac2';
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.1);
  ctx.lineTo(-r * 1.2, -r * 0.4);
  ctx.lineTo(-r * 1.05, r * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.15, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffd94a';
  ctx.beginPath();
  ctx.moveTo(r * 0.82, -r * 0.15);
  ctx.lineTo(r * 1.25, r * 0);
  ctx.lineTo(r * 0.82, r * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(r * 0.52, -r * 0.26, r * 0.13, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.arc(r * 0.54, -r * 0.26, r * 0.06, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(r * 0.1, -r * 0.55, r * 0.5, r * 0.22 * Math.max(0.12, Math.abs(flap)), -0.4, 0, TAU);
  ctx.fill();
}

function drawTurtle(ctx, r, o) {
  ctx.rotate(o.dir + Math.PI / 2);
  ctx.fillStyle = '#5fa85f';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.85, r * 0.68, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(40,90,40,0.5)';
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.62, r * 0.5, 0, 0, TAU);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.38, r * 0.3, 0, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = '#8ed08e';
  ctx.beginPath();
  ctx.arc(0, -r * 0.72, r * 0.34, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#222';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.14, -r * 0.78, r * 0.05, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#5fa85f';
  for (const s of [-1, 1]) {
    for (const [lx, ly] of [[0.55, -0.25], [0.6, 0.15]]) {
      ctx.beginPath();
      ctx.ellipse(s * lx * r, ly * r, r * 0.28, r * 0.14, s * 0.4, 0, TAU);
      ctx.fill();
    }
  }
}

function drawRabbit(ctx, r, o) {
  const hop = Math.abs(Math.sin(o.wag * 4.5)) * r * 0.3;
  ctx.translate(0, -hop);
  ctx.rotate(o.dir + Math.PI / 2);
  ctx.fillStyle = '#fff2f2';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.75, r * 0.68, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -r * 0.55, r * 0.42, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.18, -r * 1.05, r * 0.16, r * 0.42, s * 0.12, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ffb7c9';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * r * 0.2, -r * 0.92, r * 0.08, r * 0.22, s * 0.12, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#222';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.16, -r * 0.6, r * 0.06, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#ff9db0';
  ctx.beginPath();
  ctx.arc(0, -r * 0.42, r * 0.08, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, r * 0.5, r * 0.18, 0, TAU);
  ctx.fill();
}

function drawDeer(ctx, r, o) {
  const step = Math.sin(o.wag * 6) * r * 0.1;
  ctx.rotate(o.dir + Math.PI / 2);
  ctx.strokeStyle = '#c89a62';
  ctx.lineWidth = r * 0.13;
  ctx.lineCap = 'round';
  for (const s of [-1, 1]) {
    for (const fx of [0.3, -0.3]) {
      ctx.beginPath();
      ctx.moveTo(s * fx * r, r * 0.35);
      ctx.lineTo(s * fx * r + step * s, r * 0.75);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#c89a62';
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.7, r * 0.52, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -r * 0.5, r * 0.34, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#8a6a42';
  ctx.lineWidth = r * 0.08;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * r * 0.12, -r * 0.78);
    ctx.lineTo(s * r * 0.3, -r * 1.15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s * r * 0.3, -r * 0.95);
    ctx.lineTo(s * r * 0.02, -r * 1.1);
    ctx.stroke();
  }
  ctx.fillStyle = '#fff6ec';
  for (const [sx, sy] of [[0.1, 0.1], [-0.2, 0.25], [0.3, -0.1]]) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, r * 0.09, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = '#222';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.13, -r * 0.55, r * 0.05, 0, TAU);
    ctx.fill();
  }
}

function drawCar(ctx, r) {
  ctx.fillStyle = '#5c6b7a';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * r * 0.6, r * 0.55, r * 0.28, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9cdd2';
    ctx.beginPath();
    ctx.arc(s * r * 0.6, r * 0.55, r * 0.14, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#5c6b7a';
  }
  ctx.fillStyle = '#e85d5d';
  ctx.beginPath();
  ctx.moveTo(-r * 1.15, r * 0.25);
  ctx.lineTo(-r * 1.3, r * 0.55);
  ctx.lineTo(r * 1.3, r * 0.55);
  ctx.lineTo(r * 1.15, r * 0.25);
  ctx.quadraticCurveTo(r * 0.5, -r * 0.35, r * 0.25, -r * 0.35);
  ctx.lineTo(-r * 0.25, -r * 0.35);
  ctx.quadraticCurveTo(-r * 0.5, -r * 0.35, -r * 1.15, r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#bfe7f7';
  ctx.beginPath();
  ctx.moveTo(-r * 0.45, -r * 0.25);
  ctx.lineTo(r * 0.45, -r * 0.25);
  ctx.quadraticCurveTo(r * 0.5, r * 0.05, r * 0.4, r * 0.1);
  ctx.lineTo(-r * 0.4, r * 0.1);
  ctx.quadraticCurveTo(-r * 0.5, r * 0.05, -r * 0.45, -r * 0.25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.arc(r * 1.12, r * 0.35, r * 0.1, 0, TAU);
  ctx.fill();
}

function drawHouse(ctx, r) {
  ctx.fillStyle = '#fff3d9';
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, r * 0.75);
  ctx.lineTo(-r * 0.85, r * 0.05);
  ctx.lineTo(r * 0.85, r * 0.05);
  ctx.lineTo(r * 0.85, r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,120,60,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#e8834a';
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, r * 0.08);
  ctx.lineTo(0, -r * 0.85);
  ctx.lineTo(r * 1.05, r * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8a5a3b';
  ctx.beginPath();
  ctx.moveTo(-r * 0.35, r * 0.75);
  ctx.lineTo(-r * 0.35, r * 0.35);
  ctx.arc(0, r * 0.35, r * 0.35, Math.PI, 0);
  ctx.lineTo(r * 0.35, r * 0.75);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#bfe7f7';
  ctx.strokeStyle = 'rgba(120,150,190,0.6)';
  ctx.lineWidth = 2;
  for (const s of [-1, 1]) {
    ctx.fillRect(s * r * 0.62, r * 0.12, r * 0.2, r * 0.2);
    ctx.strokeRect(s * r * 0.62, r * 0.12, r * 0.2, r * 0.2);
  }
  ctx.fillStyle = '#b06a4a';
  ctx.fillRect(-r * 0.62, -r * 0.68, r * 0.18, r * 0.3);
}

function drawGiantMushroom(ctx, r) {
  ctx.fillStyle = '#e8dcc8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.85);
  ctx.lineTo(-r * 0.42, -r * 0.1);
  ctx.quadraticCurveTo(0, -r * 0.25, r * 0.42, -r * 0.1);
  ctx.lineTo(r * 0.3, r * 0.85);
  ctx.quadraticCurveTo(0, r * 1.0, -r * 0.3, r * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,120,80,0.4)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#c94f4f';
  ctx.beginPath();
  ctx.ellipse(0, -r * 0.2, r * 1.05, r * 0.72, 0, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff6ec';
  for (const [sx, sy, sr] of [[-0.5, -0.45, 0.13], [0.15, -0.62, 0.11], [0.55, -0.4, 0.14], [-0.15, -0.28, 0.09]]) {
    ctx.beginPath();
    ctx.arc(sx * r, sy * r, sr * r, 0, TAU);
    ctx.fill();
  }
}

import { CONFIG, LEVELS, PONDS } from './config.js';
import { TAU, hash2, rand } from './utils.js';

const CELL = 96;
const FLOWER_COLORS = ['#FF9CC4', '#FFC46B', '#C79BF2', '#FF8FB1', '#FFF2F2'];
const FOREST_FLOWER_COLORS = ['#B48CE8', '#8FD6FF', '#FF9CC4', '#A8E063'];

export class World {
  constructor() {
    this.W = CONFIG.world.width;
    this.H = CONFIG.world.height;
    this.time = 0;
    this.theme = 'meadow';
    this.ponds = PONDS.slice();
    this.trees = [];
    this.backTrees = [];
    this.lily = [];
    this.reeds = [];
    this.clouds = [];
    this.dirt = [];
    this.vignetteCache = null;
    this.build();
  }

  setTheme(theme) {
    if (this.theme === theme) return;
    this.theme = theme;
    const L = LEVELS.find((l) => l.theme === theme) || LEVELS[0];
    this.W = L.worldW;
    this.H = L.worldH;
    this.ponds = theme === 'forest' ? [] : PONDS.slice();
    this.vignetteCache = null;
    this.build();
  }

  build() {
    const forest = this.theme === 'forest';
    this.trees = [];
    this.backTrees = [];

    if (forest) {
      for (let i = 0; i < 60; i++) {
        const x = rand(200, this.W - 200);
        const y = rand(200, this.H - 200);
        this.backTrees.push({ x, y, r: rand(90, 150), phase: rand(TAU) });
      }
      for (let i = 0; i < 150; i++) {
        const x = rand(160, this.W - 160);
        const y = rand(160, this.H - 160);
        this.trees.push({ x, y, r: rand(34, 82), phase: rand(TAU), glow: rand() < 0.3 });
      }
    } else {
      for (let i = 0; i < 115; i++) {
        const x = rand(180, this.W - 180);
        const y = rand(180, this.H - 180);
        if (this.waterAt(x, y)) continue;
        const r = rand(30, 78);
        this.trees.push({ x, y, r, phase: rand(TAU), fruit: rand() < 0.4, fruitColor: ['#FFD23E', '#FF9B7E', '#E86A5E'][Math.floor(rand(3))] });
      }
    }

    this.dirt = [];
    for (let i = 0; i < 10; i++) {
      this.dirt.push({ x: rand(300, this.W - 300), y: rand(300, this.H - 300), rx: rand(90, 190), ry: rand(60, 130), rot: rand(TAU) });
    }

    this.lily = [];
    this.ponds.forEach((p, pi) => {
      const n = 8 + pi * 4;
      for (let i = 0; i < n; i++) {
        const a = rand(TAU);
        const d = Math.sqrt(rand(0.15, 0.95));
        this.lily.push({
          x: p.x + Math.cos(a) * p.rx * d,
          y: p.y + Math.sin(a) * p.ry * d,
          r: rand(9, 17),
          flower: rand() < 0.25,
          phase: rand(TAU),
        });
      }
    });

    this.reeds = [];
    this.ponds.forEach((p) => {
      const n = 30;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(0.15);
        const x = p.x + Math.cos(a) * p.rx;
        const y = p.y + Math.sin(a) * p.ry;
        if (x < 60 || x > this.W - 60 || y < 60 || y > this.H - 60) continue;
        this.reeds.push({ x, y, phase: rand(TAU), len: rand(14, 26), dir: rand() < 0.5 ? -1 : 1 });
      }
    });

    this.clouds = [];
    if (!forest) {
      for (let i = 0; i < 16; i++) {
        const puffs = [];
        const np = 3 + Math.floor(rand(3));
        for (let j = 0; j < np; j++) {
          puffs.push({ dx: rand(-46, 46), dy: rand(-12, 12), r: rand(30, 58) });
        }
        this.clouds.push({
          x: rand(0, this.W + 600),
          y: rand(150, this.H - 150),
          spd: rand(7, 16),
          puffs,
          alpha: rand(0.5, 0.85),
        });
      }
    }
  }

  sdf(x, y) {
    let m = Infinity;
    for (const p of this.ponds) {
      const d = Math.hypot((x - p.x) / p.rx, (y - p.y) / p.ry) - 1;
      if (d < m) m = d;
    }
    return m;
  }

  waterAt(x, y) {
    if (this.ponds.length === 0) return false;
    return this.sdf(x, y) < 0;
  }

  shoreDist(x, y) {
    if (this.ponds.length === 0) return Infinity;
    return Math.abs(this.sdf(x, y)) * Math.min(300, this.nearestPond(x, y).rx);
  }

  nearestPond(x, y) {
    if (this.ponds.length === 0) return null;
    let best = this.ponds[0];
    let bd = Infinity;
    for (const p of this.ponds) {
      const d = Math.hypot(x - p.x, y - p.y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  update(dt) {
    this.time += dt;
    for (const c of this.clouds) {
      c.x += c.spd * dt;
      if (c.x > this.W + 700) c.x = -700;
    }
  }

  drawOcean(ctx, w, h) {
    if (this.theme === 'forest') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#1b2440');
      g.addColorStop(1, '#10172c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      const t = this.time;
      for (let i = 0; i < 90; i++) {
        const sx = hash2(i * 7 + 1, 11) * w;
        const sy = hash2(i * 13 + 3, 17) * h * 0.75;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + hash2(i, 31) * 1.4) + i * 2.1));
        ctx.fillStyle = 'rgba(255,240,220,' + (0.25 + tw * 0.5).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(sx, sy, 0.8 + hash2(i, 23) * 1.6, 0, TAU);
        ctx.fill();
      }
      const mg = ctx.createLinearGradient(0, h * 0.55, 0, h);
      mg.addColorStop(0, 'rgba(30,40,80,0)');
      mg.addColorStop(1, 'rgba(10,16,40,0.55)');
      ctx.fillStyle = mg;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#ffe3ef');
    g.addColorStop(1, '#ffc3dc');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    const t = this.time;
    for (let row = 0; row < 6; row++) {
      const baseY = ((row * h) / 5 + ((t * 26) % (h / 5))) % h;
      ctx.beginPath();
      for (let x = -20; x <= w + 20; x += 26) {
        const y = baseY + Math.sin(x * 0.02 + t * 1.4 + row * 2.1) * 5;
        if (x === -20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  drawGround(ctx, cam, view, zoom) {
    const W = this.W;
    const H = this.H;
    const m = CONFIG.world.margin;
    const cr = CONFIG.world.corner;
    const forest = this.theme === 'forest';

    ctx.fillStyle = forest ? '#22314c' : '#ffe9f2';
    this.roundRectPath(ctx, -60, -60, W + 120, H + 120, cr + 60);
    ctx.fill();

    const g = ctx.createLinearGradient(0, 0, 0, H);
    if (forest) {
      g.addColorStop(0, '#39523f');
      g.addColorStop(0.5, '#2f4736');
      g.addColorStop(1, '#263b2e');
    } else {
      g.addColorStop(0, '#bfe29a');
      g.addColorStop(0.5, '#b2da8c');
      g.addColorStop(1, '#a3d07e');
    }
    ctx.fillStyle = g;
    this.roundRectPath(ctx, 0, 0, W, H, cr);
    ctx.fill();

    ctx.strokeStyle = forest ? 'rgba(10,30,20,0.4)' : 'rgba(60,110,50,0.28)';
    ctx.lineWidth = 6;
    this.roundRectPath(ctx, 3, 3, W - 6, H - 6, cr - 3);
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = forest ? '#4a6a58' : '#ffd3e6';
    ctx.lineWidth = 30;
    this.roundRectPath(ctx, -14, -14, W + 28, H + 28, cr + 14);
    ctx.stroke();
    ctx.strokeStyle = forest ? '#3a5a48' : '#f5bcd4';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    for (const d of this.dirt) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = forest ? 'rgba(30,50,36,0.55)' : 'rgba(226,180,200,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, d.rx, d.ry, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = forest ? 'rgba(20,36,26,0.4)' : 'rgba(180,130,150,0.3)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    const hw = view.w / (2 * zoom);
    const hh = view.h / (2 * zoom);
    const cx0 = Math.floor((cam.x - hw) / CELL);
    const cx1 = Math.floor((cam.x + hw) / CELL);
    const cy0 = Math.floor((cam.y - hh) / CELL);
    const cy1 = Math.floor((cam.y + hh) / CELL);

    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h1 = hash2(cx * 7 + 3, cy * 13 + 5);
        if (h1 < 0.88) {
          const px = cx * CELL + h1 * CELL;
          const py = cy * CELL + hash2(cx * 17 + 1, cy * 23 + 9) * CELL;
          const pr = CELL * (0.22 + hash2(cx * 29 + 5, cy * 31 + 2) * 0.5);
          if (forest) {
            ctx.fillStyle = h1 < 0.45 ? 'rgba(10,26,16,0.16)' : 'rgba(90,140,90,0.10)';
          } else {
            ctx.fillStyle = h1 < 0.45 ? 'rgba(76,145,62,0.09)' : 'rgba(255,214,232,0.13)';
          }
          ctx.beginPath();
          ctx.ellipse(px, py, pr, pr * 0.66, hash2(cx, cy) * TAU, 0, TAU);
          ctx.fill();
        }
      }
    }
  }

  roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawPonds(ctx, cam, view, zoom) {
    if (this.ponds.length === 0) return;
    const t = this.time;
    const hw = view.w / (2 * zoom) + 200;
    const hh = view.h / (2 * zoom) + 200;
    for (const p of this.ponds) {
      if (p.x < cam.x - hw - p.rx || p.x > cam.x + hw + p.rx || p.y < cam.y - hh - p.ry || p.y > cam.y + hh + p.ry) continue;

      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.strokeStyle = '#f5c8dc';
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx + 30, p.ry + 30, 0, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#e8a8c6';
      ctx.lineWidth = 10;
      ctx.stroke();

      const wg = ctx.createRadialGradient(-p.rx * 0.2, -p.ry * 0.2, p.ry * 0.1, 0, 0, p.rx);
      wg.addColorStop(0, '#8fd4ec');
      wg.addColorStop(0.55, '#6fbfe2');
      wg.addColorStop(1, '#59a9d6');
      ctx.fillStyle = wg;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, TAU);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        const ph = t * (0.5 + i * 0.17) + i * 2.4;
        const s = 0.52 + ((ph % 2) > 1 ? 2 - (ph % 2) : ph % 2) * 0.46;
        ctx.beginPath();
        ctx.ellipse(-p.rx * 0.25, -p.ry * 0.25, p.rx * s, p.ry * s, 0, 0, TAU);
        ctx.stroke();
      }

      for (let i = 0; i < 6; i++) {
        const hx = hash2(i * 13 + 7, p.x) * 1.6 - 0.8;
        const hy = hash2(i * 29 + 3, p.y) * 1.6 - 0.8;
        const tw = 0.5 + 0.5 * Math.sin(t * 1.8 + i * 2.9);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.18 + tw * 0.25).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(hx * p.rx * 0.8, hy * p.ry * 0.8, 3 + tw * 3, 0, TAU);
        ctx.fill();
      }

      ctx.restore();
    }

    for (const lp of this.lily) {
      if (lp.x < cam.x - hw - 40 || lp.x > cam.x + hw + 40 || lp.y < cam.y - hh - 40 || lp.y > cam.y + hh + 40) continue;
      ctx.save();
      ctx.translate(lp.x, lp.y);
      ctx.rotate(Math.sin(t * 0.5 + lp.phase) * 0.08);
      ctx.fillStyle = '#54a852';
      ctx.beginPath();
      ctx.arc(0, 0, lp.r, 0.4, TAU - 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.arc(-lp.r * 0.25, -lp.r * 0.25, lp.r * 0.3, 0, TAU);
      ctx.fill();
      if (lp.flower) {
        ctx.fillStyle = '#ff9dc0';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          ctx.beginPath();
          ctx.arc(Math.cos(a) * lp.r * 0.32, Math.sin(a) * lp.r * 0.32, lp.r * 0.24, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.arc(0, 0, lp.r * 0.2, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawTrees(ctx, cam, view, zoom) {
    const hw = view.w / (2 * zoom) + 200;
    const hh = view.h / (2 * zoom) + 200;
    const forest = this.theme === 'forest';

    if (forest) {
      for (const tr of this.backTrees) {
        if (tr.x < cam.x - hw || tr.x > cam.x + hw || tr.y < cam.y - hh || tr.y > cam.y + hh) continue;
        this.drawPine(ctx, tr.x, tr.y, tr.r, tr.phase, 0.55);
      }
      for (const tr of this.trees) {
        if (tr.x < cam.x - hw || tr.x > cam.x + hw || tr.y < cam.y - hh || tr.y > cam.y + hh) continue;
        this.drawPine(ctx, tr.x, tr.y, tr.r, tr.phase, 1);
        if (tr.glow) this.drawGlowShroom(ctx, tr.x + tr.r * 0.8, tr.y + tr.r * 0.9, 7 + tr.r * 0.12);
      }
      return;
    }

    for (const tr of this.trees) {
      if (tr.x < cam.x - hw || tr.x > cam.x + hw || tr.y < cam.y - hh || tr.y > cam.y + hh) continue;
      ctx.save();
      ctx.translate(tr.x, tr.y);

      ctx.fillStyle = 'rgba(120,60,100,0.18)';
      ctx.beginPath();
      ctx.ellipse(tr.r * 0.22, tr.r * 0.3, tr.r * 1.05, tr.r * 0.55, 0, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#a8775e';
      ctx.beginPath();
      ctx.arc(0, 0, tr.r * 0.34, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#ffc9dd';
      ctx.beginPath();
      ctx.arc(0, 0, tr.r, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#ffdceb';
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU + tr.phase;
        const d = tr.r * 0.45;
        const br = tr.r * 0.52;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, br, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#ffe6f1';
      ctx.beginPath();
      ctx.arc(0, 0, tr.r * 0.62, 0, TAU);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(-tr.r * 0.35, -tr.r * 0.4, tr.r * 0.34, 0, TAU);
      ctx.fill();

      ctx.fillStyle = '#ff8fb8';
      for (let i = 0; i < 7; i++) {
        const a = tr.phase + (i / 7) * TAU;
        const d = tr.r * (0.5 + hash2(i, tr.x) * 0.3);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 3.5, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawPine(ctx, x, y, r, phase, dark) {
    ctx.save();
    ctx.translate(x, y);
    const k = dark;
    ctx.fillStyle = 'rgba(5,15,10,' + (0.30 * k).toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(r * 0.25, r * 0.45, r * 1.0, r * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = dark ? '#1e3527' : '#2c4f3a';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.26, r * 0.5, 0, 0, TAU);
    ctx.fill();
    const tiers = 4;
    for (let i = 0; i < tiers; i++) {
      const ty = -r * 0.25 - i * r * 0.52;
      const tw = r * (1.15 - i * 0.22);
      const th = r * 0.72;
      ctx.fillStyle = i % 2 === 0 ? (dark ? '#23402f' : '#345c42') : (dark ? '#1b3326' : '#2a4c36');
      ctx.beginPath();
      ctx.moveTo(-tw, ty);
      ctx.lineTo(0, ty - th);
      ctx.lineTo(tw, ty);
      ctx.closePath();
      ctx.fill();
    }
    if (!dark) {
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, -r * 0.25);
      ctx.lineTo(0, -r * 0.95);
      ctx.lineTo(r * 0.02, -r * 0.25);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawGlowShroom(ctx, x, y, r) {
    const t = this.time;
    const glow = 0.55 + 0.35 * Math.sin(t * 2.2 + x * 0.05);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(150,255,220,' + (glow * 0.28).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(0, -r * 0.4, r * 1.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#d9f7ec';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.4, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7ef0c8';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r, r * 0.72, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.3, r * 0.16, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawDecor(ctx, cam, view, zoom, t) {
    const hw = view.w / (2 * zoom);
    const hh = view.h / (2 * zoom);
    const cx0 = Math.floor((cam.x - hw) / CELL);
    const cx1 = Math.floor((cam.x + hw) / CELL);
    const cy0 = Math.floor((cam.y - hh) / CELL);
    const cy1 = Math.floor((cam.y + hh) / CELL);
    const forest = this.theme === 'forest';

    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        const h1 = hash2(cx * 31 + 7, cy * 17 + 3);
        const h2 = hash2(cx * 53 + 1, cy * 41 + 11);
        const h3 = hash2(cx * 71 + 5, cy * 23 + 9);
        const h4 = hash2(cx * 89 + 13, cy * 61 + 17);
        const gx = cx * CELL + h1 * CELL;
        const gy = cy * CELL + h2 * CELL;

        if (forest) {
          this.drawGrassTuftDark(ctx, gx, gy, h3 * TAU, t * 1.2 + h4 * TAU, 0.8 + h2 * 0.4);
          if (h2 < 0.5) {
            const fx = cx * CELL + h3 * CELL;
            const fy = cy * CELL + h4 * CELL;
            this.drawForestFlower(ctx, fx, fy, FOREST_FLOWER_COLORS[Math.floor(h1 * FOREST_FLOWER_COLORS.length)], t * 1.1 + h2 * TAU);
          }
          if (h3 < 0.34) {
            const sx = cx * CELL + h4 * CELL;
            const sy = cy * CELL + h1 * CELL;
            this.drawStone(ctx, sx, sy, 4 + h2 * 7);
          }
          if (h4 < 0.2) {
            const mx = cx * CELL + h2 * CELL;
            const my = cy * CELL + h3 * CELL;
            this.drawForestShroom(ctx, mx, my, 5 + h1 * 5, t * 0.9 + h2 * TAU);
          }
        } else {
          this.drawGrassTuft(ctx, gx, gy, h3 * TAU, t * 1.3 + h4 * TAU, 0.85 + h2 * 0.4);

          if (h2 < 0.6) {
            const fx = cx * CELL + h3 * CELL;
            const fy = cy * CELL + h4 * CELL;
            if (!this.waterAt(fx, fy)) {
              this.drawFlower(ctx, fx, fy, FLOWER_COLORS[Math.floor(h1 * FLOWER_COLORS.length)], t * 1.1 + h2 * TAU);
            }
          }
          if (h3 < 0.38) {
            const sx = cx * CELL + h4 * CELL;
            const sy = cy * CELL + h1 * CELL;
            if (!this.waterAt(sx, sy)) this.drawStone(ctx, sx, sy, 4 + h2 * 7);
          }
          if (h4 < 0.16) {
            const mx = cx * CELL + h2 * CELL;
            const my = cy * CELL + h3 * CELL;
            if (!this.waterAt(mx, my)) this.drawMushroom(ctx, mx, my, 5 + h1 * 5, t * 0.9 + h2 * TAU);
          }
        }
      }
    }

    for (const rd of this.reeds) {
      if (rd.x < cam.x - hw - 40 || rd.x > cam.x + hw + 40 || rd.y < cam.y - hh - 40 || rd.y > cam.y + hh + 40) continue;
      this.drawReed(ctx, rd.x, rd.y, rd.len, rd.phase + t * 1.5, rd.dir);
    }
  }

  drawGrassTuft(ctx, x, y, rot, sway, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(110,180,80,0.8)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + sway * 0.14;
      const len = (7 + (i % 2) * 2.5) * s;
      const ex = Math.cos(a) * len;
      const ey = Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(ex * 0.5, ey * 0.5 - 1.5, ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawGrassTuftDark(ctx, x, y, rot, sway, s) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.strokeStyle = 'rgba(90,150,100,0.55)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + sway * 0.14;
      const len = (7 + (i % 2) * 2.5) * s;
      const ex = Math.cos(a) * len;
      const ey = Math.sin(a) * len;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(ex * 0.5, ey * 0.5 - 1.5, ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawFlower(ctx, x, y, color, sway) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sway) * 0.12);
    ctx.fillStyle = color;
    const pr = 3.4;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * pr, Math.sin(a) * pr, pr * 0.85, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath();
    ctx.arc(0, 0, pr * 0.72, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawForestFlower(ctx, x, y, color, sway) {
    const t = this.time;
    const glow = 0.4 + 0.3 * Math.sin(t * 1.8 + x * 0.08 + y * 0.05);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sway) * 0.1);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = glow;
    const pr = 3;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * pr, Math.sin(a) * pr, pr * 0.9, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(0, 0, pr * 0.6, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawStone(ctx, x, y, r) {
    ctx.fillStyle = 'rgba(20,40,25,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 3, r * 1.1, r * 0.62, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = this.theme === 'forest' ? '#5a6a70' : '#d8c9d4';
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.72, 0.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = this.theme === 'forest' ? 'rgba(30,45,50,0.5)' : 'rgba(150,110,135,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = this.theme === 'forest' ? 'rgba(200,220,225,0.35)' : 'rgba(255,240,248,0.6)';
    ctx.beginPath();
    ctx.ellipse(x - r * 0.28, y - r * 0.24, r * 0.36, r * 0.22, 0.4, 0, TAU);
    ctx.fill();
  }

  drawMushroom(ctx, x, y, r, sway) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sway) * 0.08);
    ctx.fillStyle = 'rgba(120,60,100,0.16)';
    ctx.beginPath();
    ctx.ellipse(2, 3, r * 1.2, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff7ab0';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(190,60,110,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#fff6ec';
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * TAU + 0.6;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.18, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawForestShroom(ctx, x, y, r, sway) {
    const t = this.time;
    const glow = 0.45 + 0.3 * Math.sin(t * 2 + x * 0.1);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(sway) * 0.08);
    ctx.fillStyle = 'rgba(10,25,15,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 3, r * 1.2, r * 0.6, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#c9b7e8';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 0.4, r * 0.5, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(190,140,255,' + glow.toFixed(3) + ')';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.1, r * 0.95, r * 0.7, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    for (const [sx, sy] of [[-0.35, -0.3], [0.15, -0.45]]) {
      ctx.beginPath();
      ctx.arc(sx * r, sy * r, r * 0.12, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawReed(ctx, x, y, len, sway, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = 'rgba(105,168,79,0.85)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = (i - 2) * 0.34 * dir + Math.sin(sway + i) * 0.18;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(Math.sin(sway + i) * 4, -len * 0.5, Math.sin(a) * len * 0.9, -len);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a5a3b';
    ctx.beginPath();
    ctx.ellipse(dir * 3, -len - 4, 2.6, 6, dir * 0.2, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawCloudShadows(ctx, cam, view, zoom) {
    if (this.theme === 'forest') return;
    const hw = view.w / (2 * zoom) + 400;
    const hh = view.h / (2 * zoom) + 400;
    ctx.fillStyle = 'rgba(180,110,150,0.07)';
    for (const c of this.clouds) {
      if (c.x < cam.x - hw || c.x > cam.x + hw || c.y < cam.y - hh || c.y > cam.y + hh) continue;
      ctx.beginPath();
      ctx.ellipse(c.x, c.y, 130, 70, 0, 0, TAU);
      ctx.fill();
    }
  }

  drawClouds(ctx, view, cam) {
    if (this.theme === 'forest') return;
    const par = 0.35;
    for (const c of this.clouds) {
      const sx = (c.x - cam.x) * cam.zoom * par + view.w / 2;
      const sy = (c.y - cam.y) * cam.zoom * par + view.h / 2;
      if (sx < -400 || sx > view.w + 400 || sy < -300 || sy > view.h + 300) continue;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.fillStyle = 'rgba(255,255,255,' + c.alpha.toFixed(3) + ')';
      for (const p of c.puffs) {
        ctx.beginPath();
        ctx.arc(p.dx * 1.6, p.dy * 1.6, p.r * 1.4, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(255,255,255,' + (c.alpha * 0.5).toFixed(3) + ')';
      ctx.beginPath();
      ctx.ellipse(0, -26, 120, 30, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  drawVignette(ctx, w, h) {
    if (!this.vignetteCache) {
      const forest = this.theme === 'forest';
      const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(30,60,30,0)');
      vg.addColorStop(1, forest ? 'rgba(5,10,20,0.5)' : 'rgba(120,50,90,0.28)');
      this.vignetteCache = vg;
    }
    ctx.fillStyle = this.vignetteCache;
    ctx.fillRect(0, 0, w, h);
  }
}

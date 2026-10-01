export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { down: false, x: 0, y: 0 };
    this.joy = { active: false, x: 0, y: 0, id: null, baseCX: 0, baseCY: 0, maxR: 60 };
    this.boost = false;
    this.isTouch = false;
    try {
      this.isTouch =
        window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    } catch (e) {
      this.isTouch = 'ontouchstart' in window;
    }
    this.onPause = null;
    this.onFirstGesture = null;
    this.testDir = null;

    this.bindKeyboard();
    this.bindMouse();
    if (this.isTouch) {
      this.bindJoystick();
      this.bindBoost();
    }
  }

  key(k) {
    return this.keys.has(k);
  }

  bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
      if (e.repeat) return;
      this.keys.add(k);
      if ((k === 'escape' || k === 'p') && this.onPause) this.onPause();
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });
    window.addEventListener('blur', () => this.keys.clear());
  }

  bindMouse() {
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouse.down = true;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
    window.addEventListener('mouseup', () => {
      this.mouse.down = false;
    });
    window.addEventListener('pointerdown', () => {
      if (this.onFirstGesture) this.onFirstGesture();
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  bindJoystick() {
    const zone = document.getElementById('joy-zone');
    const knob = document.getElementById('joy-knob');
    if (!zone || !knob) return;

    const setKnob = (dx, dy) => {
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    };

    const update = (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.baseCX;
      let dy = e.clientY - this.joy.baseCY;
      const appEl = document.getElementById('app');
      if (appEl && appEl.classList.contains('rotated')) {
        const t = dx;
        dx = dy;
        dy = -t;
      }
      const d = Math.hypot(dx, dy);
      if (d > this.joy.maxR) {
        dx = (dx / d) * this.joy.maxR;
        dy = (dy / d) * this.joy.maxR;
      }
      setKnob(dx, dy);
      this.joy.x = dx / this.joy.maxR;
      this.joy.y = dy / this.joy.maxR;
      this.joy.active = true;
    };

    const end = (e) => {
      if (e.pointerId !== this.joy.id) return;
      this.joy.id = null;
      this.joy.active = false;
      this.joy.x = 0;
      this.joy.y = 0;
      setKnob(0, 0);
    };

    zone.addEventListener('pointerdown', (e) => {
      if (!this.isTouch) return;
      this.joy.id = e.pointerId;
      try {
        zone.setPointerCapture(e.pointerId);
      } catch (err) {
        /* ignore */
      }
      const r = zone.getBoundingClientRect();
      this.joy.baseCX = r.left + r.width / 2;
      this.joy.baseCY = r.top + r.height / 2;
      this.joy.maxR = r.width * 0.36;
      if (this.onFirstGesture) this.onFirstGesture();
      update(e);
    });
    zone.addEventListener('pointermove', update);
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  bindBoost() {
    const btn = document.getElementById('btn-boost');
    if (!btn) return;
    btn.addEventListener('pointerdown', (e) => {
      this.boost = true;
      btn.classList.add('active');
      if (this.onFirstGesture) this.onFirstGesture();
    });
    const release = () => {
      this.boost = false;
      btn.classList.remove('active');
    };
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  }

  joyVector() {
    return this.joy.active ? { x: this.joy.x, y: this.joy.y } : null;
  }

  shiftBoost() {
    return this.keys.has('shift');
  }
}

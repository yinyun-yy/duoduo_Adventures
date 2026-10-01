import { Game } from './game.js';
import { UI } from './ui.js';
import { AudioManager } from './audio.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const view = { w: window.innerWidth, h: window.innerHeight, dpr: 1 };

const audio = new AudioManager();
const input = new Input(canvas);
const game = new Game();
const ui = new UI(game);
game.bindIO(input, audio, ui);

input.onPause = () => ui.onPauseRequest();
input.onFirstGesture = () => {
  audio.init();
  tryLockLandscape();
};

function resize() {
  const portrait = window.innerHeight > window.innerWidth;
  const rotated = input.isTouch && portrait;
  const appEl = document.getElementById('app');
  if (appEl) appEl.classList.toggle('rotated', rotated);
  if (rotated) {
    view.w = window.innerHeight;
    view.h = window.innerWidth;
  } else {
    view.w = window.innerWidth;
    view.h = window.innerHeight;
  }
  view.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(view.w * view.dpr);
  canvas.height = Math.round(view.h * view.dpr);
  canvas.style.width = view.w + 'px';
  canvas.style.height = view.h + 'px';
  ui.onResize();
}

function tryLockLandscape() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(function () {});
    }
  } catch (e) {
    /* unsupported */
  }
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
resize();

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!document.hidden) {
    game.update(dt, view);
    game.render(ctx, view, view.dpr);
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'playing') {
    ui.pauseGame();
  }
});

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

window.addEventListener('error', (e) => {
  const info = document.getElementById('bootinfo');
  if (info) {
    info.style.display = 'block';
    info.textContent = 'ERR ' + e.message;
  }
  window.__lastError = e.message + ' @ ' + (e.filename || '') + ':' + e.lineno;
});
window.__lastError = '';

window.__game = game;
document.body.dataset.booted = '1';

if (new URLSearchParams(location.search).has('test')) {
  setTimeout(() => ui.startGame(), 500);
  const eatSteps = 8;
  for (let i = 0; i < eatSteps; i++) {
    setTimeout(() => {
      let victim = null;
      for (const t of game.targets) {
        if (t.alive) {
          victim = t;
          break;
        }
      }
      if (victim) {
        game.player.x = victim.x;
        game.player.y = victim.y;
        game.player.visualR = Math.max(game.player.visualR, victim.r * 1.2);
      }
    }, 700 + i * 120);
  }
  setTimeout(() => game.debugGain(4000), 1900);
  setTimeout(() => game.debugGain(30000), 2200);
  setTimeout(() => ui.pauseGame(), 2600);
  setTimeout(() => {
    const info = document.getElementById('bootinfo');
    if (info) {
      info.style.display = 'block';
      info.textContent =
        'TEST state=' +
        game.state +
        ' level=' +
        game.player.level +
        ' exp=' +
        game.player.exp +
        ' totalExp=' +
        game.player.stats.totalExp +
        ' eaten=' +
        game.player.stats.eaten +
        ' hp=' +
        game.player.hp +
        ' alive=' +
        game.targetsAlive() +
        ' hudExp=' +
        document.getElementById('hud-exp').textContent +
        ' pausedShown=' +
        !document.getElementById('pause').classList.contains('hidden') +
        ' err=' +
        (window.__lastError || 'none') +
        ' frames=' +
        (window.__frames || 0) +
        ' hudCalls=' +
        (window.__hudCalls || 0) +
        ' ok';
    }
  }, 3100);
  setTimeout(() => {
    game.gameover('time');
    const info = document.getElementById('bootinfo');
    if (info) {
      info.textContent =
        'TEST2 state=' +
        game.state +
        ' goShown=' +
        !document.getElementById('gameover').classList.contains('hidden') +
        ' goTitle=' +
        document.getElementById('go-title').textContent +
        ' bestExp=' +
        JSON.parse(localStorage.getItem('nf_best_exp')) +
        ' ok';
    }
  }, 3600);
  setTimeout(() => {
    document.getElementById('btn-continue').click();
  }, 3700);
  setTimeout(() => {
    const info = document.getElementById('bootinfo');
    if (info) {
      info.textContent =
        'TEST3 state=' +
        game.state +
        ' endless=' +
        game.endless +
        ' timer=' +
        document.getElementById('hud-timer').textContent +
        ' ok';
    }
  }, 4200);
  setTimeout(() => {
    game.input.isTouch = true;
    window.dispatchEvent(new Event('resize'));
    const info = document.getElementById('bootinfo');
    if (info) {
      const app = document.getElementById('app');
      info.textContent =
        'MOBILE joyShown=' +
        !document.getElementById('joy-zone').classList.contains('hidden') +
        ' boostShown=' +
        !document.getElementById('btn-boost').classList.contains('hidden') +
        ' rotated=' +
        app.classList.contains('rotated') +
        ' viewW=' +
        window.innerWidth +
        ' ok';
    }
  }, 4600);
}

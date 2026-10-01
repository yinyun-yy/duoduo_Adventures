import fs from 'node:fs';

const BASE = 'http://127.0.0.1:' + (process.env.CDP_PORT || '9222');
const URL = process.env.TEST_URL || 'http://localhost:8000/index.html';
const SHOT = process.env.SHOT || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const tabRes = await fetch(BASE + '/json/new?about:blank', { method: 'PUT' });
const tab = await tabRes.json();
const ws = new WebSocket(tab.webSocketDebuggerUrl);

let id = 0;
const pending = new Map();
const exceptions = [];

ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails;
    exceptions.push((d.exception && d.exception.description) || d.text);
  }
};

function send(method, params) {
  return new Promise((resolve) => {
    const i = ++id;
    pending.set(i, resolve);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
}

await new Promise((r) => (ws.onopen = r));
await send('Runtime.enable');
await send('Page.enable');
await send('Page.navigate', { url: URL });
await sleep(1800);

async function evaljs(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true });
  if (r.result && r.result.exceptionDetails) return 'EVAL_ERR ' + r.result.exceptionDetails.text;
  return r.result ? r.result.result.value : undefined;
}

const snap = () =>
  evaljs(
    `JSON.stringify({boot:document.body.dataset.booted, state:window.__game.state, level:window.__game.player.level, totalExp:window.__game.player.stats.totalExp, eaten:window.__game.player.stats.eaten, alive:window.__game.targetsAlive(), hp:window.__game.player.hp, hudLevel:document.getElementById('hud-level').textContent, hudExp:document.getElementById('hud-exp').textContent, hudTimer:document.getElementById('hud-timer').textContent})`
  );

console.log('BOOT      ', await snap());
console.log('click start');
await evaljs(`document.getElementById('btn-start').click()`);
await sleep(2500);
console.log('PLAYING   ', await snap());

console.log('simulate eats (teleport onto 10 victims)');
await evaljs(
  `(async () => { for (let i=0;i<10;i++){ const t=window.__game.targets.find(x=>x.alive); if(!t) break; const p=window.__game.player; p.x=t.x; p.y=t.y; p.visualR=Math.max(p.visualR, t.r*1.2); await new Promise(r=>setTimeout(r,150)); } })()`
);
await sleep(2500);
console.log('AFTER EAT ', await snap());

console.log('level up test');
await evaljs(`window.__game.debugGain(4000); window.__game.debugGain(30000);`);
await sleep(1500);
console.log('AFTER LVL ', await snap());

if (SHOT) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64'));
  console.log('screenshot saved:', SHOT);
}

console.log('pause');
await evaljs(`document.getElementById('btn-pause').click()`);
await sleep(600);
console.log('PAUSED    ', await snap());
await evaljs(`document.getElementById('btn-resume').click()`);
await sleep(600);
console.log('RESUMED   ', await evaljs('window.__game.state'));

console.log('gameover time test');
await evaljs(`window.__game.gameover('time')`);
await sleep(600);
console.log(
  'GAMEOVER  ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, shown:!document.getElementById('gameover').classList.contains('hidden'), title:document.getElementById('go-title').textContent, continueVisible:!document.getElementById('btn-continue').classList.contains('hidden'), bestExp:JSON.parse(localStorage.getItem('nf_best_exp'))})`
  )
);

console.log('continue endless');
await evaljs(`document.getElementById('btn-continue').click()`);
await sleep(600);
console.log(
  'ENDLESS   ',
  await evaljs(`JSON.stringify({state:window.__game.state, endless:window.__game.endless, timer:document.getElementById('hud-timer').textContent})`)
);

console.log('menu return + records');
await evaljs(`window.__game.gameover('time')`);
await sleep(400);
await evaljs(`document.getElementById('btn-home2').click()`);
await sleep(400);
console.log(
  'MENU      ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, menuShown:!document.getElementById('menu').classList.contains('hidden'), hudHidden:document.getElementById('hud').classList.contains('hidden'), best:document.getElementById('menu-best').textContent})`
  )
);

console.log('laugh / hurt / dying states test');
await evaljs(`window.__game.player.laugh(1.0)`);
await sleep(300);
console.log(
  'LAUGH     ',
  await evaljs(`JSON.stringify({state:window.__game.player.state, laughOpen:window.__game.player.laughOpen().toFixed(2), stillPlaying:window.__game.state})`)
);
await sleep(1300);
await evaljs(`window.__game.player.hurt(0.6)`);
await sleep(300);
console.log('HURT      ', await evaljs(`window.__game.player.state`));
await sleep(600);
console.log('RECOVERED ', await evaljs(`window.__game.player.state`));

console.log('death flow test (drain hp to 0)');
await evaljs(`(async () => { for (let i=0;i<8;i++){ window.__game.player.damageCd = 0; window.__game.damage({ r: 999 }); await new Promise(r=>setTimeout(r,80)); } })()`);
for (let i = 0; i < 5; i++) {
  await sleep(400);
  console.log('DYING     ', await evaljs(`JSON.stringify({state:window.__game.state, deadT:window.__game.player.deadT.toFixed(2), playerState:window.__game.player.state})`));
}
await sleep(1200);
console.log(
  'DEAD OVER ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, shown:!document.getElementById('gameover').classList.contains('hidden'), title:document.getElementById('go-title').textContent, continueHidden:document.getElementById('btn-continue').classList.contains('hidden')})`
  )
);

console.log('new creatures check');
console.log(
  'CREATURES ',
  await evaljs(
    `JSON.stringify((() => { const counts={}; for(let i=0;i<300;i++){ const t=window.__game.pickTypeFor(3600+Math.random()*1200, 1700+Math.random()*800, 5); if(t) counts[t.id]=(counts[t.id]||0)+1; } return {shrimp:!!counts.shrimp, jellyfish:!!counts.jellyfish, crab:!!counts.crab, sample:Object.keys(counts).length}; })())`
  )
);
await evaljs(`document.getElementById('btn-restart2').click()`);
await sleep(600);
console.log(
  'RESTART   ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, dead:window.__game.player.dead, level:window.__game.player.level, hp:window.__game.player.hp, title:document.title, menuH1:document.querySelector('.title').textContent})`
  )
);

console.log('EXCEPTIONS:', exceptions.length ? exceptions.join(' | ') : 'none');
ws.close();
process.exit(0);

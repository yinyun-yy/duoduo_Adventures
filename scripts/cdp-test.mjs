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
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.result && r.result.exceptionDetails) return 'EVAL_ERR ' + r.result.exceptionDetails.text;
  return r.result ? r.result.result.value : undefined;
}

const snap = () =>
  evaljs(
    `JSON.stringify({boot:document.body.dataset.booted, state:window.__game.state, level:window.__game.level, theme:window.__game.world.theme, playerLevel:window.__game.player.level, hp:window.__game.player.hp, alive:window.__game.targetsAlive(), quest:JSON.stringify(window.__game.quest), gateOpen:window.__game.gateOpen})`
  );

console.log('BOOT      ', await snap());
console.log('click start L1');
await evaljs(`document.getElementById('btn-start').click()`);
await sleep(2200);
console.log('PLAYING   ', await snap());
console.log('L1 title  ', await evaljs(`document.getElementById('lt-main').textContent + ' / ' + document.getElementById('lt-sub').textContent`));

console.log('simulate eats');
await evaljs(
  `(async () => { for (let i=0;i<10;i++){ const t=window.__game.targets.find(x=>x.alive&&!x.type.hostile&&!x.type.collectible); if(!t) break; const p=window.__game.player; p.x=t.x; p.y=t.y; p.visualR=Math.max(p.visualR, t.r*1.2); await new Promise(r=>setTimeout(r,150)); } })()`
);
await sleep(2200);
console.log('AFTER EAT ', await snap());

console.log('level up test');
await evaljs(`window.__game.debugGain(4000);`);
await sleep(1200);
console.log('AFTER LVL ', await snap());

if (SHOT) {
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(SHOT, Buffer.from(shot.result.data, 'base64'));
  console.log('screenshot saved:', SHOT);
}

console.log('L1 complete (timer end)');
await evaljs(`window.__game.timer = 0.01`);
await sleep(700);
console.log(
  'L1 CLEAR  ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, shown:!document.getElementById('levelcomplete').classList.contains('hidden'), title:document.getElementById('lc-title').textContent, nextVisible:!document.getElementById('btn-lc-next').classList.contains('hidden')})`
  )
);

console.log('enter L2');
await evaljs(`document.getElementById('btn-lc-next').click()`);
await sleep(2200);
console.log(
  'L2 PLAY   ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, theme:window.__game.world.theme, slimes:window.__game.targets.filter(t=>t.alive&&t.type.hostile).length, coins:window.__game.targets.filter(t=>t.alive&&t.type.collectible).length, title:document.getElementById('lt-sub').textContent, questHidden:document.getElementById('hud-quest').classList.contains('hidden'), timer:document.getElementById('hud-timer').textContent})`
  )
);

console.log('grow + defeat slimes');
await evaljs(`window.__game.debugGain(1500)`);
await sleep(800);
for (let i = 0; i < 8; i++) {
  await evaljs(
    `(async()=>{ const s=window.__game.targets.find(t=>t.alive&&t.type.hostile); if(!s) return; const p=window.__game.player; p.hp=100; p.invulnT=9; p.x=s.x; p.y=s.y; await new Promise(r=>setTimeout(r,1500)); })()`
  );
  await sleep(1650);
}
console.log(
  'FIGHT     ',
  await evaljs(
    `JSON.stringify({quest:window.__game.quest, gateOpen:window.__game.gateOpen, slimesLeft:window.__game.targets.filter(t=>t.alive&&t.type.hostile).length})`
  )
);

console.log('reach gate');
await evaljs(`(async()=>{ const p=window.__game.player; p.x=6840; p.y=1400; window.__game.camera.snapTo(p.x,p.y); await new Promise(r=>setTimeout(r,400)); })()`);
await sleep(1000);
console.log(
  'L2 CLEAR  ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, shown:!document.getElementById('levelcomplete').classList.contains('hidden'), title:document.getElementById('lc-title').textContent, coins:document.getElementById('lc-coin').textContent, slimes:document.getElementById('lc-slime').textContent})`
  )
);

console.log('back to menu, death flow L1');
await evaljs(`document.getElementById('btn-lc-home').click()`);
await sleep(400);
await evaljs(`document.getElementById('btn-start').click()`);
await sleep(800);
await evaljs(
  `(async()=>{ for(let i=0;i<8;i++){ window.__game.player.damageCd=0; window.__game.damage({r:999}); await new Promise(r=>setTimeout(r,120)); } })()`
);
await sleep(2600);
console.log(
  'L1 DEATH  ',
  await evaljs(
    `JSON.stringify({state:window.__game.state, shown:!document.getElementById('gameover').classList.contains('hidden'), title:document.getElementById('go-title').textContent})`
  )
);
await evaljs(`document.getElementById('btn-home2').click()`);
await sleep(400);

console.log('mobile touch UI');
await evaljs(`window.__game.input.isTouch=true; window.dispatchEvent(new Event('resize'));`);
await sleep(500);
console.log(
  'MOBILE    ',
  await evaljs(
    `JSON.stringify({joy:!document.getElementById('joy-zone').classList.contains('hidden'), boost:!document.getElementById('btn-boost').classList.contains('hidden')})`
  )
);

console.log('EXCEPTIONS:', exceptions.length ? exceptions.join(' | ') : 'none');
ws.close();
process.exit(0);

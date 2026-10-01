export const CONFIG = {
  world: {
    width: 5600,
    height: 4200,
    margin: 60,
    corner: 420,
  },
  game: {
    duration: 600,
    maxTargets: 130,
    initialScatter: 85,
    spawnInterval: 0.12,
    spawnDistMin: 520,
    spawnDistMax: 1150,
  },
  player: {
    baseRadius: 24,
    radiusGrowth: 1.11,
    baseSpeed: 320,
    speedPerLevel: 7,
    speedCap: 480,
    accelK: 7,
    frictionK: 4.5,
    boostMult: 1.75,
    waterMult: 0.8,
    energyMax: 100,
    boostDrain: 30,
    boostRegen: 16,
    boostRegenDelay: 0.9,
    hpMax: 100,
    hpRegen: 2.5,
    hpRegenDelay: 5,
    damage: 16,
    damageCooldown: 1.5,
    knockback: 420,
  },
  eat: {
    threshold: 0,
  },
  zoom: {
    base: 1.08,
    shrink: 0.0032,
    min: 0.45,
    max: 1.12,
  },
  levels: {
    max: 20,
    expBase: 60,
    expPow: 1.4,
  },
};

export const LEVELS = [
  {
    id: 1,
    name: '阳光草地',
    title: '第一关',
    theme: 'meadow',
    worldW: 5600,
    worldH: 4200,
    duration: 600,
    startX: 1300,
    startY: 1500,
    foodExpMult: 1,
  },
  {
    id: 2,
    name: '神秘森林',
    title: '第二关',
    theme: 'forest',
    worldW: 7200,
    worldH: 2800,
    duration: 0,
    startX: 420,
    startY: 1400,
    foodExpMult: 1.5,
  },
];

export const FOREST = {
  gate: { x: 6840, y: 1400, r: 170 },
  slimeGoal: 8,
  slimeR: 30,
  slimeHp: 3,
  slimes: [
    { x: 1250, y: 1200 },
    { x: 1750, y: 1680 },
    { x: 2450, y: 1350 },
    { x: 3000, y: 1050 },
    { x: 3550, y: 1750 },
    { x: 4050, y: 1350 },
    { x: 4700, y: 850 },
    { x: 5150, y: 1550 },
    { x: 5650, y: 1150 },
    { x: 6250, y: 1550 },
  ],
  checkpoints: [
    { x: 2200, y: 1500 },
    { x: 4300, y: 1000 },
    { x: 5800, y: 1750 },
  ],
  coinCount: 40,
};

export const PONDS = [
  { x: 3600, y: 1700, rx: 950, ry: 720 },
  { x: 820, y: 3020, rx: 300, ry: 240 },
  { x: 4240, y: 3320, rx: 260, ry: 200 },
  { x: 2480, y: 3680, rx: 220, ry: 180 },
];

export const STAGES = [
  { level: 1, name: '小朵朵' },
  { level: 4, name: '兔兔' },
  { level: 7, name: '大兔兔' },
  { level: 10, name: '巨型兔兔' },
  { level: 13, name: '超级兔兔' },
  { level: 16, name: '远古兔兔' },
  { level: 19, name: '终极兔兔' },
];

export const TARGET_TYPES = [
  { id: 'bug', name: '小虫', r: 6, exp: 5, score: 10, habitat: 'land', speed: 35, flee: false, approach: false, tier: 1, colors: ['#8B6E4E', '#C9A86A'], levels: [1, 2] },
  { id: 'petal', name: '花瓣', r: 5, exp: 3, score: 5, habitat: 'any', speed: 16, flee: false, approach: false, tier: 1, colors: ['#F7A8C4', '#FFD3E3'], levels: [1, 2] },
  { id: 'berry', name: '小果子', r: 8, exp: 8, score: 15, habitat: 'land', speed: 0, flee: false, approach: false, tier: 1, colors: ['#E85D5D', '#FF9B9B'], levels: [1, 2] },
  { id: 'mushroom', name: '小蘑菇', r: 10, exp: 10, score: 20, habitat: 'land', speed: 0, flee: false, approach: false, tier: 1, colors: ['#EFE6D4', '#E86A5E'], levels: [1, 2] },
  { id: 'butterfly', name: '蝴蝶', r: 9, exp: 12, score: 25, habitat: 'any', speed: 70, flee: true, approach: false, tier: 1, colors: ['#B48CE8', '#E8C9FF'], levels: [1, 2] },
  { id: 'droplet', name: '小水滴', r: 7, exp: 6, score: 10, habitat: 'water', speed: 20, flee: false, approach: false, tier: 1, colors: ['#7CC8EE', '#BDE8FA'], levels: [1] },
  { id: 'tadpole', name: '小蝌蚪', r: 9, exp: 14, score: 28, habitat: 'water', speed: 55, flee: false, approach: false, tier: 1, colors: ['#4A4458', '#7A6F8E'], levels: [1] },
  { id: 'shrimp', name: '小虾', r: 7, exp: 6, score: 12, habitat: 'water', speed: 42, flee: false, approach: false, tier: 1, colors: ['#FF8A66', '#FFC2A8'], levels: [1] },
  { id: 'jellyfish', name: '水母', r: 12, exp: 18, score: 36, habitat: 'water', speed: 22, flee: false, approach: false, tier: 1, colors: ['#F7A8D8', '#FBD8EE'], levels: [1] },
  { id: 'smallfish', name: '小鱼', r: 14, exp: 22, score: 45, habitat: 'water', speed: 80, flee: true, approach: false, tier: 1, colors: ['#FF9A5C', '#FFC79E'], levels: [1] },
  { id: 'crab', name: '小螃蟹', r: 16, exp: 32, score: 65, habitat: 'shore', speed: 30, flee: false, approach: false, tier: 2, colors: ['#E8583F', '#FF9B7E'], levels: [1] },
  { id: 'apple', name: '苹果', r: 15, exp: 30, score: 60, habitat: 'land', speed: 0, flee: false, approach: false, tier: 2, colors: ['#E84A4A', '#FFD23E'], levels: [1, 2] },
  { id: 'duckling', name: '小鸭子', r: 18, exp: 48, score: 95, habitat: 'water', speed: 85, flee: true, approach: false, tier: 2, colors: ['#FFD94A', '#FF9B4A'], levels: [1] },
  { id: 'bird', name: '小鸟', r: 17, exp: 44, score: 88, habitat: 'land', speed: 95, flee: true, approach: false, tier: 2, colors: ['#6EC6F0', '#FFD94A'], levels: [1, 2] },
  { id: 'bigfish', name: '大鱼', r: 26, exp: 90, score: 180, habitat: 'water', speed: 60, flee: false, approach: true, tier: 3, colors: ['#5A86D8', '#8FB4EE'], levels: [1] },
  { id: 'turtle', name: '乌龟', r: 28, exp: 110, score: 220, habitat: 'shore', speed: 28, flee: false, approach: false, tier: 3, colors: ['#5FA85F', '#8ED08E'], levels: [1] },
  { id: 'rabbit', name: '兔子', r: 30, exp: 160, score: 320, habitat: 'land', speed: 100, flee: true, approach: false, tier: 3, colors: ['#FFF2F2', '#FFB7C9'], levels: [1] },
  { id: 'deer', name: '小鹿', r: 42, exp: 340, score: 680, habitat: 'land', speed: 85, flee: true, approach: false, tier: 4, colors: ['#C89A62', '#E8C99E'], levels: [1] },
  { id: 'giantfish', name: '巨型鱼', r: 55, exp: 650, score: 1300, habitat: 'water', speed: 42, flee: false, approach: true, tier: 4, colors: ['#3E7E8E', '#6FB4C4'], levels: [1] },
  { id: 'car', name: '小汽车', r: 48, exp: 520, score: 1040, habitat: 'land', speed: 0, flee: false, approach: false, tier: 4, colors: ['#E85D5D', '#5C6B7A'], levels: [1] },
  { id: 'giantmushroom', name: '巨型蘑菇', r: 70, exp: 1000, score: 2000, habitat: 'land', speed: 0, flee: false, approach: false, tier: 5, colors: ['#E8DCC8', '#C94F4F'], levels: [1] },
  { id: 'house', name: '小房子', r: 95, exp: 1500, score: 3000, habitat: 'land', speed: 0, flee: false, approach: false, tier: 5, colors: ['#FFF3D9', '#E8834A'], levels: [1] },
  { id: 'coin', name: '金币', r: 11, exp: 0, score: 50, habitat: 'any', speed: 0, flee: false, approach: false, tier: 1, colors: ['#FFD23E', '#FFB703'], levels: [2], collectible: true },
  { id: 'slime', name: '森林史莱姆', r: 30, exp: 150, score: 300, habitat: 'land', speed: 62, flee: false, approach: false, tier: 3, colors: ['#8FD06A', '#4FA03F'], levels: [2], hostile: true, hp: 3, aggro: 430 },
];

export function radiusFor(level) {
  const lv = Math.max(1, Math.min(CONFIG.levels.max, level));
  return CONFIG.player.baseRadius * Math.pow(CONFIG.player.radiusGrowth, lv - 1);
}

export function expToNext(level) {
  if (level >= CONFIG.levels.max) return Infinity;
  return Math.round(CONFIG.levels.expBase * Math.pow(level, CONFIG.levels.expPow));
}

export function stageFor(level) {
  let s = STAGES[0];
  for (const st of STAGES) {
    if (level >= st.level) s = st;
    else break;
  }
  return s;
}

export function maxTierFor(level) {
  return Math.min(5, Math.floor(level / 3) + 1);
}

export function speedFor(level) {
  return Math.min(
    CONFIG.player.speedCap,
    CONFIG.player.baseSpeed + CONFIG.player.speedPerLevel * (level - 1)
  );
}

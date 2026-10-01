const KEYS = {
  exp: 'dd_best_exp',
  level: 'dd_best_level',
  size: 'dd_best_size',
  games: 'dd_games',
  bgm: 'dd_bgm',
  sfx: 'dd_sfx',
  coins: 'dd_coins',
  unlocked: 'dd_unlocked',
};

function get(key, def) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : JSON.parse(v);
  } catch (e) {
    return def;
  }
}

function set(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    /* storage unavailable */
  }
}

export const storage = {
  getBestExp: () => get(KEYS.exp, 0),
  getBestLevel: () => get(KEYS.level, 1),
  getBestSize: () => get(KEYS.size, 24),
  getGames: () => get(KEYS.games, 0),
  getBgm: () => get(KEYS.bgm, true),
  getSfx: () => get(KEYS.sfx, true),
  getTotalCoins: () => get(KEYS.coins, 0),
  getUnlocked: () => get(KEYS.unlocked, 1),
  setBestExp: (v) => set(KEYS.exp, v),
  setBestLevel: (v) => set(KEYS.level, v),
  setBestSize: (v) => set(KEYS.size, v),
  setGames: (v) => set(KEYS.games, v),
  setBgm: (v) => set(KEYS.bgm, v),
  setSfx: (v) => set(KEYS.sfx, v),
  setTotalCoins: (v) => set(KEYS.coins, v),
  setUnlocked: (v) => set(KEYS.unlocked, v),
  resetAll() {
    try {
      Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      /* ignore */
    }
  },
};

# 朵朵历险记 🐰

> 「蹦蹦跳跳，吃吃长长。」

一个粉粉嫩嫩的 2D 闯关小游戏：控制可爱的小兔子朵朵吞食比自己小的东西慢慢长大，闯过阳光草地，进入夜晚的神秘森林，打败森林史莱姆，打开终点大门！

## 关卡

### 第一关 · 阳光草地
- 自由成长：吃掉比自己小的东西，获得成长值，升级变大
- 比你大的生物会把你弹开并造成伤害，长到足够大再回来报仇
- 10 分钟成长挑战，时间到即通关，进入第二关
- 7 个成长阶段：小朵朵 → 兔兔 → 大兔兔 → 巨型兔兔 → 超级兔兔 → 远古兔兔 → 终极兔兔

### 第二关 · 神秘森林
- 夜晚森林：深色森林背景、松树、发光蘑菇、萤火虫、景深层次
- 地图更长，新敌人「森林史莱姆」会追着你跑
- 长得比史莱姆大就能打它（3 下打败），打败 8 只打开终点大门
- 沿途收集金币、点亮检查点，被史莱姆打败会在检查点复活
- 到达终点大门即通关！

## 操作

| 平台 | 移动 | 加速 |
| --- | --- | --- |
| 电脑 | WASD / 方向键 / 按住鼠标 | SHIFT |
| 手机 | 左下角虚拟摇杆 | 右下角 ⚡ 按钮 |

电脑按 `ESC` / `P` 暂停。手机建议横屏游玩。

## 本地运行

```bash
# 方式一：Python
python -m http.server 8000

# 方式二：Node.js（自带 server.js）
node server.js
```

然后打开 http://localhost:8000

> 游戏使用 ES Modules，必须通过 HTTP 服务器运行，不能直接双击 index.html。

## 部署到公网

### 方式一：临时分享（电脑要开着，双击即用）

双击 `tunnel.bat`（需 Windows 自带 ssh + python），窗口里会出现一个
`https://xxxx.lhr.life` 网址，直接发给朋友即可在手机上玩。
关闭窗口或关机后网址失效。

### 方式二：永久部署（电脑关机也能玩，免费）

**GitHub Pages（推荐）**

1. 把本项目发布到 GitHub 仓库 `duoduo_Adventures`（公开）
2. 仓库页面 → Settings → Pages → Source 选 `main` 分支根目录 → Save
3. 获得网址 `https://你的用户名.github.io/duoduo_Adventures/`

**Cloudflare Pages（备选）**

1. 同上发布仓库到 GitHub
2. 打开 https://dash.cloudflare.com → Workers & Pages → Create → Pages
3. Connect to Git 选择仓库，Build command 留空，Output directory 填 `/`，点 Deploy
4. 完成即可获得 `https://duoduo-xxx.pages.dev` 网址，永久有效

## PWA

支持「添加到主屏幕」：部署到 HTTPS 后，手机浏览器菜单选择「添加到主屏幕」，即可像 App 一样打开（含离线缓存）。

## 常见自定义修改

所有可调参数集中在 `js/config.js`：

| 想改什么 | 位置 |
| --- | --- |
| 玩家移动速度 | `CONFIG.player.baseSpeed` / `speedPerLevel` / `speedCap` |
| 加速倍率 / 能量消耗 | `CONFIG.player.boostMult` / `boostDrain` / `boostRegen` |
| 第一关地图大小 | `CONFIG.world.width` / `height` |
| 第二关地图大小 / 史莱姆 / 检查点 / 终点 | `LEVELS` 与 `FOREST` |
| 游戏时长（秒） | `CONFIG.game.duration` |
| 成长等级数量 / 升级所需经验 | `CONFIG.levels.max` / `expBase` / `expPow` |
| 游戏名称 | `index.html` 的 `<title>` 和 `<h1 class="title">`，以及 `manifest.json` 的 `name` |
| 兔子外观 | `js/player.js` 的 `drawDuoduo()`（颜色、耳朵、眼睛、花环、光环） |
| 史莱姆外观 / 属性 | `js/target.js` 的 `drawSlime()` 与 `js/config.js` 的 `TARGET_TYPES` |
| 新增生物 | `js/config.js` 的 `TARGET_TYPES` 数组加一条，再在 `js/target.js` 的 `drawType()` 里加绘制分支 |

## 项目结构

```
duoduo_Adventures/
├── index.html          # 页面结构 + 所有 UI 容器（菜单/选关/关卡标题/通关结算）
├── css/style.css       # 全部粉嫩样式与动画
├── js/
│   ├── main.js         # 入口：启动、循环、resize、PWA 注册
│   ├── game.js         # 关卡系统：生成、碰撞、吞食、史莱姆战斗、金币、检查点、终点、结算
│   ├── player.js       # 小兔子朵朵：物理、7 状态动画、绘制
│   ├── target.js       # 吞食目标 + 森林史莱姆 AI + 金币绘制
│   ├── world.js        # 双主题大地图：粉嫩阳光草地 / 夜晚神秘森林
│   ├── particles.js    # 粒子对象池 + 飘字
│   ├── camera.js       # 跟随镜头 + 缩放 + 震动
│   ├── ui.js           # HUD、选关、暂停、结算、关卡标题
│   ├── input.js        # 键盘/鼠标/虚拟摇杆/加速按钮
│   ├── audio.js        # Web Audio 程序化音效与 BGM
│   ├── config.js       # 全部可调参数、关卡表、生物表、成长表
│   ├── storage.js      # localStorage 记录
│   └── utils.js        # 数学工具
├── icons/              # PWA 图标（粉兔子）
├── scripts/make-icons.ps1
├── manifest.json       # PWA 清单
├── sw.js               # Service Worker（离线缓存）
├── server.js           # 零依赖 Node 静态服务器
└── README.md
```

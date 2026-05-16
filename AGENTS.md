# AGENTS — wxgame (My WxGame)

This is the **WeChat Mini Game** site on the OceanDino multisite server.
Sister project of `wxapp` (the WeChat Mini Program).

## Branch lock

- All agent work happens on `main`.
- Push via `bash sync.sh` (NOT `git push -u origin main`).
- No feature branches.

## Layout

```
src/                  原生微信小游戏源码 (将来 miniprogram-ci 上传的部分)
  game.json           小游戏窗口/网络配置
  game.js             真机入口，调 wx.createCanvas + wx.onTouchStart
  game-logic.js       平台无关的游戏循环（同时被 src/game.js 和
                      web-preview/src/main.ts 使用）
  project.config.json appid + 编译器配置（compileType: "game"）

web-preview/          Vite + wx.* shim 浏览器预览（vibe coding 用）
  index.html          手机外壳 + 一个 360×640 <canvas>
  vite.config.ts      端口 3007，alias @wxgame → ../src
  src/
    main.ts           浏览器入口：installWxShim → import @wxgame/game.js
    wx-shim.ts        把 wx.createCanvas / onTouchStart / getSystemInfoSync
                      映射到 DOM API，让 src/game.js 一字不改在浏览器跑
```

## 关键设计：两条独立路径

**重要：当前 src/ 和 web-preview/ 并不共享代码**（不是 zero-fork
约定），原因详见下一节。两条独立路径并存：

| 路径 | 谁跑 | 渲染栈 | 入口 |
|---|---|---|---|
| **web-preview/** | 浏览器（dashboard preview iframe） | **Phaser 3** | `web-preview/src/main.ts` |
| **src/** | 真机（微信小游戏 runtime） | 手写 canvas2d 循环 | `src/game.js` → `src/game-logic.js` |

### Phaser philosophy — 为什么 Phaser 只在浏览器跑

Phaser 3 在 source 里有大量 `window` / `document` / `HTMLImageElement` /
`XMLHttpRequest` 直接引用。微信小游戏 runtime 没有这些全局，所以 Phaser
不能"开箱即用"地在真机跑。要在真机跑 Phaser 需要写一个 2000+ 行的
"phaser-wechat-adapter" polyfill（社区有几个，但都不是官方，质量参差）。

**当前的妥协**：
- 浏览器预览用 Phaser，**快速迭代** 是这一层的目标
- 真机用 `src/game.js` + `src/game-logic.js` 写的纯 canvas2d 循环
- 你要让 Phaser scene 真机能跑，有两条路：
    1. 把 Phaser scene 手工 port 回 canvas2d 形式（适合简单 scene）
    2. vendor 一个 phaser-wechat-adapter 进 `src/`（适合复杂 scene）
- vibe coding 期间，先在浏览器 Phaser 里把玩法跑通，临到上线再考虑哪条路

## Dev loop (vibe coding 流程)

**浏览器 Phaser scene 调试（高频路径）**：

1. Cursor agent 在 `web-preview/src/scenes/MainScene.ts` 改 scene 代码
   （加 sprite、加碰撞、加状态机、调参数 ……）
2. Vite HMR 推到浏览器，< 50ms 看到效果
3. OceanDino dashboard 的 "WxGame · 小游戏" → Preview tab 看渲染结果

**真机扫码测试（低频，玩法定稿后再做）**：

1. 把 Phaser scene port 回 `src/game-logic.js` 的纯 canvas2d 形式
   （或 vendor adapter，见上）
2. 用 `miniprogram-ci upload` 推体验版
3. 手机微信扫码体验

## Production publish

通过 `miniprogram-ci` 把 `src/` 上传到微信小游戏后台：

```bash
# 上传体验版
npx miniprogram-ci upload \
  --pp ./src \
  --pkp ./.private.<appid>.key \
  --appid <appid> \
  -v 0.0.1 \
  --desc "from oceandino dashboard"

# 提审正式版
npx miniprogram-ci submit-audit \
  --pp ./src \
  --pkp ./.private.<appid>.key \
  --appid <appid>
```

**注意**：

- 真实 appid 替换 `src/project.config.json` 里的 `"touristappid"` 占位
- `.private.<appid>.key` 不能进 git（已加 .gitignore）
- 上传前在微信公众平台的"开发管理 → 开发设置 → 小程序代码上传"开启服务端 CI 并加 ECS IP 白名单

本仓库 `web-preview/` 仅供 dev 期看效果，不参与微信平台发布。

## 不在此仓库做的事

- 不要在这里塞 Caddy 配置 / systemd 单元 / docker-compose 文件
  → 这些归 `/opt/multisite-docker/`（host infra repo）
- 不要在 `wx-shim.ts` 真实实现 `wx.login` / `wx.requestPayment` 等
  → 这些只能在真机扫体验版二维码测

## 已知限制

- `wx.login` / `wx.requestPayment` / `getUserProfile`：shim 不模拟
- Phaser 不能直接跑在微信小游戏真机；需要 port 回 canvas2d 或 vendor
  一个 phaser-wechat-adapter（见上方 "Phaser philosophy"）
- 当前 `src/game.js` 真机端是手写的 tap-to-move 小球 demo，**不是**
  浏览器里 Phaser 的方块物理 demo —— 这是有意的（见 Phaser philosophy）
- 浏览器帧率 / 物理时序：Phaser arcade physics 在不同浏览器 / dashboard
  preview iframe 内偶有 jitter，但调试 gameplay 足够

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

## 关键设计：src/ 和 web-preview/ 之间的"零分叉"约定

- `src/game-logic.js` **必须** 是平台无关的（不能用 `document.*`，
  也不能用 `wx.*` 之外的平台 API）。它由两端共用。
- `src/game.js` 只做"平台胶水"：用 `wx.createCanvas()` 拿 canvas，
  调用 `startGame(canvas, ctx)`，把 `wx.onTouchStart` 转发到 game。
- `web-preview/src/main.ts` 是 `src/game.js` 的**浏览器版**：用
  `document.getElementById('game-canvas')` 拿 canvas，先装 shim 再
  import `@wxgame/game.js`。两条路最后都跑同一段游戏逻辑。
- `web-preview/` 永远 **不** 改 `src/`；如果浏览器要 mock 什么 wx.* API，
  加到 `wx-shim.ts` 里。这样 `src/` 保持 "可直接上传到微信平台" 的状态。

## Dev loop (vibe coding 流程)

1. Cursor agent 在 `src/game-logic.js` 改游戏逻辑（占主要工作量）
2. `web-preview/` 的 Vite dev server 跑在 **port 3007**
3. Caddy 反代 `https://p3007.oceandino.com/` → `127.0.0.1:3007`
4. OceanDino dashboard 的 "WxGame · 小游戏" 侧边栏点进去 → Preview tab
   iframe 加载上述 URL → 浏览器里看小游戏 canvas、点击交互

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
- 物理引擎 / 音频引擎 / 网络多人：未引入。当前 `game-logic.js` 是
  最小可玩 demo（点哪去哪的小球），换成 Phaser/Pixi/自写代码自由
- 真机帧率 / 渲染时序：和真机非 100% 一致，但足够 vibe coding 期使用

# wxgame — My WxGame

OceanDino 多站服务器的微信小游戏工程。`wxapp`（微信小程序）的姊妹仓库。

## 是什么

- `src/` —— 原生微信小游戏源码（`game.json` + `game.js` + `game-logic.js`）。
  这一份将来用 `miniprogram-ci` 上传到微信小游戏后台，是真正的"小游戏"。
- `web-preview/` —— Vite + 一个 ~200 行的 `wx.*` shim 组成的浏览器预览前端。
  浏览器跑的同一份 `game-logic.js`，开发期用，**不**发布到微信平台。

## 为什么这么拆

vibe coding：人在 OceanDino dashboard 里写代码，希望在同一个网页里看到
游戏画面 + 能点击交互。小游戏的好处是「核心只有 Canvas + Touch + RAF」，
浏览器里 mock 一份 `wx.*` API 就能跑得起来，不需要装微信开发者工具桌面 app
——直到要测 `wx.login`/支付/订阅消息或上传体验版时，才需要：

- 真机：用 `miniprogram-ci` 推体验版 → 手机微信扫二维码
- 上线：用 `miniprogram-ci` 上传 + 在微信后台提审

## 本地启动

```bash
cd web-preview
npm install
npm run dev    # 0.0.0.0:3007
```

在 ECS 上由 `multisite-docker` 的 `sites/wxgame.yml` 容器自动起，
端口 3007，Caddy 反代到 `https://p3007.oceandino.com/`。

## 部署

- **预览** 自动跑：`wxgame-preview` 容器（multisite-docker 管）
- **发布到微信平台**：见 `AGENTS.md` 的 "Production publish" 段

## 同步

```bash
bash sync.sh    # 双端 main 同步
```

不允许在 `main` 之外的分支提交。详见 `AGENTS.md`。

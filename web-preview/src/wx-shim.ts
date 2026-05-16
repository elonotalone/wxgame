/**
 * Minimal wx.* runtime shim for WeChat mini game **browser preview**.
 *
 * Difference from the wxapp shim:
 *   - wxapp shim mocks wx.* used by mini-program PAGES (storage, system
 *     info, network, navigation). It does NOT need canvas / touch / RAF
 *     because pages render to DOM via the wxml runtime.
 *   - wxgame shim mocks wx.* used by mini-program GAMES (createCanvas,
 *     createImage, onTouchStart/Move/End, getSystemInfoSync,
 *     requestAnimationFrame). These all map cleanly to standard DOM /
 *     window APIs, so the shim is mostly thin pass-through.
 *
 * The shape matches the real wx.* enough that the same /src/ source tree
 * can be uploaded to WeChat unchanged (via miniprogram-ci).
 *
 * Anything device-specific (wx.login, wx.requestPayment, wx.openSetting,
 * subscription messages, etc.) is stubbed with a console warning + a
 * rejected callback — those must be tested on real device via the
 * miniprogram-ci preview QR code.
 */

type AnyObj = Record<string, any>;

interface TouchCallback {
  (e: { touches: { clientX: number; clientY: number; identifier: number }[]; timeStamp: number }): void;
}

let mountedCanvas: HTMLCanvasElement | null = null;
const touchCallbacks = {
  start: [] as TouchCallback[],
  move: [] as TouchCallback[],
  end: [] as TouchCallback[],
  cancel: [] as TouchCallback[],
};

function fireTouch(kind: keyof typeof touchCallbacks, ev: MouseEvent | TouchEvent) {
  const list = touchCallbacks[kind];
  if (list.length === 0) return;
  let touches: { clientX: number; clientY: number; identifier: number }[] = [];
  if ("touches" in ev && ev.touches.length > 0) {
    touches = Array.from(ev.touches).map((t, i) => ({
      clientX: t.clientX,
      clientY: t.clientY,
      identifier: t.identifier ?? i,
    }));
  } else if ("clientX" in ev) {
    touches = [{ clientX: ev.clientX, clientY: ev.clientY, identifier: 0 }];
  }
  const payload = { touches, timeStamp: ev.timeStamp };
  for (const cb of list) cb(payload);
}

function attachInputListeners(canvas: HTMLCanvasElement) {
  // Wire DOM events to the wx-style callbacks. Both mouse and touch are
  // routed because the dashboard preview is mostly used from a desktop
  // browser, but Cursor mobile preview / phone real-device test should
  // still work via touch events.
  canvas.addEventListener("mousedown", (e) => fireTouch("start", e));
  canvas.addEventListener("mousemove", (e) => {
    if (e.buttons & 1) fireTouch("move", e);
  });
  canvas.addEventListener("mouseup", (e) => fireTouch("end", e));
  canvas.addEventListener("mouseleave", (e) => fireTouch("cancel", e));
  canvas.addEventListener("touchstart", (e) => fireTouch("start", e));
  canvas.addEventListener("touchmove", (e) => fireTouch("move", e));
  canvas.addEventListener("touchend", (e) => fireTouch("end", e));
  canvas.addEventListener("touchcancel", (e) => fireTouch("cancel", e));
}

const storage = {
  setSync(key: string, value: any) {
    try {
      localStorage.setItem(`wxgame:${key}`, JSON.stringify(value));
    } catch {}
  },
  getSync(key: string) {
    try {
      const raw = localStorage.getItem(`wxgame:${key}`);
      return raw === null ? "" : JSON.parse(raw);
    } catch {
      return "";
    }
  },
  removeSync(key: string) {
    try {
      localStorage.removeItem(`wxgame:${key}`);
    } catch {}
  },
};

function notImplemented(name: string) {
  return (opts: AnyObj = {}) => {
    console.warn(`[wx-shim] wx.${name} is not implemented in browser preview.`);
    opts?.fail?.({ errMsg: `${name}:fail not supported in browser preview` });
    opts?.complete?.({ errMsg: `${name}:complete (browser preview)` });
  };
}

export interface WxGameShimOptions {
  // Real DOM canvas where the game should render. Required because the
  // mini-game `wx.createCanvas()` returns the (single, screen-sized) game
  // canvas; the browser shim has to know which DOM canvas plays that role.
  canvas: HTMLCanvasElement;
}

export function installWxShim(opts: WxGameShimOptions) {
  mountedCanvas = opts.canvas;
  attachInputListeners(opts.canvas);

  const wx = {
    // ── Canvas ──────────────────────────────────────────────────────
    // Real wx.createCanvas returns a *Canvas*-like object (not a
    // standard HTMLCanvasElement, but the surface is identical enough).
    // First call returns the on-screen game canvas; subsequent calls
    // return off-screen canvases — we just create detached ones.
    createCanvas() {
      if (mountedCanvas) {
        const c = mountedCanvas;
        // Subsequent createCanvas() calls should return off-screen.
        mountedCanvas = null;
        return c;
      }
      return document.createElement("canvas");
    },
    createImage() {
      return new Image();
    },

    // ── System info ─────────────────────────────────────────────────
    getSystemInfoSync() {
      const c = opts.canvas;
      return {
        brand: "browser",
        model: "OceanDino Dashboard Preview",
        pixelRatio: window.devicePixelRatio || 1,
        screenWidth: c.width,
        screenHeight: c.height,
        windowWidth: c.width,
        windowHeight: c.height,
        statusBarHeight: 0,
        language: navigator.language,
        version: "preview",
        system: "Web",
        platform: "browser",
        SDKVersion: "preview-0.1",
      };
    },
    getSystemInfo(o: AnyObj = {}) {
      const res = wx.getSystemInfoSync();
      o.success?.(res);
      o.complete?.(res);
    },

    // ── Touch ───────────────────────────────────────────────────────
    onTouchStart(cb: TouchCallback) {
      touchCallbacks.start.push(cb);
    },
    onTouchMove(cb: TouchCallback) {
      touchCallbacks.move.push(cb);
    },
    onTouchEnd(cb: TouchCallback) {
      touchCallbacks.end.push(cb);
    },
    onTouchCancel(cb: TouchCallback) {
      touchCallbacks.cancel.push(cb);
    },
    offTouchStart(cb: TouchCallback) {
      touchCallbacks.start = touchCallbacks.start.filter((c) => c !== cb);
    },
    offTouchMove(cb: TouchCallback) {
      touchCallbacks.move = touchCallbacks.move.filter((c) => c !== cb);
    },
    offTouchEnd(cb: TouchCallback) {
      touchCallbacks.end = touchCallbacks.end.filter((c) => c !== cb);
    },
    offTouchCancel(cb: TouchCallback) {
      touchCallbacks.cancel = touchCallbacks.cancel.filter((c) => c !== cb);
    },

    // ── Frame loop ──────────────────────────────────────────────────
    // Mini-game frames run via requestAnimationFrame on real device too;
    // we just point at the browser RAF.
    triggerGC() {
      /* no-op in browser */
    },

    // ── Storage ─────────────────────────────────────────────────────
    setStorageSync: storage.setSync,
    getStorageSync: storage.getSync,
    removeStorageSync: storage.removeSync,
    setStorage(o: { key: string; data: any; success?: (r: AnyObj) => void; fail?: (r: AnyObj) => void }) {
      storage.setSync(o.key, o.data);
      o.success?.({ errMsg: "setStorage:ok" });
    },
    getStorage(o: { key: string; success?: (r: AnyObj) => void; fail?: (r: AnyObj) => void }) {
      const data = storage.getSync(o.key);
      if (data === "") {
        o.fail?.({ errMsg: "getStorage:fail data not found" });
      } else {
        o.success?.({ data, errMsg: "getStorage:ok" });
      }
    },

    // ── Network (basic) ─────────────────────────────────────────────
    // Pass through to fetch so vibe-coded leaderboards can be tested.
    request(o: AnyObj) {
      void fetch(o.url, {
        method: o.method || "GET",
        headers: o.header || undefined,
        body: o.data ? (typeof o.data === "string" ? o.data : JSON.stringify(o.data)) : undefined,
      })
        .then(async (r) => {
          const text = await r.text();
          let data: any = text;
          try {
            data = JSON.parse(text);
          } catch {}
          o.success?.({ data, statusCode: r.status, header: {} });
        })
        .catch((e) => o.fail?.({ errMsg: `request:fail ${e?.message || e}` }))
        .finally(() => o.complete?.({}));
    },

    // ── Logging ─────────────────────────────────────────────────────
    showToast(o: AnyObj) {
      console.log(`[wx.showToast] ${o.title} ${o.icon ?? ""}`);
      o.success?.({ errMsg: "showToast:ok (browser preview)" });
    },

    // ── Stubs for things that DO require the WeChat client ──────────
    login: notImplemented("login"),
    getUserProfile: notImplemented("getUserProfile"),
    requestPayment: notImplemented("requestPayment"),
    requestSubscribeMessage: notImplemented("requestSubscribeMessage"),
    shareAppMessage: notImplemented("shareAppMessage"),
    onShow: (_: () => void) => {},
    onHide: (_: () => void) => {},
    onError: (_: (err: any) => void) => {},
  };

  // Expose globally so /src/game.js can call wx.* directly.
  (globalThis as any).wx = wx;

  return wx;
}

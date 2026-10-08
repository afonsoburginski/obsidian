var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => HtmlAutoWebViewerPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var VIEW_TYPE = "html-webviewer";
var HTML_EXTENSIONS = ["html", "htm"];
var NAV_PREFIX = "__HAWV_NAV__";
var CLICK_INTERCEPTOR = `
  (function () {
    if (window.__hawvInstalled) return;
    window.__hawvInstalled = true;
    var PREFIX = ${JSON.stringify(NAV_PREFIX)};
    // Bubble phase so SPA frameworks that preventDefault in their own handlers
    // (also in bubble phase) win, and we only fire when no one else handles it.
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target && e.target.closest && e.target.closest('a[href]');
      if (!a) return;
      var t = a.getAttribute('target');
      if (t && t !== '_self') return;
      var href = a.getAttribute('href') || '';
      // Pseudo-protocols aren't real navigation \u2014 let the browser handle them
      // (or do nothing for javascript: which already ran on the inline handler).
      if (/^(javascript|mailto|tel|sms|data):/i.test(href)) return;
      // Same-page hash anchors: native scroll-to-anchor behavior is fine, and
      // forcing a full reload via src= would be a regression.
      try {
        if (
          a.pathname === location.pathname &&
          a.search === location.search &&
          a.hash &&
          a.origin === location.origin
        ) return;
      } catch (_) {}
      e.preventDefault();
      console.log(PREFIX + a.href);
    }, false);

    // Catch JS-driven location changes so single-page apps that don't use
    // history.pushState still navigate. We can't patch location itself (it's
    // not configurable), but assignment to location.href / .assign / .replace
    // can be observed by patching the prototype methods.
    try {
      var origAssign = Location.prototype.assign;
      var origReplace = Location.prototype.replace;
      Location.prototype.assign = function (url) {
        console.log(PREFIX + new URL(url, location.href).href);
      };
      Location.prototype.replace = function (url) {
        console.log(PREFIX + new URL(url, location.href).href);
      };
    } catch (_) {}
  })();
`;
var HtmlWebView = class extends import_obsidian.FileView {
  webview = null;
  urlInput = null;
  backBtn = null;
  forwardBtn = null;
  pendingUrl = null;
  getViewType() {
    return VIEW_TYPE;
  }
  getIcon() {
    return "globe";
  }
  getDisplayText() {
    return this.file?.basename ?? "HTML";
  }
  async onOpen() {
    try {
      const root = this.contentEl;
      root.empty();
      root.addClass("html-webviewer-root");
      const bar = root.createDiv({ cls: "html-webviewer-bar" });
      this.backBtn = bar.createEl("button", {
        text: "\u2190",
        cls: "html-webviewer-btn"
      });
      this.forwardBtn = bar.createEl("button", {
        text: "\u2192",
        cls: "html-webviewer-btn"
      });
      const reloadBtn = bar.createEl("button", {
        text: "\u21BB",
        cls: "html-webviewer-btn"
      });
      this.urlInput = bar.createEl("input", {
        type: "text",
        cls: "html-webviewer-omnibox",
        attr: {
          placeholder: "file://\u2026 or ./relative/path.html or https://\u2026",
          spellcheck: "false"
        }
      });
      const wrap = root.createDiv({ cls: "html-webviewer-wrap" });
      const wv = document.createElement("webview");
      wv.setAttribute("allowpopups", "");
      wv.setAttribute("disablewebsecurity", "");
      wrap.appendChild(wv);
      this.webview = wv;
      this.urlInput.addEventListener("keydown", (e) => {
        if (e.key !== "Enter")
          return;
        e.preventDefault();
        const resolved = this.resolveAddress(this.urlInput.value.trim());
        if (resolved)
          this.navigate(resolved);
      });
      this.backBtn.addEventListener("click", () => this.webview?.goBack?.());
      this.forwardBtn.addEventListener("click", () => this.webview?.goForward?.());
      reloadBtn.addEventListener("click", () => this.webview?.reload?.());
      const syncUrl = (e) => {
        const url = e.url;
        if (url && this.urlInput)
          this.urlInput.value = url;
        this.refreshNavButtons();
      };
      wv.addEventListener("did-navigate", syncUrl);
      wv.addEventListener("did-navigate-in-page", syncUrl);
      wv.addEventListener("new-window", (e) => {
        const ev = e;
        console.log("[hawv] new-window", ev.url);
        if (ev.url) {
          e.preventDefault();
          this.navigate(ev.url);
        }
      });
      wv.addEventListener("will-navigate", (e) => {
        const ev = e;
        console.log("[hawv] will-navigate", ev.url, "current:", this.webview?.src);
        if (ev.url && this.webview && ev.url !== this.webview.src) {
        }
      });
      wv.addEventListener("did-start-navigation", (e) => {
        const ev = e;
        console.log("[hawv] did-start-navigation", ev.url, "main:", ev.isMainFrame);
      });
      wv.addEventListener("did-finish-load", () => {
        console.log("[hawv] did-finish-load src=", this.webview?.src);
      });
      wv.addEventListener("dom-ready", () => {
        console.log("[hawv] dom-ready src=", this.webview?.src);
        this.webview?.executeJavaScript?.(CLICK_INTERCEPTOR).catch((err) => {
          console.error("[hawv] click interceptor injection failed", err);
        });
      });
      wv.addEventListener("console-message", (e) => {
        const ev = e;
        if (typeof ev.message === "string" && ev.message.startsWith(NAV_PREFIX)) {
          const url = ev.message.slice(NAV_PREFIX.length);
          console.log("[hawv] intercepted in-page nav \u2192", url);
          this.navigate(url);
          return;
        }
        console.log(`[hawv:page] ${ev.message} (${ev.sourceId}:${ev.line})`);
      });
      wv.addEventListener("did-fail-load", (e) => {
        const ev = e;
        console.error("[hawv] did-fail-load", ev);
        if (ev.errorCode === -3)
          return;
        new import_obsidian.Notice(
          `webview load failed: ${ev.errorDescription} (${ev.errorCode}) \u2014 ${ev.validatedURL}`
        );
      });
      if (this.pendingUrl) {
        const url = this.pendingUrl;
        this.pendingUrl = null;
        window.setTimeout(() => this.navigate(url), 0);
      }
    } catch (e) {
      console.error("[html-auto-webviewer] onOpen failed", e);
      new import_obsidian.Notice(
        "html-auto-webviewer: onOpen failed \u2014 " + e.message
      );
      throw e;
    }
  }
  async onLoadFile(file) {
    try {
      const adapter = this.app.vault.adapter;
      if (!(adapter instanceof import_obsidian.FileSystemAdapter)) {
        new import_obsidian.Notice("html-auto-webviewer: vault is not a local folder");
        return;
      }
      const url = "file://" + adapter.getFullPath(file.path);
      if (this.webview) {
        this.navigate(url);
      } else {
        this.pendingUrl = url;
      }
    } catch (e) {
      console.error("[html-auto-webviewer] onLoadFile failed", e);
      new import_obsidian.Notice(
        "html-auto-webviewer: onLoadFile failed \u2014 " + e.message
      );
      throw e;
    }
  }
  async onUnloadFile() {
  }
  navigate(url) {
    if (this.urlInput)
      this.urlInput.value = url;
    if (!this.webview) {
      this.pendingUrl = url;
      return;
    }
    if (this.webview.src === url) {
      this.webview.reload?.();
    } else {
      this.webview.src = url;
    }
  }
  refreshNavButtons() {
    this.backBtn.disabled = !this.webview.canGoBack?.();
    this.forwardBtn.disabled = !this.webview.canGoForward?.();
  }
  resolveAddress(input) {
    if (!input)
      return null;
    if (/^[a-z][a-z0-9+.\-]*:\/\//i.test(input))
      return input;
    const adapter = this.app.vault.adapter;
    if (!(adapter instanceof import_obsidian.FileSystemAdapter))
      return null;
    const currentUrl = this.webview.src;
    if (currentUrl && currentUrl.startsWith("file://")) {
      try {
        return new URL(input, currentUrl).toString();
      } catch {
      }
    }
    const base = "file://" + adapter.getBasePath() + "/";
    try {
      const stripped = input.replace(/^\/+/, "");
      return new URL(stripped, base).toString();
    } catch {
      return null;
    }
  }
};
var HtmlAutoWebViewerPlugin = class extends import_obsidian.Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, (leaf) => new HtmlWebView(leaf));
    this.registerExtensions(HTML_EXTENSIONS, VIEW_TYPE);
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }
};

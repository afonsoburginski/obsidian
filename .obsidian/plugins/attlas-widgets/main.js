/* Attlas Widgets — bloco ```widget renderiza um arquivo HTML do vault dentro da nota.
 *
 * Sintaxe no markdown:
 *
 *   ```widget
 *   src: Docs/Infraestrutura/assets/widgets/orquestracao-swarm-vs-k8s.html
 *   height: 520
 *   ```
 *
 * `src` aceita caminho a partir da raiz do vault ou relativo a pasta da nota.
 * `height` e opcional: sem ela o iframe segue a altura publicada pelo widget
 * (mensagem { type: 'widget-resize', height }) emitida por _widgets/widget-runtime.js.
 */

const { Plugin, MarkdownRenderChild, Platform } = require('obsidian');

const DEFAULT_HEIGHT = 420;
const MIN_HEIGHT = 80;
const MAX_HEIGHT = 4000;

function parseBlock(source) {
  const options = { src: '', height: null, maxHeight: null };
  const lines = source.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    const match = line.match(/^([a-zA-Z-]+)\s*:\s*(.+)$/);
    if (!match) {
      if (!options.src) options.src = line.replace(/^\[\[|\]\]$/g, '');
      continue;
    }
    const key = match[1].toLowerCase();
    const value = match[2].trim().replace(/^["']|["']$/g, '').replace(/^\[\[|\]\]$/g, '');
    if (key === 'src' || key === 'file' || key === 'path') options.src = value;
    else if (key === 'height') options.height = parseInt(value, 10);
    else if (key === 'max-height' || key === 'maxheight') options.maxHeight = parseInt(value, 10);
  }
  return options;
}

function resolveFile(app, src, sourcePath) {
  const vault = app.vault;
  const clean = src.replace(/^\.\//, '');
  const direct = vault.getAbstractFileByPath(clean);
  if (direct && direct.path) return direct;

  const folder = sourcePath.includes('/') ? sourcePath.slice(0, sourcePath.lastIndexOf('/')) : '';
  if (folder) {
    const joined = vault.getAbstractFileByPath(`${folder}/${clean}`);
    if (joined && joined.path) return joined;
  }
  const linked = app.metadataCache.getFirstLinkpathDest(clean, sourcePath);
  return linked || null;
}

class WidgetView extends MarkdownRenderChild {
  constructor(plugin, containerEl, file, options) {
    super(containerEl);
    this.plugin = plugin;
    this.file = file;
    this.options = options;
  }

  onload() {
    const wrapper = this.containerEl.createDiv({ cls: 'attlas-widget' });
    const iframe = wrapper.createEl('iframe', { cls: 'attlas-widget__frame' });
    this.iframe = iframe;

    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.setAttribute('loading', 'lazy');
    iframe.setAttribute('title', this.file.basename || 'widget');
    iframe.style.height = `${this.clamp(this.options.height || DEFAULT_HEIGHT)}px`;

    const resourcePath = this.plugin.app.vault.adapter.getResourcePath(this.file.path);
    const bust = this.file.stat ? this.file.stat.mtime : Date.now();
    iframe.src = `${resourcePath}${resourcePath.includes('?') ? '&' : '?'}v=${bust}`;

    this.registerDomEvent(iframe, 'load', () => this.pushTheme());
    this.messageHandler = (event) => {
      if (!this.iframe || event.source !== this.iframe.contentWindow) return;
      const data = event.data;
      if (!data || data.type !== 'widget-resize' || this.options.height) return;
      const height = this.clamp(Math.ceil(data.height) + 8);
      if (Number.isFinite(height)) this.iframe.style.height = `${height}px`;
    };
    this.registerDomEvent(window, 'message', this.messageHandler);
    this.plugin.register(this.plugin.onThemeChange(() => this.pushTheme()));
  }

  clamp(value) {
    const max = this.options.maxHeight || MAX_HEIGHT;
    return Math.min(Math.max(value, MIN_HEIGHT), max);
  }

  pushTheme() {
    if (!this.iframe || !this.iframe.contentWindow) return;
    const theme = document.body.classList.contains('theme-dark') ? 'dark' : 'light';
    this.iframe.contentWindow.postMessage({ type: 'set-theme', theme }, '*');
  }
}

module.exports = class AttlasWidgetsPlugin extends Plugin {
  onload() {
    this.themeListeners = new Set();

    this.themeObserver = new MutationObserver(() => {
      for (const listener of this.themeListeners) listener();
    });
    this.themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    this.register(() => this.themeObserver.disconnect());

    for (const lang of ['widget', 'html-widget']) {
      this.registerMarkdownCodeBlockProcessor(lang, (source, el, ctx) => {
        const options = parseBlock(source);
        if (!options.src) {
          this.renderError(el, 'Bloco `widget` sem `src`.');
          return;
        }
        const file = resolveFile(this.app, options.src, ctx.sourcePath);
        if (!file) {
          this.renderError(el, `Widget não encontrado: ${options.src}`);
          return;
        }
        if (!Platform.isDesktopApp) {
          this.renderError(el, 'Widgets HTML só renderizam no Obsidian desktop.');
          return;
        }
        ctx.addChild(new WidgetView(this, el, file, options));
      });
    }
  }

  onThemeChange(listener) {
    this.themeListeners.add(listener);
    return () => this.themeListeners.delete(listener);
  }

  renderError(el, message) {
    el.createDiv({ cls: 'attlas-widget__error', text: message });
  }
};

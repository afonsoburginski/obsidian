/* widget-runtime.js — boilerplate compartilhado de todo widget HTML do vault.
 *
 * Responsabilidades (nenhuma pertence ao widget):
 *   1. Tema: aplica data-theme no <html> a partir do SO ou da mensagem
 *      { type: 'set-theme', theme: 'dark' | 'light' } enviada pelo host.
 *   2. Altura: publica { type: 'widget-resize', height } no parent a cada
 *      mudanca de layout, para o host dimensionar o iframe sem scroll interno.
 *   3. Modo embed: dentro de um iframe o fundo fica transparente para herdar
 *      o fundo da nota; aberto direto no browser mantem o fundo do tema.
 *   4. Normaliza input[type=range] para o visual .lumi-slider.
 *
 * O widget pode expor uma funcao global `updateViz()`; ela e chamada a cada
 * troca de tema para repintar o que le token via getComputedStyle (canvas/D3).
 */
(function () {
  var root = document.documentElement;

  function syncBody() {
    var theme = root.getAttribute('data-theme');
    if (document.body && (theme === 'dark' || theme === 'light')) {
      document.body.classList.toggle('dark-mode', theme === 'dark');
    }
  }

  function applyTheme(theme) {
    if (theme !== 'dark' && theme !== 'light') return;
    root.setAttribute('data-theme', theme);
    syncBody();
    if (typeof window.updateViz === 'function') window.updateViz();
  }

  if (typeof MutationObserver === 'function') {
    new MutationObserver(syncBody).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  document.addEventListener('DOMContentLoaded', syncBody);

  try {
    var mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (mq) {
      applyTheme(root.getAttribute('data-theme') || (mq.matches ? 'dark' : 'light'));
      if (mq.addEventListener) {
        mq.addEventListener('change', function (e) { applyTheme(e.matches ? 'dark' : 'light'); });
      }
    }
  } catch (e) {}

  window.addEventListener('message', function (e) {
    var data = e && e.data;
    if (!data) return;
    if ((data.type === 'set-theme' || data.type === 'APPLY_THEME') && data.theme) applyTheme(data.theme);
  });

  if (window.parent !== window) root.classList.add('is-embedded');

  function notifyHeight() {
    var c = document.querySelector('.widget-container') || document.body;
    if (!c) return;
    var h = Math.ceil(Math.max(c.getBoundingClientRect().bottom, c.scrollHeight));
    window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
  }
  window.addEventListener('load', function () { setTimeout(notifyHeight, 120); });
  document.addEventListener('DOMContentLoaded', function () {
    var target = document.querySelector('.widget-container') || document.body;
    if (target && typeof ResizeObserver === 'function') new ResizeObserver(notifyHeight).observe(target);
  });

  function normalizeSlider(r) {
    if (!r || r.type !== 'range') return;
    var mn = parseFloat(r.min || '0'), mx = parseFloat(r.max || '100'), v = parseFloat(r.value);
    if (isNaN(v)) v = (mn + mx) / 2;
    r.style.setProperty('--progress', (mx > mn ? ((v - mn) / (mx - mn)) * 100 : 50) + '%');
    r.style.removeProperty('--slider-fill');
  }
  document.addEventListener('input', function (e) { normalizeSlider(e.target); });
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('input[type="range"], .lumi-slider').forEach(normalizeSlider);
  });
})();

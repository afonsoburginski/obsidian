/* flow.js — renderizador declarativo de diagramas de fluxo em SVG.
 *
 * Substitui o Mermaid nas notas: cada widget descreve nos e arestas num objeto
 * JSON e este modulo calcula o layout em camadas, desenha com os tokens do
 * lumi-runtime.css e liga a interacao (hover, selecao, painel de detalhe).
 *
 * Uso dentro de um widget:
 *
 *   <script type="application/json" id="flow-spec"> { ...spec... } </script>
 *   <script src="../../../../_widgets/flow.js"></script>
 *
 * Spec:
 *   direction : 'LR' (default) ou 'TB'
 *   title     : titulo opcional no topo
 *   subtitle  : linha de apoio opcional
 *   groups    : [{ id, label }]  caixa em volta dos nos daquele grupo
 *   nodes     : [{ id, label, sub, group, kind, detail, tag, width }]
 *               kind: 'default' | 'accent' | 'store' | 'decision' | 'muted'
 *               label e sub aceitam \n para quebrar linha
 *   edges     : [{ from, to, label, dashed }]
 *
 * Detalhe: no com `detail` vira clicavel e o texto aparece no painel abaixo do
 * diagrama. Sem nenhum `detail`, o painel nao e renderizado.
 */
(function (global) {
  'use strict';

  const FONT_LABEL = 13;
  const FONT_SUB = 12;
  const CHAR_W_LABEL = 7.1;
  const CHAR_W_SUB = 6.6;
  const PAD_X = 28;
  const LINE_H = 17;
  const SUB_LINE_H = 15;
  const MIN_W = 118;
  const MAX_W = 300;
  const GAP_MAIN = 74;
  const GAP_CROSS = 22;
  const GROUP_PAD = 16;
  const GROUP_LABEL_H = 26;
  const GROUP_GAP = 26;
  const MARGIN = 16;

  /* Rotulo longo sem \n quebra sozinho para nao atravessar o no vizinho. */
  function wrapLabel(text, maxChars) {
    if (text.includes('\n') || text.length <= maxChars) return lines(text);
    const words = text.split(' ');
    const out = [];
    let current = '';
    words.forEach((w) => {
      if (!current.length) current = w;
      else if ((current + ' ' + w).length <= maxChars) current += ' ' + w;
      else { out.push(current); current = w; }
    });
    if (current) out.push(current);
    return out;
  }

  function lines(text) {
    if (!text) return [];
    return String(text).split('\n');
  }

  function textWidth(list, charWidth) {
    return list.reduce((max, line) => Math.max(max, line.length * charWidth), 0);
  }

  function measure(node) {
    /* Linha longa quebra sozinha: sem isso o texto vaza da caixa, que tem teto
       de largura. */
    const labelLines = lines(node.label).reduce((acc, l) => acc.concat(wrapLabel(l, 30)), []);
    const subLines = lines(node.sub).reduce((acc, l) => acc.concat(wrapLabel(l, 34)), []);
    const width = node.width || Math.min(
      MAX_W,
      Math.max(MIN_W, Math.ceil(Math.max(textWidth(labelLines, CHAR_W_LABEL), textWidth(subLines, CHAR_W_SUB))) + PAD_X)
    );
    const height = 22 + labelLines.length * LINE_H + subLines.length * SUB_LINE_H;
    return { labelLines, subLines, width, height: Math.max(46, height) };
  }

  /* Rank = maior caminho desde uma origem. Aresta que fecharia ciclo e ignorada
     na ordenacao (o desenho dela vira uma volta por fora). */
  function rankNodes(nodes, edges) {
    const incoming = new Map();
    const outgoing = new Map();
    nodes.forEach((n) => { incoming.set(n.id, []); outgoing.set(n.id, []); });
    const kept = [];
    edges.forEach((e) => {
      if (!incoming.has(e.from) || !incoming.has(e.to) || e.from === e.to) return;
      kept.push(e);
      outgoing.get(e.from).push(e.to);
      incoming.get(e.to).push(e.from);
    });

    const rank = new Map(nodes.map((n) => [n.id, 0]));
    const visiting = new Set();
    const done = new Set();

    function visit(id) {
      if (done.has(id)) return rank.get(id);
      if (visiting.has(id)) return rank.get(id);
      visiting.add(id);
      let best = 0;
      incoming.get(id).forEach((from) => {
        if (visiting.has(from)) return;
        const node = nodes.find((n) => n.id === from);
        best = Math.max(best, visit(from) + 1);
        void node;
      });
      visiting.delete(id);
      done.add(id);
      rank.set(id, best);
      return best;
    }

    nodes.forEach((n) => visit(n.id));
    return rank;
  }

  function layout(spec) {
    const horiz = (spec.direction || 'LR') !== 'TB';
    const nodes = spec.nodes.map((n) => Object.assign({}, n, measure(n)));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const rank = rankNodes(nodes, spec.edges || []);
    nodes.forEach((n) => { n.rank = rank.get(n.id) || 0; });

    const mainSize = (n) => (horiz ? n.width : n.height);
    const crossSize = (n) => (horiz ? n.height : n.width);

    const maxRank = nodes.reduce((m, n) => Math.max(m, n.rank), 0);
    const rankExtent = [];
    for (let r = 0; r <= maxRank; r++) {
      rankExtent[r] = nodes.filter((n) => n.rank === r).reduce((m, n) => Math.max(m, mainSize(n)), 0);
    }
    /* O vao entre duas camadas precisa caber o rotulo mais largo que as cruza,
       senao o pill do rotulo some atras do no de destino. */
    const gapAfter = [];
    for (let r = 0; r <= maxRank; r++) gapAfter[r] = GAP_MAIN;
    (spec.edges || []).forEach((e) => {
      const a = byId.get(e.from);
      const b = byId.get(e.to);
      if (!a || !b || !e.label || b.rank <= a.rank) return;
      const labelLines = wrapLabel(String(e.label), 24);
      const widest = labelLines.reduce((m, l) => Math.max(m, l.length), 0);
      const need = horiz ? widest * CHAR_W_SUB + 34 : labelLines.length * 15 + 44;
      for (let r = a.rank; r < b.rank; r++) gapAfter[r] = Math.max(gapAfter[r], need / (b.rank - a.rank));
    });

    const rankStart = [];
    let cursor = MARGIN;
    for (let r = 0; r <= maxRank; r++) {
      rankStart[r] = cursor;
      cursor += rankExtent[r] + gapAfter[r];
    }
    const mainTotal = cursor - gapAfter[maxRank] + MARGIN;

    const groupOrder = [];
    const groupLabel = new Map((spec.groups || []).map((g) => [g.id, g.label]));
    nodes.forEach((n) => {
      const key = n.group || '__none';
      if (!groupOrder.includes(key)) groupOrder.push(key);
    });

    const bands = [];
    let crossCursor = MARGIN;
    /* Faixa de grupo so organiza o eixo transversal no sentido LR. Em TB os
       grupos sao caixas em volta dos membros, sem deslocar o layout. */
    const bandLayout = horiz;
    (bandLayout ? groupOrder : ['__all']).forEach((key) => {
      const members = bandLayout ? nodes.filter((n) => (n.group || '__none') === key) : nodes;
      const named = bandLayout && key !== '__none';
      const labelPad = named ? GROUP_LABEL_H : 0;
      const stacks = new Map();
      members.forEach((n) => {
        if (!stacks.has(n.rank)) stacks.set(n.rank, []);
        stacks.get(n.rank).push(n);
      });
      let bandCross = 0;
      stacks.forEach((list) => {
        const size = list.reduce((sum, n) => sum + crossSize(n) + GAP_CROSS, 0) - GAP_CROSS;
        bandCross = Math.max(bandCross, size);
      });
      const top = crossCursor;
      const inner = top + labelPad + (named ? GROUP_PAD / 2 : 0);
      stacks.forEach((list) => {
        const size = list.reduce((sum, n) => sum + crossSize(n) + GAP_CROSS, 0) - GAP_CROSS;
        let offset = inner + (bandCross - size) / 2;
        list.forEach((n) => {
          n.crossPos = offset;
          offset += crossSize(n) + GAP_CROSS;
        });
      });
      const bandHeight = labelPad + bandCross + (named ? GROUP_PAD : 0);
      bands.push({ key, named, label: groupLabel.get(key) || key, top, height: bandHeight });
      crossCursor = top + bandHeight + GROUP_GAP;
    });
    const crossTotal = crossCursor - GROUP_GAP + MARGIN;

    nodes.forEach((n) => {
      if (horiz) {
        n.x = rankStart[n.rank];
        n.y = n.crossPos;
      } else {
        n.y = rankStart[n.rank];
        n.x = n.crossPos;
      }
      n.cx = n.x + n.width / 2;
      n.cy = n.y + n.height / 2;
    });

    const boxes = bandLayout ? bands.filter((b) => b.named) : groupOrder
      .filter((key) => key !== '__none')
      .map((key) => ({ key, named: true, label: groupLabel.get(key) || key }));

    boxes.forEach((b) => {
      const members = nodes.filter((n) => (n.group || '__none') === b.key);
      if (!bandLayout) {
        const minX = members.reduce((m, n) => Math.min(m, n.x), Infinity) - GROUP_PAD;
        const minY = members.reduce((m, n) => Math.min(m, n.y), Infinity) - GROUP_PAD - GROUP_LABEL_H;
        const maxX = members.reduce((m, n) => Math.max(m, n.x + n.width), 0) + GROUP_PAD;
        const maxY = members.reduce((m, n) => Math.max(m, n.y + n.height), 0) + GROUP_PAD;
        b.rect = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        return;
      }
      const minMain = members.reduce((m, n) => Math.min(m, horiz ? n.x : n.y), Infinity);
      const maxMain = members.reduce((m, n) => Math.max(m, horiz ? n.x + n.width : n.y + n.height), 0);
      if (horiz) {
        b.rect = { x: minMain - GROUP_PAD, y: b.top, width: maxMain - minMain + GROUP_PAD * 2, height: b.height };
      } else {
        b.rect = { x: b.top, y: minMain - GROUP_PAD, width: b.height, height: maxMain - minMain + GROUP_PAD * 2 };
      }
    });

    return {
      horiz,
      nodes,
      byId,
      bands: boxes,
      width: horiz ? mainTotal : crossTotal,
      height: horiz ? crossTotal : mainTotal,
    };
  }

  function svgEl(name, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    Object.keys(attrs || {}).forEach((k) => el.setAttribute(k, attrs[k]));
    return el;
  }

  function nodeFill(kind) {
    if (kind === 'accent') return 'var(--accent-container)';
    if (kind === 'store') return 'var(--surface-container)';
    if (kind === 'muted') return 'var(--surface-container)';
    return 'var(--surface-bright)';
  }

  function nodeStroke(kind) {
    if (kind === 'accent') return 'var(--primary)';
    if (kind === 'muted') return 'var(--stroke-default)';
    return 'var(--outline)';
  }

  function drawNode(n) {
    const g = svgEl('g', { class: 'flow-node' + (n.detail ? ' is-clickable' : ''), 'data-node': n.id });
    const kind = n.kind || 'default';

    if (kind === 'decision') {
      const cut = Math.min(22, n.height / 2);
      const pts = [
        [n.x + cut, n.y],
        [n.x + n.width - cut, n.y],
        [n.x + n.width, n.y + n.height / 2],
        [n.x + n.width - cut, n.y + n.height],
        [n.x + cut, n.y + n.height],
        [n.x, n.y + n.height / 2],
      ].map((p) => p.join(',')).join(' ');
      g.appendChild(svgEl('polygon', {
        points: pts, fill: 'var(--surface-bright)', stroke: 'var(--primary)', 'stroke-width': '1.2',
      }));
    } else {
      g.appendChild(svgEl('rect', {
        x: n.x, y: n.y, width: n.width, height: n.height,
        rx: kind === 'store' ? 14 : 10,
        fill: nodeFill(kind), stroke: nodeStroke(kind),
        'stroke-width': kind === 'accent' ? '1.3' : '1.1',
      }));
    }

    const total = n.labelLines.length * LINE_H + n.subLines.length * SUB_LINE_H;
    let cursor = n.cy - total / 2 + LINE_H - 4;
    n.labelLines.forEach((line) => {
      const t = svgEl('text', {
        x: n.cx, y: cursor, 'text-anchor': 'middle',
        'font-family': 'var(--ff-sans)', 'font-size': FONT_LABEL, 'font-weight': '500',
        fill: kind === 'muted' ? 'var(--on-surface-variant)' : 'var(--on-surface)',
      });
      t.textContent = line;
      g.appendChild(t);
      cursor += LINE_H;
    });
    n.subLines.forEach((line) => {
      const t = svgEl('text', {
        x: n.cx, y: cursor, 'text-anchor': 'middle',
        'font-family': 'var(--ff-mono)', 'font-size': FONT_SUB, 'font-style': 'italic',
        fill: 'var(--on-surface-variant)',
      });
      t.textContent = line;
      g.appendChild(t);
      cursor += SUB_LINE_H;
    });
    return g;
  }

  function edgePath(a, b, horiz, lane) {
    const r = 10;
    if (horiz) {
      const sx = a.x + a.width;
      const sy = a.cy;
      const tx = b.x;
      const ty = b.cy;
      if (tx <= sx) {
        const detour = lane;
        return `M ${sx} ${sy} H ${sx + 14} V ${detour} H ${tx - 24} V ${ty} H ${tx}`;
      }
      if (Math.abs(sy - ty) < 2) return `M ${sx} ${sy} H ${tx}`;
      const mid = sx + (tx - sx) / 2;
      const dir = ty > sy ? 1 : -1;
      return [
        `M ${sx} ${sy}`,
        `H ${mid - r}`,
        `Q ${mid} ${sy} ${mid} ${sy + r * dir}`,
        `V ${ty - r * dir}`,
        `Q ${mid} ${ty} ${mid + r} ${ty}`,
        `H ${tx}`,
      ].join(' ');
    }
    const sx = a.cx;
    const sy = a.y + a.height;
    const tx = b.cx;
    const ty = b.y;
    if (ty <= sy) {
      return `M ${sx} ${sy} V ${sy + 14} H ${lane} V ${ty - 14} H ${tx} V ${ty}`;
    }
    if (Math.abs(sx - tx) < 2) return `M ${sx} ${sy} V ${ty}`;
    const mid = sy + (ty - sy) / 2;
    const dir = tx > sx ? 1 : -1;
    return [
      `M ${sx} ${sy}`,
      `V ${mid - r}`,
      `Q ${sx} ${mid} ${sx + r * dir} ${mid}`,
      `H ${tx - r * dir}`,
      `Q ${tx} ${mid} ${tx} ${mid + r}`,
      `V ${ty}`,
    ].join(' ');
  }

  /* O rotulo fica na reta final da aresta, nao no centro geometrico: um no que
     se abre em varios destinos empilharia todos os rotulos no mesmo ponto. */
  function midpoint(a, b, horiz, anchor) {
    if (horiz) {
      const sx = a.x + a.width;
      const tx = b.x;
      const mid = sx + (tx - sx) / 2;
      if (Math.abs(a.cy - b.cy) < 2) return { x: mid, y: a.cy };
      if (anchor === 'source') return { x: sx + (mid - sx) / 2, y: a.cy };
      return { x: mid + (tx - mid) / 2, y: b.cy };
    }
    const sy = a.y + a.height;
    const ty = b.y;
    const mid = sy + (ty - sy) / 2;
    if (Math.abs(a.cx - b.cx) < 2) return { x: a.cx, y: mid };
    if (anchor === 'source') return { x: a.cx, y: sy + (mid - sy) / 2 };
    return { x: b.cx, y: mid + (ty - mid) / 2 };
  }


  function render(spec, mountEl) {
    const model = layout(spec);
    const svg = svgEl('svg', {
      class: 'flow-svg',
      viewBox: `0 0 ${model.width} ${model.height}`,
      xmlns: 'http://www.w3.org/2000/svg',
      role: 'img',
    });

    const defs = svgEl('defs', {});
    [['flow-caret', 'var(--on-surface)'], ['flow-caret-muted', 'var(--on-surface-variant)']].forEach(([id, color]) => {
      const marker = svgEl('marker', {
        id, viewBox: '0 0 10 10', refX: '7.5', refY: '5', markerUnits: 'userSpaceOnUse',
        markerWidth: '10', markerHeight: '10', orient: 'auto',
      });
      marker.appendChild(svgEl('path', {
        d: 'M 3 1.2 L 7.5 5 L 3 8.8', fill: 'none', stroke: color,
        'stroke-width': '1.3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }));
      marker.appendChild(svgEl('path', { d: 'M 3 1.2 L 7.5 5 L 3 8.8', fill: 'none' }));
      defs.appendChild(marker);
    });
    svg.appendChild(defs);

    model.bands.forEach((band) => {
      const g = svgEl('g', { class: 'flow-group' });
      g.appendChild(svgEl('rect', Object.assign({}, band.rect, {
        rx: 16, fill: 'var(--surface-dim)', stroke: 'var(--stroke-default)',
        'stroke-width': '1', 'stroke-dasharray': '4 5',
      })));
      const label = svgEl('text', {
        x: band.rect.x + 16, y: band.rect.y + 19,
        'font-family': 'var(--ff-sans)', 'font-size': '12', 'font-weight': '500',
        fill: 'var(--on-surface-variant)',
      });
      label.textContent = band.label;
      g.appendChild(label);
      svg.appendChild(g);
    });

    const laneBase = model.horiz ? model.height - 8 : model.width - 8;
    /* Leque saindo de um no: rotulo perto do destino. Leque entrando num no:
       rotulo perto da origem. Senao os rotulos se empilham no mesmo ponto. */
    const outDeg = new Map();
    const inDeg = new Map();
    (spec.edges || []).forEach((e) => {
      if (!e.label) return;
      outDeg.set(e.from, (outDeg.get(e.from) || 0) + 1);
      inDeg.set(e.to, (inDeg.get(e.to) || 0) + 1);
    });
    (spec.edges || []).forEach((e, i) => {
      const a = model.byId.get(e.from);
      const b = model.byId.get(e.to);
      if (!a || !b) return;
      const g = svgEl('g', { class: 'flow-edge', 'data-from': e.from, 'data-to': e.to });
      g.appendChild(svgEl('path', {
        d: edgePath(a, b, model.horiz, laneBase - (i % 3) * 10),
        fill: 'none',
        stroke: e.dashed ? 'var(--on-surface-variant)' : 'var(--on-surface)',
        'stroke-width': '1.3',
        'stroke-linecap': 'round',
        'stroke-dasharray': e.dashed ? '5 5' : '0 4',
        'marker-end': e.dashed ? 'url(#flow-caret-muted)' : 'url(#flow-caret)',
      }));
      if (e.label) {
        const anchor = (inDeg.get(e.to) || 0) > 1 && (outDeg.get(e.from) || 0) <= 1 ? 'source' : 'target';
        const p = midpoint(a, b, model.horiz, anchor);
        const labelLines = wrapLabel(String(e.label), 24);
        const w = Math.ceil(textWidth(labelLines, CHAR_W_SUB)) + 14;
        const h = labelLines.length * 15 + 6;
        /* O pill nunca invade os dois nos que ele liga. */
        if (model.horiz) {
          const lo = a.x + a.width + w / 2 + 8;
          const hi = b.x - w / 2 - 8;
          p.x = hi >= lo ? Math.min(Math.max(p.x, lo), hi) : (lo + hi) / 2;
        } else {
          const lo = a.y + a.height + h / 2 + 6;
          const hi = b.y - h / 2 - 6;
          p.y = hi >= lo ? Math.min(Math.max(p.y, lo), hi) : (lo + hi) / 2;
        }
        g.appendChild(svgEl('rect', {
          x: p.x - w / 2, y: p.y - h / 2, width: w, height: h, rx: 9,
          fill: 'var(--surface)',
        }));
        labelLines.forEach((line, idx) => {
          const t = svgEl('text', {
            x: p.x, y: p.y - h / 2 + 15 + idx * 15 - 3, 'text-anchor': 'middle',
            'font-family': 'var(--ff-mono)', 'font-size': '12', 'font-style': 'italic',
            fill: 'var(--on-surface)',
          });
          t.textContent = line;
          g.appendChild(t);
        });
      }
      svg.appendChild(g);
    });

    model.nodes.forEach((n) => svg.appendChild(drawNode(n)));

    /* Sem teto o SVG de viewBox estreito estica ate a largura da nota e a
       altura do widget explode junto. */
    svg.style.maxWidth = `${model.width}px`;
    svg.style.margin = '0 auto';

    mountEl.innerHTML = '';
    mountEl.appendChild(svg);
    return model;
  }

  function mountWidget(spec) {
    const container = document.querySelector('.widget-container');
    if (!container) return;
    container.innerHTML = '';

    if (spec.title || spec.subtitle) {
      const header = document.createElement('div');
      header.className = 'flow-header';
      if (spec.title) {
        const h = document.createElement('h2');
        h.className = 'lumi-headline-m';
        h.textContent = spec.title;
        header.appendChild(h);
      }
      if (spec.subtitle) {
        const p = document.createElement('p');
        p.className = 'lumi-body-s';
        p.textContent = spec.subtitle;
        header.appendChild(p);
      }
      container.appendChild(header);
    }

    const card = document.createElement('div');
    card.className = 'diagram-card';
    container.appendChild(card);
    const model = render(spec, card);

    const withDetail = model.nodes.filter((n) => n.detail);
    if (!withDetail.length) return;

    const panel = document.createElement('div');
    panel.className = 'details-card';
    panel.innerHTML = '<div class="details-header"><span class="details-title"></span><span class="details-tag"></span></div><p class="details-desc"></p>';
    container.appendChild(panel);
    const titleEl = panel.querySelector('.details-title');
    const tagEl = panel.querySelector('.details-tag');
    const descEl = panel.querySelector('.details-desc');

    function select(id) {
      const node = model.byId.get(id);
      if (!node || !node.detail) return;
      card.querySelectorAll('.flow-node').forEach((el) => {
        el.classList.toggle('is-selected', el.dataset.node === id);
      });
      titleEl.textContent = (node.label || '').replace(/\n/g, ' ');
      tagEl.textContent = node.tag || '';
      tagEl.style.display = node.tag ? '' : 'none';
      descEl.textContent = node.detail;
    }

    card.querySelectorAll('.flow-node.is-clickable').forEach((el) => {
      el.addEventListener('click', () => select(el.dataset.node));
    });
    select(withDetail[0].id);
  }

  function boot() {
    const holder = document.getElementById('flow-spec');
    if (!holder) return;
    let spec;
    try {
      spec = JSON.parse(holder.textContent);
    } catch (e) {
      console.error('flow-spec invalido', e);
      return;
    }
    mountWidget(spec);
  }

  global.AttlasFlow = { render, mountWidget, layout };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);

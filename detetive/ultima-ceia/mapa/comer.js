// Comer: pegar um alimento da mesa (E), levar à boca e comer em três mordidas, com farelos caindo.
//  E perto de um alimento ... pega (fica na mão do boneco)
//  Q com o alimento na mão .. come (o boneco vira de frente, leva à boca, 3 mordidas e farelos)
//  E com o alimento na mão .. devolve o alimento ao lugar
// Os outros jogadores veem o alimento sumir da mesa, na mão de quem pegou e a pessoa comendo.
// Usa: x, y, dir, inside, keys, msg, size, pick (mapa.js), Interior, Decoracao e MapaOnline.
(() => {
  const K = 3;
  const MAO = [[0.13, -0.34], [-0.19, -0.36], [0.19, -0.36], [-0.14, -0.34]]; // posição da mão por direção (fração do boneco)
  const T_LEVAR = 0.35, MORDIDAS = [0.55, 0.9, 1.25], T_FIM = 1.6;
  let mao = null;          // { n, idx, img, w, h }
  let comendo = null;      // { t0, img, w, h, mordidas }
  const farelos = [];      // { x, y, vx, vy, chao, cor, vida }
  const outros = new Map(); // id do jogador → { mao?: {img,w,h,n,idx}, comendo?: {...} }
  const paletas = new WeakMap();

  const s = () => Number((window.size && size.value) || 88);
  const online = () => window.MapaOnline && MapaOnline.pronto;
  const mandar = (p) => { if (online()) MapaOnline.mandar('comida', p); };

  // ---------- alimento perto do boneco ----------
  function alimentoPerto() {
    if (!window.Interior || !window.Decoracao || Decoracao.modo) return null;
    const A = Interior.andarDe(Interior.nivel); if (!A.decor) return null;
    let melhor = null, dist = 62;
    for (const d of A.decor) {
      if (!d.ref || d.ref.item === undefined || d.camada !== 2) continue;
      const cx = (d.x0 + d.w / 2) * K, cy = (d.y0 + d.h / 2) * K;
      const dd = Math.hypot(x - cx, (y - 26) - cy);
      if (dd < dist) { dist = dd; melhor = d; }
    }
    return melhor;
  }
  function nomeDe(n, idx) { const r = Decoracao.itemDe(n, idx); return r && r.it ? r.it.nome : 'alimento'; }

  // ---------- ações ----------
  function pegar(d) {
    const n = Interior.nivel, idx = d.ref.item;
    mao = { n, idx, img: d.can, w: d.w * K, h: d.h * K };
    Decoracao.ocultar(n, idx, true);
    mandar({ a: 'pegar', n, i: idx });
    msg.textContent = `Na mão: ${nomeDe(n, idx)} — Q come · E devolve`;
  }
  function devolver() {
    if (!mao) return;
    Decoracao.ocultar(mao.n, mao.idx, false);
    mandar({ a: 'devolver', n: mao.n, i: mao.idx });
    mao = null; msg.textContent = 'Devolveu o alimento ao lugar.';
  }
  function comer() {
    if (!mao) return;
    comendo = { t0: performance.now(), img: mao.img, w: mao.w, h: mao.h, mordidas: 0 };
    mandar({ a: 'comer', n: mao.n, i: mao.idx });
    mao = null; dir = 0; // vira de frente para comer
    msg.textContent = 'Comendo…';
  }

  // E: pega ou come (antes das outras ações do E); Q: devolve
  const pegarAntes = pick;
  pick = function () {
    if (inside && !(window.Decoracao && Decoracao.modo)) {
      if (comendo) return;
      if (mao) return devolver();
      const d = alimentoPerto(); if (d) return pegar(d);
    }
    return pegarAntes();
  };
  addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if (e.key.toLowerCase() === 'q' && mao && !comendo) { e.preventDefault(); comer(); }
  });

  // ---------- outros jogadores ----------
  addEventListener('mapa:comida', ({ detail: p }) => {
    if (!p || !window.Decoracao) return;
    const o = outros.get(p.id) || {}; outros.set(p.id, o);
    if (p.a === 'pegar') {
      Decoracao.ocultar(p.n, p.i, true);
      const r = Decoracao.itemDe(p.n, p.i), it = r && r.it;
      const img = new Image(); if (it && it.img) img.src = it.img;
      const esc = (r && r.p && r.p.s) || 1;
      o.mao = { img, w: (it ? it.w : 5) * K * esc, h: (it ? it.h : 5) * K * esc, n: p.n, i: p.i };
    } else if (p.a === 'devolver') {
      Decoracao.ocultar(p.n, p.i, false); o.mao = null;
    } else if (p.a === 'comer') {
      Decoracao.ocultar(p.n, p.i, true);
      if (o.mao) { o.comendo = { t0: performance.now(), img: o.mao.img, w: o.mao.w, h: o.mao.h, mordidas: 0 }; o.mao = null; }
    }
  });

  // ---------- desenho ----------
  function corDe(img) { // cores do próprio alimento para os farelos
    let p = paletas.get(img); if (p) return p[Math.floor(Math.random() * p.length)];
    p = ['#c89458', '#e8d0a0', '#8a5a34'];
    try {
      const c = document.createElement('canvas'); c.width = img.naturalWidth || img.width; c.height = img.naturalHeight || img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data, cores = [];
      for (let i = 0; i < d.length; i += 4 * 7) if (d[i + 3] > 200) cores.push(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`);
      if (cores.length) p = cores;
    } catch (e) { /* imagem de outro endereço: usa as cores padrão */ }
    paletas.set(img, p); return p[Math.floor(Math.random() * p.length)];
  }
  function soltarFarelos(px, py, chao, img, n = 7) {
    for (let i = 0; i < n; i++) farelos.push({ x: px + (Math.random() - 0.5) * 10, y: py, vx: (Math.random() - 0.5) * 110, vy: -40 - Math.random() * 90, chao: chao + (Math.random() - 0.5) * 10, cor: corDe(img), vida: 1.8 + Math.random() * 0.8, t: Math.random() < 0.5 ? 3 : 4 });
  }
  function posMao(px, py, d) { const [hx, hy] = MAO[d || 0]; return [px + hx * s(), py + hy * s()]; }
  const boca = (px, py) => [px, py - s() * 0.62];

  // desenha uma pessoa comendo (você ou outro jogador); devolve false quando acabou
  function animarComer(c, px, py, agora, g) {
    const t = (agora - c.t0) / 1000;
    if (t > T_FIM) return false;
    const [mx, my] = posMao(px, py, 0), [bx, by] = boca(px, py);
    const k = Math.min(1, t / T_LEVAR), e = k * k * (3 - 2 * k);
    let fx = mx + (bx - mx) * e, fy = my + (by + 6 - my) * e;
    // mordidas: o alimento diminui, dá um tranco para a boca e solta farelos
    while (c.mordidas < MORDIDAS.length && t >= MORDIDAS[c.mordidas]) { c.mordidas++; soltarFarelos(bx, by + 8, py - 2, c.img, 9); }
    const resto = 1 - c.mordidas / MORDIDAS.length;
    const tranco = MORDIDAS.some((m) => t >= m && t < m + 0.12) ? -4 : 0;
    if (resto > 0) {
      const z = 1.35 * (0.45 + 0.55 * resto), w = c.w * z, h = c.h * z; // um pouco maior perto do rosto, para dar para ver
      g.drawImage(c.img, Math.round(fx - w / 2), Math.round(fy - h / 2 + tranco), Math.round(w), Math.round(h));
      // mãos segurando (dois pontinhos na cor da pele seriam muito pequenos: uma sombra discreta basta)
    }
    // "nham" pequeno a cada mordida
    const ult = MORDIDAS[c.mordidas - 1];
    if (ult && t - ult < 0.35) {
      g.save(); g.globalAlpha = 1 - (t - ult) / 0.35; g.font = 'bold 12px system-ui'; g.textAlign = 'center';
      g.fillStyle = '#fff4d0'; g.strokeStyle = 'rgba(20,14,10,.8)'; g.lineWidth = 3;
      const ty = by - 18 - (t - ult) * 30; g.strokeText('nham', bx + 18, ty); g.fillText('nham', bx + 18, ty); g.restore();
    }
    return true;
  }
  let ultimo = performance.now();
  function desenhar(g, agora) {
    const dt = Math.min(0.05, (agora - ultimo) / 1000); ultimo = agora;
    g.save(); g.imageSmoothingEnabled = false;
    const andar = window.Interior ? Interior.andar : null;
    // você
    if (mao) { const [hx, hy] = posMao(x, y, dir); g.drawImage(mao.img, Math.round(hx - mao.w / 2), Math.round(hy - mao.h / 2), Math.round(mao.w), Math.round(mao.h)); }
    if (comendo) {
      keys = {}; // parado enquanto come
      if (!animarComer(comendo, x, y, agora, g)) { comendo = null; msg.textContent = 'Comeu!'; }
    }
    // outros jogadores do mesmo andar
    for (const [id, o] of outros) {
      const j = window.MapaOnline && MapaOnline.jogador(id);
      if (!j || !j.inside || (j.andar ?? 0) !== andar) continue;
      if (o.mao) { const [hx, hy] = posMao(j.x, j.y, j.dir); g.drawImage(o.mao.img, Math.round(hx - o.mao.w / 2), Math.round(hy - o.mao.h / 2), Math.round(o.mao.w), Math.round(o.mao.h)); }
      if (o.comendo && !animarComer(o.comendo, j.x, j.y, agora, g)) o.comendo = null;
    }
    // farelos: caem com gravidade, quicam um pouco no chão e somem
    for (let i = farelos.length - 1; i >= 0; i--) {
      const f = farelos[i];
      if (f.y < f.chao || f.vy < 0) { f.vy += 520 * dt; f.x += f.vx * dt; f.y += f.vy * dt; if (f.y >= f.chao && f.vy > 0) { f.y = f.chao; f.vy = -f.vy * 0.25; f.vx *= 0.4; if (Math.abs(f.vy) < 25) f.vy = 0; } }
      f.vida -= dt; if (f.vida <= 0) { farelos.splice(i, 1); continue; }
      g.globalAlpha = Math.min(1, f.vida / 0.4); g.fillStyle = f.cor; g.fillRect(Math.round(f.x), Math.round(f.y), f.t, f.t);
    }
    g.globalAlpha = 1;
    // dica
    if (!mao && !comendo && !(window.Decoracao && Decoracao.modo)) {
      const d = alimentoPerto();
      if (d) {
        g.font = '13px system-ui'; g.textAlign = 'center';
        const txt = `E: pegar ${nomeDe(Interior.nivel, d.ref.item)}`, w = g.measureText(txt).width + 16;
        g.fillStyle = 'rgba(20,14,10,.8)'; g.fillRect(x - w / 2, y + 40, w, 22); g.fillStyle = '#f0e2c0'; g.fillText(txt, x, y + 55);
      }
    } else if (mao) {
      g.font = '13px system-ui'; g.textAlign = 'center';
      const txt = 'Q: comer · E: devolver', w = g.measureText(txt).width + 16;
      g.fillStyle = 'rgba(20,14,10,.8)'; g.fillRect(x - w / 2, y + 40, w, 22); g.fillStyle = '#f0e2c0'; g.fillText(txt, x, y + 55);
    }
    g.restore();
  }

  window.Comida = { desenhar, get naMao() { return mao; }, get comendo() { return !!comendo; }, comer: () => comer() };
})();

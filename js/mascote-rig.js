// Mascote articulado a partir da arte original, sem redesenhar nada.
//
// Como funciona (animação por ossos, não por quadros):
// - A imagem é usada em várias peças, cada uma recortada por um polígono (cabeça, braço, pompom).
// - O corpo é a imagem inteira com essas peças removidas por máscara.
// - Cada peça gira/escala em torno do seu pivô (pescoço, cotovelo, ponta do gorro).
// - O braço pode passar para TRÁS do corpo: a peça muda de camada e o tronco a cobre de verdade.
//   Escondido, ele pode trocar o que segura (faca ↔ cartinha) sem ninguém ver a troca.
// - Olhos: as pupilas foram recortadas da própria arte e andam dentro do branco do olho
//   (o lugar original da pupila foi preenchido com a textura do olho). A pálpebra de cima
//   é a da arte e desce para piscar.
// - As poses só definem alvos; molas amortecidas levam cada osso até o alvo, então todo movimento
//   sai suave e qualquer mudança parte da posição atual.
// - O pompom é um pêndulo: reage ao giro da cabeça e a um vento leve (movimento secundário).
// Coordenadas em pixels de cada imagem original.
window.MP = window.MP || {};

MP.Rig = (() => {
  const NS = 'http://www.w3.org/2000/svg';

  const ARTES = {
    // arte principal: segurando a faca
    faca: {
      imagem: 'assets/mascote/faca.png',
      largura: 682, altura: 1024,
      pecas: {
        cabeca: { pivo: [345, 350], pontos: '160,180 178,100 255,85 285,70 300,35 400,8 470,8 540,40 590,100 615,170 612,225 598,245 575,252 540,252 515,370 470,372 420,352 380,345 310,345 258,352 215,342 178,330 150,270' },
        // inclui as gotas que escorrem da lâmina, para irem junto com a faca
        braco: { pivo: [203, 442], pontos: '32,200 38,105 80,110 140,200 150,270 178,330 215,345 232,380 238,428 225,458 195,458 165,430 130,400 120,430 118,565 40,565 36,320' },
        pompom: { pivo: [588, 250], pontos: '525,300 528,250 600,238 636,268 640,325 605,350 545,345' },
      },
      olhos: {
        brancos: 'assets/mascote/faca-olhos.png',
        pupilas: 'assets/mascote/faca-pupilas.png',
        lista: [
          { branco: [266, 250, 34, 29], alcance: [13, 8], palpebra: '226,244 228,222 245,205 266,199 288,205 303,222 305,244 296,240 266,237 235,240', topo: 199 },
          { branco: [410, 255, 28, 24], alcance: [10, 7], palpebra: '378,248 380,232 395,221 410,218 425,221 440,232 442,248 436,245 410,242 384,245', topo: 218 },
        ],
        bochechas: [[248, 300, 34, 16], [446, 292, 30, 14]],
        boca: [395, 322],
        bico: [352, 304], // lábios em bico das poses de assobio
      },
      // poses desenhadas alinhadas com esta arte (mãos para trás / dedo erguido, assobiando)
      variantes: {
        assobio: 'assets/mascote/assobio.png',
        dedo: 'assets/mascote/assobio-dedo.png',
      },
      // pontas de onde o sangue pinga (no espaço do braço)
      gotas: [[64, 392], [98, 468]],
      // a cartinha, vinda da arte do envelope e encaixada na mesma mão
      cartinha: { arte: 'envelope', escala: .646, pivoOrigem: [325, 640] },
      pes: [320, 985],
      sombra: { cx: 320, cy: 975, rx: 215, ry: 22, desfoque: 9 },
      poses: {
        repouso: { braco: 0, esc: 1, inclina: 0 },
        antecipar: { braco: -7, esc: 1.04, inclina: -1.4 },
        esconder: { braco: 152, esc: .9, inclina: 1.6, tras: true },
        disfarcar: { braco: 158, esc: .9, inclina: -1.2, tras: true },
        vergonha: { braco: 156, esc: .9, inclina: 2.6, tras: true },
        mostrar: { braco: -10, esc: 1.12, inclina: -1.8 },
      },
    },
    // arte com o envelope
    envelope: {
      imagem: 'assets/mascote/natal.webp',
      largura: 1024, altura: 1536,
      pecas: {
        cabeca: { pivo: [506, 530], pontos: '267,167 333,128 383,133 422,111 433,94 528,67 628,28 728,9 806,33 872,100 906,189 914,278 903,353 886,369 789,372 778,550 717,556 628,522 550,513 500,522 450,522 383,550 344,533 341,478 303,391 272,372 256,278' },
        braco: { pivo: [325, 640], pontos: '94,456 217,406 300,389 341,467 350,533 317,578 322,617 344,639 333,661 306,656 278,628 250,622 217,600 194,600 156,556 100,489' },
        pompom: { pivo: [884, 368], pontos: '794,361 886,356 939,389 950,456 928,511 872,528 817,511 792,456' },
      },
      envelope: [[100, 456], [300, 389], [344, 522], [189, 594]],
      pes: [520, 1520],
      sombra: { cx: 520, cy: 1508, rx: 400, ry: 34, desfoque: 14 },
      poses: {
        repouso: { braco: 0, esc: 1, inclina: 0 },
        antecipar: { braco: 5, esc: .96, inclina: 1.2 },
        mostrar: { braco: -9, esc: 1.16, inclina: -2.2 },
        esconder: { braco: 6, esc: .93, inclina: 1.6 },
        disfarcar: { braco: 4, esc: .95, inclina: -1.3 },
      },
    },
  };

  let contador = 0;

  function el(nome, attrs, pai) {
    const e = document.createElementNS(NS, nome);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }
  function mola(v, k, d) { return { v, vel: 0, alvo: v, k, d }; }
  function passoMola(m, dt) {
    const a = m.k * (m.alvo - m.v) - m.d * m.vel;
    m.vel += a * dt;
    m.v += m.vel * dt;
  }
  const limitar = (v, a, b) => Math.max(a, Math.min(b, v));

  function criar(container, { arte = 'faca', reduzido = () => false } = {}) {
    const A = ARTES[arte];
    const { largura: L, altura: H, pecas: P } = A;
    const id = `rig${++contador}`;
    const svg = el('svg', { viewBox: `0 0 ${L} ${H}`, class: `rig rig-${arte}`, 'aria-hidden': 'true', overflow: 'visible' });
    const defs = el('defs', {}, svg);
    const clip = (nome, forma, attrs) => { const c = el('clipPath', { id: `${id}-${nome}` }, defs); el(forma, attrs, c); return `url(#${id}-${nome})`; };
    for (const nome in P) clip(nome, 'polygon', { points: P[nome].pontos });
    const mascara = el('mask', { id: `${id}-corpo`, maskUnits: 'userSpaceOnUse', x: -50, y: -50, width: L + 100, height: H + 100 }, defs);
    el('rect', { x: -50, y: -50, width: L + 100, height: H + 100, fill: '#fff' }, mascara);
    for (const nome in P) el('polygon', { points: P[nome].pontos, fill: '#000' }, mascara);
    const desfoque = el('filter', { id: `${id}-sombra`, x: '-20%', y: '-200%', width: '140%', height: '500%' }, defs);
    el('feGaussianBlur', { stdDeviation: A.sombra.desfoque }, desfoque);
    const imagem = (pai, extra, href = A.imagem, w = L, h = H) => el('image', { href, width: w, height: h, ...extra }, pai);

    const sombra = el('ellipse', { cx: A.sombra.cx, cy: A.sombra.cy, rx: A.sombra.rx, ry: A.sombra.ry, fill: 'rgba(5,6,12,.72)', filter: `url(#${id}-sombra)` }, svg);
    const camadaGotas = el('g', { class: 'rig-gotas' }, svg);
    const corpo = el('g', { class: 'rig-corpo' }, svg);
    const gBraco = el('g', { class: 'rig-braco' }, corpo);
    const imgFaca = imagem(gBraco, { 'clip-path': `url(#${id}-braco)` });
    // cartinha na mesma mão (fica oculta até ele puxá-la de trás das costas)
    let gCartinha = null, cantosCartinha = null;
    if (A.cartinha) {
      const B = ARTES[A.cartinha.arte], k = A.cartinha.escala, [ox, oy] = A.cartinha.pivoOrigem, [bx, by] = P.braco.pivo;
      gCartinha = el('g', { transform: `translate(${bx - ox * k} ${by - oy * k}) scale(${k})`, display: 'none' }, gBraco);
      imagem(gCartinha, { 'clip-path': clip('braco-cartinha', 'polygon', { points: B.pecas.braco.pontos }) }, B.imagem, B.largura, B.altura);
      cantosCartinha = B.envelope;
    }
    const imgCorpo = imagem(corpo, { mask: `url(#${id}-corpo)` });
    const gCabeca = el('g', {}, corpo);
    imagem(gCabeca, { 'clip-path': `url(#${id}-cabeca)` });

    // ---------- olhos, pálpebras e rubor (quando a arte tem essas peças) ----------
    const O = A.olhos;
    const olhos = [];
    let gRubor = null, gNotas = null;
    if (O) {
      O.lista.forEach((o, i) => {
        const [cx, cy, rx, ry] = o.branco;
        const gOlho = el('g', { 'clip-path': clip(`olho${i}`, 'ellipse', { cx, cy, rx, ry }) }, gCabeca);
        imagem(gOlho, {}, O.brancos);
        const gPupila = el('g', {}, gOlho);
        imagem(gPupila, {}, O.pupilas);
        // pálpebra de cima: recortada da arte; estica para baixo para piscar, sem sair do contorno do olho
        const area = el('clipPath', { id: `${id}-area${i}` }, defs);
        el('ellipse', { cx, cy, rx: rx + 2, ry: ry + 2 }, area);
        el('polygon', { points: o.palpebra }, area);
        const gArea = el('g', { 'clip-path': `url(#${id}-area${i})` }, gCabeca);
        const gPalpebra = el('g', {}, gArea);
        imagem(gPalpebra, { 'clip-path': clip(`palpebra${i}`, 'polygon', { points: o.palpebra }) });
        olhos.push({ ...o, cx, cy, gPupila, gPalpebra, gOlho, gArea });
      });
    }
    // ---------- poses alternativas desenhadas (ex.: assobiando) ----------
    // São artes alinhadas com a principal: a cabeça da variante gira junto com a cabeça do rig,
    // e o resto do corpo aparece por cima do corpo principal. A troca é um cruzamento curto.
    const variantes = {};
    if (A.variantes) {
      const mVar = el('mask', { id: `${id}-var`, maskUnits: 'userSpaceOnUse', x: -50, y: -50, width: L + 100, height: H + 100 }, defs);
      el('rect', { x: -50, y: -50, width: L + 100, height: H + 100, fill: '#fff' }, mVar);
      el('polygon', { points: P.cabeca.pontos, fill: '#000' }, mVar);
      el('polygon', { points: P.pompom.pontos, fill: '#000' }, mVar);
      for (const nome in A.variantes) {
        const href = A.variantes[nome];
        const corpoVar = imagem(null, { mask: `url(#${id}-var)`, opacity: 0 }, href);
        corpo.insertBefore(corpoVar, gCabeca);
        const cabecaVar = imagem(gCabeca, { 'clip-path': `url(#${id}-cabeca)`, opacity: 0 }, href);
        variantes[nome] = { corpoVar, cabecaVar, op: mola(0, 110, 21) };
      }
    }
    if (O) {
      const grad = el('radialGradient', { id: `${id}-rubor` }, defs);
      el('stop', { offset: '0', 'stop-color': '#e8506a', 'stop-opacity': '.6' }, grad);
      el('stop', { offset: '1', 'stop-color': '#e2324a', 'stop-opacity': '0' }, grad);
      gRubor = el('g', { opacity: 0 }, gCabeca);
      O.bochechas.forEach(([cx, cy, rx, ry]) => el('ellipse', { cx, cy, rx, ry, fill: `url(#${id}-rubor)` }, gRubor));
      gNotas = el('g', { class: 'rig-notas' }, svg);
    }
    const gPompom = el('g', {}, gCabeca);
    imagem(gPompom, { 'clip-path': `url(#${id}-pompom)` });
    corpo.appendChild(gBraco); // começa na frente
    container.appendChild(svg);

    // ---------- estado ----------
    const ossos = {
      cabeca: mola(0, 70, 13),          // a cabeça segue o olhar, mais devagar
      braco: mola(0, 70, 14),
      bracoEsc: mola(1, 120, 18),
      inclina: mola(0, 60, 13),
      respira: mola(1, 200, 26),
      pupX: mola(0, 160, 22),
      pupY: mola(0, 160, 22),
      palpebra: mola(1, 900, 55),       // 1 = aberta como na arte; ~2,5 = fechada
      rubor: mola(0, 30, 11),
    };
    const pendulo = { a: 0, vel: 0 };
    let olharX = 0, olharY = 0, inclinaPose = 0, ultimaCabeca = 0, velCabecaAnt = 0;
    let atras = false, querAtras = false, envergonhado = false, assobiando = false;
    let segurando = 'faca', proximaPiscada = 2, proximaGota = 1.2, proximaNota = 0, varianteDesejada = null;
    const gotas = [], notas = [];
    let t0 = performance.now(), ultimo = t0, raf = 0, ativo = true, tempo = 0;

    function camadaDoBraco(tras) {
      if (tras === atras) return;
      atras = tras;
      if (tras) corpo.insertBefore(gBraco, imgCorpo); else corpo.appendChild(gBraco);
    }
    function trocarObjeto(qual) {
      if (!gCartinha) return;
      segurando = qual;
      imgFaca.setAttribute('display', qual === 'faca' ? 'inline' : 'none');
      gCartinha.setAttribute('display', qual === 'cartinha' ? 'inline' : 'none');
    }

    function aplicar() {
      const [cx, cy] = P.cabeca.pivo, [bx, by] = P.braco.pivo, [px, py] = P.pompom.pivo, [fx, fy] = A.pes;
      const r = ossos.respira.v;
      corpo.setAttribute('transform', `translate(${fx} ${fy}) rotate(${ossos.inclina.v}) scale(${2 - r} ${r}) translate(${-fx} ${-fy})`);
      gCabeca.setAttribute('transform', `rotate(${ossos.cabeca.v} ${cx} ${cy})`);
      gPompom.setAttribute('transform', `rotate(${pendulo.a} ${px} ${py})`);
      gBraco.setAttribute('transform', `translate(${bx} ${by}) rotate(${ossos.braco.v}) scale(${ossos.bracoEsc.v}) translate(${-bx} ${-by})`);
      olhos.forEach((o) => {
        o.gPupila.setAttribute('transform', `translate(${ossos.pupX.v * o.alcance[0]} ${ossos.pupY.v * o.alcance[1]})`);
        o.gPalpebra.setAttribute('transform', `translate(0 ${o.topo}) scale(1 ${ossos.palpebra.v}) translate(0 ${-o.topo})`);
      });
      if (gRubor) gRubor.setAttribute('opacity', limitar(ossos.rubor.v, 0, 1).toFixed(3));
      // cruzamento com a pose alternativa: a principal some por baixo quando a outra já cobre quase tudo
      let maxVar = 0;
      for (const nome in variantes) {
        const vv = limitar(variantes[nome].op.v, 0, 1);
        maxVar = Math.max(maxVar, vv);
        variantes[nome].corpoVar.setAttribute('opacity', vv.toFixed(3));
        variantes[nome].cabecaVar.setAttribute('opacity', vv.toFixed(3));
      }
      const base = (1 - maxVar * maxVar).toFixed(3);
      imgCorpo.setAttribute('opacity', base);
      gBraco.setAttribute('opacity', base);
    }
    function variantePrincipal() {
      let melhor = null, v = .5;
      for (const nome in variantes) if (variantes[nome].op.v > v) { v = variantes[nome].op.v; melhor = nome; }
      return melhor;
    }

    // gotas de sangue pingando da lâmina (só com a faca à mostra)
    function pingar() {
      if (!A.gotas || segurando !== 'faca' || atras || Math.abs(ossos.braco.v) > 12) return;
      const [gx, gy] = A.gotas[Math.random() < .6 ? 0 : 1];
      const m = svg.getScreenCTM()?.inverse().multiply(gBraco.getScreenCTM());
      if (!m) return;
      const p = new DOMPoint(gx, gy).matrixTransform(m);
      const img = imagem(camadaGotas, { width: 11, height: 18, x: -5.5, y: -4 }, 'assets/mascote/gota.png', 11, 18);
      gotas.push({ el: img, x: p.x, y: p.y, vy: 10, chao: A.pes[1] - 30 - Math.random() * 40 });
    }
    function moverGotas(dt) {
      for (let i = gotas.length - 1; i >= 0; i--) {
        const g = gotas[i];
        g.vy += 1100 * dt; g.y += g.vy * dt;
        const resta = g.chao - g.y;
        g.el.setAttribute('transform', `translate(${g.x} ${g.y}) scale(1 ${limitar(1 + g.vy / 1400, 1, 1.6)})`);
        g.el.setAttribute('opacity', limitar(resta / 60, 0, 1));
        if (resta <= 0) { g.el.remove(); gotas.splice(i, 1); }
      }
    }
    // notas musicais do assobio, saindo do canto da boca
    function soltarNota() {
      const [bx, by] = variantePrincipal() ? O.bico : O.boca;
      const m = svg.getScreenCTM()?.inverse().multiply(gCabeca.getScreenCTM());
      if (!m) return;
      const p = new DOMPoint(bx, by).matrixTransform(m);
      const n = el('text', { class: 'rig-nota', x: 0, y: 0 }, gNotas);
      n.textContent = Math.random() < .5 ? '♪' : '♫';
      notas.push({ el: n, x: p.x + 10, y: p.y, vida: 0, lado: Math.random() < .5 ? -1 : 1 });
    }
    function moverNotas(dt) {
      for (let i = notas.length - 1; i >= 0; i--) {
        const n = notas[i];
        n.vida += dt;
        const x = n.x + 40 * n.vida + 10 * Math.sin(n.vida * 6) * n.lado, y = n.y - 70 * n.vida;
        n.el.setAttribute('transform', `translate(${x} ${y}) rotate(${n.lado * 12 * Math.sin(n.vida * 4)})`);
        n.el.setAttribute('opacity', limitar(n.vida < .2 ? n.vida / .2 : (1.6 - n.vida) / .6, 0, 1));
        if (n.vida > 1.6) { n.el.remove(); notas.splice(i, 1); }
      }
    }

    function quadro(agora) {
      raf = 0;
      if (!ativo) return;
      const dt = Math.min(.05, (agora - ultimo) / 1000);
      ultimo = agora;
      avancar(dt);
      raf = requestAnimationFrame(quadro);
    }

    function avancar(dt) {
      tempo += dt;
      const t = tempo;
      const calmo = reduzido();
      const ocioso = calmo ? 0 : 1;
      ossos.respira.alvo = (envergonhado ? .988 : 1) + ocioso * .0075 * Math.sin(t * 2 * Math.PI / 3.7);
      // pupilas: seguem o alvo; a cabeça acompanha com uma inclinação menor e mais lenta
      ossos.pupX.alvo = olharX; ossos.pupY.alvo = olharY;
      ossos.cabeca.alvo = (envergonhado ? -5 : ossos.pupX.v * 2.2) + ossos.inclina.v * -.4 + ocioso * .6 * Math.sin(t * 2 * Math.PI / 5.3 + 1);
      ossos.inclina.alvo = inclinaPose + ocioso * (.35 * Math.sin(t * 2 * Math.PI / 7.9) + .5 * Math.sin(t * 2 * Math.PI / 13.1));
      ossos.rubor.alvo = envergonhado ? 1 : 0;
      // a pose alternativa só entra com o braço já escondido atrás do corpo
      for (const k in variantes) variantes[k].op.alvo = (k === varianteDesejada && (atras || calmo)) ? 1 : 0;

      // piscar em intervalos variados (às vezes duas vezes seguidas)
      let palpebraBase = envergonhado ? 1.45 : 1;
      if (!calmo && olhos.length) {
        proximaPiscada -= dt;
        if (proximaPiscada <= 0) {
          ossos.palpebra.alvo = 3;
          if (proximaPiscada < -.11) {
            proximaPiscada = Math.random() < .2 ? .18 : 2.2 + Math.random() * 4.5;
            ossos.palpebra.alvo = palpebraBase;
          }
        } else ossos.palpebra.alvo = palpebraBase;
      } else ossos.palpebra.alvo = palpebraBase;

      if (calmo) {
        for (const k in ossos) { ossos[k].v = ossos[k].alvo; ossos[k].vel = 0; }
        for (const k in variantes) { const m = variantes[k].op; m.v = m.alvo; m.vel = 0; }
        pendulo.a = 0; pendulo.vel = 0;
      } else {
        for (const k in ossos) passoMola(ossos[k], dt);
        for (const k in variantes) passoMola(variantes[k].op, dt);
        const velCabeca = (ossos.cabeca.v - ultimaCabeca) / Math.max(dt, 1e-3);
        const acelCabeca = (velCabeca - velCabecaAnt) / Math.max(dt, 1e-3);
        ultimaCabeca = ossos.cabeca.v; velCabecaAnt = velCabeca;
        const vento = 2.2 * Math.sin(t * .9) + 1.2 * Math.sin(t * 2.3 + 2);
        const acel = -38 * (pendulo.a - vento) - 2.6 * pendulo.vel - acelCabeca * .9 - ossos.inclina.vel * 6;
        pendulo.vel += acel * dt;
        pendulo.a = limitar(pendulo.a + pendulo.vel * dt, -14, 14);
        // sangue pingando
        proximaGota -= dt;
        if (proximaGota <= 0) { pingar(); proximaGota = .9 + Math.random() * 1.8; }
        // notas do assobio
        if (assobiando && gNotas) { proximaNota -= dt; if (proximaNota <= 0) { soltarNota(); proximaNota = .45 + Math.random() * .35; } }
      }
      moverGotas(dt);
      moverNotas(dt);
      // o braço só volta para a frente do corpo quando já está quase de volta ao lugar
      if (!querAtras && atras && Math.abs(ossos.braco.v) < 28) camadaDoBraco(false);
      aplicar();
    }

    function retomar() {
      if (raf || !ativo) return;
      ultimo = performance.now();
      raf = requestAnimationFrame(quadro);
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else retomar();
    });
    retomar();

    function pontoNaTela(x, y, ref = gBraco) {
      const p = svg.createSVGPoint();
      p.x = x; p.y = y;
      return p.matrixTransform(ref.getScreenCTM());
    }

    return {
      elemento: svg,
      arte,
      // olhar para um ponto da tela: as pupilas vão até a borda do olho; a cabeça acompanha um pouco
      olharPara(x, y) {
        if (envergonhado) return;
        const ref = olhos.length ? pontoNaTela(...O.boca, gCabeca) : null;
        const r = svg.getBoundingClientRect();
        const ox = ref ? ref.x : r.left + r.width / 2, oy = ref ? ref.y - r.height * .08 : r.top + r.height * .25;
        const dx = x - ox, dy = y - oy, d = Math.hypot(dx, dy) || 1;
        const forca = Math.min(1, d / 260);
        olharX = (dx / d) * forca;
        olharY = (dy / d) * forca;
      },
      olharElemento(alvo) {
        const r = alvo.getBoundingClientRect();
        this.olharPara(r.left + r.width / 2, r.top + r.height / 2);
      },
      // volta devagar ao olhar neutro (ex.: o cursor saiu da janela)
      olharFrente() { if (!envergonhado) { olharX = 0; olharY = 0; } },
      cabecaRapida(rapida) {
        ossos.cabeca.k = rapida ? 220 : 70; ossos.cabeca.d = rapida ? 26 : 13;
        ossos.pupX.k = ossos.pupY.k = rapida ? 420 : 160; ossos.pupX.d = ossos.pupY.d = rapida ? 36 : 22;
      },
      pose(nome) {
        const p = A.poses[nome] || A.poses.repouso;
        ossos.braco.alvo = p.braco;
        ossos.bracoEsc.alvo = p.esc;
        inclinaPose = p.inclina;
        querAtras = !!p.tras;
        if (querAtras) camadaDoBraco(true); // passa por trás do corpo logo no início do gesto
        if (reduzido()) camadaDoBraco(querAtras);
      },
      // braço mais rápido (ex.: jogar a cartinha e recolher a mão)
      bracoRapido(rapido) { ossos.braco.k = rapido ? 180 : 70; ossos.braco.d = rapido ? 24 : 14; },
      get escondido() { return atras; },
      get segurando() { return segurando; },
      // troca o que está na mão; só acontece com a mão escondida atrás do corpo
      segurar(qual) { if (atras || reduzido()) { trocarObjeto(qual); return true; } return false; },
      // vergonha: olha para baixo e para o lado, pálpebras pesadas, bochechas coradas, corpo encolhido
      vergonha(sim) {
        envergonhado = sim;
        if (sim) { olharX = -.85; olharY = .55; }
        else { olharX = 0; olharY = 0; }
      },
      assobiar(sim) { assobiando = sim && !!gNotas && !reduzido(); proximaNota = 0; },
      piscar() { proximaPiscada = 0; },
      // troca para uma pose desenhada (ex.: 'assobio', 'dedo') ou volta à principal (null)
      variante(nome) { varianteDesejada = nome && variantes[nome] ? nome : null; },
      sacudir(forca = 1) {
        if (reduzido()) return;
        ossos.respira.vel -= .35 * forca;
        ossos.cabeca.vel += 30 * forca;
        pendulo.vel += 60 * forca;
      },
      // Ganchos para camadas que ainda faltam (sobrancelhas e etapas da boca).
      expressao({ sobrancelha, sorriso } = {}) {
        if (sobrancelha !== undefined) svg.dataset.sobrancelha = sobrancelha ? '1' : '0';
        if (sorriso !== undefined) svg.dataset.sorriso = String(sorriso);
      },
      // retângulo da cartinha na mão (para ela sair voando de lá)
      retanguloCartinha() {
        const ref = gCartinha || gBraco;
        const cantos = gCartinha ? cantosCartinha : (A.envelope || [[0, 0], [L, H]]);
        const pts = cantos.map(([x, y]) => pontoNaTela(x, y, ref));
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        const left = Math.min(...xs), top = Math.min(...ys);
        return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
      },
      pontoCabeca() { return pontoNaTela(P.cabeca.pivo[0] + 20, P.cabeca.pivo[1] - 160 * (L / 682), gCabeca); },
      // para testes: avança a simulação sem depender do relógio da tela
      simular(segundos) { for (let i = 0; i < segundos * 60; i++) avancar(1 / 60); },
      congelar(sim) { ativo = !sim; if (sim) { cancelAnimationFrame(raf); raf = 0; } else retomar(); },
      destruir() { ativo = false; cancelAnimationFrame(raf); svg.remove(); },
    };
  }

  return { criar };
})();

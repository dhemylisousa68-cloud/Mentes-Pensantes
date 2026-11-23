// Mascote articulado a partir da arte original (assets/mascote/natal.webp), sem redesenhar nada.
//
// Como funciona (animação por ossos, não por quadros):
// - A mesma imagem é usada em várias peças, cada uma recortada por um polígono (cabeça, braço com o envelope, pompom).
// - O corpo é a imagem inteira com essas peças removidas por máscara.
// - Cada peça gira/escala em torno do seu pivô (pescoço, punho, ponta do gorro).
// - As poses só definem alvos; molas amortecidas levam cada osso até o alvo, então todo movimento sai suave.
// - O pompom é um pêndulo: reage ao giro da cabeça e a um vento leve (movimento secundário).
// Coordenadas abaixo estão em pixels da imagem original (1024 × 1536).
window.MP = window.MP || {};

MP.Rig = (() => {
  const LARGURA = 1024, ALTURA = 1536;
  const IMAGEM = 'assets/mascote/natal.webp';

  const PECAS = {
    cabeca: {
      pivo: [506, 530],
      pontos: '267,167 333,128 383,133 422,111 433,94 528,67 628,28 728,9 806,33 872,100 906,189 914,278 903,353 886,369 789,372 778,550 717,556 628,522 550,513 500,522 450,522 383,550 344,533 341,478 303,391 272,372 256,278',
    },
    braco: {
      pivo: [325, 640],
      pontos: '94,456 217,406 300,389 341,467 350,533 317,578 322,617 344,639 333,661 306,656 278,628 250,622 217,600 194,600 156,556 100,489',
    },
    pompom: {
      pivo: [884, 368],
      pontos: '794,361 886,356 939,389 950,456 928,511 872,528 817,511 792,456',
    },
  };
  // cantos do envelope (para o convite sair exatamente dele)
  const ENVELOPE = [[100, 456], [300, 389], [344, 522], [189, 594]];
  const PES = [520, 1520];
  const NS = 'http://www.w3.org/2000/svg';

  // poses: alvos dos ossos (graus e escala)
  const POSES = {
    repouso: { braco: 0, bracoEsc: 1, inclina: 0 },
    antecipar: { braco: 5, bracoEsc: .96, inclina: 1.2 },
    oferecer: { braco: -9, bracoEsc: 1.16, inclina: -2.2 },
    segurar: { braco: -3, bracoEsc: 1.05, inclina: -.8 },
  };

  let contador = 0;

  function el(nome, attrs, pai) {
    const e = document.createElementNS(NS, nome);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (pai) pai.appendChild(e);
    return e;
  }

  // mola amortecida: valor persegue o alvo com rigidez k e amortecimento d
  function mola(v, k = 120, d = 2 * Math.sqrt(120) * .9) { return { v, vel: 0, alvo: v, k, d }; }
  function passoMola(m, dt) {
    const a = m.k * (m.alvo - m.v) - m.d * m.vel;
    m.vel += a * dt;
    m.v += m.vel * dt;
  }

  function criar(container, { reduzido = () => false } = {}) {
    const id = `rig${++contador}`;
    const svg = el('svg', { viewBox: `0 0 ${LARGURA} ${ALTURA}`, class: 'rig', 'aria-hidden': 'true', overflow: 'visible' });
    const defs = el('defs', {}, svg);
    for (const nome in PECAS) {
      const c = el('clipPath', { id: `${id}-${nome}` }, defs);
      el('polygon', { points: PECAS[nome].pontos }, c);
    }
    const mascara = el('mask', { id: `${id}-corpo`, maskUnits: 'userSpaceOnUse', x: -50, y: -50, width: LARGURA + 100, height: ALTURA + 100 }, defs);
    el('rect', { x: -50, y: -50, width: LARGURA + 100, height: ALTURA + 100, fill: '#fff' }, mascara);
    for (const nome in PECAS) el('polygon', { points: PECAS[nome].pontos, fill: '#000' }, mascara);
    const desfoque = el('filter', { id: `${id}-sombra`, x: '-20%', y: '-200%', width: '140%', height: '500%' }, defs);
    el('feGaussianBlur', { stdDeviation: 14 }, desfoque);

    // sombra de contato sob os pés
    const sombra = el('ellipse', { cx: 520, cy: 1508, rx: 400, ry: 34, fill: 'rgba(5,6,12,.72)', filter: `url(#${id}-sombra)`, class: 'rig-sombra' }, svg);
    const corpo = el('g', { class: 'rig-corpo' }, svg);
    const imagem = (pai, extra) => el('image', { href: IMAGEM, width: LARGURA, height: ALTURA, ...extra }, pai);
    imagem(corpo, { mask: `url(#${id}-corpo)` });
    const gCabeca = el('g', {}, corpo);
    imagem(gCabeca, { 'clip-path': `url(#${id}-cabeca)` });
    const gPompom = el('g', {}, gCabeca);
    imagem(gPompom, { 'clip-path': `url(#${id}-pompom)` });
    const gBraco = el('g', {}, corpo);
    imagem(gBraco, { 'clip-path': `url(#${id}-braco)` });
    container.appendChild(svg);

    // ---------- estado dos ossos ----------
    const ossos = {
      cabeca: mola(0, 90, 15),
      braco: mola(0, 110, 17),
      bracoEsc: mola(1, 140, 19),
      inclina: mola(0, 60, 13),   // corpo inteiro levemente inclinado (a partir dos pés)
      respira: mola(1, 200, 26),
    };
    const pendulo = { a: 0, vel: 0 };
    let olharCabeca = 0, inclinaPose = 0, ultimaCabeca = 0, velCabecaAnt = 0;
    let t0 = performance.now(), ultimo = t0, raf = 0, ativo = true;

    function aplicar(t) {
      const [cx, cy] = PECAS.cabeca.pivo, [bx, by] = PECAS.braco.pivo, [px, py] = PECAS.pompom.pivo, [fx, fy] = PES;
      const r = ossos.respira.v;
      corpo.setAttribute('transform',
        `translate(${fx} ${fy}) rotate(${ossos.inclina.v}) scale(${2 - r} ${r}) translate(${-fx} ${-fy})`);
      gCabeca.setAttribute('transform', `rotate(${ossos.cabeca.v} ${cx} ${cy})`);
      gPompom.setAttribute('transform', `rotate(${pendulo.a} ${px} ${py})`);
      gBraco.setAttribute('transform',
        `translate(${bx} ${by}) rotate(${ossos.braco.v}) scale(${ossos.bracoEsc.v}) translate(${-bx} ${-by})`);
      sombra.setAttribute('rx', 400 + (ossos.inclina.v * 4));
    }

    function quadro(agora) {
      raf = 0;
      if (!ativo) return;
      const dt = Math.min(.05, (agora - ultimo) / 1000);
      ultimo = agora;
      const t = (agora - t0) / 1000;
      const calmo = reduzido();

      // movimento ocioso, cada parte num ritmo próprio
      const ocioso = calmo ? 0 : 1;
      ossos.respira.alvo = 1 + ocioso * .0075 * Math.sin(t * 2 * Math.PI / 3.7);
      ossos.cabeca.alvo = olharCabeca + ossos.inclina.v * -.4 + ocioso * .7 * Math.sin(t * 2 * Math.PI / 5.3 + 1);
      ossos.inclina.alvo = inclinaPose + ocioso * .35 * Math.sin(t * 2 * Math.PI / 7.9);

      if (calmo) {
        for (const k in ossos) { ossos[k].v = ossos[k].alvo; ossos[k].vel = 0; }
        pendulo.a = 0; pendulo.vel = 0;
      } else {
        for (const k in ossos) passoMola(ossos[k], dt);
        // pêndulo do pompom: puxado pela aceleração da cabeça e por um vento leve
        const velCabeca = (ossos.cabeca.v - ultimaCabeca) / Math.max(dt, 1e-3);
        const acelCabeca = (velCabeca - velCabecaAnt) / Math.max(dt, 1e-3);
        ultimaCabeca = ossos.cabeca.v; velCabecaAnt = velCabeca;
        const vento = 2.2 * Math.sin(t * .9) + 1.2 * Math.sin(t * 2.3 + 2);
        const acel = -38 * (pendulo.a - vento) - 2.6 * pendulo.vel - acelCabeca * .9;
        pendulo.vel += acel * dt;
        pendulo.a = Math.max(-14, Math.min(14, pendulo.a + pendulo.vel * dt));
      }
      aplicar(t);
      raf = requestAnimationFrame(quadro);
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
      // inclina a cabeça na direção de um ponto (a arte não tem olhos separados, então o "olhar" é a cabeça)
      olharPara(x, y) {
        const r = svg.getBoundingClientRect();
        if (!r.width) return;
        const nx = Math.max(-1, Math.min(1, (x - (r.left + r.width * .5)) / (innerWidth * .45)));
        const ny = Math.max(-1, Math.min(1, (y - (r.top + r.height * .25)) / (innerHeight * .6)));
        olharCabeca = nx * 4.5 + ny * nx * -1.2;
      },
      olharElemento(alvo) {
        const r = alvo.getBoundingClientRect();
        this.olharPara(r.left + r.width / 2, r.top + r.height / 2);
      },
      olharFrente() { olharCabeca = 0; },
      pose(nome) {
        const p = POSES[nome] || POSES.repouso;
        ossos.braco.alvo = p.braco;
        ossos.bracoEsc.alvo = p.bracoEsc;
        inclinaPose = p.inclina;
      },
      // pequeno impulso no corpo (surpresa, risadinha)
      sacudir(forca = 1) {
        if (reduzido()) return;
        ossos.respira.vel -= .35 * forca;
        ossos.cabeca.vel += 30 * forca;
        pendulo.vel += 60 * forca;
      },
      retanguloConvite() {
        const pts = ENVELOPE.map(([x, y]) => pontoNaTela(x, y));
        const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
        const left = Math.min(...xs), top = Math.min(...ys);
        return { left, top, width: Math.max(...xs) - left, height: Math.max(...ys) - top };
      },
      pontoCabeca() { return pontoNaTela(560, 330, gCabeca); },
      destruir() { ativo = false; cancelAnimationFrame(raf); svg.remove(); },
    };
  }

  return { criar };
})();

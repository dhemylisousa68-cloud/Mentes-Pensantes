// Mascote do Mentes Pensantes, montado em CAMADAS com os mesmos nomes de docs/mascote-camadas.md.
// Cada camada usa a imagem da arte original quando ela existe (js/mascote-imagens.js)
// e, enquanto não existe, um desenho provisório em vetor.
// Tela de referência: 600 × 690 unidades (equivale a 2000 × 2300 px nas imagens).
window.MP = window.MP || {};

MP.Mascote = (() => {
  let contador = 0;
  const L = 600, A = 690;
  const PIVO_CABECA = [300, 330];

  const CORPO = 'M120 64 L236 146 Q300 124 364 146 L480 64 Q470 190 474 300 L478 520 L386 520 L300 430 L214 520 L122 520 L126 300 Q130 190 120 64 Z';
  const OLHO_E = 'M182 274 Q184 236 232 236 Q284 238 288 280 Q284 316 236 318 Q184 316 182 274 Z';
  const OLHO_D = 'M418 274 Q416 236 368 236 Q316 238 312 280 Q316 316 364 318 Q416 316 418 274 Z';

  // ---------- auxiliares de desenho ----------
  function pelo(pontos, r) {
    const cs = [];
    for (let i = 0; i < pontos.length - 1; i++) {
      const [x1, y1] = pontos[i], [x2, y2] = pontos[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / (r * 0.9)));
      for (let k = 0; k < n; k++) cs.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
    }
    cs.push(pontos[pontos.length - 1]);
    const raio = (i) => r * (0.88 + 0.24 * (((i * 37) % 10) / 10));
    const f = (v) => v.toFixed(1);
    return `<g class="pelo">
      <g class="pelo-borda">${cs.map(([x, y], i) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(raio(i) + 5)}"/>`).join('')}</g>
      <g class="pelo-miolo">${cs.map(([x, y], i) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(raio(i))}"/>`).join('')}</g>
      <g class="pelo-sombra">${cs.map(([x, y], i) => `<circle cx="${f(x + 4)}" cy="${f(y + 5)}" r="${f(raio(i) * 0.5)}"/>`).join('')}</g>
    </g>`;
  }
  function luva(x, y, rot = 0, s = 1) {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <path class="c-creme contorno-fino" d="M-34 -8 Q-38 -40 -8 -42 L24 -40 Q44 -36 42 -10 Q42 24 14 32 L-12 32 Q-36 28 -34 -8 Z"/>
      <path class="c-creme contorno-fino" d="M-32 2 Q-50 8 -42 26 Q-32 34 -20 24 Z"/>
      <path class="traco-contorno" d="M-20 -24 Q0 -20 22 -24 M-22 -8 Q0 -4 24 -8 M-20 8 Q0 12 22 8"/>
    </g>`;
  }
  function maoAberta(x, y, rot = 0) {
    return `<g transform="translate(${x} ${y}) rotate(${rot})">
      <path class="c-creme contorno-fino" d="M-30 -6 Q-32 -30 -6 -30 L34 -28 Q46 -26 44 -16 Q42 -8 30 -8 L44 -6 Q52 -2 48 8 Q44 14 34 12 L42 16 Q48 22 42 28 Q36 32 28 28 Q14 34 -6 32 Q-30 30 -30 -6 Z"/>
      <path class="traco-contorno" d="M10 -10 L30 -10 M10 4 L34 6 M8 18 L30 20"/>
    </g>`;
  }
  const manga = (d, cor) => `<path class="manga-contorno" d="${d}"/><path class="manga ${cor}" d="${d}"/>`;

  // ---------- desenhos provisórios de cada camada ----------
  const VETOR = (id) => ({
    'cabeca': `
      <path class="c-corpo contorno" d="${CORPO}"/>
      <g clip-path="url(#${id}-clip-corpo)">
        <path class="c-corpo-claro" d="M120 64 L236 146 L206 300 L120 300 Z" opacity=".55"/>
        <path class="c-corpo-escuro" d="M364 146 L480 64 L490 540 L414 540 L400 300 Z" opacity=".6"/>
      </g>
      <path class="interrogacao-borda" d="M214 178 C198 70, 392 50, 398 150 C402 216, 300 206, 300 262 L300 292"/>
      <path class="interrogacao" d="M214 178 C198 70, 392 50, 398 150 C402 216, 300 206, 300 262 L300 292"/>
      <path class="interrogacao-sombra" d="M372 112 C392 150, 380 190, 326 214 M318 236 L318 288"/>
      <path class="interrogacao-brilho" d="M232 150 C236 104, 300 84, 346 96"/>`,

    'tronco-detetive': `
      <rect class="c-corpo contorno" x="226" y="496" width="40" height="104" rx="8"/>
      <rect class="c-corpo contorno" x="334" y="496" width="40" height="104" rx="8"/>
      <path class="c-roxo contorno" d="M200 600 L272 600 L278 656 L148 656 Q144 628 176 618 L200 612 Z"/>
      <rect class="c-roxo-escuro contorno-fino" x="206" y="584" width="68" height="24" rx="6"/>
      <path class="c-lima" d="M168 632 L192 620 L188 632 L206 628 L180 642 L184 632 Z"/>
      <path class="traco-creme" d="M214 616 l40 10 M214 630 l40 -10"/>
      <rect class="c-lima contorno" x="138" y="650" width="150" height="22" rx="9"/>
      <path class="c-roxo contorno" d="M400 600 L328 600 L322 656 L452 656 Q456 628 424 618 L400 612 Z"/>
      <rect class="c-roxo-escuro contorno-fino" x="326" y="584" width="68" height="24" rx="6"/>
      <path class="c-lima" d="M432 632 L408 620 L412 632 L394 628 L420 642 L416 632 Z"/>
      <path class="traco-creme" d="M386 616 l-40 10 M386 630 l-40 -10"/>
      <rect class="c-lima contorno" x="312" y="650" width="150" height="22" rx="9"/>
      <path class="c-roxo contorno" d="M130 300 L58 258 L90 330 L48 364 L128 420 Z"/>
      <path class="c-roxo-escuro" d="M128 318 L90 330 L48 364 L126 396 Z" opacity=".6"/>
      <path class="c-roxo contorno" d="M470 300 L542 258 L510 330 L552 364 L472 420 Z"/>
      <path class="c-roxo-escuro" d="M472 318 L510 330 L552 364 L474 396 Z" opacity=".6"/>
      <g clip-path="url(#${id}-clip-abaixo)">
        <path class="c-corpo contorno" d="${CORPO}"/>
        <path class="c-corpo-escuro" d="M414 300 L480 300 L490 540 L420 540 Z" opacity=".6"/>
        <path class="c-corpo-escuro" d="M214 520 L300 430 L386 520 L300 470 Z" opacity=".5"/>
      </g>
      <path class="c-roxo" d="M300 430 L262 470 L300 452 L338 470 Z" opacity=".85"/>
      <circle class="c-lima contorno-fino" cx="168" cy="468" r="11"/><circle class="brilho-botao" cx="164" cy="464" r="3"/>
      <circle class="c-lima contorno-fino" cx="432" cy="468" r="11"/><circle class="brilho-botao" cx="428" cy="464" r="3"/>`,

    'tronco-natal': `
      <rect class="c-corpo contorno" x="226" y="496" width="40" height="104" rx="8"/>
      <rect class="c-corpo contorno" x="334" y="496" width="40" height="104" rx="8"/>
      <path class="c-vermelho contorno" d="M198 590 L274 590 L280 656 L146 656 Q142 626 176 618 L198 614 Z"/>
      <path class="traco-creme" d="M208 612 l42 10 M208 628 l42 -10"/>
      <rect class="c-lima contorno" x="136" y="650" width="152" height="22" rx="9"/>
      ${pelo([[194, 592], [282, 592]], 15)}
      <path class="c-vermelho contorno" d="M402 590 L326 590 L320 656 L454 656 Q458 626 424 618 L402 614 Z"/>
      <path class="traco-creme" d="M392 612 l-42 10 M392 628 l-42 -10"/>
      <rect class="c-lima contorno" x="312" y="650" width="152" height="22" rx="9"/>
      ${pelo([[318, 592], [406, 592]], 15)}
      <path class="c-vermelho contorno" d="M110 312 Q160 298 186 314 L300 452 L414 314 Q440 298 490 312 L488 544 L386 544 L300 474 L214 544 L112 544 Z"/>
      <path class="c-vermelho-escuro" d="M420 300 Q456 298 490 312 L488 544 L430 544 Z" opacity=".5"/>
      <rect class="c-preto contorno-fino" x="114" y="444" width="372" height="30"/>
      <g class="c-dourado"><circle cx="148" cy="459" r="3"/><circle cx="178" cy="459" r="3"/><circle cx="422" cy="459" r="3"/><circle cx="452" cy="459" r="3"/></g>
      <rect class="fivela" x="264" y="432" width="72" height="54" rx="9"/>
      <rect class="c-dourado" x="296" y="446" width="8" height="26" rx="3"/>
      <circle class="c-dourado contorno-fino" cx="166" cy="504" r="11"/>
      <circle class="c-dourado contorno-fino" cx="434" cy="504" r="11"/>
      ${pelo([[114, 540], [214, 540], [300, 472], [386, 540], [486, 540]], 16)}
      ${pelo([[104, 318], [150, 304], [186, 318], [244, 388], [296, 446]], 16)}
      ${pelo([[496, 318], [450, 304], [414, 318], [356, 388], [304, 446]], 16)}`,

    'olho-esq': `<path class="c-olho" d="${OLHO_E}"/>`,
    'olho-dir': `<path class="c-olho" d="${OLHO_D}"/>`,
    'pupila-esq': `<circle class="c-pupila" cx="244" cy="286" r="15"/><circle class="c-olho" cx="249" cy="281" r="4"/>`,
    'pupila-dir': `<circle class="c-pupila" cx="356" cy="286" r="15"/><circle class="c-olho" cx="361" cy="281" r="4"/>`,
    'palpebra-esq': `<g transform="rotate(16 236 276)"><rect class="c-corpo" x="140" y="140" width="200" height="122"/></g>`,
    'palpebra-dir': `<g transform="rotate(-16 364 276)"><rect class="c-corpo" x="260" y="140" width="200" height="122"/></g>`,
    'sobrancelha-esq': `<path class="c-creme contorno-fino" d="M164 212 L290 244 L283 270 L170 240 Q156 226 164 212 Z"/>`,
    'sobrancelha-dir': `<path class="c-creme contorno-fino" d="M446 222 Q446 196 420 188 Q388 180 360 204 Q332 228 310 250 L322 270 Q350 240 378 222 Q400 210 418 220 Q428 228 426 238 Q440 240 446 222 Z"/>`,

    'boca-detetive': `<path class="traco-boca" d="M332 360 Q368 374 398 342"/>`,
    'boca-malicioso': `
      <path class="c-pupila contorno" d="M194 320 Q300 438 406 320 Q300 362 194 320 Z"/>
      <path class="c-creme" d="M212 332 Q300 384 388 332 L378 356 Q300 410 222 356 Z"/>
      <path class="dentes" d="M240 344 v22 M268 354 v24 M300 358 v26 M332 354 v24 M360 344 v22"/>
      <path class="vinco" d="M184 312 Q196 326 190 342 M416 312 Q404 326 410 342"/>`,
    'boca-inocente': `<path class="traco-boca" d="M262 360 Q300 394 338 360"/><path class="vinco" d="M254 352 Q258 362 256 370 M346 352 Q342 362 344 370"/>`,
    'boca-surpresa': `<ellipse class="c-pupila contorno-fino" cx="300" cy="366" rx="14" ry="17"/>`,

    'gorro': `
      <path class="c-vermelho contorno" d="M206 148 Q250 36 380 26 Q512 18 560 166 L526 182 Q490 90 392 80 Q298 86 258 150 Z"/>
      <path class="c-vermelho-escuro" d="M400 34 Q512 26 560 166 L536 176 Q500 76 400 64 Z" opacity=".45"/>
      ${pelo([[190, 156], [262, 118], [342, 98], [424, 94], [488, 108]], 24)}
      ${pelo([[532, 186], [566, 200]], 26)}`,
    'gorro-cobrindo': `
      <path class="c-vermelho contorno" d="M150 262 Q170 104 320 96 Q470 92 548 236 L516 252 Q462 150 332 146 Q226 152 196 268 Z"/>
      <path class="c-vermelho-escuro" d="M360 98 Q470 96 548 236 L524 246 Q466 132 360 130 Z" opacity=".45"/>
      ${pelo([[146, 288], [224, 272], [300, 268], [376, 272], [454, 288]], 28)}
      ${pelo([[530, 258], [560, 280]], 26)}`,

    'bracos-puxando-gorro': `
      ${manga('M128 340 Q92 300 146 270', 'c-corpo-s')}
      ${manga('M472 340 Q508 300 454 270', 'c-corpo-s')}
      <rect class="c-roxo contorno-fino" x="124" y="270" width="34" height="24" rx="8" transform="rotate(-40 141 282)"/>
      <rect class="c-roxo contorno-fino" x="442" y="270" width="34" height="24" rx="8" transform="rotate(40 459 282)"/>
      ${luva(160, 272, -70, 0.95)}${luva(440, 272, 70, 0.95)}`,
    'bracos-puxando-gorro-natal': `
      ${manga('M128 340 Q92 300 146 270', 'c-vermelho-s')}
      ${manga('M472 340 Q508 300 454 270', 'c-vermelho-s')}
      ${pelo([[132, 296], [156, 270]], 14)}${pelo([[468, 296], [444, 270]], 14)}
      ${luva(160, 272, -70, 0.95)}${luva(440, 272, 70, 0.95)}`,

    'braco-esq-queixo': `
      ${manga('M128 336 Q100 432 204 418 Q240 412 254 392', 'c-corpo-s')}
      <rect class="c-roxo contorno-fino" x="226" y="386" width="34" height="26" rx="8" transform="rotate(-50 243 399)"/>
      <path class="c-creme contorno-fino" d="M262 362 L284 318 Q292 306 302 314 Q306 322 298 334 L282 372 Z"/>
      ${luva(266, 386, -30, 0.95)}`,
    'braco-dir-caderno': `
      ${manga('M472 336 Q536 414 488 468', 'c-corpo-s')}
      <g transform="translate(414 378) rotate(10)">
        <rect class="c-roxo contorno" x="0" y="0" width="94" height="118" rx="8"/>
        <rect class="c-roxo-escuro" x="6" y="8" width="12" height="104" opacity=".6"/>
        <rect class="c-lima contorno-fino" x="78" y="4" width="12" height="110" rx="3"/>
        <circle class="lupa" cx="44" cy="56" r="18"/><path class="lupa" d="M57 69 L72 86"/>
        <g class="c-creme contorno-fino"><circle cx="22" cy="0" r="7"/><circle cx="44" cy="0" r="7"/><circle cx="66" cy="0" r="7"/></g>
      </g>
      <rect class="c-roxo contorno-fino" x="466" y="448" width="38" height="26" rx="8" transform="rotate(30 485 461)"/>
      ${luva(478, 488, 10, 1)}`,
    'braco-esq-cintura': `
      ${manga('M128 336 Q48 404 104 462 Q124 480 150 476', 'c-vermelho-s')}
      ${pelo([[120, 456], [146, 488]], 15)}
      ${luva(162, 476, -20, 1)}`,
    'braco-dir-faca': `
      ${manga('M472 336 Q562 352 548 256', 'c-vermelho-s')}
      ${pelo([[522, 270], [572, 264]], 16)}
      <path class="lamina" d="M530 258 L568 258 L562 392 Q554 420 540 438 Q532 392 530 258 Z"/>
      <path class="lamina-brilho" d="M540 270 L542 400"/>
      <rect class="c-cinza contorno-fino" x="520" y="246" width="58" height="14" rx="4"/>
      <rect class="cabo contorno-fino" x="536" y="142" width="28" height="66" rx="8"/>
      <g class="c-dourado"><circle cx="550" cy="160" r="3.5"/><circle cx="550" cy="186" r="3.5"/></g>
      ${luva(550, 222, 0, 1.05)}`,
    'braco-dir-atras': `${manga('M472 340 Q548 404 494 462', 'c-vermelho-s')}`,
    'braco-dir-convite': `
      ${manga('M472 336 Q540 430 440 430', 'c-vermelho-s')}
      ${pelo([[450, 410], [446, 452]], 14)}
      ${maoAberta(408, 432, -6)}`,
    'convite': `
      <g transform="translate(332 388) rotate(-8)">
        <rect class="c-convite contorno" x="0" y="0" width="150" height="98" rx="8"/>
        <path class="dobra" d="M0 4 L75 58 L150 4"/>
        <circle class="c-dourado contorno-fino" cx="75" cy="58" r="21"/>
        <circle class="selo-anel" cx="75" cy="58" r="14"/>
        <text class="selo-texto" x="75" y="66" text-anchor="middle">?</text>
      </g>`,
  });

  function svg(id) {
    const imgs = MP.IMAGENS_MASCOTE || {};
    const v = VETOR(id);
    const c = (nome, extra = '') => `<g class="camada camada-${nome}" data-camada="${nome}" ${extra}>${
      imgs[nome] ? `<image href="${imgs[nome]}" x="0" y="0" width="${L}" height="${A}"/>` : v[nome]}</g>`;
    // máscara do olho: usa a transparência da imagem do olho (ou o formato em vetor)
    const mascara = (nome, d) => imgs[nome]
      ? `<image href="${imgs[nome]}" x="0" y="0" width="${L}" height="${A}"/>`
      : `<path d="${d}" fill="#fff"/>`;

    return `
<svg class="mascote" viewBox="0 0 ${L} ${A}" role="img" aria-label="Mascote do Mentes Pensantes">
  <defs>
    <filter id="${id}-adesivo" x="-12%" y="-12%" width="124%" height="124%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="d"/>
      <feFlood class="adesivo-cor"/>
      <feComposite in2="d" operator="in" result="borda"/>
      <feMerge><feMergeNode in="borda"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="${id}-clip-corpo"><path d="${CORPO}"/></clipPath>
    <clipPath id="${id}-clip-abaixo"><rect x="0" y="312" width="${L}" height="${A}"/></clipPath>
    <mask id="${id}-m-olho-e" style="mask-type:alpha">${mascara('olho-esq', OLHO_E)}</mask>
    <mask id="${id}-m-olho-d" style="mask-type:alpha">${mascara('olho-dir', OLHO_D)}</mask>
  </defs>

  <ellipse class="sombra-chao" cx="300" cy="670" rx="210" ry="14"/>

  <g class="figura" filter="url(#${id}-adesivo)">
   <g class="balanco">
    ${c('braco-dir-atras')}
    <g class="gira-cabeca">${c('cabeca')}</g>
    ${c('tronco-detetive')}
    ${c('tronco-natal')}
    <g class="gira-cabeca rosto">
      <g class="olho olho-e">
        ${c('olho-esq')}
        <g mask="url(#${id}-m-olho-e)">
          <g class="pupila">${c('pupila-esq')}</g>
          <g class="palpebra">${c('palpebra-esq')}</g>
        </g>
        ${imgs['olho-esq'] ? '' : `<path class="contorno-olho" d="${OLHO_E}"/>`}
      </g>
      <g class="olho olho-d">
        ${c('olho-dir')}
        <g mask="url(#${id}-m-olho-d)">
          <g class="pupila">${c('pupila-dir')}</g>
          <g class="palpebra">${c('palpebra-dir')}</g>
        </g>
        ${imgs['olho-dir'] ? '' : `<path class="contorno-olho" d="${OLHO_D}"/>`}
      </g>
      <g class="sobrancelha sobrancelha-e">${c('sobrancelha-esq')}</g>
      <g class="sobrancelha sobrancelha-d">${c('sobrancelha-dir')}</g>
      ${c('boca-detetive')}
      ${c('boca-malicioso')}
      ${c('boca-inocente')}
      ${c('boca-surpresa')}
      ${c('gorro')}
      ${c('gorro-cobrindo')}
    </g>
    ${c('braco-esq-queixo')}
    ${c('braco-dir-caderno')}
    ${c('braco-esq-cintura')}
    ${c('braco-dir-faca')}
    ${c('braco-dir-convite')}
    ${c('convite')}
    ${c('bracos-puxando-gorro')}
    ${c('bracos-puxando-gorro-natal')}
   </g>
  </g>
  <path class="brilho" d="M456 214 l8 -22 l8 22 l22 8 l-22 8 l-8 22 l-8 -22 l-22 -8 z"/>
</svg>`;
  }

  // ---------- controle ----------
  function criar(container, opcoes = {}) {
    const id = 'mp' + (++contador);
    container.innerHTML = svg(id);
    const raiz = container.querySelector('svg');
    const pupilas = [...raiz.querySelectorAll('.pupila')];
    const camadas = {};
    raiz.querySelectorAll('[data-camada]').forEach((g) => { camadas[g.dataset.camada] = g; });
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

    const estado = { roupa: 'detetive', pose: 'detetive', gorro: 'nenhum', expressao: 'neutra' };
    let livre = true;
    let cabecaSegue = true;
    let timerCabeca = null;

    const SEMPRE = ['cabeca', 'olho-esq', 'olho-dir', 'pupila-esq', 'pupila-dir', 'palpebra-esq', 'palpebra-dir', 'sobrancelha-esq', 'sobrancelha-dir'];

    function atualizar() {
      const vis = new Set(SEMPRE);
      vis.add('tronco-' + estado.roupa);
      const natal = estado.roupa === 'natal';
      switch (estado.pose) {
        case 'detetive': vis.add('braco-esq-queixo'); vis.add('braco-dir-caderno'); break;
        case 'faca': vis.add('braco-esq-cintura'); vis.add('braco-dir-faca'); break;
        case 'atras': vis.add('braco-esq-cintura'); vis.add('braco-dir-atras'); break;
        case 'convite': vis.add('braco-esq-cintura'); vis.add('braco-dir-convite'); vis.add('convite'); break;
        case 'puxando': vis.add(natal ? 'bracos-puxando-gorro-natal' : 'bracos-puxando-gorro'); break;
        default: break;
      }
      if (estado.gorro === 'normal') vis.add('gorro');
      if (estado.gorro === 'cobrindo') vis.add('gorro-cobrindo');
      const boca = {
        malicioso: 'boca-malicioso', inocente: 'boca-inocente', surpresa: 'boca-surpresa',
        piscadela: natal ? 'boca-malicioso' : 'boca-detetive', neutra: natal ? 'boca-malicioso' : null,
      }[estado.expressao];
      if (boca) vis.add(boca);
      Object.entries(camadas).forEach(([nome, g]) => g.classList.toggle('visivel', vis.has(nome)));
      ['neutra', 'piscadela', 'malicioso', 'inocente', 'surpresa'].forEach((e) => raiz.classList.toggle('expr-' + e, estado.expressao === e));
    }

    function definir(parcial) { Object.assign(estado, parcial); atualizar(); }

    // ----- olhar e cabeça -----
    function moverPupilas(dx, dy) { pupilas.forEach((p) => { p.style.transform = `translate(${dx}px, ${dy}px)`; }); }
    function moverCabeca(nx, ny, forca = 1) {
      raiz.style.setProperty('--cab-r', `${(nx * 6 * forca).toFixed(2)}deg`);
      raiz.style.setProperty('--cab-x', `${(nx * 8 * forca).toFixed(1)}px`);
      raiz.style.setProperty('--cab-y', `${(ny * 5 * forca).toFixed(1)}px`);
    }
    function direcaoDe(x, y) {
      const m = raiz.getScreenCTM();
      if (!m) return [0, 0, 0];
      const p = raiz.createSVGPoint();
      p.x = 300; p.y = 286;
      const t = p.matrixTransform(m);
      const vx = x - t.x, vy = y - t.y;
      const d = Math.hypot(vx, vy) || 1;
      return [vx / d, vy / d, Math.min(1, d / 260)];
    }
    // Olhos primeiro; a cabeça acompanha um instante depois.
    function olhar(nx, ny, { forca = 1, cabeca = cabecaSegue, atraso = 180, forcaCabeca = 1 } = {}) {
      moverPupilas(nx * 13 * forca, ny * 9 * forca);
      clearTimeout(timerCabeca);
      if (cabeca) timerCabeca = setTimeout(() => moverCabeca(nx, ny, forcaCabeca), atraso);
    }
    function olharPara(x, y) {
      if (!livre) return;
      const [nx, ny, f] = direcaoDe(x, y);
      olhar(nx, ny, { forca: f, forcaCabeca: 0.45 * f, atraso: 260 });
    }
    function olharElemento(el, opcoes) {
      const r = el.getBoundingClientRect();
      const [nx, ny] = direcaoDe(r.left + r.width / 2, r.top + r.height / 2);
      olhar(nx, ny, opcoes);
    }
    function olharDirecao(dx, dy, opcoes) { olhar(dx, dy, opcoes); }

    // ----- piscar e espera -----
    function piscar() {
      raiz.classList.add('piscar');
      setTimeout(() => raiz.classList.remove('piscar'), 150);
    }
    (function piscarSozinho() {
      setTimeout(() => {
        if (estado.gorro !== 'cobrindo' && estado.expressao !== 'piscadela') piscar();
        piscarSozinho();
      }, 2800 + Math.random() * 3600);
    })();

    async function piscadela() {
      livre = false;
      moverPupilas(0, 0);
      definir({ expressao: 'piscadela' });
      await esperar(1100);
      definir({ expressao: 'neutra' });
      livre = true;
    }

    function sobrancelha(erguida) { raiz.classList.toggle('sobrancelha-erguida', erguida); }
    function setSombra(v) { raiz.classList.toggle('sombra', v); }
    function retanguloConvite() { return camadas.convite.getBoundingClientRect(); }

    // compatibilidade: troca direta de roupa
    async function vestir(roupa) {
      definir({ roupa, pose: roupa === 'natal' ? 'atras' : 'detetive', gorro: roupa === 'natal' ? 'normal' : 'nenhum' });
    }

    if (opcoes.sombra) {
      raiz.classList.add('sombra', 'sem-transicao');
      requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('sem-transicao')));
    }
    moverCabeca(0, 0);
    atualizar();

    return {
      elemento: raiz,
      definir, olhar, olharPara, olharElemento, olharDirecao, piscar, piscadela, sobrancelha,
      setSombra, retanguloConvite, vestir,
      expressao: (e) => definir({ expressao: e }),
      pose: (p) => definir({ pose: p }),
      gorro: (g) => definir({ gorro: g }),
      roupa: (r) => definir({ roupa: r }),
      get estado() { return { ...estado }; },
      set livre(v) { livre = v; },
      get livre() { return livre; },
      set cabecaSegue(v) { cabecaSegue = v; if (!v) moverCabeca(0, 0); },
    };
  }

  return { criar };
})();

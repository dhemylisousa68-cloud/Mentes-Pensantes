// Mascote do Mentes Pensantes em vetor, com camadas separadas para animar:
// olhos (pupilas e pálpebras), sobrancelhas, bocas, braços em poses, faca e convite.
window.MP = window.MP || {};

MP.Mascote = (() => {
  let contador = 0;

  const OLHO_E = 'M182 274 Q184 236 232 236 Q284 238 288 280 Q284 316 236 318 Q184 316 182 274 Z';
  const OLHO_D = 'M418 274 Q416 236 368 236 Q316 238 312 280 Q316 316 364 318 Q416 316 418 274 Z';
  const PUPILA_E = [244, 286];
  const PUPILA_D = [356, 286];

  // Pelúcia: círculos ao longo de uma linha, com contorno só por fora.
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

  // Luva de desenho animado (punho fechado)
  function luva(x, y, rot = 0, s = 1) {
    return `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">
      <path class="c-creme contorno-fino" d="M-34 -8 Q-38 -40 -8 -42 L24 -40 Q44 -36 42 -10 Q42 24 14 32 L-12 32 Q-36 28 -34 -8 Z"/>
      <path class="c-creme contorno-fino" d="M-32 2 Q-50 8 -42 26 Q-32 34 -20 24 Z"/>
      <path class="traco-contorno" d="M-20 -24 Q0 -20 22 -24 M-22 -8 Q0 -4 24 -8 M-20 8 Q0 12 22 8"/>
    </g>`;
  }

  function manga(d, classe) {
    return `<path class="manga-contorno" d="${d}"/><path class="manga ${classe}" d="${d}"/>`;
  }

  function svg(id) {
    return `
<svg class="mascote" viewBox="0 0 600 690" role="img" aria-label="Mascote do Mentes Pensantes">
  <defs>
    <filter id="${id}-adesivo" x="-12%" y="-12%" width="124%" height="124%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="9" result="d"/>
      <feFlood class="adesivo-cor"/>
      <feComposite in2="d" operator="in" result="borda"/>
      <feMerge><feMergeNode in="borda"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="${id}-clip-e"><path d="${OLHO_E}"/></clipPath>
    <clipPath id="${id}-clip-d"><path d="${OLHO_D}"/></clipPath>
    <clipPath id="${id}-clip-corpo"><path d="M120 64 L236 146 Q300 124 364 146 L480 64 Q470 190 474 300 L478 520 L386 520 L300 430 L214 520 L122 520 L126 300 Q130 190 120 64 Z"/></clipPath>
  </defs>

  <ellipse class="sombra-chao" cx="300" cy="670" rx="210" ry="14"/>

  <g class="figura" filter="url(#${id}-adesivo)">
   <g class="balanco">

    <!-- braço escondido atrás das costas (Natal) -->
    <g class="so-natal br br-atras">${manga('M472 340 Q548 404 494 462', 'c-vermelho-s')}</g>

    <!-- lapelas pontudas do detetive (atrás do corpo) -->
    <g class="so-detetive">
      <path class="c-roxo contorno" d="M146 296 L58 258 L90 330 L48 364 L140 410 Z"/>
      <path class="c-roxo-escuro" d="M140 316 L90 330 L48 364 L136 392 Z" opacity=".6"/>
      <path class="c-roxo contorno" d="M454 296 L542 258 L510 330 L552 364 L460 410 Z"/>
      <path class="c-roxo-escuro" d="M460 316 L510 330 L552 364 L464 392 Z" opacity=".6"/>
    </g>

    <!-- pernas -->
    <rect class="c-corpo contorno" x="226" y="496" width="40" height="104" rx="8"/>
    <rect class="c-corpo contorno" x="334" y="496" width="40" height="104" rx="8"/>

    <!-- tênis do detetive -->
    <g class="so-detetive">
      <path class="c-roxo contorno" d="M200 600 L272 600 L278 656 L148 656 Q144 628 176 618 L200 612 Z"/>
      <rect class="c-roxo-escuro contorno-fino" x="206" y="584" width="68" height="24" rx="6"/>
      <path class="c-lima" d="M168 632 L192 620 L188 632 L206 628 L180 642 L184 632 Z"/>
      <path class="traco-creme" d="M214 616 l40 10 M214 630 l40 -10"/>
      <rect class="c-lima contorno" x="138" y="650" width="150" height="22" rx="9"/>
      <path class="c-lima-escuro-s" d="M156 664 h12 M182 664 h12 M208 664 h12 M234 664 h12 M260 664 h12"/>
      <path class="c-roxo contorno" d="M400 600 L328 600 L322 656 L452 656 Q456 628 424 618 L400 612 Z"/>
      <rect class="c-roxo-escuro contorno-fino" x="326" y="584" width="68" height="24" rx="6"/>
      <path class="c-lima" d="M432 632 L408 620 L412 632 L394 628 L420 642 L416 632 Z"/>
      <path class="traco-creme" d="M386 616 l-40 10 M386 630 l-40 -10"/>
      <rect class="c-lima contorno" x="312" y="650" width="150" height="22" rx="9"/>
      <path class="c-lima-escuro-s" d="M328 664 h12 M354 664 h12 M380 664 h12 M406 664 h12 M432 664 h12"/>
    </g>

    <!-- botas de Natal -->
    <g class="so-natal">
      <path class="c-vermelho contorno" d="M198 590 L274 590 L280 656 L146 656 Q142 626 176 618 L198 614 Z"/>
      <path class="c-vermelho-escuro" d="M248 598 L274 590 L280 656 L252 656 Z" opacity=".5"/>
      <path class="traco-creme" d="M208 612 l42 10 M208 628 l42 -10"/>
      <g class="c-dourado"><circle cx="206" cy="612" r="3.5"/><circle cx="252" cy="622" r="3.5"/><circle cx="206" cy="628" r="3.5"/></g>
      <rect class="c-lima contorno" x="136" y="650" width="152" height="22" rx="9"/>
      ${pelo([[194, 592], [282, 592]], 15)}
      <path class="c-vermelho contorno" d="M402 590 L326 590 L320 656 L454 656 Q458 626 424 618 L402 614 Z"/>
      <path class="traco-creme" d="M392 612 l-42 10 M392 628 l-42 -10"/>
      <g class="c-dourado"><circle cx="394" cy="612" r="3.5"/><circle cx="348" cy="622" r="3.5"/><circle cx="394" cy="628" r="3.5"/></g>
      <rect class="c-lima contorno" x="312" y="650" width="152" height="22" rx="9"/>
      ${pelo([[318, 592], [406, 592]], 15)}
    </g>

    <!-- corpo em M -->
    <path class="c-corpo contorno" d="M120 64 L236 146 Q300 124 364 146 L480 64 Q470 190 474 300 L478 520 L386 520 L300 430 L214 520 L122 520 L126 300 Q130 190 120 64 Z"/>
    <g clip-path="url(#${id}-clip-corpo)">
      <path class="c-corpo-claro" d="M120 64 L236 146 L206 300 L120 300 Z" opacity=".55"/>
      <path class="c-corpo-escuro" d="M364 146 L480 64 L490 540 L414 540 L400 300 Z" opacity=".6"/>
      <path class="c-corpo-escuro" d="M214 520 L300 430 L386 520 L300 470 Z" opacity=".5"/>
    </g>
    <g class="so-detetive">
      <path class="c-roxo" d="M300 430 L262 470 L300 452 L338 470 Z" opacity=".85"/>
      <circle class="c-lima contorno-fino" cx="168" cy="468" r="11"/><circle class="brilho-botao" cx="164" cy="464" r="3"/>
      <circle class="c-lima contorno-fino" cx="432" cy="468" r="11"/><circle class="brilho-botao" cx="428" cy="464" r="3"/>
    </g>

    <!-- casaco de Papai Noel -->
    <g class="so-natal">
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
      ${pelo([[496, 318], [450, 304], [414, 318], [356, 388], [304, 446]], 16)}
    </g>

    <!-- ponto de interrogação -->
    <path class="interrogacao-borda" d="M214 178 C198 70, 392 50, 398 150 C402 216, 300 206, 300 262 L300 292"/>
    <path class="interrogacao" d="M214 178 C198 70, 392 50, 398 150 C402 216, 300 206, 300 262 L300 292"/>
    <path class="interrogacao-sombra" d="M372 112 C392 150, 380 190, 326 214 M318 236 L318 288"/>
    <path class="interrogacao-brilho" d="M232 150 C236 104, 300 84, 346 96"/>
    <rect class="c-lima contorno so-detetive ponto" x="278" y="306" width="44" height="40" rx="8"/>

    <!-- rosto -->
    <g class="rosto">
      <g class="olho olho-e">
        <path class="c-olho" d="${OLHO_E}"/>
        <g clip-path="url(#${id}-clip-e)">
          <g class="pupila"><circle class="c-pupila" cx="${PUPILA_E[0]}" cy="${PUPILA_E[1]}" r="15"/><circle class="c-olho" cx="${PUPILA_E[0] + 5}" cy="${PUPILA_E[1] - 5}" r="4"/></g>
          <g transform="rotate(16 236 276)"><rect class="palpebra c-corpo" x="140" y="140" width="200" height="122"/></g>
        </g>
        <path class="contorno-olho" d="${OLHO_E}"/>
      </g>
      <g class="olho olho-d">
        <path class="c-olho" d="${OLHO_D}"/>
        <g clip-path="url(#${id}-clip-d)">
          <g class="pupila"><circle class="c-pupila" cx="${PUPILA_D[0]}" cy="${PUPILA_D[1]}" r="15"/><circle class="c-olho" cx="${PUPILA_D[0] + 5}" cy="${PUPILA_D[1] - 5}" r="4"/></g>
          <g transform="rotate(-16 364 276)"><rect class="palpebra c-corpo" x="260" y="140" width="200" height="122"/></g>
        </g>
        <path class="contorno-olho" d="${OLHO_D}"/>
      </g>

      <g class="sobrancelha sobrancelha-e"><path class="c-creme contorno-fino" d="M164 212 L290 244 L283 270 L170 240 Q156 226 164 212 Z"/></g>
      <g class="sobrancelha sobrancelha-d"><path class="c-creme contorno-fino" d="M446 222 Q446 196 420 188 Q388 180 360 204 Q332 228 310 250 L322 270 Q350 240 378 222 Q400 210 418 220 Q428 228 426 238 Q440 240 446 222 Z"/></g>

      <path class="boca boca-sorriso" d="M332 360 Q368 374 398 342"/>
      <path class="boca boca-inocente" d="M266 362 Q300 392 334 362"/>
      <g class="boca boca-shh"><ellipse class="c-pupila contorno-fino" cx="300" cy="362" rx="13" ry="15"/></g>
      <g class="boca boca-risada">
        <path class="c-pupila contorno" d="M194 320 Q300 438 406 320 Q300 362 194 320 Z"/>
        <path class="c-creme" d="M212 332 Q300 384 388 332 L378 356 Q300 410 222 356 Z"/>
        <path class="dentes" d="M240 344 v22 M268 354 v24 M300 358 v26 M332 354 v24 M360 344 v22"/>
        <path class="vinco" d="M184 312 Q196 326 190 342 M416 312 Q404 326 410 342"/>
      </g>
    </g>

    <!-- gorro de Papai Noel -->
    <g class="so-natal gorro">
      <path class="c-vermelho contorno" d="M206 148 Q250 36 380 26 Q512 18 560 166 L526 182 Q490 90 392 80 Q298 86 258 150 Z"/>
      <path class="c-vermelho-escuro" d="M400 34 Q512 26 560 166 L536 176 Q500 76 400 64 Z" opacity=".45"/>
      ${pelo([[190, 156], [262, 118], [342, 98], [424, 94], [488, 108]], 24)}
      ${pelo([[532, 186], [566, 200]], 26)}
    </g>

    <!-- braços do detetive -->
    <g class="so-detetive">
      ${manga('M128 336 Q100 432 204 418 Q240 412 254 392', 'c-corpo-s')}
      <rect class="c-roxo contorno-fino" x="226" y="386" width="34" height="26" rx="8" transform="rotate(-50 243 399)"/>
      <path class="c-creme contorno-fino" d="M262 362 L284 318 Q292 306 302 314 Q306 322 298 334 L282 372 Z"/>
      ${luva(266, 386, -30, 0.95)}
      ${manga('M472 336 Q536 414 488 468', 'c-corpo-s')}
      <g transform="translate(414 378) rotate(10)">
        <rect class="c-roxo contorno" x="0" y="0" width="94" height="118" rx="8"/>
        <rect class="c-roxo-escuro" x="6" y="8" width="12" height="104" opacity=".6"/>
        <rect class="c-lima contorno-fino" x="78" y="4" width="12" height="110" rx="3"/>
        <circle class="lupa" cx="44" cy="56" r="18"/>
        <path class="lupa" d="M57 69 L72 86"/>
        <g class="c-creme contorno-fino"><circle cx="22" cy="0" r="7"/><circle cx="44" cy="0" r="7"/><circle cx="66" cy="0" r="7"/></g>
      </g>
      <rect class="c-roxo contorno-fino" x="466" y="448" width="38" height="26" rx="8" transform="rotate(30 485 461)"/>
      ${luva(478, 488, 10, 1)}
    </g>

    <!-- braços de Natal -->
    <g class="so-natal">
      ${manga('M128 336 Q48 404 104 462 Q124 480 150 476', 'c-vermelho-s')}
      ${pelo([[120, 456], [146, 488]], 15)}
      ${luva(162, 476, -20, 1)}

      <g class="br br-faca">
        ${manga('M472 336 Q562 352 548 256', 'c-vermelho-s')}
        ${pelo([[522, 270], [572, 264]], 16)}
        <g class="faca">
          <path class="lamina" d="M530 258 L568 258 L562 392 Q554 420 540 438 Q532 392 530 258 Z"/>
          <path class="lamina-brilho" d="M540 270 L542 400"/>
          <rect class="c-cinza contorno-fino" x="520" y="246" width="58" height="14" rx="4"/>
          <rect class="cabo contorno-fino" x="536" y="142" width="28" height="66" rx="8"/>
          <g class="c-dourado"><circle cx="550" cy="160" r="3.5"/><circle cx="550" cy="186" r="3.5"/></g>
        </g>
        ${luva(550, 222, 0, 1.05)}
      </g>

      <g class="br br-shh">
        ${manga('M472 336 Q540 440 410 398 Q376 386 352 378', 'c-vermelho-s')}
        ${pelo([[376, 362], [370, 404]], 14)}
        <rect class="c-creme contorno-fino" x="288" y="300" width="26" height="80" rx="13"/>
        ${luva(334, 384, 0, 0.95)}
      </g>

      <g class="br br-convite">
        ${manga('M472 336 Q566 446 470 456', 'c-vermelho-s')}
        ${pelo([[484, 436], [488, 476]], 14)}
        <g class="convite" transform="translate(300 376) rotate(-10)">
          <rect class="c-convite contorno" x="0" y="0" width="160" height="106" rx="8"/>
          <path class="dobra" d="M0 4 L80 62 L160 4"/>
          <circle class="c-dourado contorno-fino" cx="80" cy="62" r="22"/>
          <circle class="selo-anel" cx="80" cy="62" r="15"/>
          <text class="selo-texto" x="80" y="71" text-anchor="middle">?</text>
        </g>
        ${luva(470, 452, -10, 1)}
      </g>
    </g>
   </g>
  </g>

  <path class="brilho" d="M456 214 l8 -22 l8 22 l22 8 l-22 8 l-8 22 l-8 -22 l-22 -8 z"/>

  <g class="fumaca">
    <circle cx="300" cy="340" r="170"/><circle cx="170" cy="250" r="110"/><circle cx="430" cy="240" r="116"/>
    <circle cx="160" cy="470" r="110"/><circle cx="440" cy="470" r="112"/><circle cx="300" cy="140" r="110"/>
    <circle cx="300" cy="560" r="100"/><circle cx="80" cy="360" r="80"/><circle cx="520" cy="360" r="82"/>
  </g>
</svg>`;
  }

  function criar(container, opcoes = {}) {
    const id = 'mp' + (++contador);
    container.innerHTML = svg(id);
    const raiz = container.querySelector('svg');
    const pupilas = [...raiz.querySelectorAll('.pupila')];
    const reduzido = () => UC.Ajustes && UC.Ajustes.get('reduzido');
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

    let roupa = 'detetive';
    let livre = true;
    let piscando = null;

    raiz.classList.add('roupa-detetive', 'expr-neutra', 'braco-faca');
    if (opcoes.sombra) {
      raiz.classList.add('sombra', 'sem-transicao');
      requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('sem-transicao')));
    }

    function moverPupilas(dx, dy) {
      pupilas.forEach((p) => { p.style.transform = `translate(${dx}px, ${dy}px)`; });
    }

    function olharPonto(x, y) {
      const m = raiz.getScreenCTM();
      if (!m) return;
      const p = raiz.createSVGPoint();
      p.x = 300; p.y = 288;
      const t = p.matrixTransform(m);
      const vx = x - t.x, vy = y - t.y;
      const d = Math.hypot(vx, vy) || 1;
      const f = Math.min(1, d / 260);
      moverPupilas((vx / d) * 13 * f, (vy / d) * 9 * f);
    }
    function olharPara(x, y) { if (livre) olharPonto(x, y); }
    function olharElemento(el) {
      const r = el.getBoundingClientRect();
      olharPonto(r.left + r.width / 2, r.top + r.height / 2);
    }
    function olharDirecao(dx, dy) { moverPupilas(dx * 13, dy * 9); }

    function piscar() {
      raiz.classList.add('piscar');
      setTimeout(() => raiz.classList.remove('piscar'), 140);
    }
    (function piscarSozinho() {
      piscando = setTimeout(() => {
        if (!raiz.classList.contains('expr-shh')) piscar();
        piscarSozinho();
      }, 2600 + Math.random() * 3400);
    })();

    const EXPRESSOES = ['neutra', 'piscadela', 'malicioso', 'inocente', 'shh', 'sorriso'];
    function expressao(nome) {
      EXPRESSOES.forEach((e) => raiz.classList.remove('expr-' + e));
      raiz.classList.add('expr-' + nome);
    }
    const BRACOS = ['faca', 'atras', 'shh', 'convite'];
    function braco(nome) {
      BRACOS.forEach((b) => raiz.classList.remove('braco-' + b));
      raiz.classList.add('braco-' + nome);
    }
    function sobrancelha(erguida) { raiz.classList.toggle('sobrancelha-erguida', erguida); }

    async function piscadela() {
      livre = false;
      moverPupilas(0, 0);
      expressao('piscadela');
      await esperar(1100);
      expressao('neutra');
      livre = true;
    }

    async function vestir(nova, { fumaca = true } = {}) {
      if (nova === roupa) return;
      roupa = nova;
      const comFumaca = fumaca && !reduzido();
      if (comFumaca) {
        raiz.classList.remove('fumacando');
        void raiz.getBoundingClientRect();
        raiz.classList.add('fumacando');
        await esperar(380);
      }
      raiz.classList.remove('roupa-detetive', 'roupa-natal');
      raiz.classList.add('roupa-' + nova);
      braco('faca');
      if (comFumaca) {
        await esperar(650);
        raiz.classList.remove('fumacando');
      }
    }

    function retanguloConvite() {
      return raiz.querySelector('.convite rect').getBoundingClientRect();
    }

    function setSombra(v) { raiz.classList.toggle('sombra', v); }

    return {
      elemento: raiz,
      olharPara, olharElemento, olharDirecao, piscar, piscadela, expressao, braco, sobrancelha,
      vestir, setSombra, retanguloConvite,
      set livre(v) { livre = v; },
      get livre() { return livre; },
      get roupa() { return roupa; },
    };
  }

  return { criar };
})();

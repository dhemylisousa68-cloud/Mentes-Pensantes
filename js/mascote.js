// Mascote do Mentes Pensantes, desenhado em vetor para poder ser animado:
// olhos que seguem o ponteiro, piscar, piscadela, troca de roupa com fumaça,
// cara fechada, risada sombria e esconder a faca.
window.MP = window.MP || {};

MP.Mascote = (() => {
  let contador = 0;

  const OLHO_E = 'M96 200 Q104 168 174 180 Q180 218 138 226 Q100 226 96 200 Z';
  const OLHO_D = 'M304 200 Q296 168 226 180 Q220 218 262 226 Q300 226 304 200 Z';
  const PUPILA_E = [140, 206];
  const PUPILA_D = [260, 206];

  function svg(id) {
    return `
<svg class="mascote" viewBox="-20 -10 440 460" role="img" aria-label="Mascote do Mentes Pensantes">
  <defs>
    <filter id="${id}-adesivo" x="-10%" y="-10%" width="120%" height="120%">
      <feMorphology in="SourceAlpha" operator="dilate" radius="7" result="d"/>
      <feFlood class="adesivo-cor"/>
      <feComposite in2="d" operator="in" result="borda"/>
      <feMerge><feMergeNode in="borda"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="${id}-clip-e"><path d="${OLHO_E}"/></clipPath>
    <clipPath id="${id}-clip-d"><path d="${OLHO_D}"/></clipPath>
  </defs>

  <ellipse class="sombra-chao" cx="200" cy="436" rx="130" ry="12"/>

  <g class="figura" filter="url(#${id}-adesivo)">
   <g class="balanco">
    <!-- pernas -->
    <rect class="c-corpo contorno" x="146" y="326" width="26" height="74"/>
    <rect class="c-corpo contorno" x="228" y="326" width="26" height="74"/>

    <!-- tênis do detetive -->
    <g class="so-detetive">
      <path class="c-roxo contorno" d="M112 402 Q112 382 136 382 L176 382 Q188 382 188 398 L188 418 L104 418 Q102 408 112 402 Z"/>
      <rect class="c-lima contorno" x="100" y="412" width="92" height="16" rx="7"/>
      <path class="traco-creme" d="M138 388 l14 8 M150 386 l14 8"/>
      <path class="c-lima" d="M118 404 l12 -8 l-2 8 z"/>
      <path class="c-roxo contorno" d="M288 402 Q288 382 264 382 L224 382 Q212 382 212 398 L212 418 L296 418 Q298 408 288 402 Z"/>
      <rect class="c-lima contorno" x="208" y="412" width="92" height="16" rx="7"/>
      <path class="traco-creme" d="M262 388 l-14 8 M250 386 l-14 8"/>
      <path class="c-lima" d="M282 404 l-12 -8 l2 8 z"/>
    </g>
    <!-- botas de Natal -->
    <g class="so-natal">
      <path class="c-vermelho contorno" d="M120 370 L182 370 L186 418 L102 418 Q102 398 120 396 Z"/>
      <rect class="c-creme contorno" x="112" y="360" width="78" height="20" rx="10"/>
      <rect class="c-lima contorno" x="98" y="412" width="92" height="16" rx="7"/>
      <path class="c-vermelho contorno" d="M280 370 L218 370 L214 418 L298 418 Q298 398 280 396 Z"/>
      <rect class="c-creme contorno" x="210" y="360" width="78" height="20" rx="10"/>
      <rect class="c-lima contorno" x="210" y="412" width="92" height="16" rx="7"/>
    </g>

    <!-- braço escondido atrás das costas (depois de guardar a faca) -->
    <g class="so-natal braco-atras">
      <path class="manga-contorno" d="M326 270 Q380 296 334 336"/>
      <path class="manga c-vermelho-s" d="M326 270 Q380 296 334 336"/>
    </g>

    <!-- lapelas do casaco do detetive -->
    <g class="so-detetive">
      <path class="c-roxo contorno" d="M74 176 L16 148 L40 236 L20 268 L82 306 Z"/>
      <path class="c-roxo-escuro" d="M70 196 L40 236 L20 268 L76 290 Z" opacity=".55"/>
      <path class="c-roxo contorno" d="M326 176 L384 148 L360 236 L380 268 L318 306 Z"/>
      <path class="c-roxo-escuro" d="M330 196 L360 236 L380 268 L324 290 Z" opacity=".55"/>
    </g>

    <!-- corpo em forma de M -->
    <path class="c-corpo contorno" d="M58 66 L152 126 L248 126 L342 66 L324 350 L250 350 L200 302 L150 350 L76 350 Z"/>
    <path class="c-corpo-claro" d="M70 92 L140 136 L120 330 L84 330 Z" opacity=".35"/>

    <!-- casaco do detetive: botões -->
    <g class="so-detetive">
      <circle class="c-lima contorno-fino" cx="104" cy="320" r="8"/>
      <circle class="c-lima contorno-fino" cx="296" cy="320" r="8"/>
    </g>

    <!-- casaco de Papai Noel -->
    <g class="so-natal">
      <path class="c-vermelho contorno" d="M68 270 L332 270 L324 350 L250 350 L200 302 L150 350 L76 350 Z"/>
      <rect class="c-preto contorno-fino" x="70" y="288" width="260" height="15"/>
      <rect class="fivela" x="182" y="283" width="36" height="25" rx="4"/>
      <rect class="c-creme contorno" x="60" y="256" width="280" height="24" rx="12"/>
      <rect class="c-creme contorno" x="70" y="338" width="86" height="16" rx="8"/>
      <rect class="c-creme contorno" x="244" y="338" width="86" height="16" rx="8"/>
      <circle class="c-dourado contorno-fino" cx="112" cy="320" r="6"/>
      <circle class="c-dourado contorno-fino" cx="288" cy="320" r="6"/>
    </g>

    <!-- ponto de interrogação -->
    <path class="interrogacao-borda" d="M150 136 C150 54, 256 48, 256 118 C256 166, 200 160, 200 214"/>
    <path class="interrogacao" d="M150 136 C150 54, 256 48, 256 118 C256 166, 200 160, 200 214"/>
    <path class="interrogacao-brilho" d="M164 112 C168 78, 220 70, 236 92"/>
    <rect class="c-lima contorno so-detetive ponto" x="181" y="236" width="38" height="34" rx="6"/>

    <!-- rosto -->
    <g class="rosto">
      <g class="sobrancelha sobrancelha-e"><path class="c-creme contorno-fino" d="M84 158 Q132 154 182 176 L178 189 Q128 170 88 173 Z"/></g>
      <g class="sobrancelha sobrancelha-d"><path class="c-creme contorno-fino" d="M316 166 Q282 122 222 150 L226 163 Q280 140 309 179 Z"/></g>

      <g class="olho olho-e">
        <path class="c-olho" d="${OLHO_E}"/>
        <g clip-path="url(#${id}-clip-e)">
          <g class="pupila"><circle class="c-pupila" cx="${PUPILA_E[0]}" cy="${PUPILA_E[1]}" r="12"/><circle class="c-olho" cx="${PUPILA_E[0] + 4}" cy="${PUPILA_E[1] - 4}" r="3"/></g>
          <rect class="palpebra c-corpo" x="80" y="110" width="120" height="80"/>
        </g>
        <path class="contorno-olho" d="${OLHO_E}"/>
      </g>
      <g class="olho olho-d">
        <path class="c-olho" d="${OLHO_D}"/>
        <g clip-path="url(#${id}-clip-d)">
          <g class="pupila"><circle class="c-pupila" cx="${PUPILA_D[0]}" cy="${PUPILA_D[1]}" r="12"/><circle class="c-olho" cx="${PUPILA_D[0] + 4}" cy="${PUPILA_D[1] - 4}" r="3"/></g>
          <rect class="palpebra c-corpo" x="200" y="110" width="120" height="80"/>
        </g>
        <path class="contorno-olho" d="${OLHO_D}"/>
      </g>

      <path class="boca boca-sorriso" d="M230 248 Q256 260 278 238"/>
      <path class="boca boca-reta" d="M162 252 Q200 246 238 252"/>
      <g class="boca boca-risada">
        <path class="c-pupila contorno" d="M128 232 Q200 292 272 232 Q200 254 128 232 Z"/>
        <path class="c-creme" d="M140 240 Q200 262 260 240 L254 252 Q200 270 146 252 Z"/>
        <path class="dentes" d="M160 246 v14 M180 252 v14 M200 254 v14 M220 252 v14 M240 246 v14"/>
      </g>
    </g>

    <!-- gorro de Papai Noel -->
    <g class="so-natal gorro">
      <path class="c-vermelho contorno" d="M178 98 Q214 14 300 18 Q362 28 378 122 L352 130 Q340 70 298 60 Q252 60 228 104 Z"/>
      <path class="c-creme contorno" d="M166 94 Q262 60 354 74 Q368 92 354 110 Q262 96 176 126 Q156 110 166 94 Z"/>
      <circle class="c-creme contorno" cx="372" cy="138" r="20"/>
    </g>

    <!-- braços do detetive -->
    <g class="so-detetive">
      <path class="manga-contorno" d="M72 252 Q90 310 142 276"/>
      <path class="manga c-corpo-s" d="M72 252 Q90 310 142 276"/>
      <rect class="c-roxo contorno-fino" x="128" y="262" width="22" height="20" rx="5" transform="rotate(-40 139 272)"/>
      <g transform="translate(156 258)">
        <path class="c-creme contorno-fino" d="M4 -16 L20 -38 Q27 -45 32 -38 L18 -12 Z"/>
        <path class="c-creme contorno-fino" d="M-18 -6 Q-20 -22 -2 -22 L14 -20 Q26 -18 24 -4 Q24 14 6 16 L-8 16 Q-20 14 -18 -6 Z"/>
        <path class="traco-contorno" d="M-6 -2 Q4 0 14 -2 M-6 6 Q4 8 12 6"/>
      </g>

      <path class="manga-contorno" d="M330 254 Q376 290 348 322"/>
      <path class="manga c-corpo-s" d="M330 254 Q376 290 348 322"/>
      <g transform="translate(296 258) rotate(10)">
        <rect class="c-roxo contorno" x="0" y="0" width="58" height="76" rx="6"/>
        <rect class="c-lima" x="48" y="3" width="7" height="70"/>
        <circle class="lupa" cx="27" cy="36" r="11"/>
        <path class="lupa" d="M35 44 L45 55"/>
        <g class="c-creme contorno-fino"><circle cx="12" cy="0" r="5"/><circle cx="26" cy="0" r="5"/><circle cx="40" cy="0" r="5"/></g>
      </g>
      <g transform="translate(344 326)">
        <path class="c-creme contorno-fino" d="M-20 -8 Q-22 -24 -4 -24 L12 -22 Q24 -20 22 -4 Q22 14 4 16 L-10 16 Q-22 14 -20 -8 Z"/>
        <path class="traco-contorno" d="M-14 -6 Q-2 -4 8 -8 M-14 4 Q-2 6 8 2"/>
      </g>
    </g>

    <!-- braços de Natal -->
    <g class="so-natal">
      <path class="manga-contorno" d="M70 266 Q20 290 60 318"/>
      <path class="manga c-vermelho-s" d="M70 266 Q20 290 60 318"/>
      <circle class="c-creme contorno-fino" cx="60" cy="318" r="14"/>
      <g transform="translate(70 322)">
        <path class="c-creme contorno-fino" d="M-16 -10 Q-18 -24 -2 -24 L12 -20 Q22 -16 20 -2 Q18 14 2 14 L-8 14 Q-18 12 -16 -10 Z"/>
      </g>

      <g class="braco-faca">
        <path class="manga-contorno" d="M326 270 Q388 252 366 182"/>
        <path class="manga c-vermelho-s" d="M326 270 Q388 252 366 182"/>
        <rect class="c-creme contorno-fino" x="350" y="174" width="34" height="18" rx="9"/>
        <g class="faca">
          <path class="lamina" d="M357 104 L363 16 Q380 34 378 104 Z"/>
          <path class="lamina-brilho" d="M366 96 L368 34"/>
          <rect class="c-cinza contorno-fino" x="346" y="100" width="42" height="9" rx="3"/>
          <rect class="cabo contorno-fino" x="358" y="108" width="18" height="48" rx="5"/>
        </g>
        <g transform="translate(367 154)">
          <path class="c-creme contorno-fino" d="M-20 -12 Q-22 -26 -4 -26 L14 -24 Q26 -20 24 -4 Q22 14 4 16 L-10 16 Q-22 14 -20 -12 Z"/>
          <path class="traco-contorno" d="M-14 -10 Q0 -8 14 -10 M-14 0 Q0 2 14 0 M-14 9 Q0 10 12 8"/>
        </g>
      </g>
    </g>
   </g>
  </g>

  <!-- brilho da piscadela -->
  <path class="brilho" d="M322 150 l7 -18 l7 18 l18 7 l-18 7 l-7 18 l-7 -18 l-18 -7 z"/>

  <!-- fumaça da troca de roupa -->
  <g class="fumaca">
    <circle cx="200" cy="230" r="120"/><circle cx="120" cy="170" r="80"/><circle cx="290" cy="160" r="84"/>
    <circle cx="110" cy="320" r="78"/><circle cx="300" cy="320" r="80"/><circle cx="200" cy="90" r="76"/>
    <circle cx="200" cy="380" r="70"/><circle cx="50" cy="250" r="56"/><circle cx="356" cy="250" r="58"/>
  </g>
</svg>`;
  }

  function criar(container, opcoes = {}) {
    const id = 'mp' + (++contador);
    container.innerHTML = svg(id);
    const raiz = container.querySelector('svg');
    const pupilas = [...raiz.querySelectorAll('.pupila')];
    const centros = [PUPILA_E, PUPILA_D];
    const reduzido = () => UC.Ajustes && UC.Ajustes.get('reduzido');

    let roupa = 'detetive';
    let piscando = null;
    let livre = true; // olhos livres para seguir o ponteiro

    raiz.classList.add('roupa-detetive', 'expr-neutra');
    if (opcoes.sombra) {
      raiz.classList.add('sombra', 'sem-transicao');
      requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('sem-transicao')));
    }

    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

    function moverPupilas(dx, dy) {
      pupilas.forEach((p) => { p.style.transform = `translate(${dx}px, ${dy}px)`; });
    }

    function olharPara(x, y) {
      if (!livre) return;
      const m = raiz.getScreenCTM();
      if (!m) return;
      const meio = raiz.createSVGPoint();
      meio.x = 200; meio.y = 206;
      const tela = meio.matrixTransform(m);
      const vx = x - tela.x;
      const vy = y - tela.y;
      const dist = Math.hypot(vx, vy) || 1;
      const forca = Math.min(1, dist / 260);
      moverPupilas((vx / dist) * 11 * forca, (vy / dist) * 7 * forca);
    }

    function olharDirecao(dx, dy) { moverPupilas(dx * 11, dy * 7); }

    function piscar() {
      raiz.classList.add('piscar');
      setTimeout(() => raiz.classList.remove('piscar'), 140);
    }

    function piscarSozinho() {
      clearTimeout(piscando);
      piscando = setTimeout(() => {
        if (!raiz.classList.contains('expr-risada')) piscar();
        piscarSozinho();
      }, 2600 + Math.random() * 3400);
    }
    piscarSozinho();

    function expressao(nome) {
      raiz.classList.remove('expr-neutra', 'expr-piscadela', 'expr-fechada', 'expr-risada');
      raiz.classList.add('expr-' + nome);
    }

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
      if (fumaca && !reduzido()) {
        raiz.classList.remove('fumacando');
        void raiz.getBoundingClientRect();
        raiz.classList.add('fumacando');
        await esperar(420);
      }
      raiz.classList.remove('roupa-detetive', 'roupa-natal', 'faca-guardada');
      raiz.classList.add('roupa-' + nova);
      if (fumaca && !reduzido()) {
        await esperar(700);
        raiz.classList.remove('fumacando');
      }
    }

    async function risadaSombria() {
      livre = false;
      moverPupilas(0, 1);
      expressao('fechada');
      await esperar(1100);
      expressao('risada');
      raiz.classList.add('rindo');
      await esperar(1700);
      raiz.classList.remove('rindo');
    }

    async function esconderFaca() {
      raiz.classList.add('faca-guardada');
      await esperar(650);
      expressao('fechada');
      moverPupilas(-6, 2);
      await esperar(500);
    }

    function setSombra(ligada) { raiz.classList.toggle('sombra', ligada); }

    function reiniciar() {
      expressao('neutra');
      raiz.classList.remove('faca-guardada', 'rindo');
      livre = true;
    }

    return {
      elemento: raiz,
      olharPara, olharDirecao, piscar, piscadela, expressao, vestir,
      risadaSombria, esconderFaca, setSombra, reiniciar,
      set livre(v) { livre = v; },
      get roupa() { return roupa; },
    };
  }

  return { criar };
})();

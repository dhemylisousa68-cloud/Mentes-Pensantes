// Controles de toque para jogar o mapa no celular.
// - Direcional (joystick) no canto esquerdo: anda nas 8 direções; empurrando até a borda, corre.
// - Botões à direita: "E" (interagir e pegar), lupa (investigar), ⤒ (pular), 🪑 (sentar/levantar) e 🍴 (comer, com alimento na mão).
// Aparece sozinho em telas de toque; no computador continua o teclado.
// Usa as variáveis do mapa.js: keys, pick(), investigate().
(() => {
  const toque = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  const css = document.createElement('style');
  css.textContent = `
    .toque { position: fixed; z-index: 30; user-select: none; -webkit-user-select: none; touch-action: none; }
    .toque-dir { left: max(16px, env(safe-area-inset-left)); bottom: max(18px, env(safe-area-inset-bottom)); width: 128px; height: 128px; border-radius: 50%;
      background: radial-gradient(circle, rgba(20, 18, 14, .35), rgba(20, 18, 14, .6)); border: 2px solid rgba(201, 167, 110, .55); }
    .toque-pino { position: absolute; left: 50%; top: 50%; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%;
      background: radial-gradient(circle at 40% 35%, #e6cf9c, #a3844f); box-shadow: 0 4px 10px rgba(0, 0, 0, .5); transition: transform .08s; }
    .toque-dir.ativo .toque-pino { transition: none; }
    .toque-botoes { right: max(16px, env(safe-area-inset-right)); bottom: max(22px, env(safe-area-inset-bottom)); display: grid;
      grid-template-columns: auto auto auto; grid-template-areas: ". sentar comer" "lupa pular e"; gap: 12px; align-items: end; justify-items: center; }
    .toque-botoes .e { grid-area: e; } .toque-botoes .lupa { grid-area: lupa; } .toque-botoes .pular { grid-area: pular; }
    .toque-botoes .sentar { grid-area: sentar; } .toque-botoes .comer { grid-area: comer; }
    .toque-botoes button.pequeno { width: 50px; height: 50px; font-size: 20px; background: radial-gradient(circle at 40% 35%, #5a4a30, #2e2416); }
    .toque-botoes button.pular { background: radial-gradient(circle at 40% 35%, #3a5a7a, #1a2a3e); font-size: 24px; }
    .toque-botoes button.comer { background: radial-gradient(circle at 40% 35%, #8a6a2a, #4a3410); }
    .toque-botoes button.comer[hidden] { display: block; visibility: hidden; }
    .toque-botoes button { width: 64px; height: 64px; border-radius: 50%; padding: 0; font: 700 22px system-ui; color: #fff4df;
      background: radial-gradient(circle at 40% 35%, #8c2a3d, #4e1420); border: 2px solid rgba(240, 207, 134, .6); box-shadow: 0 4px 10px rgba(0, 0, 0, .5); }
    .toque-botoes button.lupa { width: 54px; height: 54px; font-size: 22px; background: radial-gradient(circle at 40% 35%, #3f5148, #1f2a25); margin-bottom: 30px; }
    .toque-botoes button:active { transform: scale(.92); filter: brightness(1.2); }
    body.com-toque canvas#cv { touch-action: none; }`;
  document.head.appendChild(css);

  if (!toque) return;
  document.body.classList.add('com-toque');

  // ---------- direcional ----------
  const dir = document.createElement('div');
  dir.className = 'toque toque-dir';
  dir.setAttribute('aria-label', 'Direcional: arraste para andar');
  dir.innerHTML = '<span class="toque-pino"></span>';
  document.body.appendChild(dir);
  const pino = dir.firstChild;
  let dedo = null;
  const soltar = () => {
    dedo = null; dir.classList.remove('ativo'); pino.style.transform = '';
    keys.w = keys.a = keys.s = keys.d = keys.shift = false;
  };
  function mover(e) {
    const r = dir.getBoundingClientRect();
    const raio = r.width / 2;
    let dx = (e.clientX - (r.left + raio)) / raio, dy = (e.clientY - (r.top + raio)) / raio;
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    pino.style.transform = `translate(${dx * raio * .6}px, ${dy * raio * .6}px)`;
    const zona = .3; // zona morta no centro
    keys.d = dx > zona; keys.a = dx < -zona; keys.s = dy > zona; keys.w = dy < -zona;
    keys.shift = m > .92; // na borda: corre
  }
  dir.addEventListener('pointerdown', (e) => { e.preventDefault(); dedo = e.pointerId; try { dir.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ } dir.classList.add('ativo'); mover(e); });
  dir.addEventListener('pointermove', (e) => { if (e.pointerId === dedo) mover(e); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => dir.addEventListener(t, (e) => { if (e.pointerId === dedo) soltar(); }));
  window.addEventListener('blur', soltar);

  // ---------- botões ----------
  const bts = document.createElement('div');
  bts.className = 'toque toque-botoes';
  bts.innerHTML = '<button type="button" class="sentar pequeno" aria-label="Sentar ou levantar">🪑</button>'
    + '<button type="button" class="comer pequeno" aria-label="Comer" hidden>🍴</button>'
    + '<button type="button" class="lupa" aria-label="Investigar">🔍</button>'
    + '<button type="button" class="pular" aria-label="Pular">⤒</button>'
    + '<button type="button" class="e" aria-label="Interagir">E</button>';
  document.body.appendChild(bts);
  const toqueEm = (sel, fn) => bts.querySelector(sel).addEventListener('pointerdown', (e) => { e.preventDefault(); fn(); });
  toqueEm('.e', () => pick());
  toqueEm('.lupa', () => investigate());
  toqueEm('.pular', () => window.Controles && Controles.pular());     // o mesmo que Espaço
  toqueEm('.sentar', () => window.Controles && Controles.sentar());   // o mesmo que Ctrl
  toqueEm('.comer', () => window.Comida && Comida.comer());           // o mesmo que Q
  // o botão de comer só aparece com um alimento na mão
  const btComer = bts.querySelector('.comer');
  setInterval(() => { btComer.hidden = !(window.Comida && Comida.naMao); }, 200);

  // evita o zoom por toque duplo e a rolagem da página enquanto joga
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
})();

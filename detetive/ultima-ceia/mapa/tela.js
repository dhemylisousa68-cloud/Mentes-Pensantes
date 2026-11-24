// Modo de jogo: o mapa ocupa a tela inteira (sem a página verde em volta).
// - O canvas acompanha o formato da tela: mostra sempre ~640 px de altura do mundo e a largura que couber.
// - Os controles de teste (personagem, tamanho, FPS, colisões...) ficam guardados no painel "⚙ Testes".
// Usa as variáveis do mapa.js: cv, ctx, W, H.
(() => {
  const css = document.createElement('style');
  css.textContent = `
    html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }
    body { background: #000; }
    main { max-width: none; padding: 0; }
    main > h1, main > h1 + p { display: none; }
    canvas#cv { position: fixed; inset: 0; width: 100vw; height: 100vh; height: 100dvh; border: 0; border-radius: 0; display: block; }
    a.voltar { position: fixed; z-index: 20; top: 10px; left: 12px; padding: 6px 10px; border-radius: 8px; background: rgba(12, 10, 9, .6); color: #e8d6ad; }
    #online-status { position: fixed; z-index: 20; top: 44px; left: 12px; margin: 0 !important; padding: 3px 8px; border-radius: 6px;
      background: rgba(12, 10, 9, .5); font-size: 12px !important; pointer-events: none; }
    #msg { position: fixed; z-index: 20; left: 50%; bottom: 18px; transform: translateX(-50%); max-width: min(80vw, 520px); text-align: center;
      padding: 6px 12px; border-radius: 8px; background: rgba(12, 10, 9, .65); color: #f2e3c2; font-size: 14px; pointer-events: none; }
    #msg:empty { display: none; }
    body.com-toque #msg { bottom: 160px; }
    .bt-testes { position: fixed; z-index: 25; top: 10px; right: 64px; padding: 6px 10px; font-size: 14px; background: rgba(12, 10, 9, .6); border-color: #a38b62; }
    #painel-teste { position: fixed; z-index: 26; top: 52px; right: 12px; width: min(420px, calc(100vw - 24px)); max-height: calc(100dvh - 70px); overflow: auto;
      padding: 10px; border-radius: 10px; background: rgba(23, 34, 30, .95); border: 1px solid #a38b62; box-shadow: 0 8px 24px rgba(0, 0, 0, .5); font-size: 14px; }
    .botao-tela-cheia { background: rgba(12, 10, 9, .6) !important; }
    #painel-teste[hidden] { display: none; }
    #painel-teste #chars img { width: 48px; height: 48px; }
    #painel-teste p { margin: 8px 0; color: #cdbb92; }`;
  document.head.appendChild(css);

  // ---------- painel de testes ----------
  const main = document.querySelector('main');
  const painel = document.createElement('div');
  painel.id = 'painel-teste';
  painel.hidden = true;
  const guardar = [...main.children].filter((el) => !el.matches('a.voltar, h1, h1 + p, #cv, #online-status, #msg'));
  guardar.forEach((el) => painel.appendChild(el));
  const bt = document.createElement('button');
  bt.type = 'button';
  bt.className = 'bt-testes';
  bt.textContent = '⚙ Testes';
  bt.setAttribute('aria-expanded', 'false');
  bt.addEventListener('click', () => {
    painel.hidden = !painel.hidden;
    bt.setAttribute('aria-expanded', String(!painel.hidden));
  });
  main.append(bt, painel);
  // depois de clicar num controle do painel, as teclas voltam para o jogo
  painel.addEventListener('change', (e) => e.target.blur());

  // ---------- canvas do tamanho da tela ----------
  const ALTURA = 640; // altura do mundo visível (a mesma de antes)
  function ajustar() {
    const ar = innerWidth / Math.max(1, innerHeight);
    let h = ALTURA, w = Math.round(h * ar);
    if (w > W) { w = W; h = Math.round(w / ar); }
    if (h > H) { h = H; w = Math.round(h * ar); }
    if (cv.width !== w || cv.height !== h) {
      cv.width = w; cv.height = h;
      ctx.imageSmoothingEnabled = false;
    }
  }
  addEventListener('resize', ajustar);
  addEventListener('orientationchange', () => setTimeout(ajustar, 200));
  ajustar();
})();

// Botão de tela cheia, compartilhado pelo Mentes Pensantes e pelos jogos.
// Na tela principal ele entra junto aos ícones do topo; nas outras páginas fica no canto superior direito.
// Obs.: o navegador sai da tela cheia ao trocar de página; é só tocar no botão de novo.
(() => {
  const doc = document;
  const el = doc.documentElement;
  const suportado = doc.fullscreenEnabled || doc.webkitFullscreenEnabled;
  if (!suportado) return; // iPhone não permite tela cheia em páginas

  const ativa = () => !!(doc.fullscreenElement || doc.webkitFullscreenElement);
  const entrar = () => (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen());
  const sair = () => (doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen());

  const ICONE_ABRIR = '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';
  const ICONE_FECHAR = '<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>';

  const b = doc.createElement('button');
  b.type = 'button';
  b.className = 'botao-tela-cheia';
  const topo = doc.querySelector('.icones-topo');
  if (topo) { b.classList.add('icone'); topo.prepend(b); } else doc.body.appendChild(b);

  function atualizar() {
    const a = ativa();
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${a ? ICONE_FECHAR : ICONE_ABRIR}</svg>`;
    b.setAttribute('aria-label', a ? 'Sair da tela cheia' : 'Tela cheia');
    b.title = a ? 'Sair da tela cheia' : 'Tela cheia';
  }
  b.addEventListener('click', () => { Promise.resolve(ativa() ? sair() : entrar()).catch(() => {}); });
  doc.addEventListener('fullscreenchange', atualizar);
  doc.addEventListener('webkitfullscreenchange', atualizar);
  atualizar();

  const css = doc.createElement('style');
  css.textContent = `
    .botao-tela-cheia { cursor: pointer; display: grid; place-items: center; color: #f1e4c8; }
    .botao-tela-cheia svg { width: 26px; height: 26px; display: block; }
    .icones-topo .botao-tela-cheia {
      background: radial-gradient(circle at 40% 35%, #4a3a2c, #241912 75%); border: 2px solid #120b07; border-radius: 12px;
      width: 48px; height: 48px; margin-top: 3px; box-shadow: inset 0 0 0 2px rgba(241, 228, 200, .12);
    }
    body > .botao-tela-cheia {
      position: fixed; top: 10px; right: 12px; z-index: 40; width: 40px; height: 40px; padding: 0;
      background: rgba(10, 7, 8, .55); border: 1px solid rgba(201, 160, 80, .35); border-radius: 10px; opacity: .8;
    }
    body > .botao-tela-cheia:hover, .botao-tela-cheia:focus-visible { opacity: 1; filter: brightness(1.2); }
    body > .botao-tela-cheia svg { width: 20px; height: 20px; }`;
  doc.head.appendChild(css);
})();

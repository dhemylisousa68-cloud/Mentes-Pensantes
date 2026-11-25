// O convite de Tomás: quando todos ficam prontos e a porta abre, cada jogador assiste, na própria tela,
// à animação do convite do SEU personagem (vídeo em tela cheia). Depois, entra no mapa.
// - O convite não revela função nenhuma (as funções são sorteadas e descobertas depois, no jogo).
// - Ao terminar (ou ao pular) escurece e vai direto para o jogo, sem tela final.
// - Cada personagem pode ter o seu (UC.PERSONAGENS[i].convite). Sem convite ainda: vai direto ao mapa.
// - Narração: toca o arquivo de voz gravado (convite.voz). Sem ele, fica sem narração
//   (a voz do navegador só entra se convite.vozNavegador = true; ela soa robótica).
window.UC = window.UC || {};

UC.Convite = (() => {
  let sintese = null;

  function vozDoNavegador(texto) {
    const s = window.speechSynthesis;
    if (!s || !texto) return;
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'pt-BR'; u.rate = 0.95; u.pitch = 0.8;
    const vozes = s.getVoices().filter((v) => /^pt(-|_)BR/i.test(v.lang));
    // prefere vozes naturais (Edge: "Online (Natural)") e masculinas; por último qualquer pt-BR
    u.voice = vozes.find((v) => /natural|online/i.test(v.name) && /antonio|donato|fabio|humberto|julio|nicolau|valerio|daniel/i.test(v.name))
      || vozes.find((v) => /natural|online/i.test(v.name))
      || vozes.find((v) => /antonio|daniel|paulo|male/i.test(v.name))
      || vozes[0] || null;
    sintese = u;
    s.cancel(); s.speak(u);
  }

  function mostrar(p, aoTerminar) {
    const c = p && p.convite;
    if (!c) { aoTerminar(); return; }
    if (UC.Som && UC.Som.calar) UC.Som.calar(0.8); // só o som da animação: a música do jogo sai
    const raiz = document.createElement('section');
    raiz.className = 'convite';
    raiz.setAttribute('role', 'dialog');
    raiz.setAttribute('aria-label', 'O convite de Tomás');
    raiz.innerHTML = `
      <video playsinline preload="auto" disablepictureinpicture poster="${c.capa}"><source src="${c.video}" type="video/mp4"></video>
      <button class="convite-pular" type="button">Pular ›</button>
      <div class="convite-toque" hidden><button class="btn btn-principal" type="button">▶ Abrir o convite</button></div>`;
    document.body.appendChild(raiz);
    const v = raiz.querySelector('video'), toque = raiz.querySelector('.convite-toque');
    let falou = false, saindo = false, audio = null;
    if (c.voz) { audio = new Audio(c.voz); audio.preload = 'auto'; }
    const calar = () => { if (audio) audio.pause(); if (window.speechSynthesis) speechSynthesis.cancel(); };

    async function tocar() {
      toque.hidden = true;
      try { await v.play(); } catch (e) { toque.hidden = false; } // sem permissão de som: pede um toque
    }
    v.addEventListener('timeupdate', () => {
      if (!falou && v.currentTime >= (c.falaEm || 14)) {
        falou = true;
        if (audio) audio.play().catch(() => {}); else if (c.vozNavegador) vozDoNavegador(c.fala);
      }
    });
    v.addEventListener('pause', () => { if (!saindo && !v.ended && audio) audio.pause(); }); // no fim do vídeo a voz continua
    v.addEventListener('play', () => { if (audio && falou && audio.currentTime > 0 && !audio.ended) audio.play().catch(() => {}); });
    // terminou (ou pulou): escurece e vai direto para o jogo
    function sair() {
      if (saindo) return;
      saindo = true;
      calar(); v.pause();
      raiz.classList.remove('visivel');
      setTimeout(aoTerminar, 600);
    }
    // o vídeo acabou mas Tomás ainda está falando: espera a frase terminar (no máximo 8 s)
    v.addEventListener('ended', () => {
      if (audio && !audio.paused && !audio.ended) { audio.addEventListener('ended', sair, { once: true }); setTimeout(sair, 8000); }
      else sair();
    });
    toque.querySelector('button').addEventListener('click', tocar);
    raiz.querySelector('.convite-pular').addEventListener('click', sair);
    addEventListener('keydown', function tecla(e) {
      if (!raiz.isConnected || saindo) { removeEventListener('keydown', tecla); return; }
      if (e.key === 'Escape') sair();
    });
    requestAnimationFrame(() => raiz.classList.add('visivel'));
    tocar();
  }

  return { mostrar };
})();

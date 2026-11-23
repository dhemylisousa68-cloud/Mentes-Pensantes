// Reação do mascote quando o jogador se aproxima de um botão (ex.: "Criar sala").
//
// Estados:  espera → atencao → esconder → aguardando → (voltando → espera) | abrir
// - entra quando o cursor chega a 120 px do botão (ou o botão recebe foco, ou é tocado);
// - só sai quando o cursor passa de 220 px e fica longe por um instante (histerese: não reinicia na borda);
// - toda transição parte da posição atual (o rig usa molas), então nada salta para o início de uma pose;
// - o clique nunca espera a animação.
//
// Sobrancelha, sorriso (0 a 4) e piscar são enviados ao rig pelo método expressao(); eles só aparecem
// quando as camadas de olhos/boca/sobrancelhas existirem (veja docs/cena-e-mascote.md).
window.MP = window.MP || {};

MP.ReacaoBotao = (() => {
  const ENTRAR = 120, SAIR = 220, SEGURAR = 650;

  function ligar({ botao, mascote, ativo, reduzido = () => false, poseEspera = () => 'repouso' }) {
    let estado = 'espera';
    let timers = [], volta = 0, olhadela = false;
    let ponteiro = null;

    const agendar = (ms, fn) => timers.push(setTimeout(fn, ms));
    function cancelar() { timers.forEach(clearTimeout); timers = []; clearTimeout(volta); volta = 0; }

    function distancia(x, y) {
      const r = botao.getBoundingClientRect();
      if (!r.width) return Infinity;
      const dx = Math.max(r.left - x, 0, x - r.right), dy = Math.max(r.top - y, 0, y - r.bottom);
      return Math.hypot(dx, dy);
    }
    function olharJogador() {
      if (ponteiro) mascote.olharPara(ponteiro.x, ponteiro.y); else mascote.olharFrente();
    }

    function reagir() {
      if (!ativo() || estado === 'abrir') return;
      clearTimeout(volta); volta = 0;
      if (['atencao', 'esconder', 'aguardando'].includes(estado)) return; // já reagindo
      cancelar();
      estado = 'atencao';
      if (reduzido()) {
        mascote.expressao({ sobrancelha: true, sorriso: 4 });
        mascote.pose('disfarcar');
        mascote.variante?.('dedo');
        estado = 'aguardando';
        return;
      }
      // 1. olhadela rápida para o botão
      olhadela = true;
      mascote.cabecaRapida(true);
      mascote.olharElemento(botao);
      // 2. volta o olhar para o jogador
      agendar(260, () => { olharJogador(); olhadela = false; });
      agendar(480, () => mascote.cabecaRapida(false));
      // 3. ergue uma sobrancelha
      agendar(340, () => mascote.expressao({ sobrancelha: true }));
      // 4. o sorriso cresce aos poucos (começa antes de a faca sumir)
      [1, 2, 3, 4].forEach((n, i) => agendar(420 + i * 130, () => mascote.expressao({ sorriso: n })));
      // 5. dobra o cotovelo e leva a mão para trás do corpo
      agendar(560, () => { estado = 'esconder'; mascote.pose('esconder'); });
      // 6. fingindo inocência, espera o clique
      // 6. fingindo inocência: dedo erguido, assobiando, enquanto espera o clique
      agendar(1200, () => { estado = 'aguardando'; mascote.pose('disfarcar'); mascote.variante?.('dedo'); mascote.assobiar?.(true); });
    }

    // mantém a reação um instante e só então volta, devagar
    function agendarVolta() {
      if (volta || estado === 'espera' || estado === 'voltando' || estado === 'abrir') return;
      volta = setTimeout(voltar, SEGURAR);
    }
    function voltar() {
      cancelar();
      if (estado === 'abrir') return;
      estado = 'voltando';
      mascote.expressao({ sobrancelha: false });
      mascote.variante?.(null);
      mascote.assobiar?.(false);
      [3, 2, 1, 0].forEach((n, i) => agendar(i * 150, () => mascote.expressao({ sorriso: n })));
      agendar(200, () => mascote.pose(poseEspera()));
      agendar(900, () => { estado = 'espera'; });
    }

    function aoMover(e) {
      ponteiro = { x: e.clientX, y: e.clientY };
      if (!ativo()) return;
      const d = distancia(e.clientX, e.clientY);
      if (d <= ENTRAR) reagir();
      else if (d > SAIR) agendarVolta();
      else { clearTimeout(volta); volta = 0; }
      if (!olhadela && estado !== 'espera') olharJogador();
    }
    window.addEventListener('pointermove', aoMover, { passive: true });
    // celular: reação breve ao tocar, sem exigir um segundo toque (o clique segue normalmente)
    let ultimoToque = 0;
    botao.addEventListener('pointerdown', (e) => { ultimoToque = performance.now(); if (e.pointerType !== 'mouse') reagir(); });
    // teclado (o foco vindo de um clique de mouse não conta: a proximidade já tratou)
    botao.addEventListener('focus', () => { if (performance.now() - ultimoToque > 400) reagir(); });
    botao.addEventListener('blur', () => { if (!ponteiro || distancia(ponteiro.x, ponteiro.y) > SAIR) agendarVolta(); });
    // cursor saiu da janela: o olhar volta aos poucos ao centro e a reação se desfaz
    document.documentElement.addEventListener('mouseleave', () => { ponteiro = null; if (estado !== 'abrir') { mascote.olharFrente(); agendarVolta(); } });

    return {
      get estado() { return estado; },
      get controlaOlhar() { return olhadela; },
      // clique: nada é atrasado; a faca continua escondida
      abrir() {
        cancelar();
        estado = 'abrir';
        mascote.expressao({ sobrancelha: true, sorriso: 4 });
        mascote.pose('disfarcar');
      },
      // painel fechado: volta à espera a partir de onde estiver
      reiniciar() {
        if (estado === 'espera') return;
        estado = 'aguardando';
        voltar();
      },
    };
  }

  return { ligar };
})();

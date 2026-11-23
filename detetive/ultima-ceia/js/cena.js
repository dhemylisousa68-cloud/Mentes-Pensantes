// Cena da entrada da Última Ceia, em camadas sobre a ilustração (coordenadas da arte: 1024 × 572).
//
//   UC.Camera  enquadra a cena na tela (cobre a tela; em retrato centraliza a mesa) e faz movimentos suaves.
//   UC.Neve    flocos caindo só dentro do vidro da janela, por baixo da grade.
//   UC.Porta   máquina de estados da porta:
//                fechada ──abrir('escolha')──▶ abrindo ──▶ aberta      (clique em "Abrir a porta")
//                fechada ──abrir('todos-prontos')──▶ abrindo ──▶ aberta (todos logados e com personagem)
//              abrir() devolve uma promessa; chamar de novo durante a animação não reinicia nada,
//              e concluir() termina na hora (cliques rápidos nunca travam a navegação).
//   UC.Velas   chamas animadas e o ciclo: enfraquece → apaga (fumaça, penumbra) → olhos vermelhos → reacende.
window.UC = window.UC || {};

(() => {
  const L = 1024, A = 572;
  const $ = (s) => document.querySelector(s);
  const reduzido = () => UC.Ajustes.get('reduzido');
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const cena = $('#cena');

  // ===================== Câmera =====================
  UC.Camera = (() => {
    let atual = { zoom: 1, fx: L / 2, fy: A / 2, puxar: 0 };
    function base() {
      const vw = innerWidth, vh = innerHeight;
      const s = Math.max(vw / L, vh / A);
      const foco = vw / vh < 1 ? 560 : L / 2; // em retrato, mesa e mascote no centro
      const x = Math.min(0, Math.max(vw - L * s, vw / 2 - foco * s));
      const y = Math.min(0, Math.max(vh - A * s, vh / 2 - (A / 2) * s));
      return { s, x, y };
    }
    function calcular({ zoom, fx, fy, puxar }) {
      const b = base();
      const s = b.s * zoom;
      const tx = b.x + fx * b.s, ty = b.y + fy * b.s;
      const ax = tx + (innerWidth / 2 - tx) * puxar, ay = ty + (innerHeight / 2 - ty) * puxar;
      // nunca mostra além da borda da ilustração
      const x = Math.min(0, Math.max(innerWidth - L * s, ax - fx * s));
      const y = Math.min(0, Math.max(innerHeight - A * s, ay - fy * s));
      return `translate(${x}px, ${y}px) scale(${s})`;
    }
    function aplicar() { cena.style.transform = calcular(atual); }
    async function mover(novo, duracao = 1200, easing = 'cubic-bezier(.45, 0, .2, 1)') {
      const de = cena.style.transform;
      atual = { ...atual, ...novo };
      const para = calcular(atual);
      cena.style.transform = para;
      if (reduzido() || !duracao) return;
      const anim = cena.animate([{ transform: de }, { transform: para }], { duration: duracao, easing });
      try { await Promise.race([anim.finished, esperar(duracao + 200)]); } catch (e) { /* cancelada */ }
    }
    const normal = () => mover({ zoom: 1, fx: L / 2, fy: A / 2, puxar: 0 }, 0);
    // enquadra a porta (em telas estreitas ela fica fora do quadro, então a câmera vai até ela)
    const naPorta = (duracao, zoom = 1.5) => mover({ zoom, fx: 820, fy: 300, puxar: 1 }, duracao);
    window.addEventListener('resize', aplicar);
    aplicar();
    return { mover, normal, naPorta, aplicar };
  })();

  // ===================== Neve na janela =====================
  UC.Neve = (() => {
    const canvas = $('#neve-janela');
    const ctx = canvas.getContext('2d');
    const ESC = 3; // resolução interna (a cena é ampliada pela câmera)
    const W = 186, H = 164;
    canvas.width = W * ESC; canvas.height = H * ESC;
    ctx.scale(ESC, ESC);
    // vidros (o resto é moldura/persiana)
    const VIDRO = { x: 3, y: 5, w: 180, h: 156 };
    const flocos = Array.from({ length: 70 }, () => novo(true));
    let raf = 0, ultimo = 0, t = 0;
    function novo(espalhar) {
      const longe = Math.random() < .55;
      return {
        x: VIDRO.x + Math.random() * VIDRO.w,
        y: espalhar ? VIDRO.y + Math.random() * VIDRO.h : VIDRO.y - 4,
        r: longe ? .4 + Math.random() * .5 : .8 + Math.random() * .9,
        v: longe ? 9 + Math.random() * 8 : 16 + Math.random() * 14,
        a: longe ? .35 + Math.random() * .25 : .6 + Math.random() * .35,
        f: Math.random() * 6.28, b: 2 + Math.random() * 5,
      };
    }
    function desenhar(dt) {
      t += dt;
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.beginPath(); ctx.rect(VIDRO.x, VIDRO.y, VIDRO.w, VIDRO.h); ctx.clip();
      const corrente = 5 + 4 * Math.sin(t * .4); // leve corrente de ar
      for (const f of flocos) {
        f.y += f.v * dt;
        f.x += (corrente + Math.sin(t * 1.3 + f.f) * f.b) * dt;
        if (f.y > VIDRO.y + VIDRO.h + 3 || f.x > VIDRO.x + VIDRO.w + 4) Object.assign(f, novo(false));
        ctx.globalAlpha = f.a;
        ctx.fillStyle = '#eef4ff';
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
    function quadro(agora) {
      raf = 0;
      if (document.hidden) return;
      const dt = Math.min(.05, (agora - (ultimo || agora)) / 1000);
      ultimo = agora;
      if (reduzido()) { desenhar(0); return; }
      desenhar(dt);
      raf = requestAnimationFrame(quadro);
    }
    function retomar() { if (!raf && !document.hidden) { ultimo = 0; raf = requestAnimationFrame(quadro); } }
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else retomar(); });
    UC.Ajustes.aoMudar(retomar);
    retomar();
    return { retomar };
  })();

  // ===================== Porta =====================
  UC.Porta = (() => {
    const porta = $('#porta');
    let estado = 'fechada';      // 'fechada' | 'abrindo' | 'aberta'
    let motivo = null;           // 'escolha' | 'todos-prontos'
    let pendente = null, terminar = null;
    const DURACAO = 1300;

    function abrir(porque = 'escolha') {
      if (estado === 'aberta' && motivo === porque) return Promise.resolve();
      if (estado === 'abrindo') return pendente;
      motivo = porque;
      estado = 'abrindo';
      porta.classList.add('abrindo');
      document.dispatchEvent(new CustomEvent('uc:porta', { detail: { estado, motivo } }));
      UC.Som.rangido?.();
      pendente = new Promise((resolver) => {
        let feito = false;
        terminar = () => {
          if (feito) return;
          feito = true;
          estado = 'aberta';
          porta.classList.remove('abrindo');
          porta.classList.add('aberta');
          document.dispatchEvent(new CustomEvent('uc:porta', { detail: { estado, motivo } }));
          resolver();
        };
        // um quadro depois, para a transição partir da porta fechada
        requestAnimationFrame(() => porta.classList.add('aberta'));
        setTimeout(terminar, reduzido() ? 0 : DURACAO);
      });
      return pendente;
    }
    // termina a animação imediatamente (pular / clique repetido)
    function concluir() { if (estado === 'abrindo' && terminar) terminar(); }
    // fecha sem animação (ao voltar para o menu ou antes de abrir de novo)
    function fechar() {
      estado = 'fechada'; motivo = null; pendente = null;
      porta.classList.remove('abrindo', 'aberta');
      document.dispatchEvent(new CustomEvent('uc:porta', { detail: { estado, motivo } }));
    }
    return { abrir, concluir, fechar, get estado() { return estado; }, get motivo() { return motivo; } };
  })();

  // ===================== Velas, penumbra e olhos =====================
  UC.Velas = (() => {
    // posição da base da chama, largura e altura (coordenadas da arte)
    const VELAS = [
      { x: 418, y: 313, l: 8, a: 22, dur: 2.3 },
      { x: 663, y: 335, l: 7, a: 15, dur: 2.9 },
      { x: 681, y: 321, l: 8, a: 21, dur: 2.6 },
    ];
    const raiz = $('#velas');
    raiz.innerHTML = VELAS.map((v) => `
      <div class="vela" style="left:${v.x}px;top:${v.y}px;--l:${v.l}px;--a:${v.a}px;--dur:${v.dur}s">
        <span class="sombra"></span><span class="halo"></span><span class="chama"></span>
        <span class="fumaca"><i></i><i></i><i></i></span>
      </div>`).join('');
    const els = [...raiz.children];

    // O escuro com os olhos vermelhos só acontece enquanto o cursor (ou o foco) está no botão "Abrir a porta".
    // entrar(): as velas enfraquecem e apagam, a sala escurece e os olhos acendem; sair(): tudo reacende.
    // Cada passo parte do estado atual, então entrar e sair rápido não deixa nada preso no meio.
    let pausas = 0, alvo = false, versao = 0;
    const bloqueado = () => pausas > 0 || reduzido();

    async function entrar() {
      alvo = true;
      if (bloqueado()) return;
      const v = ++versao;
      els.forEach((e) => { e.classList.remove('acendendo', 'apagada'); e.classList.add('fraca'); });
      await esperar(220);
      if (v !== versao || !alvo) return;
      els.forEach((e) => { e.classList.remove('fraca'); e.classList.add('apagada'); });
      UC.Som.sopro?.();
      cena.classList.add('escura');
      await esperar(380);
      if (v !== versao || !alvo) return;
      cena.classList.add('olhos');
      UC.Som.sussurro?.();
    }
    async function sair() {
      alvo = false;
      const v = ++versao;
      const estavaEscuro = cena.classList.contains('escura');
      cena.classList.remove('olhos', 'escura');
      els.forEach((e) => { e.classList.remove('fraca', 'apagada'); if (estavaEscuro) e.classList.add('acendendo'); });
      if (estavaEscuro) UC.Som.acender?.();
      await esperar(900);
      if (v === versao) els.forEach((e) => e.classList.remove('acendendo'));
    }
    function restaurar() {
      versao++;
      cena.classList.remove('escura', 'olhos');
      els.forEach((e) => e.classList.remove('fraca', 'apagada', 'acendendo'));
    }
    // pausa enquanto a porta anima, configurações abertas etc. (pode empilhar)
    function pausar() { pausas++; restaurar(); }
    function retomar() { pausas = Math.max(0, pausas - 1); }

    // liga ao botão "Abrir a porta" (mouse e teclado; no celular não há hover, então não escurece)
    const botao = document.querySelector('[data-acao="sala"]');
    if (botao) {
      botao.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') entrar(); });
      botao.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') sair(); });
      botao.addEventListener('focus', () => { if (botao.matches(':focus-visible')) entrar(); });
      botao.addEventListener('blur', sair);
    }
    document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('pausado', document.hidden));
    return { pausar, retomar, entrar, sair, restaurar };
  })();
})();

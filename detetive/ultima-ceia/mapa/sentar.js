// Animação de sentar e levantar nos bancos, inspirada no GIF "homem sentando na cadeira":
// em pé → inclina e dobra os joelhos → sentado de frente, coxas encurtadas, mãos sobre os joelhos e botas no chão.
// Funciona para os 10 personagens a partir do próprio boneco (não precisa de arte nova):
// o boneco é dividido em 3 faixas (corpo, coxas e canelas/botas) que descem e encolhem em perspectiva.
// Serve para você e para os outros jogadores (multijogador.js). Usa: ctx.
(() => {
  // faixas do quadro de 128 px: corpo (cabeça, tronco e mãos), coxas e canelas com as botas
  const CORPO = [0, 92], COXA = [88, 100], BOTA = [100, 128];
  const T_SENTAR = 0.6, T_LEVANTAR = 0.45;   // segundos
  const suave = (t) => t * t * (3 - 2 * t);
  const mistura = (a, b, t) => a + (b - a) * t;

  // posições (topo e altura, em px do mapa) de cada faixa: em pé apoiado em (px,py) e sentado no banco (sx,sy)
  function emPe(py, s) {
    const topo = py - s * 120 / 128, k = s / 128;
    return { corpo: [topo, 92 * k], coxa: [topo + 88 * k, 12 * k], bota: [topo + 100 * k, 28 * k] };
  }
  function sentado(sy, s, dir) {
    if (dir === 3) // de costas: as pernas ficam escondidas pelo corpo e pelo banco
      return { corpo: [sy - s * 0.56, s * 89 / 128], coxa: [sy + s * 0.12, 0], bota: [sy + s * 0.13, 0] };
    return { corpo: [sy - s * 0.60, s * 92 / 128], coxa: [sy + s * 0.06, s * 0.06], bota: [sy + s * 0.10, s * 0.15] };
  }

  function faixa(im, fx, fy, [a, b], x, [y, h], s, aperto) {
    if (h < 0.5) return;
    const w = s * (1 - aperto), dx = (s - w) / 2;
    ctx.drawImage(im, fx, fy + a, 128, b - a, Math.round(x - s / 2 + dx), Math.round(y), Math.round(w), Math.max(1, Math.round(h)));
  }

  // ent: objeto que guarda o estado da animação de um personagem (você ou outro jogador)
  function desenhar(ent, im, fx, fy, s, x, y, seated, dir) {
    const agora = performance.now();
    let a = ent.sentar;
    if (!a) a = ent.sentar = { p: seated ? 1 : 0, alvo: seated, banco: { x, y }, pe: { x, y }, t: agora, dir };
    const dt = Math.min(0.1, (agora - a.t) / 1000); a.t = agora;
    if (seated !== a.alvo) {
      // mudou: sentar (de onde estava em pé até o banco) ou levantar (do banco até onde fica em pé)
      if (seated) { a.pe = { x: a.ux ?? x, y: a.uy ?? y }; a.banco = { x, y }; }
      else { a.banco = { x: a.ux ?? x, y: a.uy ?? y }; a.pe = { x, y }; }
      a.alvo = seated;
    }
    if (seated) { a.banco = { x, y }; a.dir = dir; } else a.pe = { x, y }; // segue quem anda no meio da animação
    a.ux = x; a.uy = y;
    a.p = seated ? Math.min(1, a.p + dt / T_SENTAR) : Math.max(0, a.p - dt / T_LEVANTAR);

    if (a.p <= 0) { ctx.drawImage(im, fx, fy, 128, 128, x - s / 2, y - s * 120 / 128, s, s); return; }
    const linha = (a.p < 1 ? a.dir : dir) * 128; // vira para o lado do banco enquanto senta
    const e = suave(a.p);
    // anda até o banco na primeira metade; desce na segunda (como no GIF: chega, inclina, senta)
    const ande = suave(Math.min(1, a.p / 0.5));
    const desce = suave(Math.max(0, (a.p - 0.25) / 0.75));
    const px = mistura(a.pe.x, a.banco.x, ande), py = mistura(a.pe.y, a.banco.y, ande);
    const A = emPe(py, s), B = sentado(py, s, a.dir);
    const p = {}; for (const k of ['corpo', 'coxa', 'bota']) p[k] = [mistura(A[k][0], B[k][0], desce), mistura(A[k][1], B[k][1], desce)];
    // no meio do movimento o tronco inclina para a frente (fica um pouco mais baixo e largo)
    const inclina = Math.sin(Math.PI * desce) * (a.alvo ? 1 : 0.7);
    p.corpo[0] += s * 0.04 * inclina;
    const fxp = a.p < 1 ? 0 : fx;
    faixa(im, fxp, linha, BOTA, px, p.bota, s, 0);
    faixa(im, fxp, linha, COXA, px, p.coxa, s, -0.04 * e);
    faixa(im, fxp, linha, CORPO, px, p.corpo, s, -0.03 * inclina);

  }

  window.Sentar = { desenhar };
})();

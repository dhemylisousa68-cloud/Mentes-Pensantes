// Portão como objeto "3D" em pixel art: cada folha gira na dobradiça (no pilar), vista de cima em perspectiva.
// - A folha é desenhada em fatias de 1 px: encurta (cosseno) e a ponta solta sobe ou desce (seno),
//   como uma porta girando no ângulo de câmera do mapa.
// - Abre para longe de quem abriu: de fora, as folhas giram para dentro da propriedade; de dentro, para a rua.
// - Ao girar aparece a espessura do ferro, a folha escurece (sai da luz dos lampiões) e projeta sombra no chão.
// Substitui o drawGate() do mapa.js (que só encolhia as folhas). Usa: ctx, gateArt, gateProgress, gateSide.
(() => {
  const L = 108, H = 208, TOPO = 755;          // tamanho de cada folha e topo do portão no mapa
  const DOBRA_E = 660, DOBRA_D = 876;           // dobradiças (borda interna dos pilares)
  const ANGULO = 1.45;                          // abre até ~83°
  const PROF = 0.5;                             // quanto a profundidade "achata" no ângulo da câmera
  const tela = document.createElement('canvas');
  const g = tela.getContext('2d');

  // sx: coluna da arte; dobra: x da dobradiça; d: +1 a folha vai para a direita, -1 para a esquerda; k: sobe (-) ou desce (+)
  function folha(sx, dobra, d, c, s, k) {
    const dy = k * L * s;                       // deslocamento vertical da ponta solta
    const ponta = dobra + d * L * c;
    // sombra no chão, saindo da base da folha
    if (s > 0.02) {
      ctx.save();
      ctx.fillStyle = `rgba(14,9,7,${(0.18 + 0.14 * s).toFixed(2)})`;
      ctx.beginPath();
      ctx.moveTo(dobra, TOPO + H - 4);
      ctx.lineTo(ponta, TOPO + H - 4 + dy);
      ctx.lineTo(ponta + d * 5 * s, TOPO + H + 4 + dy);
      ctx.lineTo(dobra, TOPO + H + 5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    const ox = Math.floor(Math.min(dobra, ponta)) - 4, oy = Math.floor(TOPO + Math.min(0, dy)) - 2;
    tela.width = Math.ceil(L * c) + 10;
    tela.height = Math.ceil(H + Math.abs(dy)) + 4;
    g.imageSmoothingEnabled = false;
    const larg = Math.max(1, Math.ceil(c + 0.35));
    for (let j = 0; j < L; j++) {
      const dist = d > 0 ? j : L - 1 - j;       // distância da coluna até a dobradiça
      const px = Math.round(dobra + d * dist * c - (d < 0 ? larg - 1 : 0)) - ox;
      const py = Math.round(TOPO + k * dist * s) - oy;
      g.drawImage(gateArt, sx + j, 0, 1, H, px, py, larg, H);
    }
    // espessura do ferro na ponta solta (aparece conforme a folha vira)
    const esp = Math.round(3 * s);
    if (esp > 0) {
      const ex = Math.round(ponta) - ox + (d > 0 ? 0 : -esp);
      const ey = Math.round(TOPO + dy) - oy;
      g.fillStyle = '#17110d';
      g.fillRect(ex, ey + 18, esp, H - 26);
    }
    // fora da luz: escurece um pouco conforme gira
    if (s > 0.02) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(8,5,10,${(0.34 * s).toFixed(2)})`;
      g.fillRect(0, 0, tela.width, tela.height);
      g.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(tela, ox, oy);
  }

  window.drawGate = function drawGate() {
    if (!gateArt.complete || !gateArt.naturalWidth) return;
    if (gateProgress <= 0) {                    // fechado: a arte inteira, como sempre
      ctx.drawImage(gateArt, 0, 0, L * 2, H, DOBRA_E, TOPO, L * 2, H);
      return;
    }
    const e = (1 - Math.cos(Math.PI * Math.min(1, gateProgress))) / 2; // suaviza início e fim
    const a = e * ANGULO, c = Math.cos(a), s = Math.sin(a);
    // gateSide: 1 = abriu de fora (folhas giram para dentro, sobem); -1 = de dentro (giram para a rua, descem)
    const k = (gateSide < 0 ? 1 : -1) * PROF;
    folha(0, DOBRA_E, 1, c, s, k);
    folha(L, DOBRA_D, -1, c, s, k);
  };
})();

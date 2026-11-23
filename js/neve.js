// Neve em três camadas de profundidade, desenhada num canvas por cima do cenário e por baixo dos botões.
// Fundo: flocos pequenos, lentos e apagados. Meio: médios, levados pelo vento. Frente: poucos, grandes e rápidos.
// A quantidade acompanha o tamanho da tela; pausa com a aba oculta; com movimento reduzido fica parada.
window.MP = window.MP || {};

MP.Neve = (() => {
  // densidade = flocos por 10 mil px² de tela; fim = até onde o floco cai (fração da altura), dando profundidade
  const CAMADAS = [
    { densidade: .55, raio: [.6, 1.3], queda: [22, 40], alfa: [.22, .45], vento: .5, balanco: [4, 10], fim: [.62, .86], borrao: 0 },
    { densidade: .22, raio: [1.3, 2.3], queda: [48, 85], alfa: [.45, .75], vento: 1, balanco: [8, 18], fim: [.8, 1.04], borrao: 0 },
    { densidade: .028, raio: [2.8, 4.6], queda: [120, 190], alfa: [.55, .85], vento: 1.7, balanco: [12, 26], fim: [1.05, 1.05], borrao: 1 },
  ];
  const sorteio = (a, b) => a + Math.random() * (b - a);

  function iniciar(canvas, { reduzido = () => false } = {}) {
    const ctx = canvas.getContext('2d');
    let L = 0, A = 0, dpr = 1, flocos = [], raf = 0, ultimo = 0, t = 0, ligado = true;
    const sprites = CAMADAS.map((c) => sprite(c.borrao));

    // um floco pré-desenhado por camada (o da frente é mais macio, como fora de foco)
    function sprite(borrao) {
      const s = document.createElement('canvas');
      const R = 32; s.width = s.height = R * 2;
      const g = s.getContext('2d');
      const grad = g.createRadialGradient(R, R, 0, R, R, R);
      grad.addColorStop(0, 'rgba(255,255,255,1)');
      grad.addColorStop(borrao ? .25 : .45, 'rgba(240,244,255,.85)');
      grad.addColorStop(1, 'rgba(230,236,255,0)');
      g.fillStyle = grad; g.fillRect(0, 0, R * 2, R * 2);
      return s;
    }

    function novo(c, i, espalhar) {
      return {
        c, i,
        x: Math.random() * L,
        y: espalhar ? Math.random() * A : -10 - Math.random() * 40,
        r: sorteio(...c.raio),
        v: sorteio(...c.queda),
        a: sorteio(...c.alfa),
        fase: Math.random() * Math.PI * 2,
        bal: sorteio(...c.balanco),
        freq: sorteio(.4, 1.1),
        fim: sorteio(...c.fim),
      };
    }

    function medir() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      L = canvas.clientWidth; A = canvas.clientHeight;
      canvas.width = Math.round(L * dpr); canvas.height = Math.round(A * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const area = (L * A) / 10000;
      const fator = L < 700 ? .6 : 1; // telas pequenas: menos flocos
      flocos = [];
      CAMADAS.forEach((c, i) => {
        const n = Math.round(area * c.densidade * fator);
        for (let k = 0; k < n; k++) flocos.push(novo(c, i, true));
      });
      desenhar(0);
    }

    function desenhar(dt) {
      ctx.clearRect(0, 0, L, A);
      // rajada de vento que vai e volta devagar
      const vento = 26 + 22 * Math.sin(t * .23) + 12 * Math.sin(t * .71 + 1.3);
      for (const f of flocos) {
        if (dt) {
          f.y += f.v * dt;
          f.x += (vento * f.c.vento + Math.sin(t * f.freq + f.fase) * f.bal) * dt;
          if (f.y > A * f.fim || f.x > L + 20 || f.x < -40) Object.assign(f, novo(f.c, f.i, false), { x: Math.random() * (L + 80) - 60 });
        }
        // some aos poucos ao "pousar" no chão da sua profundidade
        const restante = A * f.fim - f.y;
        const alfa = f.a * Math.min(1, Math.max(0, restante / 40));
        if (alfa <= 0) continue;
        ctx.globalAlpha = alfa;
        const d = f.r * 2.6;
        ctx.drawImage(sprites[f.i], f.x - d / 2, f.y - d / 2, d, d);
      }
      ctx.globalAlpha = 1;
    }

    function quadro(agora) {
      raf = 0;
      if (!ligado || document.hidden) return;
      const dt = Math.min(.05, (agora - (ultimo || agora)) / 1000);
      ultimo = agora;
      if (reduzido()) { t = 0; desenhar(0); return; } // parada: só o desenho, sem movimento
      t += dt;
      desenhar(dt);
      raf = requestAnimationFrame(quadro);
    }
    function retomar() { if (!raf && ligado && !document.hidden) { ultimo = 0; raf = requestAnimationFrame(quadro); } }

    window.addEventListener('resize', () => { medir(); retomar(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else retomar(); });
    UC.Ajustes.aoMudar(retomar);
    medir();
    retomar();

    return {
      ligar(v) { ligado = v; if (v) retomar(); else { cancelAnimationFrame(raf); raf = 0; } },
      medir,
    };
  }

  return { iniciar };
})();

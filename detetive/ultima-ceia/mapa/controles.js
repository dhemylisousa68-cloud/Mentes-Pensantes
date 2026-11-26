// Controles extras do mapa:
//  Ctrl ...... sentar / levantar (cadeiras, poltronas, sofás e bancos do jardim)
//  Espaço .... pular (os outros jogadores veem)
//  F ......... investigar o lugar (a descrição que antes ficava no Espaço)
// O E continua para interagir: portas, portão, elevador, examinar pistas, pegar objetos e alimentos.
// Usa: x, y, dir, phase, seated, seatReturn, inside, benches, keys, msg, pick, investigate (mapa.js), Interior, Sentar, MapaOnline.
(() => {
  // ---------- sentar no Ctrl ----------
  function bancoPerto() {
    if (typeof benches === 'undefined') return null;
    return benches.filter(([a, b, d]) => Math.abs(x - a) < 58 && Math.abs(y - b) < 65 && (d === 3 ? y < b + 38 : y > b - 25))
      .sort((a, b) => Math.hypot(x - a[0], y - a[1]) - Math.hypot(x - b[0], y - b[1]))[0] || null;
  }
  function sentarFora() {
    if (seated) { seated = false; [x, y] = seatReturn; msg.textContent = 'Levantou'; return; }
    const b = bancoPerto();
    if (!b) { msg.textContent = 'Nenhum banco por perto.'; return; }
    seatReturn = [x, y]; [x, y] = b; dir = b[2]; phase = 0; seated = true; msg.textContent = 'Sentado — Ctrl para levantar';
  }
  function sentar() {
    if (window.Decoracao && Decoracao.modo) return;
    if (window.Comida && Comida.naMao) { msg.textContent = 'Coma (Q) ou devolva o alimento (E) antes de sentar.'; return; }
    if (inside) { if (window.Interior && Interior.sentar) Interior.sentar(); }
    else sentarFora();
  }
  // Ctrl sozinho (soltar sem ter apertado outra tecla junto), para não atrapalhar Ctrl+Z etc.
  let ctrlSozinho = false;
  addEventListener('keydown', (e) => {
    if (e.key === 'Control') { if (!e.repeat) ctrlSozinho = true; return; }
    ctrlSozinho = false;
  }, true);
  addEventListener('keyup', (e) => {
    if (e.key !== 'Control' || !ctrlSozinho) return;
    ctrlSozinho = false;
    if (/INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    sentar();
  }, true);
  // no jardim, o E não senta mais nos bancos (evita sentar sem querer ao pegar algo)
  const pegarAntes = pick;
  pick = function () {
    if (!inside && !seated) {
      const pertoPortao = Math.abs(x - 768) < 105 && Math.abs(y - 958) < 32;
      const pertoPorta = Math.hypot(x - 768, y - 380) < 40;
      const pertoGaragem = x > 177 && x < 282 && y > 365 && y < 435;
      const pertoCaixa = typeof obj !== 'undefined' && Math.hypot(x - obj.x, y - obj.y) < 55;
      if (!pertoPortao && !pertoPorta && !pertoGaragem && !pertoCaixa && !carry && bancoPerto()) { msg.textContent = 'Ctrl: sentar no banco'; return; }
    }
    return pegarAntes();
  };

  // ---------- pular no Espaço ----------
  const V0 = 330, GRAV = 1500, DUR = (2 * V0) / GRAV; // ~0,44 s, sobe ~36 px
  const altura = (ent) => {
    if (!ent || !ent.puloT0) return 0;
    const t = (performance.now() - ent.puloT0) / 1000;
    if (t >= DUR) { ent.puloT0 = 0; return 0; }
    return Math.max(0, V0 * t - GRAV * t * t / 2);
  };
  function pular() {
    const eu = window.__eu || (window.__eu = {});
    if (seated || (eu.puloT0 && altura(eu) > 0)) return;
    if (window.Comida && Comida.comendo) return;
    eu.puloT0 = performance.now();
    if (window.MapaOnline && MapaOnline.pronto) MapaOnline.mandar('pulo', {});
  }
  addEventListener('keydown', (e) => {
    if (e.key !== ' ' || /INPUT|TEXTAREA|BUTTON/.test(document.activeElement?.tagName || '')) return;
    if (document.querySelector('.inv-modal')) return;
    e.preventDefault(); e.stopImmediatePropagation(); // o Espaço não investiga mais: agora pula
    if (!e.repeat) pular();
  }, true);
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'f' || e.repeat || e.ctrlKey || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    investigate();
  });
  addEventListener('mapa:pulo', ({ detail: p }) => {
    const o = window.MapaOnline && MapaOnline.jogador(p.id);
    if (o) o.puloT0 = performance.now();
  });
  // desenha o boneco mais alto enquanto pula (a sombra continua no chão)
  const esperar = setInterval(() => {
    if (!window.Sentar || Sentar.__pulo) return;
    const orig = Sentar.desenhar;
    Sentar.desenhar = function (ent, im, fx, fy, s, px, py, sentado, d) {
      const z = sentado ? 0 : altura(ent);
      // um leve achatamento ao sair do chão e ao cair
      return orig.call(this, ent, im, fx, fy, s, px, py - z, sentado, d);
    };
    Sentar.__pulo = true; clearInterval(esperar);
  }, 50);

  window.Controles = { pular, sentar };
})();

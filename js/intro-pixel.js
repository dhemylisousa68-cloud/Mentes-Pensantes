// Intro de apresentação do Mentes Pensantes, em pixel art (adaptada de Mentes_Pensantes_Pixel_Cadencia.html).
// 0–4 s: o cérebro pulsa · 4–11 s: a lupa percorre o cérebro · 11–16,5 s: a lupa revela o interior da mente
// 16,5–24 s: o M pega o controle, cruza as pernas e liga a TV · 28–30 s: título · 32 s: fim → tela inicial.
// MP.Intro.iniciar(aoTerminar) é chamado no "Toque para começar" (o toque também libera o som).
window.MP = window.MP || {};

MP.Intro = (() => {
  const $ = (x) => document.getElementById(x);
  const raiz = $('portao'), c = $('ip-cabeca'), ctx = c.getContext('2d');
  const img = new Image(), atorImg = new Image(), quadros = [];
  const DURACAO = 32, BPM = 66, FPS_ATOR = 3;
  let w = 0, h = 0, dpr = 1, pronto = false, atorPronto = false, rodando = false;
  let tempo = 0, ultimo = 0, batida = 0, soou = -1, anterior = 0, pulso = 0, fim = null, acabou = false;
  let ac = null, nos = [];
  const suave = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
  const somLigado = () => !(MP.Som && MP.Som.mudo);
  const volume = () => (window.UC && UC.Ajustes ? UC.Ajustes.get('efeitos') / 100 : .7);

  function medir() {
    w = raiz.clientWidth; h = raiz.clientHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
  }
  new ResizeObserver(medir).observe(raiz);

  function tom(f, d, v, fimF = f) {
    if (!ac || !somLigado()) return;
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
    o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(fimF, t + d);
    g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(v * volume(), t + .02); g.gain.exponentialRampToValueAtTime(.001, t + d);
    o.connect(g); g.connect(ac.destination); o.start(); o.stop(t + d);
    nos.push(o); o.onended = () => { nos = nos.filter((n) => n !== o); };
  }
  function silenciar() { nos.forEach((n) => { try { n.stop(); } catch (e) { /* já parou */ } }); nos = []; }

  // só a parte de cima (o cérebro) se deforma com a pulsação; rosto e borda ficam parados
  function desenharCabeca(x, y, ww, hh) {
    const corte = Math.floor(img.height * .49), fator = hh / img.height;
    ctx.drawImage(img, 0, corte, img.width, img.height - corte, x, y + corte * fator, ww, (img.height - corte) * fator);
    const passo = 3;
    const yMapa = (linha) => { const v = linha / corte; return y + linha * fator - pulso * hh * .018 * Math.pow(1 - v, 2); };
    for (let linha = 0; linha < corte; linha += passo) {
      const ate = Math.min(corte, linha + passo), v = (linha + ate) / 2 / corte;
      const largura = ww * (1 + .027 * pulso * Math.sin(Math.PI * v));
      const dy = yMapa(linha), dh = yMapa(ate) - dy;
      ctx.drawImage(img, 0, linha, img.width, ate - linha, x + (ww - largura) / 2, dy, largura, dh + .35);
    }
  }

  atorImg.onload = () => {
    for (let i = 0; i < 6; i++) {
      const q = document.createElement('canvas'); q.width = 683; q.height = 384;
      q.getContext('2d').drawImage(atorImg, (i % 3) * atorImg.width / 3, Math.floor(i / 3) * atorImg.height / 2, atorImg.width / 3, atorImg.height / 2, 0, 0, 683, 384);
      quadros.push(q);
    }
    atorPronto = true;
  };
  atorImg.src = 'assets/intro/m-sofa.png';

  const clique = () => 17 + 5 / FPS_ATOR + .12;
  function animarM(t) {
    if (!atorPronto) return;
    const cx = $('ip-ator').getContext('2d');
    const q = Math.max(0, Math.min(5, Math.floor((t - 17) * FPS_ATOR)));
    cx.imageSmoothingEnabled = false; cx.clearRect(0, 0, 683, 384);
    cx.drawImage(quadros[0], 0, 0);
    cx.drawImage(quadros[q], 110, 62, 280, 307, 110, 62, 280, 307); // a sala fica parada; só o M muda
    if (t >= clique() && anterior < clique() && rodando) { tom(850, .08, .05, 300); tom(95, .65, .035, 60); }
    anterior = t;
  }

  function arcoPixel(cx, x, y, r, a0, a1) {
    const passos = Math.max(8, Math.ceil((a1 - a0) * r / 8));
    for (let k = 0; k <= passos; k++) {
      const a = a0 + (a1 - a0) * k / passos, px = Math.round((x + Math.cos(a) * r) / 4) * 4, py = Math.round((y + Math.sin(a) * r) / 4) * 4;
      if (k === 0) cx.moveTo(px, py); else cx.lineTo(px, py);
    }
  }

  function quadro(agora) {
    const dt = Math.min((agora - ultimo) / 1000 || 0, .05); ultimo = agora;
    if (rodando && pronto) {
      tempo += dt; batida += dt * BPM / 60;
      if (tempo >= DURACAO) { tempo = DURACAO; terminar(); }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, w, h);
    const fundo = ctx.createRadialGradient(w / 2, h * .45, 10, w / 2, h * .45, Math.max(w, h) * .65);
    fundo.addColorStop(0, '#252331'); fundo.addColorStop(1, '#090c13'); ctx.fillStyle = fundo; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 30; i++) {
      const a = i * 2.399 + tempo * .025, r = Math.min(w, h) * (.28 + (i % 7) * .046);
      ctx.fillStyle = `rgba(209,182,125,${.13 + (i % 4) * .09})`; ctx.beginPath();
      ctx.arc(w / 2 + Math.cos(a) * r, h * .46 + Math.sin(a) * r, 1 + (i % 3) * .5, 0, Math.PI * 2); ctx.fill();
    }
    if (pronto) {
      const fase = batida % 1;
      pulso = rodando ? Math.exp(-Math.pow((fase - .14) / .085, 2)) + .4 * Math.exp(-Math.pow((fase - .36) / .1, 2)) : 0;
      const mergulho = suave((tempo - 11) / 4.5), some = 1 - suave((tempo - 15) / 1.5);
      const ih = Math.min(h * .84, w * 1.08), iw = ih * img.width / img.height, cx = w * .5, cy = h * .48;
      const rota = suave((tempo - 4) / 6), ang = rota * Math.PI * 2 - Math.PI / 2, assenta = suave((tempo - 9.3) / 1.7);
      const lx = cx + Math.cos(ang) * iw * .19 * (1 - assenta), ly = cy - ih * .23 + Math.sin(ang) * ih * .085 * (1 - assenta);
      ctx.save(); ctx.globalAlpha = some;
      const brilho = ctx.createRadialGradient(cx, cy - ih * .18, 0, cx, cy - ih * .18, iw * .65);
      brilho.addColorStop(0, `rgba(169,145,190,${.08 + pulso * .10})`); brilho.addColorStop(1, 'rgba(169,145,190,0)');
      ctx.fillStyle = brilho; ctx.fillRect(cx - iw, cy - ih, iw * 2, ih * 2);
      const x = cx - iw / 2, y = cy - ih / 2;
      desenharCabeca(x, y, iw, ih);
      // lupa
      const aparece = suave((tempo - 4) / 1.4), raio0 = Math.max(65, Math.min(iw * .32, 145));
      const raioTotal = Math.hypot(Math.max(lx, w - lx), Math.max(ly, h - ly)) + 24, raio = raio0 + (raioTotal - raio0) * mergulho;
      if (aparece > 0) {
        ctx.save(); ctx.globalAlpha *= aparece;
        ctx.save(); ctx.beginPath(); arcoPixel(ctx, lx, ly, raio, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = '#191923'; ctx.fillRect(lx - raio, ly - raio, raio * 2, raio * 2);
        ctx.translate(lx, ly); ctx.scale(1.7, 1.7); ctx.translate(-lx, -ly); desenharCabeca(x, y, iw, ih); ctx.restore();
        ctx.strokeStyle = '#e4c487'; ctx.lineWidth = 10; ctx.beginPath(); arcoPixel(ctx, lx, ly, raio, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = '#fff0ce'; ctx.lineWidth = 2; ctx.beginPath(); arcoPixel(ctx, lx, ly, Math.max(1, raio - 7), 0, Math.PI * 2); ctx.stroke();
        ctx.lineCap = 'square'; ctx.strokeStyle = '#b7945d'; ctx.lineWidth = 22; ctx.beginPath(); ctx.moveTo(lx + raio * .72, ly + raio * .72); ctx.lineTo(lx + raio * 1.5, ly + raio * 1.5); ctx.stroke();
        ctx.strokeStyle = '#ffffffaa'; ctx.lineWidth = 5; ctx.beginPath(); arcoPixel(ctx, lx, ly, raio * .82, 3.5, 4.3); ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
      $('ip-titulo').style.opacity = suave((tempo - 28) / 2);
      const cena = $('ip-cena');
      cena.style.clipPath = `circle(${Math.max(0, raio - 10)}px at ${lx}px ${ly}px)`;
      cena.style.opacity = suave((tempo - 11.2) / 3.4);
      cena.classList.toggle('ligada', tempo > clique());
      cena.classList.toggle('logo', tempo > clique() + .9);
      animarM(tempo);
      $('ip-barra').style.width = `${tempo / DURACAO * 100}%`;
      if (rodando && Math.floor(batida) !== soou) { soou = Math.floor(batida); tom(57, .33, .065, 35); tom(220 * Math.pow(2, (soou % 4) / 12), 1.5, .009); }
    }
    if (!acabou) requestAnimationFrame(quadro);
  }

  function terminar() {
    if (acabou) return;
    acabou = true; rodando = false; silenciar();
    $('ip-pular').hidden = true;
    if (fim) { const f = fim; fim = null; f(); }
  }

  img.onload = () => { pronto = true; };
  img.src = 'assets/intro/cabeca.png';
  medir();
  requestAnimationFrame(quadro);

  $('ip-pular').addEventListener('click', terminar);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && rodando) { e.preventDefault(); terminar(); } });
  document.addEventListener('visibilitychange', () => { if (document.hidden) silenciar(); });
  window.addEventListener('pagehide', silenciar);

  return {
    iniciar(aoTerminar) {
      fim = aoTerminar;
      try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); ac.resume(); } catch (e) { ac = null; }
      if (window.UC && UC.Ajustes && UC.Ajustes.get('reduzido')) { terminar(); return; }
      raiz.classList.add('rodando');
      $('ip-pular').hidden = false;
      $('ip-pular').focus({ preventScroll: true });
      tempo = 0; batida = 0; soou = -1; rodando = true;
    },
  };
})();

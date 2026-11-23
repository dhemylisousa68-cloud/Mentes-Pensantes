// Sons da intro e da tela principal, gerados com Web Audio (sem arquivos).
// Trilha original: baixo "pé ante pé" em mi menor, com escovinha e acordes de vibrafone.
window.MP = window.MP || {};

MP.Som = (() => {
  let ctx = null, geral, musica, efeitos, reverb;
  let tocandoMusica = false, relogio = null, proximo = 0, passo = 0;
  let mudo = false;
  try { mudo = localStorage.getItem('mp_mudo') === '1'; } catch (e) { /* ignora */ }

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const BPM = 96;
  const COL = 60 / BPM / 2;

  // 4 compassos de 8 colcheias (null = pausa)
  const BAIXO = [
    [40, null, 43, null, 45, null, 46, 47],
    [40, null, 43, null, 45, 46, 45, 43],
    [40, null, 43, null, 45, null, 46, 47],
    [52, null, 50, null, 47, null, 46, 45],
  ];
  const ACORDES = [[64, 67, 71, 74, 78], null, [62, 65, 69, 72, 76], null];

  function iniciar() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    geral = ctx.createGain();
    geral.gain.value = mudo ? 0 : 1;
    geral.connect(ctx.destination);
    musica = ctx.createGain();
    efeitos = ctx.createGain();
    musica.connect(geral); efeitos.connect(geral);
    reverb = ctx.createConvolver();
    const dur = 2.2, buf = ctx.createBuffer(2, ctx.sampleRate * dur, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    }
    reverb.buffer = buf;
    const ret = ctx.createGain(); ret.gain.value = .3;
    reverb.connect(ret); ret.connect(geral);
    volumes();
  }

  function volumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    musica.gain.setTargetAtTime((UC.Ajustes.get('musica') / 100) * .8, t, .1);
    efeitos.gain.setTargetAtTime(UC.Ajustes.get('efeitos') / 100, t, .1);
  }
  UC.Ajustes.aoMudar(volumes);

  function ruido(seg) {
    const b = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * seg), ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = b; return s;
  }

  function env(g, t, pico, ataque, queda) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(pico, t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + queda);
  }

  // ---------- música ----------
  function pizz(m, t) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = hz(m);
    f.type = 'lowpass'; f.frequency.setValueAtTime(1400, t); f.frequency.exponentialRampToValueAtTime(300, t + .3);
    env(g, t, .5, .008, .38);
    o.connect(f); f.connect(g); g.connect(musica);
    o.start(t); o.stop(t + .5);
  }
  function escovinha(t, forte) {
    const s = ruido(.12), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 6000;
    env(g, t, forte ? .05 : .025, .005, .09);
    s.connect(f); f.connect(g); g.connect(musica); s.start(t);
  }
  function vibra(notas, t) {
    notas.forEach((m, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), trem = ctx.createOscillator(), tg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = hz(m);
      trem.frequency.value = 5; tg.gain.value = .02;
      trem.connect(tg); tg.connect(g.gain);
      const ti = t + i * .03;
      env(g, ti, .045, .01, 2.6);
      o.connect(g); g.connect(musica); g.connect(reverb);
      o.start(ti); trem.start(ti); o.stop(ti + 2.8); trem.stop(ti + 2.8);
    });
  }
  function agendar() {
    while (proximo < ctx.currentTime + .4) {
      const c = Math.floor(passo / 8) % BAIXO.length, col = passo % 8;
      const n = BAIXO[c][col];
      if (n != null) pizz(n, proximo);
      if (col % 2 === 1) escovinha(proximo, col === 3 || col === 7);
      if (col === 0 && ACORDES[c]) vibra(ACORDES[c], proximo + COL);
      proximo += COL; passo++;
    }
  }
  function tocarMusica() {
    iniciar();
    if (!ctx || tocandoMusica) return;
    tocandoMusica = true;
    proximo = ctx.currentTime + .2; passo = 0;
    relogio = setInterval(agendar, 100);
  }
  function pararMusica() { tocandoMusica = false; clearInterval(relogio); }

  // ---------- efeitos ----------
  function drone(seg = 4) {
    if (!ctx) return;
    const t = ctx.currentTime, f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 180;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(.35, t + 1.2);
    g.gain.setValueAtTime(.35, t + seg - 1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + seg);
    [40, 40.12, 47].forEach((m) => {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
      o.connect(f); o.start(t); o.stop(t + seg + .1);
    });
    f.connect(g); g.connect(efeitos);
  }
  function tique(atraso = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + atraso, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1800;
    env(g, t, .05, .002, .03);
    o.connect(g); g.connect(efeitos); o.start(t); o.stop(t + .05);
  }
  function zumbidoLuz() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [0, .13, .24, .33].forEach((d) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 120;
      env(g, t + d, .08, .005, .07);
      o.connect(g); g.connect(efeitos); o.start(t + d); o.stop(t + d + .1);
    });
    const s = ruido(.05), g2 = ctx.createGain();
    env(g2, t + .4, .3, .002, .05); s.connect(g2); g2.connect(efeitos); s.start(t + .4);
  }
  function brilho() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [2093, 3136, 4186].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      env(g, t + i * .06, .09, .005, .6);
      o.connect(g); g.connect(efeitos); g.connect(reverb); o.start(t + i * .06); o.stop(t + 1);
    });
  }
  function impacto() {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + .4);
    env(g, t, .8, .005, .5);
    o.connect(g); g.connect(efeitos); o.start(t); o.stop(t + .6);
    const s = ruido(.4), f = ctx.createBiquadFilter(), g2 = ctx.createGain();
    f.type = 'bandpass'; f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(400, t + .35);
    env(g2, t, .25, .005, .35);
    s.connect(f); f.connect(g2); g2.connect(efeitos); g2.connect(reverb); s.start(t);
  }
  function puf() {
    if (!ctx) return;
    const t = ctx.currentTime, s = ruido(.8), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = .8;
    f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(300, t + .7);
    env(g, t, .5, .02, .7);
    s.connect(f); f.connect(g); g.connect(efeitos); g.connect(reverb); s.start(t);
  }
  function risada() {
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (let i = 0; i < 6; i++) {
      const t = t0 + i * .26, o = ctx.createOscillator(), f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(118 - i * 4, t); o.frequency.exponentialRampToValueAtTime(92 - i * 3, t + .18);
      f1.type = 'bandpass'; f1.frequency.value = 650; f1.Q.value = 4;
      f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 5;
      env(g, t, .55, .02, .17);
      o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(efeitos); g.connect(reverb);
      o.start(t); o.stop(t + .25);
      const s = ruido(.08), fh = ctx.createBiquadFilter(), gh = ctx.createGain();
      fh.type = 'highpass'; fh.frequency.value = 2000;
      env(gh, t, .12, .005, .07); s.connect(fh); fh.connect(gh); gh.connect(efeitos); s.start(t);
    }
  }
  function lamina() {
    if (!ctx) return;
    const t = ctx.currentTime, s = ruido(.5), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.setValueAtTime(2500, t); f.frequency.exponentialRampToValueAtTime(7000, t + .3);
    env(g, t, .25, .01, .35);
    s.connect(f); f.connect(g); g.connect(efeitos); s.start(t);
    const o = ctx.createOscillator(), g2 = ctx.createGain();
    o.type = 'sine'; o.frequency.value = 3520;
    env(g2, t + .05, .06, .005, .8);
    o.connect(g2); g2.connect(efeitos); g2.connect(reverb); o.start(t); o.stop(t + 1);
  }
  function clique() {
    if (!ctx) return;
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(700, t); o.frequency.exponentialRampToValueAtTime(380, t + .06);
    env(g, t, .14, .003, .07);
    o.connect(g); g.connect(efeitos); o.start(t); o.stop(t + .1);
  }

  function alternarMudo() {
    mudo = !mudo;
    try { localStorage.setItem('mp_mudo', mudo ? '1' : '0'); } catch (e) { /* ignora */ }
    if (ctx) geral.gain.setTargetAtTime(mudo ? 0 : 1, ctx.currentTime, .05);
    return mudo;
  }

  return {
    iniciar, tocarMusica, pararMusica, drone, tique, zumbidoLuz, brilho, impacto, puf, risada, lamina, clique,
    alternarMudo, get mudo() { return mudo; }, get ativo() { return !!ctx; },
  };
})();

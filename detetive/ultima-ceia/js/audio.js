// Música e efeitos gerados no próprio navegador (Web Audio), sem arquivos externos.
// Melodia original em ré menor, no estilo caixinha de música.
// O áudio só começa depois da primeira interação do usuário (exigência dos navegadores e do roteiro).
window.UC = window.UC || {};

UC.Som = (() => {
  let ctx = null;
  let geral, musica, efeitos, reverb;
  let iniciado = false;
  let proximoTempo = 0;
  let passo = 0;
  let relogio = null;

  const BPM = 64;
  const COLCHEIA = 60 / BPM / 2;

  // 8 compassos, 8 colcheias cada (null = pausa). Números MIDI.
  const MELODIA = [
    [62, 69, 74, 69, 77, null, 74, null],
    [58, 65, 70, 65, 74, null, 72, null],
    [55, 62, 67, 62, 70, null, 69, null],
    [57, 64, 69, 64, 73, null, null, null],
    [62, 69, 74, 69, 76, 77, 76, 74],
    [53, 60, 65, 60, 72, null, 69, null],
    [55, 62, 67, 70, 69, 64, 61, 64],
    [62, null, 69, null, 74, null, null, null],
  ];
  const ACORDES = [
    [38, 50, 53, 57], [34, 46, 50, 53], [31, 43, 46, 50], [33, 45, 49, 52],
    [38, 50, 53, 57], [29, 41, 45, 48], [31, 43, 46, 50], [38, 50, 53, 57],
  ];

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  function criarReverb() {
    const dur = 2.8;
    const taxa = ctx.sampleRate;
    const buf = ctx.createBuffer(2, taxa * dur, taxa);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    return conv;
  }

  function ruido(segundos) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * segundos, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function notaCaixinha(m, t, forca = 1) {
    const f = hz(m + 12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * forca, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 2.2);
    const o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    const o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 4.02;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.05 * forca, t);
    g2.gain.exponentialRampToValueAtTime(0.0005, t + 0.35);
    o1.connect(g); o2.connect(g2); g2.connect(g);
    g.connect(musica); g.connect(reverb);
    o1.start(t); o2.start(t);
    o1.stop(t + 2.3); o2.stop(t + 2.3);
  }

  function acorde(notas, t, dur) {
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 700;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.03, t + 1.2);
    g.gain.setValueAtTime(0.03, t + dur - 0.6);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.4);
    filtro.connect(g); g.connect(musica); g.connect(reverb);
    notas.forEach((m) => {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = hz(m);
      o.detune.value = (Math.random() - 0.5) * 8;
      o.connect(filtro);
      o.start(t); o.stop(t + dur + 0.5);
    });
  }

  function agendar() {
    while (proximoTempo < ctx.currentTime + 0.4) {
      const compasso = Math.floor(passo / 8) % MELODIA.length;
      const col = passo % 8;
      if (col === 0) acorde(ACORDES[compasso], proximoTempo, COLCHEIA * 8);
      const m = MELODIA[compasso][col];
      if (m != null) notaCaixinha(m, proximoTempo, col % 2 === 0 ? 1 : 0.75);
      proximoTempo += COLCHEIA;
      passo++;
    }
  }

  function iniciarChuva() {
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruido(3);
    fonte.loop = true;
    const pb = ctx.createBiquadFilter();
    pb.type = 'bandpass';
    pb.frequency.value = 1400;
    pb.Q.value = 0.5;
    const pa = ctx.createBiquadFilter();
    pa.type = 'lowpass';
    pa.frequency.value = 5000;
    const g = ctx.createGain();
    g.gain.value = 0.07;
    fonte.connect(pb); pb.connect(pa); pa.connect(g); g.connect(efeitos);
    fonte.start();
  }

  function aplicarVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    musica.gain.setTargetAtTime(UC.Ajustes.get('musica') / 100, t, 0.1);
    efeitos.gain.setTargetAtTime(UC.Ajustes.get('efeitos') / 100, t, 0.1);
  }

  function iniciar() {
    if (iniciado) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    iniciado = true;
    ctx = new AC();
    geral = ctx.createGain();
    geral.gain.value = 0;
    geral.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
    geral.connect(ctx.destination);
    musica = ctx.createGain();
    efeitos = ctx.createGain();
    musica.connect(geral); efeitos.connect(geral);
    reverb = criarReverb();
    const retorno = ctx.createGain();
    retorno.gain.value = 0.35;
    reverb.connect(retorno); retorno.connect(musica);
    aplicarVolumes();
    iniciarChuva();
    proximoTempo = ctx.currentTime + 0.3;
    relogio = setInterval(agendar, 100);
    agendar();
  }

  function clique() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.07);
    g.gain.setValueAtTime(0.12, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(g); g.connect(efeitos);
    o.start(t); o.stop(t + 0.1);
  }

  function rangido(atraso = 0) {
    if (!ctx) return;
    const t = ctx.currentTime + atraso;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(70, t);
    o.frequency.linearRampToValueAtTime(115, t + 0.5);
    o.frequency.linearRampToValueAtTime(85, t + 1.1);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 23;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 14;
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    const filtro = ctx.createBiquadFilter();
    filtro.type = 'bandpass';
    filtro.frequency.value = 900;
    filtro.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.15);
    g.gain.linearRampToValueAtTime(0.12, t + 0.8);
    g.gain.linearRampToValueAtTime(0, t + 1.2);
    o.connect(filtro); filtro.connect(g); g.connect(efeitos); g.connect(reverb);
    o.start(t); lfo.start(t);
    o.stop(t + 1.3); lfo.stop(t + 1.3);
  }

  function silenciarMusica(seg = 1.5) {
    if (!ctx) return;
    musica.gain.setTargetAtTime(0.0001, ctx.currentTime, seg / 3);
  }

  function retomarMusica() { aplicarVolumes(); }

  UC.Ajustes.aoMudar(aplicarVolumes);

  return { iniciar, clique, rangido, silenciarMusica, retomarMusica, get ativo() { return iniciado; } };
})();

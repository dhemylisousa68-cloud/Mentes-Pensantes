// Chat de voz por proximidade: aperte e segure Z (ou o botão 🎤) para falar.
// - O áudio vai direto entre os aparelhos (WebRTC). O canal do Supabase só serve para eles se encontrarem.
// - Ouvir fica sempre ligado: quem nunca falou também escuta. O microfone só é pedido no primeiro Z.
// - Proximidade: quem está perto no mapa se ouve alto; longe, baixinho; a partir de ~650 px, nada.
//   Quem está em outro lugar (hall, garagem) não se ouve.
// - Em cima de quem está falando aparecem ondinhas de som (MapaOnline.falando).
// Limitação: sem servidor TURN, algumas redes (4G de certas operadoras, Wi-Fi de empresa) podem não conectar a voz.
(() => {
  if (!window.RTCPeerConnection) return;
  const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
  const PERTO = 140, LONGE = 650;
  const pares = new Map();      // id → { pc, sender, audio, ganho, iniciador, iceEspera: [] }
  let mic = null, pedindo = false, segurando = false;
  let actx = null;

  const css = document.createElement('style');
  css.textContent = `
    .voz-bt { position: fixed; z-index: 25; top: 76px; left: 62px; width: 42px; height: 42px; border-radius: 50%; padding: 0; font-size: 19px;
      background: rgba(12, 10, 9, .65); border: 1px solid #a38b62; color: #fff; touch-action: none; user-select: none; -webkit-user-select: none; }
    .voz-bt.falando { background: #2f6b3a; border-color: #9fe0a0; box-shadow: 0 0 0 4px rgba(159, 224, 160, .35); }
    .voz-bt.negado { opacity: .5; }
    body.com-toque .voz-bt { top: auto; left: auto; right: max(16px, env(safe-area-inset-right)); bottom: 170px; width: 54px; height: 54px; font-size: 22px; }`;
  document.head.appendChild(css);
  const bt = document.createElement('button');
  bt.type = 'button'; bt.className = 'voz-bt'; bt.textContent = '🎤';
  bt.title = 'Segure Z (ou este botão) para falar';
  bt.setAttribute('aria-label', 'Segure para falar');
  document.body.appendChild(bt);

  const M = () => window.MapaOnline;
  const sinal = (para, dados) => M() && M().mandar('voz', { ...dados, para });
  const aviso = (t) => { const m = document.getElementById('msg'); if (m) m.textContent = t; };

  // ---------- qualidade do som ----------
  // Quem ouve: todas as vozes passam por um limitador (pode aumentar sem estourar) e pelo volume escolhido.
  const REFORCO = 2.2;               // as vozes chegavam baixas: ganho extra antes do limitador
  let saida = null, volumeVoz = 1;
  try { volumeVoz = Math.min(3, Math.max(0, Number(localStorage.getItem('uc_volume_voz') || 1))); } catch (e) { /* ignora */ }
  function contexto() {
    if (!actx && (window.AudioContext || window.webkitAudioContext)) {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      const lim = actx.createDynamicsCompressor();
      lim.threshold.value = -10; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.15;
      saida = actx.createGain(); saida.gain.value = volumeVoz;
      lim.connect(saida).connect(actx.destination);
      saida.entrada = lim;
    }
    return actx;
  }
  // Opus com correção de perdas e mais bits (voz mais limpa)
  function opus(sdp) {
    const m = sdp.match(/a=rtpmap:(\d+) opus\/48000/i);
    if (!m) return sdp;
    const pt = m[1], extra = 'useinbandfec=1;stereo=0;maxaveragebitrate=64000;cbr=0';
    return new RegExp(`a=fmtp:${pt} `).test(sdp)
      ? sdp.replace(new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`), (l, p) => `a=fmtp:${pt} ${p.split(';').filter((x) => !/^(useinbandfec|stereo|maxaveragebitrate|cbr)=/.test(x)).concat(extra).join(';')}`)
      : sdp.replace(m[0], `${m[0]}\r\na=fmtp:${pt} ${extra}`);
  }
  async function descrever(pc, desc) { await pc.setLocalDescription({ type: desc.type, sdp: opus(desc.sdp) }); }
  function caprichar(sender) {
    try {
      const pr = sender.getParameters();
      if (!pr.encodings || !pr.encodings.length) pr.encodings = [{}];
      pr.encodings[0].maxBitrate = 64000;
      sender.setParameters(pr).catch(() => {});
    } catch (e) { /* ignora */ }
  }

  // áudio só pode tocar depois de um toque/tecla: destrava na primeira interação
  function destravar() {
    contexto();
    if (actx && actx.state === 'suspended') actx.resume();
    for (const p of pares.values()) if (p.audio) p.audio.play().catch(() => {});
  }
  addEventListener('pointerdown', destravar);
  addEventListener('keydown', destravar);

  // ---------- conexões ----------
  function criar(id, iniciador) {
    fechar(id);
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const p = { pc, sender: null, audio: null, ganho: null, iniciador, iceEspera: [] };
    pares.set(id, p);
    pc.onicecandidate = (e) => { if (e.candidate) sinal(id, { tipo: 'ice', c: e.candidate.toJSON() }); };
    pc.ontrack = (e) => tocar(id, p, e.streams[0] || new MediaStream([e.track]));
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' && p.iniciador && pares.get(id) === p) setTimeout(() => { if (pares.get(id) === p) chamar(id); }, 3000);
    };
    return p;
  }
  function fechar(id) {
    const p = pares.get(id);
    if (!p) return;
    try { p.pc.close(); } catch (e) { /* ignora */ }
    if (p.audio) { p.audio.srcObject = null; p.audio.remove(); }
    if (p.fonte) try { p.fonte.disconnect(); } catch (e) { /* ignora */ }
    pares.delete(id);
    M() && M().falando.delete(id);
  }
  async function chamar(id) {            // sou o iniciador (menor id): mando a oferta
    const p = criar(id, true);
    const tr = p.pc.addTransceiver('audio', { direction: 'sendrecv' });
    p.sender = tr.sender;
    if (mic) await p.sender.replaceTrack(mic);
    await descrever(p.pc, await p.pc.createOffer());
    caprichar(p.sender);
    sinal(id, { tipo: 'sdp', sdp: p.pc.localDescription.toJSON() });
  }
  async function receberSdp(id, sdp) {
    let p = pares.get(id);
    if (sdp.type === 'offer') {
      p = criar(id, false);
      await p.pc.setRemoteDescription(sdp);
      const tr = p.pc.getTransceivers().find((t) => t.receiver.track && t.receiver.track.kind === 'audio') || p.pc.getTransceivers()[0];
      tr.direction = 'sendrecv';
      p.sender = tr.sender;
      if (mic) await p.sender.replaceTrack(mic);
      await descrever(p.pc, await p.pc.createAnswer());
      caprichar(p.sender);
      sinal(id, { tipo: 'sdp', sdp: p.pc.localDescription.toJSON() });
    } else if (p && sdp.type === 'answer' && p.pc.signalingState === 'have-local-offer') {
      await p.pc.setRemoteDescription(sdp);
    } else return;
    for (const c of p.iceEspera.splice(0)) p.pc.addIceCandidate(c).catch(() => {});
  }
  function receberIce(id, c) {
    const p = pares.get(id);
    if (!p) return;
    if (p.pc.remoteDescription) p.pc.addIceCandidate(c).catch(() => {}); else p.iceEspera.push(c);
  }

  // toca a voz do outro: com WebAudio (volume por distância funciona até no iPhone)
  function tocar(id, p, stream) {
    if (!p.audio) {
      p.audio = document.createElement('audio');
      p.audio.autoplay = true; p.audio.playsInline = true;
      document.body.appendChild(p.audio);
    }
    p.audio.srcObject = stream;
    if (contexto()) {
      p.audio.muted = true; // o som sai pelo WebAudio; o elemento só mantém o fluxo vivo
      p.fonte = actx.createMediaStreamSource(stream);
      // tira o ronco grave e o chiado agudo antes de aumentar
      const grave = actx.createBiquadFilter(); grave.type = 'highpass'; grave.frequency.value = 85;
      const agudo = actx.createBiquadFilter(); agudo.type = 'lowpass'; agudo.frequency.value = 8000;
      p.ganho = actx.createGain(); p.ganho.gain.value = 0;
      p.fonte.connect(grave).connect(agudo).connect(p.ganho).connect(saida.entrada);
    }
    p.audio.play().catch(() => {});
  }

  // ---------- quem está no mapa ----------
  addEventListener('mapa:jogadores', ({ detail: ids }) => {
    const meu = M() && M().meuId;
    if (!meu) return;
    for (const id of ids) if (!pares.has(id) && meu < id) chamar(id).catch(() => {});
    for (const id of [...pares.keys()]) if (!ids.includes(id)) fechar(id);
  });
  addEventListener('mapa:voz', ({ detail: d }) => {
    const meu = M() && M().meuId;
    if (d.tipo === 'fala') { if (d.on) M().falando.add(d.id); else M().falando.delete(d.id); return; }
    if (d.para !== meu) return;
    if (d.tipo === 'sdp' && d.sdp) receberSdp(d.id, d.sdp).catch(() => {});
    else if (d.tipo === 'ice' && d.c) receberIce(d.id, d.c);
  });

  // ---------- volume pela distância ----------
  setInterval(() => {
    if (!M()) return;
    for (const [id, p] of pares) {
      const o = M().jogador(id);
      let v = 0;
      if (o && !!o.inside === !!inside && !!o.garage === !!garage) {
        const d = Math.hypot(o.x - x, o.y - y);
        v = d <= PERTO ? 1 : d >= LONGE ? 0 : Math.pow(1 - (d - PERTO) / (LONGE - PERTO), 1.6);
        if (inside) v = 1; // dentro do hall/garagem todos se ouvem
      }
      if (p.ganho) p.ganho.gain.setTargetAtTime(v * REFORCO, actx.currentTime, 0.12);
      else if (p.audio) p.audio.volume = v;
    }
  }, 150);

  // ---------- microfone tratado antes de enviar ----------
  // filtro do ronco grave e do chiado → compressor (iguala voz alta e baixa) → ganho → portão de ruído
  // (o portão fecha quando só tem chiado de fundo entre as palavras)
  let micBruto = null, portao = null, medidor = null;
  const PORTAO_DB = -52, SEGURA_MS = 280;
  function tratar(stream) {
    if (!contexto() || !actx.createMediaStreamDestination) return null;
    const fonte = actx.createMediaStreamSource(stream);
    const grave = actx.createBiquadFilter(); grave.type = 'highpass'; grave.frequency.value = 100;
    const agudo = actx.createBiquadFilter(); agudo.type = 'lowpass'; agudo.frequency.value = 7600;
    const comp = actx.createDynamicsCompressor();
    comp.threshold.value = -30; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    const ganho = actx.createGain(); ganho.gain.value = 1.8;
    portao = actx.createGain(); portao.gain.value = 0;
    medidor = actx.createAnalyser(); medidor.fftSize = 1024;
    const destino = actx.createMediaStreamDestination();
    fonte.connect(grave).connect(agudo);
    agudo.connect(medidor);
    agudo.connect(comp).connect(ganho).connect(portao).connect(destino);
    const buf = new Float32Array(medidor.fftSize);
    let aberto = false, ultimaVoz = 0;
    setInterval(() => {
      if (!segurando) { if (aberto) { aberto = false; portao.gain.setTargetAtTime(0, actx.currentTime, 0.05); } return; }
      medidor.getFloatTimeDomainData(buf);
      let soma = 0; for (let i = 0; i < buf.length; i++) soma += buf[i] * buf[i];
      const db = 10 * Math.log10(soma / buf.length + 1e-12);
      const agora = performance.now();
      if (db > PORTAO_DB) ultimaVoz = agora;
      const abrir = agora - ultimaVoz < SEGURA_MS;
      if (abrir !== aberto) { aberto = abrir; portao.gain.setTargetAtTime(abrir ? 1 : 0, actx.currentTime, abrir ? 0.01 : 0.08); }
    }, 20);
    return destino.stream.getAudioTracks()[0];
  }

  // volume da voz dos outros (no painel ⚙ Testes)
  (function controleVolume() {
    const painel = document.getElementById('painel-teste') || document.querySelector('main');
    if (!painel) return;
    const l = document.createElement('label');
    l.innerHTML = `Volume da voz <input type="range" min="0" max="300" step="10" value="${Math.round(volumeVoz * 100)}"> <output>${Math.round(volumeVoz * 100)}%</output>`;
    const r = l.querySelector('input'), o = l.querySelector('output');
    r.addEventListener('input', () => {
      volumeVoz = Number(r.value) / 100; o.textContent = r.value + '%';
      if (saida) saida.gain.setTargetAtTime(volumeVoz, actx.currentTime, 0.05);
      try { localStorage.setItem('uc_volume_voz', String(volumeVoz)); } catch (e) { /* ignora */ }
    });
    const ref = painel.querySelector('label');
    if (ref) ref.before(l); else painel.appendChild(l);
  })();

  // ---------- aperte e segure para falar ----------
  async function pegarMic() {
    if (mic || pedindo) return !!mic;
    pedindo = true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
      micBruto = s.getAudioTracks()[0];
      mic = tratar(s) || micBruto;
      mic.enabled = false;
      for (const p of pares.values()) if (p.sender) p.sender.replaceTrack(mic).catch(() => {});
      bt.classList.remove('negado');
      return true;
    } catch (e) {
      bt.classList.add('negado');
      aviso('Microfone bloqueado: libere o microfone para este site nas configurações do navegador.');
      return false;
    } finally { pedindo = false; }
  }
  async function comecar() {
    if (segurando) return;
    segurando = true;
    destravar();
    const ok = await pegarMic();
    if (!ok || !segurando) return; // soltou enquanto pedia permissão
    mic.enabled = true;
    bt.classList.add('falando');
    M() && M().falando.add('eu');
    M() && M().mandar('voz', { tipo: 'fala', on: true });
  }
  function parar() {
    if (!segurando) return;
    segurando = false;
    if (mic) mic.enabled = false;
    bt.classList.remove('falando');
    M() && M().falando.delete('eu');
    M() && M().mandar('voz', { tipo: 'fala', on: false });
  }
  const digitando = (e) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
  addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'z' && !e.repeat && !digitando(e)) comecar(); });
  addEventListener('keyup', (e) => { if (e.key.toLowerCase() === 'z') parar(); });
  addEventListener('blur', parar);
  bt.addEventListener('pointerdown', (e) => { e.preventDefault(); try { bt.setPointerCapture(e.pointerId); } catch (err) { /* ignora */ } comecar(); });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((t) => bt.addEventListener(t, parar));
  bt.addEventListener('contextmenu', (e) => e.preventDefault());

  addEventListener('pagehide', () => { for (const id of [...pares.keys()]) fechar(id); if (mic) mic.stop(); if (micBruto) micBruto.stop(); });
  window.MapaVoz = { pares, tratar, get segurando() { return segurando; }, set segurando(v) { segurando = v; } };
})();

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

  // áudio só pode tocar depois de um toque/tecla: destrava na primeira interação
  function destravar() {
    if (!actx && (window.AudioContext || window.webkitAudioContext)) actx = new (window.AudioContext || window.webkitAudioContext)();
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
    await p.pc.setLocalDescription(await p.pc.createOffer());
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
      await p.pc.setLocalDescription(await p.pc.createAnswer());
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
    if (actx || window.AudioContext || window.webkitAudioContext) {
      if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
      p.audio.muted = true; // o som sai pelo WebAudio; o elemento só mantém o fluxo vivo
      p.fonte = actx.createMediaStreamSource(stream);
      p.ganho = actx.createGain(); p.ganho.gain.value = 0;
      p.fonte.connect(p.ganho).connect(actx.destination);
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
      if (p.ganho) p.ganho.gain.setTargetAtTime(v, actx.currentTime, 0.12);
      else if (p.audio) p.audio.volume = v;
    }
  }, 150);

  // ---------- aperte e segure para falar ----------
  async function pegarMic() {
    if (mic || pedindo) return !!mic;
    pedindo = true;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
      mic = s.getAudioTracks()[0];
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

  addEventListener('pagehide', () => { for (const id of [...pares.keys()]) fechar(id); if (mic) mic.stop(); });
  window.MapaVoz = { pares };
})();

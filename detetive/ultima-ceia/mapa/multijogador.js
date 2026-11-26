// Multijogador no mapa: cada jogador vê os outros andando, em tempo real (Supabase Realtime).
// - Um canal por sala ("mapa-CODIGO"). Abrindo o mapa direto, sem sala, todos caem no canal de teste "mapa-teste".
// - Presença: quem está no mapa (nome e personagem). Mensagens: posição, direção e se está andando/sentado.
// - Envia ~10 vezes por segundo enquanto anda, e a cada 2 s parado. Os outros são suavizados (interpolação).
// Também compartilha o mundo: portão (aberto/fechado) e a caixa (no chão ou na mão de alguém).
// Usa as variáveis do mapa.js: x, y, dir, phase, seated, inside, garage, imgs, selected, ctx, size, camX, camY, gateOpen, gateSide, carry, obj, msg.
(() => {
  const status = document.createElement('p');
  status.id = 'online-status';
  status.style.cssText = 'margin:6px 0;font-size:13px;color:#cdbb92';
  document.getElementById('cv').insertAdjacentElement('beforebegin', status);

  let convite = null;
  try { convite = JSON.parse(sessionStorage.getItem('mp_sala') || 'null'); } catch (e) { /* ignora */ }
  const codigo = convite && convite.codigo ? String(convite.codigo).toUpperCase() : null;
  const meuNome = (convite && convite.nome) || (() => { try { return localStorage.getItem('uc_nome'); } catch (e) { return null; } })() || 'Jogador';
  const canalNome = codigo ? `mapa-${codigo}` : 'mapa-teste';

  const outros = new Map(); // id → { nome, n, x, y, alvoX, alvoY, dir, andando, seated, inside, garage, phase, visto }
  let canal = null, meuId = null, pronto = false, ultimoEnvio = 0, ultimoEstado = '';

  function atualizarStatus() {
    const n = outros.size;
    status.textContent = (codigo ? `Sala ${codigo}` : 'Mapa de teste (aberto direto)') + ` · ${n + 1} no mapa` +
      (n ? ': ' + [meuNome, ...[...outros.values()].map((o) => o.nome)].join(', ') : '');
  }

  async function conectar() {
    if (!window.UC || !UC.Online || !UC.Online.disponivel()) { status.textContent = 'Sem conexão: só você no mapa.'; return; }
    try {
      meuId = await UC.Online.conectar();
      const sb = UC.Online.cliente;
      canal = sb.channel(canalNome, { config: { broadcast: { self: false }, presence: { key: meuId } } });
      canal
        .on('presence', { event: 'sync' }, () => {
          const estado = canal.presenceState();
          for (const [id, lista] of Object.entries(estado)) {
            if (id === meuId) continue;
            const p = lista[0] || {};
            const o = outros.get(id) || { x: 768, y: 750, alvoX: 768, alvoY: 750, dir: 0, phase: 0, andando: false };
            Object.assign(o, { id, nome: p.nome || 'Jogador', n: p.n || 1, visto: performance.now() });
            outros.set(id, o);
          }
          for (const id of [...outros.keys()]) if (!estado[id]) { saiu(id); outros.delete(id); }
          atualizarStatus();
          dispatchEvent(new CustomEvent('mapa:jogadores', { detail: [...outros.keys()] }));
        })
        .on('broadcast', { event: 'pos' }, ({ payload: p }) => {
          if (!p || p.id === meuId || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
          const o = outros.get(p.id) || { nome: p.nome, n: p.n, x: p.x, y: p.y, phase: 0 };
          // pulo grande (entrou/saiu de um lugar): teleporta em vez de deslizar
          if (Math.hypot(p.x - o.x, p.y - o.y) > 160 || p.inside !== o.inside || p.andar !== o.andar) { o.x = p.x; o.y = p.y; }
          Object.assign(o, { id: p.id, alvoX: p.x, alvoY: p.y, dir: p.dir, andando: p.andando, seated: p.seated, inside: p.inside, garage: p.garage, andar: p.andar ?? null, carry: !!p.carry, nome: p.nome || o.nome, n: p.n || o.n, visto: performance.now() });
          outros.set(p.id, o);
          atualizarStatus();
        })
        // chat de texto e sinais da voz: repassa para chat.js e voz.js
        .on('broadcast', { event: 'chat' }, ({ payload: p }) => { if (p && p.id !== meuId) dispatchEvent(new CustomEvent('mapa:chat', { detail: p })); })
        .on('broadcast', { event: 'voz' }, ({ payload: p }) => { if (p && p.id !== meuId) dispatchEvent(new CustomEvent('mapa:voz', { detail: p })); })
        .on('broadcast', { event: 'portao' }, ({ payload: p }) => receberPortao(p))
        .on('broadcast', { event: 'caixa' }, ({ payload: p }) => receberCaixa(p))
        .on('broadcast', { event: 'fis' }, ({ payload: p }) => { if (p && p.id !== meuId) dispatchEvent(new CustomEvent('mapa:fis', { detail: p })); })
        .on('broadcast', { event: 'comida' }, ({ payload: p }) => { if (p && p.id !== meuId) dispatchEvent(new CustomEvent('mapa:comida', { detail: p })); })
        .on('broadcast', { event: 'pulo' }, ({ payload: p }) => { if (p && p.id !== meuId) dispatchEvent(new CustomEvent('mapa:pulo', { detail: p })); })
        // alguém chegou: conta para ele como está o mundo (portão e caixa)
        .on('presence', { event: 'join' }, ({ key }) => { if (key !== meuId) setTimeout(enviarMundo, 300 + Math.random() * 400); })
        .subscribe(async (s) => {
          if (s !== 'SUBSCRIBED') return;
          pronto = true;
          await canal.track({ nome: meuNome, n: selected + 1 });
          dispatchEvent(new CustomEvent('mapa:conectado'));
          enviar(performance.now(), true);
          atualizarStatus();
        });
    } catch (e) {
      status.textContent = 'Não foi possível conectar: só você no mapa.';
    }
  }

  // ---------- mundo compartilhado: portão e caixa ----------
  // Quem mexe avisa os outros. O portão fecha sozinho só para quem abriu (e esse aviso também vai para todos).
  let portaoDono = null;               // id de outro jogador que abriu o portão
  let caixaDono = null;                 // id de outro jogador que está carregando a caixa
  const FORA = { x: -9999, y: -9999 };  // caixa "sumida" do chão (está na mão de alguém)
  let portaoVisto = '', caixaVista = '';

  const nomeDe = (id) => (outros.get(id) || {}).nome || 'Alguém';
  function avisar(texto) { msg.textContent = texto; }

  function receberPortao(p) {
    if (!p || typeof p.aberto !== 'boolean') return;
    if (gateOpen !== p.aberto) avisar(`${nomeDe(p.id)} ${p.aberto ? 'abriu' : 'fechou'} o portão`);
    gateOpen = p.aberto;
    if (p.aberto) { gateSide = p.lado; window.gateRemoto = true; portaoDono = p.id; } else portaoDono = null; // quem abriu é quem fecha
    portaoVisto = `${gateOpen}|${gateSide}`;
  }

  function receberCaixa(p) {
    if (!p) return;
    if (p.carregando) {
      if (carry) {
        // os dois pegaram ao mesmo tempo: fica com quem tem o menor id
        if (meuId < p.id) { enviarCaixa(); return; }
        carry = false;
      }
      if (caixaDono !== p.id) avisar(`${nomeDe(p.id)} pegou a caixa`);
      caixaDono = p.id;
      obj = { ...FORA };
    } else if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
      if (caixaDono === p.id) avisar(`${nomeDe(p.id)} soltou a caixa`);
      if (caixaDono === p.id || !carry) { caixaDono = null; obj = { x: p.x, y: p.y }; }
    }
    caixaVista = `${carry}|${Math.round(obj.x)}|${Math.round(obj.y)}`;
  }

  function enviarPortao() {
    canal.send({ type: 'broadcast', event: 'portao', payload: { id: meuId, aberto: gateOpen, lado: gateSide } });
  }
  function enviarCaixa() {
    canal.send({ type: 'broadcast', event: 'caixa', payload: carry ? { id: meuId, carregando: true } : { id: meuId, carregando: false, x: obj.x, y: obj.y } });
  }
  // para quem acabou de chegar: só conta o que sabe de verdade (a caixa no chão ou na própria mão)
  function enviarMundo() {
    if (!pronto) return;
    if (gateOpen) enviarPortao();
    if (carry || (!caixaDono && obj.x > -1000)) enviarCaixa();
  }

  // a cada quadro: se eu mudei o portão ou a caixa, avisa
  function verMundo() {
    const portao = `${gateOpen}|${gateSide}`;
    const caixa = `${carry}|${Math.round(obj.x)}|${Math.round(obj.y)}`;
    if (portaoVisto && portao !== portaoVisto) enviarPortao();
    if (caixaVista && caixa !== caixaVista) { if (carry) caixaDono = null; enviarCaixa(); }
    portaoVisto = portao; caixaVista = caixa;
  }

  // quem saiu do mapa carregando a caixa: ela cai onde ele estava
  function saiu(id) {
    const o = outros.get(id);
    if (portaoDono === id && gateOpen) { gateOpen = false; portaoDono = null; portaoVisto = ''; }
    if (caixaDono === id) { caixaDono = null; obj = o ? { x: o.x + 22, y: o.y } : { x: 810, y: 740 }; caixaVista = ''; }
  }

  // andar da mansão em que estou (null = fora)
  const andarAtual = () => (window.Interior ? Interior.andar : null);

  function enviar(t, forcar) {
    if (!pronto || !canal) return;
    verMundo();
    const andando = !!(keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright) && !seated;
    const estado = `${Math.round(x)},${Math.round(y)},${dir},${andando},${seated},${inside},${garage},${andarAtual()},${selected},${carry}`;
    const intervalo = andando ? 100 : 2000;
    if (!forcar && (t - ultimoEnvio < intervalo || (estado === ultimoEstado && t - ultimoEnvio < 2000))) return;
    ultimoEnvio = t; ultimoEstado = estado;
    canal.send({ type: 'broadcast', event: 'pos', payload: { id: meuId, nome: meuNome, n: selected + 1, x, y, dir, andando, seated, inside, garage, andar: andarAtual(), carry } });
  }

  // troca de personagem pelos botões de teste: avisa os outros
  document.getElementById('chars').addEventListener('click', () => setTimeout(() => {
    if (pronto) { canal.track({ nome: meuNome, n: selected + 1 }); enviar(performance.now(), true); }
  }, 0));

  function desenhar(dt) {
    const s = Number(size.value);
    const agora = performance.now();
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.font = '12px system-ui'; ctx.textAlign = 'center';
    for (const o of outros.values()) {
      if (agora - o.visto > 15000) continue;               // sumiu (aba fechada, sem rede)
      if (!!o.inside !== !!inside || !!o.garage !== !!garage || (inside && (o.andar ?? 0) !== andarAtual())) continue; // só quem está no mesmo lugar
      const k = Math.min(1, dt * 10);
      o.x += (o.alvoX - o.x) * k; o.y += (o.alvoY - o.y) * k;
      o.phase = o.andando ? o.phase + dt * Number(fps.value) : 0;
      const im = imgs[(o.n || 1) - 1];
      // sombra
      ctx.fillStyle = 'rgba(15,12,10,.45)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 15, 4, 0, 0, 7); if (!o.seated) ctx.fill();
      if (im && im.complete && im.naturalWidth) {
        const fx = Math.floor(o.phase) % 4 * 128, fy = (o.dir || 0) * 128;
        if (window.Sentar) Sentar.desenhar(o, im, fx, fy, s, o.x, o.y, !!o.seated, o.dir || 0); // senta/levanta com animação
        else if (o.seated) ctx.drawImage(im, fx, fy, 128, 92, o.x - s / 2, o.y - s * .60, s, s * 92 / 128);
        else ctx.drawImage(im, fx, fy, 128, 128, o.x - s / 2, o.y - s * 120 / 128, s, s);
      }
      // caixa na mão
      if (o.carry) {
        const [hx, hy] = [[.13, -.34], [-.19, -.36], [.19, -.36], [-.14, -.34]][o.dir || 0], q = s * .14;
        const xx = o.x + hx * s - q / 2, yy = o.y + hy * s;
        ctx.fillStyle = '#654328'; ctx.fillRect(xx, yy, q, q); ctx.fillStyle = '#bd8b45'; ctx.fillRect(xx + 1, yy + 1, q - 2, q * .4);
      }
      // nome
      const ty = o.y - s * (o.seated ? .62 : .95) - 4, w = ctx.measureText(o.nome).width + 10;
      ctx.fillStyle = 'rgba(10,8,8,.65)'; ctx.fillRect(o.x - w / 2, ty - 12, w, 16);
      ctx.fillStyle = '#f2e3c2'; ctx.fillText(o.nome, o.x, ty);
      extras(o.id, o.x, ty - 16, w, agora);
    }
    // eu: balão e indicador de voz em cima do meu personagem
    extras('eu', x, y - s * (seated ? .62 : .95) - 4, 0, agora);
    ctx.restore();
  }

  // ---------- balões do chat e indicador de quem está falando na voz ----------
  const falas = new Map();     // id → { texto, ate }
  const falando = new Set();   // ids falando agora na voz ('eu' = você)
  function quebrar(texto, larg) {
    const linhas = []; let atual = '';
    for (const p of texto.split(/\s+/)) {
      const t = atual ? atual + ' ' + p : p;
      if (ctx.measureText(t).width > larg && atual) { linhas.push(atual); atual = p; } else atual = t;
    }
    if (atual) linhas.push(atual);
    return linhas.slice(0, 4);
  }
  function extras(id, cx, base, larguraNome, agora) {
    if (falando.has(id)) {
      // ondinhas de som ao lado do nome
      const fx = cx + Math.max(18, larguraNome / 2 + 8), fy = base + 8, fase = agora / 140;
      ctx.fillStyle = '#9fe0a0';
      for (let i = 0; i < 3; i++) { const h = 4 + Math.abs(Math.sin(fase + i * 1.3)) * 7; ctx.fillRect(fx + i * 4, fy - h / 2, 2, h); }
    }
    const f = falas.get(id);
    if (!f || agora > f.ate) return;
    ctx.font = '13px system-ui';
    const linhas = quebrar(f.texto, 170);
    const lw = Math.max(...linhas.map((l) => ctx.measureText(l).width)) + 14, lh = linhas.length * 16 + 8;
    const bx = Math.round(cx - lw / 2), by = Math.round(base - lh - 6);
    const alfa = Math.min(1, (f.ate - agora) / 400);
    ctx.globalAlpha = alfa;
    ctx.fillStyle = 'rgba(250,244,230,.96)'; ctx.fillRect(bx, by, lw, lh);
    ctx.fillRect(Math.round(cx - 4), by + lh, 8, 4); ctx.fillRect(Math.round(cx - 2), by + lh + 4, 4, 2); // rabinho
    ctx.fillStyle = '#2a1d16';
    linhas.forEach((l, i) => ctx.fillText(l, cx, by + 17 + i * 16));
    ctx.globalAlpha = 1; ctx.font = '12px system-ui';
  }

  // envia um evento extra pelo canal (chat, sinais da voz)
  function mandar(evento, payload) {
    if (!pronto || !canal) return false;
    canal.send({ type: 'broadcast', event: evento, payload: { ...payload, id: meuId, nome: meuNome } });
    return true;
  }

  window.MapaOnline = {
    desenhar, enviar, mandar, falas, falando,
    get pronto() { return pronto; }, get meuId() { return meuId; }, get meuNome() { return meuNome; },
    nomeDe: (id) => (outros.get(id) || {}).nome || 'Alguém',
    jogador: (id) => outros.get(id),
    ids: () => [...outros.keys()],
  };
  window.addEventListener('pagehide', () => { try { canal && canal.untrack(); } catch (e) { /* ignora */ } });
  conectar();
})();

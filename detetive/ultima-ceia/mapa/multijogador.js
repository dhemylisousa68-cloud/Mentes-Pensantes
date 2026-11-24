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
            Object.assign(o, { nome: p.nome || 'Jogador', n: p.n || 1, visto: performance.now() });
            outros.set(id, o);
          }
          for (const id of [...outros.keys()]) if (!estado[id]) { saiu(id); outros.delete(id); }
          atualizarStatus();
        })
        .on('broadcast', { event: 'pos' }, ({ payload: p }) => {
          if (!p || p.id === meuId || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
          const o = outros.get(p.id) || { nome: p.nome, n: p.n, x: p.x, y: p.y, phase: 0 };
          // pulo grande (entrou/saiu de um lugar): teleporta em vez de deslizar
          if (Math.hypot(p.x - o.x, p.y - o.y) > 160 || p.inside !== o.inside) { o.x = p.x; o.y = p.y; }
          Object.assign(o, { alvoX: p.x, alvoY: p.y, dir: p.dir, andando: p.andando, seated: p.seated, inside: p.inside, garage: p.garage, carry: !!p.carry, nome: p.nome || o.nome, n: p.n || o.n, visto: performance.now() });
          outros.set(p.id, o);
          atualizarStatus();
        })
        .on('broadcast', { event: 'portao' }, ({ payload: p }) => receberPortao(p))
        .on('broadcast', { event: 'caixa' }, ({ payload: p }) => receberCaixa(p))
        // alguém chegou: conta para ele como está o mundo (portão e caixa)
        .on('presence', { event: 'join' }, ({ key }) => { if (key !== meuId) setTimeout(enviarMundo, 300 + Math.random() * 400); })
        .subscribe(async (s) => {
          if (s !== 'SUBSCRIBED') return;
          pronto = true;
          await canal.track({ nome: meuNome, n: selected + 1 });
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

  function enviar(t, forcar) {
    if (!pronto || !canal) return;
    verMundo();
    const andando = !!(keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright) && !seated;
    const estado = `${Math.round(x)},${Math.round(y)},${dir},${andando},${seated},${inside},${garage},${selected},${carry}`;
    const intervalo = andando ? 100 : 2000;
    if (!forcar && (t - ultimoEnvio < intervalo || (estado === ultimoEstado && t - ultimoEnvio < 2000))) return;
    ultimoEnvio = t; ultimoEstado = estado;
    canal.send({ type: 'broadcast', event: 'pos', payload: { id: meuId, nome: meuNome, n: selected + 1, x, y, dir, andando, seated, inside, garage, carry } });
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
      if (!!o.inside !== !!inside || !!o.garage !== !!garage) continue; // só quem está no mesmo lugar
      const k = Math.min(1, dt * 10);
      o.x += (o.alvoX - o.x) * k; o.y += (o.alvoY - o.y) * k;
      o.phase = o.andando ? o.phase + dt * Number(fps.value) : 0;
      const im = imgs[(o.n || 1) - 1];
      // sombra
      ctx.fillStyle = 'rgba(15,12,10,.45)'; ctx.beginPath(); ctx.ellipse(o.x, o.y, 15, 4, 0, 0, 7); if (!o.seated) ctx.fill();
      if (im && im.complete && im.naturalWidth) {
        const fx = Math.floor(o.phase) % 4 * 128, fy = (o.dir || 0) * 128;
        if (o.seated) ctx.drawImage(im, fx, fy, 128, 92, o.x - s / 2, o.y - s * .60, s, s * 92 / 128);
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
    }
    ctx.restore();
  }

  window.MapaOnline = { desenhar, enviar };
  window.addEventListener('pagehide', () => { try { canal && canal.untrack(); } catch (e) { /* ignora */ } });
  conectar();
})();

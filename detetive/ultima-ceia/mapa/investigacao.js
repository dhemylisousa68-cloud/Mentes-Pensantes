// Investigação da Última Ceia: pontos para examinar (Espaço), diário coletivo, fichas de pista,
// enigmas, vinheta do dia, a voz de Tomás no alto-falante e o apagão.
// IMPORTANTE: este arquivo é público. Ele NÃO tem textos de pistas nem respostas: tudo isso vem do
// Supabase (supabase/04-investigacao.sql), e só quando alguém da sala encontra.
// Aqui ficam apenas os LUGARES dos pontos (com rótulos neutros) e a encenação da noite.
// Usa: x, y, inside, msg, keys, investigate (mapa.js) e window.Interior (interior.js).
(() => {
  // ---------- onde estão as coisas (andar, x, y no mundo, rótulo neutro, desenho) ----------
  const PONTOS = [
    { id: 'd1-convite', andar: 0, x: 945, y: 1422, rot: 'um envelope sobre o banco', des: 'envelope' },
    { id: 'd1-desenho-mesa', andar: 0, x: 954, y: 452, rot: 'um papel sobre a mesa', des: 'papel' },
    { id: 'd1-cartao-ana', andar: 0, x: 756, y: 168, rot: 'um cartão no aparador', des: 'cartao' },
    { id: 'd1-gaveta', andar: 0, x: 1548, y: 168, rot: 'a gaveta do aparador', des: 'cadeado' },
    { id: 'd1-cartao-bruno', andar: 0, x: 1950, y: 336, rot: 'um cartão na escrivaninha', des: 'cartao' },
    { id: 'd1-audio', andar: 0, x: 1698, y: 1690, rot: 'um aparelho de som', des: 'radio' },
    { id: 'd1-porta-escritorio', andar: 0, x: 2112, y: 1000, rot: 'a porta do escritório', des: null, porta: true },
    { id: 'd1-descoberta', andar: 0, x: 2088, y: 1320, rot: 'o escritório', des: null, raio: 120 },
    { id: 'd1-cartao-carla', andar: 1, x: 123, y: 1164, rot: 'um cartão no criado-mudo', des: 'cartao' },
    { id: 'd1-foto', andar: 1, x: 1053, y: 150, rot: 'um quadro da galeria', des: null },
    { id: 'd1-bilhete-quarto', andar: 1, x: 159, y: 146, rot: 'um bilhete no criado-mudo', des: 'papel' },
    { id: 'd1-cartao-davi', andar: 2, x: 1056, y: 444, rot: 'um cartão na mesa de bilhar', des: 'cartao' },
    { id: 'd1-agenda', andar: 2, x: 1950, y: 354, rot: 'uma agenda', des: 'livro' },
    { id: 'd1-cartao-eva', andar: -1, x: 120, y: 156, rot: 'um cartão na adega', des: 'cartao' },
    { id: 'd1-garrafa', andar: -1, x: 360, y: 156, rot: 'uma garrafa com etiqueta', des: null },
  ];
  // a decoração (modo de edição) pode mudar o lugar das pistas
  const pontos = () => { const ov = (window.Decoracao && Decoracao.pistas()) || {}; return PONTOS.map((p) => (ov[p.id] ? { ...p, ...ov[p.id] } : p)); };
  const ALCANCE = 80;
  // porta do escritório (térreo, blocos 43-44, linhas 21-23) — trancada até a marca "escritorio_aberto"
  const PORTA = { andar: 0, x0: 43 * 16, x1: 45 * 16, y0: 21 * 16, y1: 24 * 16 };
  // vinhetas: uma frase curta por dia (títulos vêm do servidor)
  const FRASES = {
    1: 'Esta noite, um lugar à mesa vai ficar vazio para sempre.',
    2: 'O passado não foi enterrado. Só esperou a casa ficar em silêncio.',
    3: 'No escuro, todos juram que estavam em outro lugar.',
    4: 'Toda mentira tem uma letra. Alguém assinou esta.',
    5: 'Esta é a última versão. Depois dela, só resta a verdade.',
  };
  // a noite do Dia 1 (segundos depois que alguém entra no salão)
  const VOZ_EM = 35, APAGAO_EM = 70, APAGAO_DUR = 6;
  const FALA_TOMAS = 'Boa noite, meus amigos. Estou terminando de separar uns papéis e já desço. Sentem-se, por favor — hoje temos muito o que conversar.';

  // ---------- estado ----------
  let sessao = null;
  try { sessao = JSON.parse(sessionStorage.getItem('mp_sala') || 'null'); } catch (e) { /* ignora */ }
  // Sem sala (mapa de teste aberto direto): usa uma sala de teste só deste navegador, criada sozinha.
  let sala = sessao && sessao.codigo ? String(sessao.codigo).toUpperCase() : null;
  const teste = !sala;
  let est = null, flags = new Set(), vistos = new Set(), relogio = 0, conectado = false, ocupado = false, erroConexao = null;
  let legenda = null; // { texto, quem, ate }
  const avisados = new Set();
  // se o servidor tirou o jogador da sala (aba parada muito tempo), entra de novo e repete o pedido
  async function rpc(nome, args) {
    try { return await api.rpc(nome, args); }
    catch (e) {
      if (!String(e && e.message).includes('FORA_DA_SALA') || !sala) throw e;
      await api.rpc('entrar_sala', { p_codigo: sala, p_nome: (sessao && sessao.nome) || 'Jogador' });
      return api.rpc(nome, args);
    }
  }
  const api = { rpc: (nome, args) => UC.Online.rpc(nome, args) }; // trocável em testes

  // ---------- interface ----------
  const css = document.createElement('style');
  css.textContent = `
  #inv-bt{position:fixed;z-index:27;top:12px;right:150px;padding:8px 12px;background:rgba(30,24,20,.85);color:#f0e2c0;border:1px solid #b08a3e;border-radius:8px;font:14px system-ui;cursor:pointer}
  #inv-bt .n{display:inline-block;min-width:18px;margin-left:6px;padding:0 5px;border-radius:9px;background:#b08a3e;color:#1e130c;font-weight:700;font-size:12px}
  #inv-diario{position:fixed;z-index:35;top:56px;right:12px;width:min(440px,calc(100vw - 24px));max-height:calc(100dvh - 76px);display:none;flex-direction:column;background:#211a15;color:#f0e2c0;border:2px solid #b08a3e;border-radius:10px;box-shadow:0 10px 40px #000;font:14px system-ui}
  #inv-diario.aberto{display:flex}
  #inv-diario header{padding:12px 14px 8px;border-bottom:1px solid #4a3b2b}
  #inv-diario header b{font:18px Georgia;color:#e8bd70}
  #inv-diario header p{margin:6px 0 0;color:#cdbb92;font-size:13px}
  #inv-diario nav{display:flex;gap:6px;padding:8px 12px}
  #inv-diario nav button,#inv-diario .acoes button,.inv-modal button{padding:8px 12px;background:#3a3028;color:#f0e2c0;border:1px solid #8c7552;border-radius:6px;font:14px system-ui;cursor:pointer}
  #inv-diario nav button.sel{background:#6a5530;border-color:#e8bd70}
  #inv-diario .corpo{overflow:auto;padding:4px 12px 12px;flex:1}
  #inv-diario .item{display:block;width:100%;text-align:left;margin:6px 0;padding:9px 11px;background:#2c241d;border:1px solid #4a3b2b;border-radius:7px;color:#f0e2c0;cursor:pointer;font:14px system-ui}
  #inv-diario .item:hover{border-color:#b08a3e}
  #inv-diario .item small{display:block;color:#a8977c;margin-top:3px}
  #inv-diario .pista{display:inline-block;margin-right:6px;padding:1px 6px;border-radius:4px;background:#7a1f26;color:#fff;font-size:12px}
  #inv-diario textarea{width:100%;min-height:64px;box-sizing:border-box;padding:8px;background:#15110e;color:#f0e2c0;border:1px solid #8c7552;border-radius:6px;font:14px system-ui;resize:vertical}
  #inv-diario .hip{margin:8px 0;padding:8px 10px;border-left:3px solid #b08a3e;background:#2c241d;border-radius:4px}
  #inv-diario .hip small{color:#a8977c}
  #inv-diario .vazio{color:#a8977c;margin:12px 2px}
  #inv-diario .acoes{padding:10px 12px;border-top:1px solid #4a3b2b;display:flex;gap:8px;justify-content:flex-end}
  .inv-modal{position:fixed;inset:0;z-index:45;display:grid;place-items:center;background:rgba(0,0,0,.55);padding:16px}
  .inv-papel{max-width:520px;width:100%;max-height:calc(100dvh - 40px);overflow:auto;background:#efe4c8;color:#2a1d12;border-radius:6px;padding:22px 24px;box-shadow:0 14px 50px #000;font:16px Georgia;line-height:1.5;white-space:pre-wrap;position:relative}
  .inv-papel h2{margin:0 0 4px;font:bold 20px Georgia}
  .inv-papel .sub{font:13px system-ui;color:#6a5a44;margin-bottom:12px;white-space:normal}
  .inv-papel .pista{display:inline-block;margin-bottom:8px;padding:2px 8px;border-radius:4px;background:#7a1f26;color:#fff;font:12px system-ui}
  .inv-papel.narrativa{background:#1a1412;color:#efe2c8}
  .inv-papel.narrativa .sub{color:#b8a888}
  .inv-modal .fim{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;white-space:normal}
  .inv-modal .letras{display:flex;gap:8px;justify-content:center;margin:14px 0}
  .inv-modal .letras input{width:44px;height:52px;text-align:center;font:bold 26px Georgia;text-transform:uppercase;background:#fff8e8;border:2px solid #8c7552;border-radius:6px;color:#2a1d12}
  .inv-modal .erro{color:#9a2a2a;font:14px system-ui;text-align:center;min-height:18px;white-space:normal}
  #inv-vinheta{position:fixed;inset:0;z-index:60;display:grid;place-items:center;background:#000;color:#e8dcc0;text-align:center;opacity:0;transition:opacity .9s;pointer-events:none}
  #inv-vinheta.ver{opacity:1;pointer-events:auto}
  #inv-vinheta .dia{font:bold clamp(44px,10vw,110px) Georgia;letter-spacing:12px;color:#c9a050}
  #inv-vinheta .tit{font:clamp(18px,3vw,28px) Georgia;letter-spacing:4px;margin-top:6px;color:#e8dcc0}
  #inv-vinheta .frase{font:italic clamp(15px,2.4vw,22px) Georgia;margin-top:28px;color:#b85050;max-width:80vw}
  #inv-toast{position:fixed;z-index:46;left:50%;top:64px;transform:translateX(-50%);padding:9px 16px;background:rgba(30,20,14,.92);color:#f0e2c0;border:1px solid #b08a3e;border-radius:8px;font:14px system-ui;display:none;max-width:80vw;text-align:center}
  `;
  document.head.append(css);

  const bt = document.createElement('button');
  bt.id = 'inv-bt'; bt.innerHTML = '📖 Diário <span class="n">0</span>'; bt.title = 'Diário coletivo (J)';
  const painel = document.createElement('section');
  painel.id = 'inv-diario';
  painel.innerHTML = `<header><b>Diário</b><p class="obj"></p></header>
    <nav><button data-aba="pistas" class="sel">Pistas</button><button data-aba="achados">Achados</button><button data-aba="hip">Hipóteses</button></nav>
    <div class="corpo"></div><div class="acoes"><button class="recomecar" hidden>Recomeçar teste</button><button class="encerrar" hidden>Encerrar o dia</button><button class="fechar">Fechar</button></div>`;
  const toast = document.createElement('div'); toast.id = 'inv-toast';
  const vinheta = document.createElement('div'); vinheta.id = 'inv-vinheta';
  document.body.append(bt, painel, toast, vinheta);
  let aba = 'pistas';
  bt.onclick = () => alternarDiario();
  painel.querySelector('.fechar').onclick = () => alternarDiario(false);
  painel.querySelector('nav').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; aba = b.dataset.aba; desenharDiario(); };
  painel.querySelector('.encerrar').onclick = encerrarDia;
  painel.querySelector('.recomecar').onclick = async () => {
    if (!confirm('Apagar o progresso deste teste e começar o Dia 1 do zero?')) return;
    try { await rpc('sair_sala', { p_codigo: sala }); } catch (e) { /* ignora */ }
    try { localStorage.removeItem('uc_sala_teste'); } catch (e) { /* ignora */ }
    location.reload();
  };
  addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'j' || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if (document.querySelector('.inv-modal')) return;
    alternarDiario();
  });

  function alternarDiario(abrir) {
    const v = abrir ?? !painel.classList.contains('aberto');
    painel.classList.toggle('aberto', v);
    if (v) { keys = {}; desenharDiario(); }
  }
  function avisar(t, ms = 3200) {
    toast.textContent = t; toast.style.display = 'block';
    clearTimeout(avisar.t); avisar.t = setTimeout(() => { toast.style.display = 'none'; }, ms);
  }
  const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function desenharDiario() {
    painel.querySelectorAll('nav button').forEach((b) => b.classList.toggle('sel', b.dataset.aba === aba));
    const corpo = painel.querySelector('.corpo');
    painel.querySelector('header b').textContent = est ? `Dia ${est.dia} — ${est.titulo || ''}` : 'Diário';
    painel.querySelector('.obj').textContent = !sala ? 'Conectando…'
      : !est ? 'Conectando…' : (teste ? '[Modo teste] ' : '') + (est.objetivo || '');
    painel.querySelector('.recomecar').hidden = !teste || !est;
    const enc = painel.querySelector('.encerrar');
    enc.hidden = !(est && est.anfitriao && est.dia_concluido < est.dia);
    enc.textContent = est ? `Encerrar o Dia ${est.dia}` : 'Encerrar o dia';
    if (!est) { corpo.innerHTML = ''; return; }
    const ach = est.achados || [];
    if (aba === 'pistas' || aba === 'achados') {
      const lista = ach.filter((a) => (aba === 'pistas' ? !!a.pista : !a.pista));
      corpo.innerHTML = lista.length ? lista.map((a, i) => `<button class="item" data-i="${ach.indexOf(a)}">${a.pista ? `<span class="pista">${esc(a.pista)}</span>` : ''}${esc(a.titulo)}<small>${esc(a.resumo)} · encontrado por ${esc(a.por)}</small></button>`).join('')
        : `<p class="vazio">${aba === 'pistas' ? 'Nenhuma pista ainda. Explorem a casa e usem Espaço perto das coisas.' : 'Nada por aqui ainda.'}</p>`;
      corpo.querySelectorAll('.item').forEach((b) => { b.onclick = () => ficha(ach[+b.dataset.i]); });
    } else {
      const hs = est.hipoteses || [];
      corpo.innerHTML = `<textarea placeholder="Escreva uma hipótese do grupo (quem, por quê, como)…" maxlength="400"></textarea>
        <div style="text-align:right;margin-top:6px"><button class="item" style="width:auto;display:inline-block" data-salvar>Registrar hipótese</button></div>
        ${hs.length ? hs.slice().reverse().map((h) => `<div class="hip">${esc(h.texto)}<br><small>${esc(h.nome)} · Dia ${h.dia}</small></div>`).join('') : '<p class="vazio">Nenhuma hipótese ainda.</p>'}`;
      const ta = corpo.querySelector('textarea');
      ta.addEventListener('keydown', (e) => e.stopPropagation());
      corpo.querySelector('[data-salvar]').onclick = async () => {
        const t = ta.value.trim(); if (t.length < 3) return;
        try { await rpc('uc_hipotese', { p_sala: sala, p_texto: t }); ta.value = ''; await carregar(); avisar('Hipótese registrada.'); }
        catch (e) { avisar('Não deu para salvar: ' + (e.message || e)); }
      };
    }
    bt.querySelector('.n').textContent = ach.filter((a) => a.pista).length;
  }

  function modal(html, cls = '') {
    const m = document.createElement('div'); m.className = 'inv-modal';
    m.innerHTML = `<div class="inv-papel ${cls}">${html}</div>`;
    m.addEventListener('click', (e) => { if (e.target === m) fechar(); });
    const fechar = () => { m.remove(); removeEventListener('keydown', tecla, true); };
    const tecla = (e) => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(); } };
    m.addEventListener('keydown', (e) => e.stopPropagation()); // o que se digita aqui não move o personagem
    addEventListener('keydown', tecla, true);
    document.body.append(m); keys = {};
    return { m, fechar };
  }
  function ficha(a) {
    const { m, fechar } = modal(`${a.pista ? `<span class="pista">${esc(a.pista)}</span>` : ''}<h2>${esc(a.titulo)}</h2><div class="sub">${esc(a.resumo || '')}${a.por ? ` · encontrado por ${esc(a.por)}` : ''}</div>${esc(a.ampliado)}<div class="fim"><button>Fechar</button></div>`, a.tipo === 'narrativa' ? 'narrativa' : '');
    m.querySelector('.fim button').onclick = fechar;
  }
  function textoSimples(titulo, texto, narrativa) {
    const { m, fechar } = modal(`<h2>${esc(titulo)}</h2>${esc(texto)}<div class="fim"><button>Fechar</button></div>`, narrativa ? 'narrativa' : '');
    m.querySelector('.fim button').onclick = fechar;
  }
  function enigma(r) {
    const { m, fechar } = modal(`<h2>${esc(r.titulo)}</h2>${esc(r.ampliado)}<div class="letras">${'<input maxlength="1">'.repeat(5)}</div><div class="erro"></div><div class="fim"><button class="ok">Tentar</button><button class="sair">Fechar</button></div>`);
    const ins = [...m.querySelectorAll('.letras input')];
    ins.forEach((inp, i) => {
      inp.addEventListener('input', () => { inp.value = inp.value.replace(/[^a-zA-ZçÇ]/g, '').toUpperCase(); if (inp.value && ins[i + 1]) ins[i + 1].focus(); });
      inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); if (e.key === 'Enter') tentar(); });
    });
    setTimeout(() => ins[0].focus(), 50);
    m.querySelector('.sair').onclick = fechar;
    m.querySelector('.ok').onclick = tentar;
    async function tentar() {
      const resp = ins.map((i) => i.value).join('');
      if (resp.length < 5) { m.querySelector('.erro').textContent = 'Preencha as cinco letras.'; return; }
      try {
        const res = await rpc('uc_resolver', { p_sala: sala, p_enigma: r.enigma, p_resposta: resp });
        if (res.ok) { fechar(); textoSimples(r.titulo, res.texto); await carregar(); }
        else { m.querySelector('.erro').textContent = res.texto; ins.forEach((i) => { i.value = ''; }); ins[0].focus(); }
      } catch (e) { m.querySelector('.erro').textContent = 'Sem conexão: ' + (e.message || e); }
    }
  }

  // ---------- servidor ----------
  async function carregar() {
    if (!sala) return;
    const r = await rpc('uc_estado', { p_sala: sala });
    aplicar(r);
  }
  function aplicar(r) {
    const antes = est;
    est = r; flags = new Set(r.flags || []); vistos = new Set(r.vistos || []);
    relogio = Date.parse(r.agora) - Date.now();
    // pista nova encontrada por outra pessoa
    if (antes) for (const a of r.achados || []) if (a.pista && !(antes.achados || []).some((b) => b.id === a.id)) avisar(`Nova pista: ${a.pista} — ${a.titulo} (por ${a.por})`, 4200);
    if (r.fechamento && !avisados.has('fim' + r.dia)) { avisados.add('fim' + r.dia); fimDoDia(r); }
    if (!antes) vinhetaDoDia(r);
    if (painel.classList.contains('aberto')) desenharDiario(); else bt.querySelector('.n').textContent = (r.achados || []).filter((a) => a.pista).length;
  }
  let recarga = 0;
  function pedirRecarga() { clearTimeout(recarga); recarga = setTimeout(() => carregar().catch(() => {}), 250); }
  async function salaDeTeste() {
    const nome = (() => { try { return localStorage.getItem('uc_nome'); } catch (e) { return null; } })() || 'Teste';
    let c = null;
    try { c = localStorage.getItem('uc_sala_teste'); } catch (e) { /* ignora */ }
    if (c) { try { return await api.rpc('entrar_sala', { p_codigo: c, p_nome: nome }); } catch (e) { /* sumiu: cria outra */ } }
    c = await api.rpc('criar_sala', { p_nome: nome, p_max: 5 });
    try { localStorage.setItem('uc_sala_teste', c); } catch (e) { /* ignora */ }
    return c;
  }
  async function conectar() {
    try {
      await UC.Online.conectar();
      if (teste) sala = await salaDeTeste();
      await carregar();
      conectado = true;
      UC.Online.cliente.channel(`inv-${sala}-${Math.random().toString(36).slice(2, 7)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'uc_partidas', filter: `sala=eq.${sala}` }, pedirRecarga)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'uc_achados', filter: `sala=eq.${sala}` }, pedirRecarga)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'uc_hipoteses', filter: `sala=eq.${sala}` }, pedirRecarga)
        .subscribe();
      setInterval(() => carregar().catch(() => {}), 30000); // garantia, caso o tempo real caia
      // avisa o servidor que este jogador continua na sala (senão ele sai da sala depois de 2 minutos)
      const presente = () => rpc('estou_aqui', { p_codigo: sala }).catch(() => {});
      presente(); setInterval(presente, 20000);
    } catch (e) {
      const t = String(e && (e.message || e));
      erroConexao = t.includes('uc_estado') ? 'A investigação ainda não foi instalada no Supabase (arquivo 04).' : 'Investigação sem conexão: ' + t;
      avisar(erroConexao, 6000);
    }
  }

  // ---------- vinheta e fechamento ----------
  function vinhetaDoDia(r) {
    const chave = `uc_vinheta_${sala}_${r.dia}`;
    try { if (sessionStorage.getItem(chave)) return; sessionStorage.setItem(chave, '1'); } catch (e) { /* ignora */ }
    vinheta.innerHTML = `<div><div class="dia">DIA ${r.dia}</div><div class="tit">${esc((r.titulo || '').toUpperCase())}</div><div class="frase">${esc(FRASES[r.dia] || '')}</div></div>`;
    requestAnimationFrame(() => vinheta.classList.add('ver'));
    const sair = () => vinheta.classList.remove('ver');
    vinheta.onclick = sair;
    setTimeout(sair, 5200);
  }
  function fimDoDia(r) {
    const { m, fechar } = modal(`<h2>Fim do Dia ${r.dia} — ${esc(r.titulo || '')}</h2>${esc(r.fechamento)}\n\n${esc(r.gancho || '')}\n\nO progresso do grupo foi salvo.<div class="fim"><button>Fechar</button></div>`, 'narrativa');
    m.querySelector('.fim button').onclick = fechar;
  }
  async function encerrarDia() {
    if (!confirm(`Encerrar o Dia ${est.dia} para todos?`)) return;
    try {
      const r = await rpc('uc_concluir_dia', { p_sala: sala });
      if (!r.ok) { avisar(r.texto, 5000); return; }
      await carregar();
    } catch (e) { avisar('Só o anfitrião (♛) pode encerrar o dia.'); }
  }

  // ---------- examinar (Espaço) ----------
  function pontoPerto() {
    if (!inside || !window.Interior) return null;
    const a = Interior.andar;
    let melhor = null, d = Infinity;
    for (const p of pontos()) {
      if (p.andar !== a) continue;
      const dd = Math.hypot(x - p.x, y - p.y);
      if (dd < (p.raio || ALCANCE) && dd < d) { d = dd; melhor = p; }
    }
    return melhor;
  }
  async function examinar(p) {
    if (!conectado) { msg.textContent = erroConexao || 'Conectando à investigação…'; avisar(msg.textContent, 4500); return; }
    if (ocupado) return; ocupado = true;
    try {
      const r = await rpc('uc_examinar', { p_sala: sala, p_objeto: p.id });
      if (!r.ok) { msg.textContent = r.texto; return; }
      if (r.tipo === 'enigma') { enigma(r); return; }
      if (r.flags) flags = new Set(r.flags);
      vistos.add(p.id);
      if (r.tipo === 'acao') { msg.textContent = r.ampliado; avisar(r.ampliado, 3500); }
      else ficha({ ...r, por: null });
      if (r.novo && r.pista) avisar(`Nova pista no diário: ${r.pista} — ${r.titulo}`, 4000);
      carregar().catch(() => {});
    } catch (e) {
      msg.textContent = 'Não deu para examinar: ' + (e.message || e);
    } finally { ocupado = false; }
  }
  // E (e o botão de toque) também examina quando há algo perto
  const pegarAntes = pick;
  pick = function () {
    if (inside && !seated && !document.querySelector('.inv-modal')) { const p = pontoPerto(); if (p) return examinar(p); }
    return pegarAntes();
  };
  const investigarAntes = investigate;
  investigate = function () {
    if (document.querySelector('.inv-modal')) return;
    const p = pontoPerto();
    if (p) return examinar(p);
    return investigarAntes();
  };

  // ---------- a noite: voz de Tomás e apagão ----------
  function tempoDoSalao() {
    const t = est && est.eventos && est.eventos[`${est.dia}:salao`];
    return t ? (Date.now() + relogio - Date.parse(t)) / 1000 : null;
  }
  let pediuSalao = false;
  function entrouEm(andar, chave) {
    if (!sala || !est || est.dia !== 1 || andar !== 0 || chave !== 'A2' || pediuSalao) return;
    if (est.eventos && est.eventos['1:salao']) return;
    pediuSalao = true;
    rpc('uc_evento', { p_sala: sala, p_evento: 'salao' }).then((r) => { est.eventos = r.eventos; relogio = Date.parse(r.agora) - Date.now(); }).catch(() => { pediuSalao = false; });
  }
  function escuridao() {
    const t = tempoDoSalao();
    if (t === null || est.dia !== 1) return 0;
    const q = t - APAGAO_EM;
    if (q < 0 || q > APAGAO_DUR + 1.2) return 0;
    if (q > APAGAO_DUR) return .95 * (1 - (q - APAGAO_DUR) / 1.2);          // as luzes voltam
    return q < .25 ? .95 * (q / .25) : (q > 1 && q < 1.15 ? .7 : .95);       // apaga (e uma piscada)
  }
  let falou = false, apagou = false, voltou = false;
  function roteiro() {
    const t = tempoDoSalao();
    if (t === null || est.dia !== 1) return;
    if (!falou && t >= VOZ_EM && t < VOZ_EM + 14) { falou = true; legenda = { quem: '🔊 Voz de Tomás (alto-falante)', texto: FALA_TOMAS, ate: performance.now() + 11000 }; chiado(); }
    if (!apagou && t >= APAGAO_EM && t < APAGAO_EM + APAGAO_DUR) { apagou = true; legenda = { quem: '', texto: 'As luzes se apagam de uma vez.', ate: performance.now() + 5500 }; }
    if (!voltou && t >= APAGAO_EM + APAGAO_DUR && t < APAGAO_EM + APAGAO_DUR + 20) { voltou = true; legenda = { quem: '', texto: 'As luzes voltam. A cadeira de Tomás continua vazia.', ate: performance.now() + 6000 }; }
  }
  let actx = null;
  function chiado() { // estalo curto de alto-falante antigo
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const n = actx.sampleRate * .35, buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2) * .25;
      const s = actx.createBufferSource(), f = actx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800;
      s.buffer = buf; s.connect(f).connect(actx.destination); s.start();
    } catch (e) { /* sem som */ }
  }

  // ---------- desenho no mapa ----------
  function desenharMundo(andar, g, t) {
    // porta do escritório (térreo)
    if (andar === 0) {
      const K = 3, X = PORTA.x0 * K, Y = 22 * 16 * K, W = (PORTA.x1 - PORTA.x0) * K, H = 32 * K;
      if (!flags.has('escritorio_aberto')) {
        g.fillStyle = '#1e130c'; g.fillRect(X - 6, Y - 4, W + 12, H + 4);
        g.fillStyle = '#5a3620'; g.fillRect(X, Y, W, H);
        g.fillStyle = '#4a2c1a'; for (let i = X + 9; i < X + W; i += 15) g.fillRect(i, Y + 3, 3, H - 6);
        g.fillStyle = '#d0a850'; g.fillRect(X + W - 18, Y + H / 2, 7, 7);
      } else {
        g.fillStyle = '#1e130c'; g.fillRect(X - 6, Y - 4, 12, H + 4);
        g.fillStyle = '#5a3620'; g.fillRect(X - 3, Y, 9, H);
      }
    }
    // objetos pequenos dos pontos de investigação
    for (const p of pontos()) {
      if (p.andar !== andar || !p.des) continue;
      const X = p.x, Y = p.y;
      if (p.des === 'cartao') { g.fillStyle = '#1e130c'; g.fillRect(X - 9, Y - 7, 18, 13); g.fillStyle = '#f4ecd8'; g.fillRect(X - 7, Y - 5, 14, 9); g.fillStyle = '#8a2a30'; g.fillRect(X - 5, Y - 2, 10, 2); }
      else if (p.des === 'envelope') { g.fillStyle = '#1e130c'; g.fillRect(X - 12, Y - 8, 24, 16); g.fillStyle = '#e8dcc0'; g.fillRect(X - 10, Y - 6, 20, 12); g.fillStyle = '#b8a888'; g.fillRect(X - 10, Y - 6, 20, 2); g.fillStyle = '#8a1f26'; g.fillRect(X - 2, Y - 2, 5, 5); }
      else if (p.des === 'papel') { g.fillStyle = '#1e130c'; g.fillRect(X - 10, Y - 8, 20, 15); g.fillStyle = '#f0e8d4'; g.fillRect(X - 8, Y - 6, 16, 11); g.fillStyle = '#9a8a70'; for (let i = 0; i < 3; i++) g.fillRect(X - 6, Y - 4 + i * 3, 12, 1); }
      else if (p.des === 'livro') { g.fillStyle = '#1e130c'; g.fillRect(X - 10, Y - 8, 20, 14); g.fillStyle = '#5a2a1a'; g.fillRect(X - 8, Y - 6, 16, 10); g.fillStyle = '#d0a850'; g.fillRect(X - 8, Y - 2, 16, 1); }
      else if (p.des === 'radio') { g.fillStyle = '#1e130c'; g.fillRect(X - 16, Y - 20, 32, 22); g.fillStyle = '#6a4227'; g.fillRect(X - 14, Y - 18, 28, 18); g.fillStyle = '#2a1d12'; g.fillRect(X - 11, Y - 15, 12, 12); g.fillStyle = (Math.sin(t / 300) > 0) ? '#f0a030' : '#7a5020'; g.fillRect(X + 4, Y - 14, 6, 4); g.fillStyle = '#d0a850'; g.fillRect(X + 4, Y - 7, 6, 2); }
      else if (p.des === 'cadeado') { g.fillStyle = '#1e130c'; g.fillRect(X - 7, Y - 4, 14, 13); g.fillStyle = '#c9a050'; g.fillRect(X - 5, Y - 2, 10, 9); g.strokeStyle = '#8a8a90'; g.lineWidth = 3; g.beginPath(); g.arc(X, Y - 4, 5, Math.PI, 0); g.stroke(); }
    }
  }
  function desenharFrente(andar, g, vx, vy, vw, vh, t) {
    if (est) roteiro();
    // brilho de "dá para examinar" perto do personagem
    for (const p of pontos()) {
      if (p.andar !== andar) continue;
      const d = Math.hypot(x - p.x, y - p.y);
      if (d > 150) continue;
      const jaVisto = vistos.has(p.id) || (p.porta && flags.has('escritorio_aberto'));
      const a = (jaVisto ? .35 : .9) * (1 - Math.max(0, d - 60) / 90);
      const s = 4 + Math.sin(t / 220) * 1.5, Y = p.y - 34 + Math.sin(t / 300) * 3;
      g.save(); g.globalAlpha = Math.max(0, a); g.fillStyle = jaVisto ? '#a8977c' : '#ffd770';
      g.beginPath(); g.moveTo(p.x, Y - s * 2); g.lineTo(p.x + s, Y); g.lineTo(p.x, Y + s * 2); g.lineTo(p.x - s, Y); g.closePath(); g.fill(); g.restore();
    }
    const perto = pontoPerto();
    if (perto) {
      g.save(); g.font = '13px system-ui'; g.textAlign = 'center';
      const txt = `E ou Espaço: examinar ${perto.rot}`, w = g.measureText(txt).width + 16;
      g.fillStyle = 'rgba(20,14,10,.8)'; g.fillRect(x - w / 2, y + 14, w, 22); g.fillStyle = '#f0e2c0'; g.fillText(txt, x, y + 29); g.restore();
    }
    // apagão (cobre tudo, inclusive os personagens)
    const e = escuridao();
    if (e > 0) { g.fillStyle = `rgba(0,0,0,${e})`; g.fillRect(vx, vy, vw, vh); }
    // legenda da noite
    if (legenda && performance.now() < legenda.ate) {
      g.save(); g.font = '16px Georgia'; g.textAlign = 'center';
      const max = Math.min(vw - 40, 640), linhas = quebrar(g, legenda.texto, max - 30);
      const h = 18 + linhas.length * 22 + (legenda.quem ? 20 : 0), X = vx + vw / 2, Y = vy + vh - h - 60;
      g.fillStyle = 'rgba(10,8,6,.86)'; g.fillRect(X - max / 2, Y, max, h); g.strokeStyle = '#b08a3e'; g.strokeRect(X - max / 2 + .5, Y + .5, max - 1, h - 1);
      let yy = Y + 24;
      if (legenda.quem) { g.font = 'bold 13px system-ui'; g.fillStyle = '#e8bd70'; g.fillText(legenda.quem, X, yy); yy += 20; g.font = 'italic 16px Georgia'; }
      g.fillStyle = '#f0e2c0'; for (const l of linhas) { g.fillText(l, X, yy); yy += 22; }
      g.restore();
    }
  }
  function quebrar(g, t, max) {
    const ps = t.split(' '), ls = []; let l = '';
    for (const p of ps) { const n = l ? l + ' ' + p : p; if (g.measureText(n).width > max && l) { ls.push(l); l = p; } else l = n; }
    if (l) ls.push(l); return ls;
  }
  function bloqueia(andar, x0, y0, x1, y1) {
    if (andar !== PORTA.andar || flags.has('escritorio_aberto')) return false;
    return x1 > PORTA.x0 && x0 < PORTA.x1 && y1 > PORTA.y0 && y0 < PORTA.y1;
  }

  window.Investigacao = { desenharMundo, desenharFrente, bloqueia, entrouEm, api, carregar, reconectar: conectar, get estado() { return est; }, PONTOS };
  conectar();
})();

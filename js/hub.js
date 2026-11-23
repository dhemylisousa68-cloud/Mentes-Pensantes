// Mentes Pensantes: portão, abertura e a tela principal na frente da mansão.
(() => {
  // ---------- Catálogo de casos ----------
  // Para adicionar um caso: inclua um objeto aqui e uma placa no cenário.
  const CASOS = [
    {
      id: 'ultima-ceia',
      titulo: 'A Última Ceia',
      tema: 'Mistério de Natal',
      jogadores: '5–10 jogadores',
      caminho: 'detetive/ultima-ceia/',
    },
  ];

  // ---------- Cenário (coordenadas da arte) ----------
  const LARGURA = 1672, ALTURA = 941;
  const PORTA = [1020, 505];
  const LUZES = [[838, 322], [878, 345], [912, 365], [950, 365], [1150, 372], [1188, 397], [1223, 405]];

  const $ = (s) => document.querySelector(s);
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduzido = () => UC.Ajustes.get('reduzido');
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const portao = $('#portao'), hub = $('#hub');
  const cena = $('#cena'), ui = $('#ui');
  const lista = $('#casos-lista');
  const balao = $('#balao'), balaoTexto = balao.querySelector('.balao-texto');
  const painel = $('#painel-sala'), fundo = $('#painel-fundo');
  const pularSeq = $('#pular-seq'), clarao = $('#clarao');

  let mascote = null, neve = null, reacao = null;
  let selecionado = null, ocupado = false, seq = null;

  function vistaNestaSessao() { try { return sessionStorage.getItem('mp_intro') === '1'; } catch (e) { return false; } }
  function marcarVista() { try { sessionStorage.setItem('mp_intro', '1'); } catch (e) { /* ignora */ } }

  // ---------- Câmera ----------
  // A cena cobre a tela inteira. Em retrato, enquadra a porta e o mascote; a interface vira coluna.
  const camera = { s: 1, x: 0, y: 0, zoom: 1, fx: LARGURA / 2, fy: ALTURA / 2 };

  function base() {
    const vw = innerWidth, vh = innerHeight;
    const retrato = vw / vh < 1.05 || vw < 640;
    hub.classList.toggle('retrato', retrato);
    const s = Math.max(vw / LARGURA, vh / ALTURA);
    // paisagem: se a tela for mais estreita que a arte, garante o mascote inteiro à direita
    const xIdeal = retrato ? vw / 2 - 1205 * s : Math.min(vw / 2 - (LARGURA / 2) * s, vw - 1600 * s);
    const x = Math.min(0, Math.max(vw - LARGURA * s, xIdeal));
    const y = Math.min(0, Math.max(vh - ALTURA * s, vh / 2 - (ALTURA / 2) * s));
    // a interface fica presa à borda esquerda, mesmo quando o cenário desliza
    const uiX = Math.max(x, -56 * s);
    return { s, x, y, uiX, retrato };
  }
  // transforma a cena para um zoom em torno de um ponto da arte (fx, fy), mantendo-o no mesmo lugar da tela
  function transformacao(zoom = 1, fx = PORTA[0], fy = PORTA[1], puxar = 0) {
    const b = base();
    const s = b.s * zoom;
    const telaX = b.x + fx * b.s, telaY = b.y + fy * b.s;
    // "puxar" leva o ponto em direção ao centro da tela (0 a 1)
    const alvoX = telaX + (innerWidth / 2 - telaX) * puxar, alvoY = telaY + (innerHeight / 2 - telaY) * puxar;
    return { s, x: alvoX - fx * s, y: alvoY - fy * s, retrato: b.retrato };
  }
  const css = (t) => `translate(${t.x}px, ${t.y}px) scale(${t.s})`;
  let enquadramento = { zoom: 1, fx: PORTA[0], fy: PORTA[1], puxar: 0 };

  function enquadrar() {
    const t = transformacao(enquadramento.zoom, enquadramento.fx, enquadramento.fy, enquadramento.puxar);
    cena.style.transform = css(t);
    const b = base();
    ui.style.transform = t.retrato ? '' : css({ s: b.s, x: b.uiX, y: b.y });
    marcarFocos(t);
    if (neve) neve.medir();
  }
  // posições da porta e do mascote na tela (para o destaque de luz)
  function marcarFocos(t) {
    const px = t.x + PORTA[0] * t.s, py = t.y + PORTA[1] * t.s;
    hub.style.setProperty('--porta-x', `${px}px`);
    hub.style.setProperty('--porta-y', `${py}px`);
    const r = $('#mascote').getBoundingClientRect();
    hub.style.setProperty('--masc-x', `${r.left + r.width * .5}px`);
    hub.style.setProperty('--masc-y', `${r.top + r.height * .5}px`);
    hub.style.setProperty('--masc-rx', `${r.width * .62}px`);
    hub.style.setProperty('--masc-ry', `${r.height * .62}px`);
  }

  // movimento de câmera suave (WAAPI); resolve mesmo se a aba estiver oculta
  async function moverCamera(novo, duracao, easing = 'cubic-bezier(.45, 0, .2, 1)') {
    const de = cena.style.transform;
    enquadramento = { ...enquadramento, ...novo };
    const t = transformacao(enquadramento.zoom, enquadramento.fx, enquadramento.fy, enquadramento.puxar);
    const para = css(t);
    cena.style.transform = para;
    marcarFocos(t);
    if (reduzido() || !duracao) return;
    const anim = cena.animate([{ transform: de }, { transform: para }], { duration: duracao, easing });
    try { await Promise.race([anim.finished, esperar(duracao + 300)]); } catch (e) { /* cancelado */ }
  }

  // ---------- Montagem ----------
  function montar() {
    $('#luzes').innerHTML = LUZES.map(([x, y], i) =>
      `<i class="luz-bulbo" style="left:${x}px;top:${y}px;--dur:${(2.3 + (i * 0.47) % 1.9).toFixed(2)}s;--atraso:${(-i * .73).toFixed(2)}s"></i>`).join('');
    const luzes = '<span class="luzinhas" aria-hidden="true">' + '<i></i>'.repeat(9) + '</span>';
    lista.innerHTML = CASOS.map((c) => `
      <button class="caso" type="button" data-id="${c.id}" aria-pressed="false">
        ${luzes}<span class="sr">${esc(c.titulo)}, ${esc(c.tema)}, ${esc(c.jogadores)}</span>
      </button>`).join('');
    mascote = MP.Rig.criar($('#mascote'), { reduzido });
    MP.mascote = mascote; // acesso pelo console, para testar poses
    neve = MP.Neve.iniciar($('#neve'), { reduzido });
    // reação ao "Criar sala": só vale com o painel aberto na aba de criar
    reacao = MP.ReacaoBotao.ligar({
      botao: $('#ps-criar button[type="submit"]'),
      mascote,
      reduzido,
      ativo: () => !painel.hidden && !$('#ps-criar').hidden && !ocupado,
      poseEspera: () => 'repouso',
    });
    enquadrar();
    window.addEventListener('resize', enquadrar);
  }

  // ---------- Abertura ----------
  let abertura = null;
  async function abrirHub(comAbertura) {
    portao.hidden = true;
    const animar = comAbertura && !reduzido();
    // já entra escuro e sem interface (sem transição de saída visível)
    if (animar) hub.classList.add('abrindo', 'sem-ui', 'travado');
    hub.hidden = false;
    if (!mascote) montar();
    if (MP.Som.ativo) { MP.Som.tocarMusica(); MP.Som.ambiente(true); }
    if (!animar) { marcarVista(); return; }

    // a cena acende do escuro, as luzes chegam, a placa desce balançando nas correntes
    const s = abertura = { pulado: false };
    const passo = (ms) => esperar(ms).then(() => { if (s.pulado) throw new Error('pulado'); });
    pularSeq.hidden = false;
    pularSeq.focus({ preventScroll: true });
    try {
      MP.Som.drone(5);
      await passo(80);
      hub.classList.add('revelando');
      hub.classList.remove('abrindo');
      await passo(1500);
      MP.Som.zumbidoLuz();
      await passo(700);
      $('.placa-logo').classList.add('cair');
      MP.Som.sinos(.5);
      await passo(700);
      MP.Som.impacto();
      mascote.olharPara(innerWidth * .5, innerHeight * .5);
      mascote.sacudir(.6);
      await passo(500);
      hub.classList.remove('sem-ui');
      await passo(900);
      terminarAbertura();
    } catch (e) {
      if (e.message !== 'pulado') throw e;
    }
  }
  function terminarAbertura() {
    if (!abertura) return;
    abertura.pulado = true;
    abertura = null;
    hub.classList.remove('abrindo', 'revelando', 'sem-ui', 'travado');
    pularSeq.hidden = true;
    marcarVista();
    $('#btn-jogar').focus({ preventScroll: true });
  }

  // ---------- Balão ----------
  function falar(html) {
    balaoTexto.innerHTML = html;
    balao.classList.remove('ponta-direita', 'ponta-baixo');
    balao.hidden = false;
    balao.style.animation = 'none'; void balao.offsetWidth; balao.style.animation = '';
    const rosto = mascote.pontoCabeca();
    const w = balao.offsetWidth, h = balao.offsetHeight;
    const r = $('#mascote').getBoundingClientRect();
    let left = r.left + r.width * .12 - w - 10;
    let top = rosto.y - h * .8;
    if (left >= 8) {
      balao.classList.add('ponta-direita');
    } else {
      left = Math.max(8, Math.min(innerWidth - w - 8, rosto.x - w * .5));
      top = r.top - h + r.height * .02;
      balao.classList.add('ponta-baixo');
      balao.style.setProperty('--ponta-x', `${Math.max(20, Math.min(w - 20, rosto.x - left))}px`);
    }
    balao.style.left = `${left}px`;
    balao.style.top = `${Math.max(64, top)}px`;
  }
  function calar() { balao.hidden = true; }

  // ---------- Seleção de caso ----------
  function travar(v) { ocupado = v; hub.classList.toggle('travado', v); }
  function marcarCaso(id) {
    lista.querySelectorAll('.caso').forEach((b) => {
      const sel = b.dataset.id === id;
      b.classList.toggle('selecionado', sel);
      b.setAttribute('aria-pressed', sel);
    });
  }
  // Passar pela placa do caso: ele fica sem graça, esconde a faca atrás das costas e assobia,
  // como quem não fez nada. Ao sair, a faca volta devagar.
  let saidaCaso = 0;
  function focarCaso(c, ativo) {
    if (ocupado || !painel.hidden || !mascote) return;
    c.classList.toggle('aceso', ativo);
    clearTimeout(saidaCaso);
    if (ativo) {
      if (!mascote.escondido || mascote.segurando !== 'faca') MP.Som.iniciar();
      mascote.vergonha(true);
      mascote.pose('vergonha');
      mascote.assobiar(true);
      mascote.variante('assobio'); // pose desenhada: mãos para trás e lábios em bico
      MP.Som.assobio(true);
    } else {
      // mantém um instante (evita reiniciar se o cursor só passou pela borda)
      saidaCaso = setTimeout(() => {
        if (ocupado || !painel.hidden) return;
        mascote.vergonha(false);
        mascote.assobiar(false);
        mascote.variante(null);
        MP.Som.assobio(false);
        mascote.pose('repouso');
      }, 450);
    }
  }
  lista.addEventListener('pointerover', (e) => { const c = e.target.closest('.caso'); if (c && !c.contains(e.relatedTarget)) focarCaso(c, true); });
  lista.addEventListener('pointerout', (e) => { const c = e.target.closest('.caso'); if (c && !c.contains(e.relatedTarget)) focarCaso(c, false); });
  lista.addEventListener('focusin', (e) => { const c = e.target.closest('.caso'); if (c) focarCaso(c, true); });
  lista.addEventListener('focusout', (e) => { const c = e.target.closest('.caso'); if (c) focarCaso(c, false); });

  // ----- Painel -----
  function preencherPainel(caso, aba) {
    $('#ps-titulo').textContent = caso.titulo;
    painel.querySelector('.ps-tema').textContent = `${caso.tema} · ${caso.jogadores}`;
    const nome = (() => { try { return localStorage.getItem('uc_nome') || ''; } catch (e) { return ''; } })();
    painel.querySelectorAll('input[name="nome"]').forEach((i) => { if (!i.value) i.value = nome; });
    painel.querySelector('.ps-aviso').hidden = true;
    escolherAba(aba);
  }
  function escolherAba(aba) {
    painel.querySelectorAll('[role="tab"]').forEach((t) => {
      const ativa = t.dataset.aba === aba;
      t.setAttribute('aria-selected', ativa);
      t.tabIndex = ativa ? 0 : -1;
    });
    $('#ps-criar').hidden = aba !== 'criar';
    $('#ps-entrar').hidden = aba !== 'entrar';
    if (reacao && aba !== 'criar') reacao.reiniciar();
    painel.querySelector('.ps-aviso').hidden = true;
  }
  function mostrarPainel(modo) {
    painel.classList.remove('surgindo', 'suave');
    fundo.hidden = false;
    painel.hidden = false;
    if (modo) painel.classList.add(modo);
    const f = painel.querySelector('.ps-form:not([hidden])');
    const alvo = f.nome.value ? (f.codigo || f.querySelector('button')) : f.nome;
    alvo.focus({ preventScroll: true });
  }
  function fecharPainel({ trocar = false } = {}) {
    if (ocupado || painel.hidden) return;
    MP.Som.clique();
    painel.hidden = true;
    fundo.hidden = true;
    hub.classList.remove('em-cena');
    mascote.pose('repouso');
    reacao.reiniciar();
    moverCamera({ zoom: 1, puxar: 0 }, 900);
    if (trocar) { selecionado = null; marcarCaso(null); }
    (lista.querySelector('.caso') || $('#btn-jogar')).focus({ preventScroll: true });
  }

  // ----- O envelope voa da mão do mascote e vira o painel -----
  // A cartinha sai da mão dele, voa até o centro, abre a aba e o painel sai de dentro dela.
  async function voarConvite(s) {
    const origem = mascote.retanguloCartinha();
    painel.hidden = false;
    painel.classList.add('medindo');
    const alvo = painel.getBoundingClientRect();
    painel.classList.remove('medindo');
    painel.hidden = true;
    const w = Math.min(300, alvo.width * .72), h = w * .62;
    const cx = alvo.left + alvo.width / 2, cy = alvo.top + alvo.height / 2;
    const voo = document.createElement('div');
    voo.className = 'convite-voo';
    voo.innerHTML = '<span class="cv-carta"></span><span class="cv-frente"></span><span class="cv-aba"></span><span class="cv-selo">M</span>';
    Object.assign(voo.style, { left: cx - w / 2 + 'px', top: cy - h / 2 + 'px', width: w + 'px', height: h + 'px' });
    hub.appendChild(voo);
    s.voo = voo;
    fundo.hidden = false;
    // a mão solta a cartinha e volta rápido para trás das costas
    mascote.bracoRapido(true);
    mascote.pose('esconder');
    const ox = origem.left + origem.width / 2 - cx, oy = origem.top + origem.height / 2 - cy;
    const esc = Math.max(.15, origem.width / w);
    const voar = voo.animate([
      { transform: `translate(${ox}px, ${oy}px) scale(${esc}) rotate(-24deg)` },
      { transform: 'translate(0, -18px) scale(1.06) rotate(3deg)', offset: .75 },
      { transform: 'none' },
    ], { duration: 760, easing: 'cubic-bezier(.3, .7, .25, 1)', fill: 'forwards' });
    MP.Som.puf();
    try { await Promise.race([voar.finished, esperar(1000)]); } catch (e) { /* cancelado */ }
    mascote.bracoRapido(false);
    if (s.pulado) return;
    // abre: o selo cai, a aba vira para trás e a carta sobe
    voo.classList.add('abrindo');
    MP.Som.sinos(.3);
    await esperar(520);
  }

  // ----- Sequência: destaca a entrada e o mascote apresenta o convite -----
  async function apresentarCaso(caso, aba = 'criar') {
    if (ocupado) return;
    MP.Som.iniciar();
    travar(true);
    calar();
    selecionado = caso.id;
    marcarCaso(caso.id);
    preencherPainel(caso, aba);
    const placa = lista.querySelector(`[data-id="${caso.id}"]`);

    if (reduzido()) {
      MP.Som.sinos(.3);
      hub.classList.add('em-cena');
      finalizar(caso, aba, 'suave');
      return;
    }
    const s = seq = { pulado: false, voo: null };
    const passo = (ms) => esperar(ms).then(() => { if (s.pulado) throw new Error('pulado'); });
    pularSeq.hidden = false;
    pularSeq.focus({ preventScroll: true });

    try {
      // 1. foi pego no flagra: se a faca ainda está à mostra, esconde atrás das costas
      clearTimeout(saidaCaso);
      mascote.assobiar(false);
      mascote.variante(null);
      MP.Som.assobio(false);
      if (!mascote.escondido) {
        mascote.vergonha(true);
        mascote.pose('vergonha');
        await passo(550);
      }
      // 2. a entrada da mansão se destaca e a câmera se aproxima um pouco; ele se recompõe e olha para você
      hub.classList.add('em-cena');
      const zoom = base().retrato ? 1.06 : 1.14;
      moverCamera({ zoom, fx: 1160, fy: 560, puxar: .25 }, 1500);
      mascote.vergonha(false);
      mascote.olharFrente();
      MP.Som.sinos(.35);
      await passo(450);

      // 3. lá atrás, onde escondeu a faca, troca pela cartinha e a puxa para a frente
      mascote.segurar('cartinha');
      mascote.pose('mostrar');
      mascote.sacudir(.3);
      await passo(900);
      falar('Você foi convidado. <strong>Álibi não incluso.</strong>');
      await passo(1500);

      // 4. a cartinha voa, abre e vira o painel
      calar();
      await voarConvite(s);
      if (s.pulado) return;
      finalizar(caso, aba, 'surgindo');
    } catch (e) {
      if (e.message !== 'pulado') throw e;
    }
  }

  function pular() {
    if (abertura) { terminarAbertura(); return; }
    if (!seq || seq.pulado) return;
    seq.pulado = true;
    const caso = CASOS.find((c) => c.id === selecionado);
    const aba = $('#ps-entrar').hidden ? 'criar' : 'entrar';
    finalizar(caso, aba, 'suave');
  }

  function finalizar(caso, aba, modo) {
    if (seq && seq.voo) { seq.voo.remove(); seq.voo = null; }
    seq = null;
    pularSeq.hidden = true;
    calar();
    hub.classList.add('em-cena');
    if (enquadramento.zoom === 1) moverCamera({ zoom: base().retrato ? 1.06 : 1.14, fx: 1160, fy: 560, puxar: .25 }, modo === 'suave' ? 0 : 600);
    // a mão vai para trás, pega a faca de novo e ela volta devagar
    // (a reação ao "Criar sala" vai escondê-la outra vez)
    mascote.vergonha(false);
    mascote.assobiar(false);
    mascote.variante(null);
    MP.Som.assobio(false);
    mascote.pose('esconder');
    const pegarFaca = () => {
      if (!mascote.segurar('faca')) { setTimeout(pegarFaca, 150); return; } // espera a mão sumir atrás do corpo
      setTimeout(() => { if (reacao.estado === 'espera' && !painel.hidden) mascote.pose('repouso'); }, reduzido() ? 0 : 500);
    };
    setTimeout(pegarFaca, reduzido() ? 0 : 350);
    mascote.olharFrente();
    escolherAba(aba);
    mostrarPainel(modo);
    travar(false);
  }

  // ----- Entrar: a câmera atravessa a porta e o clarão esconde a troca de cena -----
  async function entrarNaMansao(caso) {
    travar(true);
    painel.hidden = true;
    fundo.hidden = true;
    hub.classList.add('saindo');
    reacao.abrir();
    if (reduzido()) { location.href = caso.caminho; return; }
    MP.Som.atravessar();
    MP.Som.ambiente(false);
    mascote.olharPara(innerWidth * .3, innerHeight * .5);
    const camera = moverCamera({ zoom: 3.4, fx: PORTA[0], fy: PORTA[1], puxar: 1 }, 1700, 'cubic-bezier(.55, 0, .7, .4)');
    await esperar(900);
    clarao.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 750, easing: 'ease-in', fill: 'forwards' });
    await camera;
    await esperar(250);
    location.href = caso.caminho;
  }

  // ----- Botões principais -----
  function pedirCaso() {
    const c = lista.querySelector('.caso');
    c.classList.remove('chamar'); void c.offsetWidth; c.classList.add('chamar');
    mascote.olharElemento(c);
    falar('Primeiro, <strong>escolha um caso</strong>: a placa ali no portão.');
    setTimeout(() => { if (!ocupado && painel.hidden) { calar(); mascote.olharFrente(); } }, 3400);
  }
  function abrirPainelDireto(caso, aba) {
    preencherPainel(caso, aba);
    hub.classList.add('em-cena');
    mascote.pose('repouso');
    moverCamera({ zoom: base().retrato ? 1.06 : 1.14, fx: 1160, fy: 560, puxar: .25 }, 700);
    mostrarPainel('suave');
  }
  $('#btn-jogar').addEventListener('click', () => {
    if (ocupado) return;
    MP.Som.iniciar(); MP.Som.clique();
    const caso = CASOS.find((c) => c.id === selecionado);
    if (caso) abrirPainelDireto(caso, 'criar'); else pedirCaso();
  });
  $('#btn-codigo').addEventListener('click', () => {
    if (ocupado) return;
    MP.Som.iniciar(); MP.Som.clique();
    const caso = CASOS.find((c) => c.id === selecionado);
    if (caso) abrirPainelDireto(caso, 'entrar'); else apresentarCaso(CASOS[0], 'entrar');
  });
  lista.addEventListener('click', (e) => {
    const b = e.target.closest('.caso');
    if (!b || ocupado) return;
    const caso = CASOS.find((c) => c.id === b.dataset.id);
    if (selecionado === caso.id) { abrirPainelDireto(caso, 'criar'); return; }
    apresentarCaso(caso, 'criar');
  });

  // ----- Formulários do painel -----
  function avisar(texto, erro) {
    const a = painel.querySelector('.ps-aviso');
    a.textContent = texto;
    a.classList.toggle('erro', !!erro);
    a.hidden = false;
  }
  function enviar(e) {
    e.preventDefault();
    const f = e.target;
    const nome = f.nome.value.trim();
    if (!nome) { avisar('Digite seu nome.', true); f.nome.focus(); return; }
    const dados = { caso: selecionado, nome };
    if (f.codigo) {
      f.codigo.value = f.codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (f.codigo.value.length !== 5) { avisar('O código tem 5 caracteres.', true); f.codigo.focus(); return; }
      dados.acao = 'entrar'; dados.codigo = f.codigo.value;
    } else {
      dados.acao = 'criar'; dados.max = Number(f.max.value);
    }
    try {
      localStorage.setItem('uc_nome', nome);
      sessionStorage.setItem('mp_sala', JSON.stringify(dados));
    } catch (err) { /* ignora */ }
    MP.Som.sinos(.3);
    marcarVista();
    entrarNaMansao(CASOS.find((c) => c.id === selecionado));
  }
  $('#ps-criar').addEventListener('submit', enviar);
  $('#ps-entrar').addEventListener('submit', enviar);
  $('#ps-entrar').codigo.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
  painel.querySelector('.ps-abas').addEventListener('click', (e) => {
    const t = e.target.closest('[role="tab"]');
    if (!t) return;
    MP.Som.clique();
    escolherAba(t.dataset.aba);
    painel.querySelector('.ps-form:not([hidden]) input').focus();
  });
  painel.querySelector('.ps-abas').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const prox = painel.querySelector('[role="tab"][aria-selected="true"]').dataset.aba === 'criar' ? 'entrar' : 'criar';
    escolherAba(prox);
    painel.querySelector(`[data-aba="${prox}"]`).focus();
  });
  painel.querySelector('.ps-fechar').addEventListener('click', () => fecharPainel());
  painel.querySelector('.ps-trocar').addEventListener('click', () => fecharPainel({ trocar: true }));
  fundo.addEventListener('click', () => fecharPainel());

  // ---------- Configurações ----------
  const dialogo = $('#config');
  const formCfg = dialogo.querySelector('form');
  function preencherConfig() {
    const v = UC.Ajustes.todos();
    formCfg.musica.value = v.musica;
    formCfg.efeitos.value = v.efeitos;
    formCfg.reduzido.checked = v.reduzido;
    formCfg.querySelector(`input[name="texto"][value="${v.texto}"]`).checked = true;
    formCfg.querySelectorAll('input[type="range"]').forEach((r) => { r.nextElementSibling.value = r.value + '%'; });
  }
  formCfg.addEventListener('input', (e) => {
    const el = e.target;
    if (el.type === 'range') { el.nextElementSibling.value = el.value + '%'; UC.Ajustes.definir(el.name, Number(el.value)); }
    else if (el.type === 'checkbox') UC.Ajustes.definir(el.name, el.checked);
    else if (el.type === 'radio') UC.Ajustes.definir(el.name, el.value);
  });
  formCfg.addEventListener('change', (e) => { if (e.target.name === 'efeitos') MP.Som.sinos(.25); });
  $('#btn-config').addEventListener('click', () => { MP.Som.clique(); preencherConfig(); dialogo.showModal(); });

  const btnSom = $('#btn-som');
  function atualizarBotaoSom() {
    btnSom.setAttribute('aria-pressed', MP.Som.mudo);
    btnSom.setAttribute('aria-label', MP.Som.mudo ? 'Som desligado' : 'Som ligado');
  }
  btnSom.addEventListener('click', () => {
    MP.Som.iniciar();
    MP.Som.alternarMudo();
    atualizarBotaoSom();
    MP.Som.tocarMusica();
    MP.Som.ambiente(true);
  });
  atualizarBotaoSom();

  // ---------- Eventos gerais ----------
  $('#comecar').addEventListener('click', () => { MP.Som.iniciar(); abrirHub(true); });
  pularSeq.addEventListener('click', pular);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (abertura || seq) { e.preventDefault(); pular(); }
    else if (!painel.hidden) { e.preventDefault(); fecharPainel(); }
  });

  // a cabeça acompanha o ponteiro
  function seguir(e) {
    if (!mascote || hub.hidden || ocupado) return;
    if (!painel.hidden && reacao.estado !== 'espera') return; // a reação cuida do olhar
    mascote.olharPara(e.clientX, e.clientY);
  }
  window.addEventListener('pointermove', seguir, { passive: true });
  window.addEventListener('pointerdown', seguir, { passive: true });

  // aba oculta: pausa as animações de CSS (a neve, o mascote e o som pausam sozinhos)
  document.addEventListener('visibilitychange', () => document.documentElement.classList.toggle('pausado', document.hidden));

  function primeiroToque() {
    MP.Som.iniciar();
    if (!hub.hidden) { MP.Som.tocarMusica(); MP.Som.ambiente(true); }
    window.removeEventListener('pointerdown', primeiroToque);
    window.removeEventListener('keydown', primeiroToque);
  }
  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

  // ---------- Início ----------
  if (vistaNestaSessao()) {
    abrirHub(false);
    window.addEventListener('pointerdown', primeiroToque);
    window.addEventListener('keydown', primeiroToque);
  } else {
    portao.hidden = false;
    $('#comecar').focus({ preventScroll: true });
  }
})();

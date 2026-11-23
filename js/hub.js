// Mentes Pensantes: portão, intro e tela principal de seleção de casos.
(() => {
  // ---------- Catálogo de casos ----------
  // Para adicionar um caso: inclua um objeto aqui. "roupa" é a roupa que o mascote veste ao apresentar o caso.
  const CASOS = [
    {
      id: 'ultima-ceia',
      titulo: 'A Última Ceia',
      tema: '🎄 Mistério de Natal',
      jogadores: '5–10 jogadores',
      caminho: 'detetive/ultima-ceia/',
      capa: '316,704,364,210',
      roupa: 'natal',
    },
  ];
  const LARGURA_REF = 1672, ALTURA_REF = 941;

  const $ = (s) => document.querySelector(s);
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduzido = () => UC.Ajustes.get('reduzido');
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function recortar(el, spec) {
    const [x, y, w, h] = spec.split(',').map(Number);
    el.style.backgroundSize = `${(LARGURA_REF / w) * 100}% ${(ALTURA_REF / h) * 100}%`;
    el.style.backgroundPosition = `${(x / (LARGURA_REF - w)) * 100}% ${(y / (ALTURA_REF - h)) * 100}%`;
  }
  document.querySelectorAll('[data-recorte]').forEach((el) => recortar(el, el.dataset.recorte));

  // ---------- Telas ----------
  const portao = $('#portao'), intro = $('#intro'), hub = $('#hub');
  let mascoteIntro = null, mascote = null;
  let introTimers = [];
  let introAtiva = false;

  function mostrar(tela) { [portao, intro, hub].forEach((t) => { t.hidden = t !== tela; }); }
  function vistaNestaSessao() { try { return sessionStorage.getItem('mp_intro') === '1'; } catch (e) { return false; } }
  function marcarVista() { try { sessionStorage.setItem('mp_intro', '1'); } catch (e) { /* ignora */ } }

  // ---------- Intro ----------
  function agendarIntro(ms, fn) { introTimers.push(setTimeout(fn, ms)); }

  function iniciarIntro() {
    MP.Som.iniciar();
    mostrar(intro);
    introAtiva = true;
    mascoteIntro = MP.Mascote.criar($('#mascote-intro'), { sombra: true });
    mascoteIntro.livre = false;
    $('#pular-intro').focus({ preventScroll: true });

    if (reduzido()) {
      mascoteIntro.setSombra(false);
      intro.classList.add('luz', 'titulo');
      agendarIntro(1800, irParaHub);
      return;
    }
    MP.Som.drone(5.5);
    [0.4, 1.4, 2.4].forEach((s) => MP.Som.tique(s));
    agendarIntro(700, () => mascoteIntro.olharDirecao(-1, 0));
    agendarIntro(1600, () => mascoteIntro.olharDirecao(1, 0.2));
    agendarIntro(2300, () => mascoteIntro.piscar());
    agendarIntro(2700, () => mascoteIntro.olharDirecao(0, 0));
    agendarIntro(3200, () => {
      intro.classList.add('luz');
      MP.Som.zumbidoLuz();
      setTimeout(() => mascoteIntro.setSombra(false), 420);
    });
    agendarIntro(4500, () => { mascoteIntro.piscadela(); MP.Som.brilho(); });
    agendarIntro(5700, () => { intro.classList.add('titulo'); MP.Som.impacto(); });
    agendarIntro(8600, irParaHub);
  }

  function irParaHub() {
    if (!introAtiva) return;
    introAtiva = false;
    introTimers.forEach(clearTimeout);
    introTimers = [];
    marcarVista();
    intro.classList.add('sair');
    setTimeout(() => { intro.classList.remove('sair', 'luz', 'titulo'); abrirHub(); }, reduzido() ? 0 : 500);
  }

  // ---------- Tela principal ----------
  const balao = $('#balao');
  const balaoTexto = balao.querySelector('.balao-texto');
  const balaoAcoes = balao.querySelector('.balao-acoes');
  const lista = $('#casos-lista');
  const palco = $('.palco');
  const caixaMascote = $('#mascote-hub');
  const painel = $('#painel-sala');
  const fundo = $('#painel-fundo');
  const pularSeq = $('#pular-seq');

  let selecionado = null;
  let ocupado = false;
  let seq = null;
  let ocioso = null;

  function abrirHub() {
    mostrar(hub);
    if (!mascote) {
      mascote = MP.Mascote.criar(caixaMascote);
      montarCasos();
    }
    if (MP.Som.ativo) MP.Som.tocarMusica();
  }

  function montarCasos() {
    const luzes = '<span class="luzinhas" aria-hidden="true">' + '<i></i>'.repeat(11) + '</span>';
    lista.innerHTML = CASOS.map((c) => `
      <button class="caso" data-id="${c.id}" aria-pressed="false" aria-label="${esc(c.titulo)}, ${esc(c.tema)}, ${esc(c.jogadores)}">
        ${luzes}
        <span class="caso-capa" data-recorte="${c.capa}"></span>
        <span class="caso-info">
          <span class="caso-titulo">${esc(c.titulo)}</span>
          <span class="caso-tema">${esc(c.tema)}</span>
          <span class="caso-pill">${esc(c.jogadores)}</span>
        </span>
      </button>`).join('') + `
      <div class="caso-breve"><span class="pasta" aria-hidden="true">🗂️</span><span>Novos mistérios<br>em breve</span></div>`;
    lista.querySelectorAll('[data-recorte]').forEach((el) => recortar(el, el.dataset.recorte));
  }

  function falar(html) {
    balao.classList.remove('perto-rosto', 'ponta-direita', 'ponta-baixo');
    balao.style.left = balao.style.top = '';
    balaoTexto.innerHTML = html;
    balaoAcoes.innerHTML = '';
    balao.hidden = false;
    balao.style.animation = 'none'; void balao.offsetWidth; balao.style.animation = '';
  }
  function calar() { balao.hidden = true; }

  // Balão ao lado do rosto do mascote, com a ponta voltada para ele
  function pontoNoMascote(x, y) {
    const svg = mascote.elemento;
    const p = svg.createSVGPoint();
    p.x = x; p.y = y;
    return p.matrixTransform(svg.getScreenCTM());
  }
  function falarPertoDoRosto(html) {
    falar(html);
    balao.classList.add('perto-rosto');
    const rosto = pontoNoMascote(150, 300);
    const b = { width: balao.offsetWidth, height: balao.offsetHeight };
    let left = rosto.x - 24 - b.width;
    let top = rosto.y - b.height * 0.85;
    if (left >= 8) {
      balao.classList.add('ponta-direita');
    } else {
      const topo = pontoNoMascote(300, 60);
      left = Math.max(8, Math.min(innerWidth - b.width - 8, topo.x - b.width * 0.6));
      top = topo.y - b.height - 14;
      balao.classList.add('ponta-baixo');
      balao.style.setProperty('--ponta-x', `${Math.max(20, Math.min(b.width - 20, rosto.x - left))}px`);
    }
    balao.style.left = `${left}px`;
    balao.style.top = `${Math.max(8, top)}px`;
  }

  // Centro da luz quente da cena = posição do mascote
  function posicionarCena() {
    const r = caixaMascote.getBoundingClientRect();
    const h = hub.getBoundingClientRect();
    hub.style.setProperty('--cena-x', `${((r.left + r.width / 2 - h.left) / h.width) * 100}%`);
    hub.style.setProperty('--cena-y', `${((r.top + r.height * 0.45 - h.top) / h.height) * 100}%`);
  }
  const estreito = () => matchMedia('(max-width: 760px)').matches;

  function travar(v) {
    ocupado = v;
    hub.classList.toggle('travado', v);
  }

  function marcarCartao(id) {
    lista.querySelectorAll('.caso').forEach((b) => {
      const sel = b.dataset.id === id;
      b.classList.toggle('selecionado', sel);
      b.setAttribute('aria-pressed', sel);
    });
  }

  // ----- Passar o mouse / focar o cartão -----
  function focarCartao(cartao, ativo) {
    if (ocupado || !painel.hidden || !mascote) return;
    cartao.classList.toggle('aceso', ativo);
    mascote.sobrancelha(ativo);
    mascote.livre = !ativo;
    if (ativo) mascote.olharElemento(cartao);
  }
  lista.addEventListener('pointerover', (e) => {
    const c = e.target.closest('.caso');
    if (c && e.pointerType === 'mouse' && !c.contains(e.relatedTarget)) focarCartao(c, true);
  });
  lista.addEventListener('pointerout', (e) => {
    const c = e.target.closest('.caso');
    if (c && e.pointerType === 'mouse' && !c.contains(e.relatedTarget)) focarCartao(c, false);
  });
  lista.addEventListener('focusin', (e) => { const c = e.target.closest('.caso'); if (c) focarCartao(c, true); });
  lista.addEventListener('focusout', (e) => { const c = e.target.closest('.caso'); if (c) focarCartao(c, false); });

  // ----- Mascote no canto (FLIP) -----
  function moverMascote(paraCanto, animar) {
    const antes = caixaMascote.getBoundingClientRect();
    hub.classList.toggle('painel-aberto', paraCanto);
    if (!animar || reduzido()) return;
    const depois = caixaMascote.getBoundingClientRect();
    const dx = antes.left - depois.left, dy = antes.top - depois.top;
    const s = antes.width / depois.width;
    caixaMascote.animate(
      [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, transformOrigin: '0 0' }, { transform: 'none', transformOrigin: '0 0' }],
      { duration: 550, easing: 'cubic-bezier(.3, .9, .3, 1)' },
    );
  }

  function iniciarOcioso() {
    clearInterval(ocioso);
    ocioso = setInterval(() => {
      if (!mascote || painel.hidden || ocupado) return;
      mascote.sobrancelha(true);
      setTimeout(() => mascote.sobrancelha(false), 1100);
    }, 8000);
  }

  // ----- Painel -----
  function preencherPainel(caso, aba) {
    $('#ps-titulo').textContent = caso.titulo;
    painel.querySelector('.ps-tema').textContent = `${caso.tema} · ${caso.jogadores}`;
    recortar(painel.querySelector('.ps-capa'), caso.capa);
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
    moverMascote(false, true);
    mascote.livre = true;
    if (trocar) {
      selecionado = null;
      marcarCartao(null);
      mascote.definir({ roupa: 'detetive', pose: 'detetive', gorro: 'nenhum', expressao: 'neutra' });
    }
    (lista.querySelector('.caso.selecionado') || lista.querySelector('.caso'))?.focus({ preventScroll: true });
  }

  // ----- Convite voando até virar o painel -----
  async function voarConvite(s) {
    const origem = mascote.retanguloConvite();
    painel.hidden = false;
    painel.classList.add('medindo');
    const alvo = painel.getBoundingClientRect();
    painel.classList.remove('medindo');
    painel.hidden = true;

    const voo = document.createElement('div');
    voo.className = 'convite-voo';
    voo.innerHTML = '<span class="cv-selo">?</span>';
    Object.assign(voo.style, { left: alvo.left + 'px', top: alvo.top + 'px', width: alvo.width + 'px', height: alvo.height + 'px' });
    document.body.appendChild(voo);
    s.voo = voo;
    mascote.pose('atras');
    fundo.hidden = false;
    moverMascote(true, true);
    const anim = voo.animate([
      { transform: `translate(${origem.left - alvo.left}px, ${origem.top - alvo.top}px) scale(${origem.width / alvo.width}, ${origem.height / alvo.height}) rotate(-10deg)` },
      { transform: 'translate(0, -12px) scale(1.02) rotate(1deg)', offset: .8 },
      { transform: 'none' },
    ], { duration: 650, easing: 'cubic-bezier(.25, .8, .25, 1)', fill: 'forwards' });
    try { await Promise.race([anim.finished, esperar(900)]); } catch (e) { /* cancelado */ }
  }

  // ----- Sequência de seleção -----
  async function apresentarCaso(caso, aba = 'criar') {
    if (ocupado) return;
    MP.Som.iniciar();
    travar(true);
    calar();
    selecionado = caso.id;
    marcarCartao(caso.id);
    preencherPainel(caso, aba);

    if (reduzido()) {
      MP.Som.sinos(.3);
      finalizar(caso, aba, 'suave');
      return;
    }

    const s = seq = { pulado: false, voo: null };
    const passo = (ms) => esperar(ms).then(() => { if (s.pulado) throw new Error('pulado'); });
    pularSeq.hidden = false;
    pularSeq.focus({ preventScroll: true });

    const cartao = lista.querySelector(`[data-id="${caso.id}"]`);
    if (estreito()) palco.scrollIntoView({ block: 'center', behavior: 'smooth' });

    try {
      // 1. percebe o clique: os olhos vão ao cartão, a cabeça acompanha um instante depois
      mascote.livre = false;
      mascote.sobrancelha(false);
      mascote.olharElemento(cartao, { atraso: 220 });
      MP.Som.sinos(.35);
      await passo(380);

      // 2. o ambiente muda: fundo escurece e uma luz quente destaca o mascote e o caso
      posicionarCena();
      hub.classList.add('em-cena');
      await passo(400);
      mascote.olhar(0, 0.12, { atraso: 160 });
      await passo(320);

      // 3. puxa o gorro sobre o rosto e, ao levantar, aparece de Natal
      if (mascote.estado.roupa !== caso.roupa) {
        mascote.definir({ pose: 'puxando', gorro: 'cobrindo' });
        await passo(420);
        mascote.elemento.classList.add('encolher');
        mascote.definir({ roupa: caso.roupa });
        await passo(380);
        mascote.elemento.classList.remove('encolher');
      }
      mascote.definir({ gorro: 'normal', pose: 'faca', expressao: 'malicioso' });
      await passo(560);

      // 4. percebe que está exibindo a faca: olha para ela, pausa e esconde atrás das costas
      mascote.olhar(0.85, -0.9, { atraso: 230 });
      mascote.expressao('surpresa');
      await passo(650);
      mascote.olhar(0, 0.1, { atraso: 170 });
      await passo(180);
      mascote.pose('atras');
      await passo(520);

      // 5. finge inocência: sorriso, sobrancelha erguida e o balão junto ao rosto
      mascote.expressao('inocente');
      mascote.sobrancelha(true);
      await passo(240);
      falarPertoDoRosto('Você foi convidado. <strong>Álibi não incluso.</strong>');
      await passo(600);
      mascote.piscar();
      await passo(700);

      // 6. oferece o convite, que vira o painel
      calar();
      mascote.sobrancelha(false);
      mascote.pose('convite');
      MP.Som.sinos(.45);
      await passo(560);
      await voarConvite(s);
      if (s.pulado) return;
      finalizar(caso, aba, 'surgindo');
    } catch (e) {
      if (e.message !== 'pulado') throw e;
    }
  }

  function pular() {
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
    hub.classList.remove('em-cena');
    mascote.elemento.classList.remove('encolher');
    mascote.definir({ roupa: caso.roupa, pose: 'atras', gorro: 'normal', expressao: 'inocente' });
    mascote.sobrancelha(false);
    mascote.livre = true;
    if (!hub.classList.contains('painel-aberto')) moverMascote(true, modo !== 'suave');
    escolherAba(aba);
    mostrarPainel(modo);
    travar(false);
    iniciarOcioso();
  }

  // ----- Botões principais -----
  function jogarComAmigos() {
    MP.Som.clique();
    const caso = CASOS.find((c) => c.id === selecionado);
    if (caso) { preencherPainel(caso, 'criar'); moverMascote(true, true); mostrarPainel('suave'); return; }
    const casos = $('.casos');
    casos.classList.remove('chamar'); void casos.offsetWidth; casos.classList.add('chamar');
    mascote.livre = false;
    mascote.olharDirecao(0, 1);
    setTimeout(() => { mascote.livre = true; }, 1400);
    falar('Primeiro, <strong>escolha um caso</strong> aqui embaixo.');
    setTimeout(() => { if (!ocupado && painel.hidden) calar(); }, 3200);
  }

  function entrarComCodigo() {
    MP.Som.clique();
    const caso = CASOS.find((c) => c.id === selecionado);
    if (caso) { preencherPainel(caso, 'entrar'); moverMascote(true, true); mostrarPainel('suave'); return; }
    apresentarCaso(CASOS[0], 'entrar');
  }

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
    const caso = CASOS.find((c) => c.id === selecionado);
    avisar('Tudo certo! Abrindo a porta…');
    f.querySelector('button[type="submit"]').disabled = true;
    setTimeout(() => { location.href = caso.caminho; }, reduzido() ? 0 : 500);
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
    const atual = painel.querySelector('[role="tab"][aria-selected="true"]').dataset.aba;
    const prox = atual === 'criar' ? 'entrar' : 'criar';
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

  // ---------- Eventos ----------
  $('#comecar').addEventListener('click', iniciarIntro);
  $('#pular-intro').addEventListener('click', irParaHub);
  pularSeq.addEventListener('click', pular);
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (introAtiva) { e.preventDefault(); irParaHub(); }
    else if (seq) { e.preventDefault(); pular(); }
    else if (!painel.hidden) { e.preventDefault(); fecharPainel(); }
  });

  lista.addEventListener('click', (e) => {
    const b = e.target.closest('.caso');
    if (!b || ocupado) return;
    const caso = CASOS.find((c) => c.id === b.dataset.id);
    if (selecionado === caso.id) { preencherPainel(caso, 'criar'); moverMascote(true, true); mostrarPainel('suave'); return; }
    apresentarCaso(caso, 'criar');
  });
  $('#btn-jogar').addEventListener('click', () => { if (!ocupado) jogarComAmigos(); });
  $('#btn-codigo').addEventListener('click', () => { if (!ocupado) entrarComCodigo(); });
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
  });
  atualizarBotaoSom();

  // Olhos seguem o ponteiro
  function seguir(e) { if (mascote && !hub.hidden) mascote.olharPara(e.clientX, e.clientY); }
  window.addEventListener('pointermove', seguir, { passive: true });
  window.addEventListener('pointerdown', seguir, { passive: true });

  function primeiroToque() {
    MP.Som.iniciar();
    if (!hub.hidden) MP.Som.tocarMusica();
    window.removeEventListener('pointerdown', primeiroToque);
    window.removeEventListener('keydown', primeiroToque);
  }

  window.addEventListener('pageshow', (e) => { if (e.persisted) location.reload(); });

  // ---------- Início ----------
  if (vistaNestaSessao()) {
    abrirHub();
    window.addEventListener('pointerdown', primeiroToque);
    window.addEventListener('keydown', primeiroToque);
  } else {
    mostrar(portao);
    $('#comecar').focus({ preventScroll: true });
  }
})();

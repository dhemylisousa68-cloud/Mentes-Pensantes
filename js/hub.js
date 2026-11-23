// Mentes Pensantes: portão, intro e tela principal de seleção de casos.
(() => {
  // ---------- Catálogo de casos ----------
  // Para adicionar um caso: inclua um objeto aqui. "roupa" é a roupa que o mascote veste ao selecionar.
  const CASOS = [
    {
      id: 'ultima-ceia',
      titulo: 'A Última Ceia',
      tema: '🎄 Mistério de Natal',
      jogadores: '5–10 jogadores',
      caminho: 'detetive/ultima-ceia/',
      capa: '316,704,364,210',
      roupa: 'natal',
      fala: '<strong>A Última Ceia.</strong> Uma festa de Natal, dez convidados e uma cadeira vazia. Ninguém sai antes da meia-noite.',
    },
  ];
  const LARGURA_REF = 1672, ALTURA_REF = 941;

  const $ = (s) => document.querySelector(s);
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduzido = () => UC.Ajustes.get('reduzido');
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Recorte de uma área da imagem de referência como fundo de um elemento
  function recortar(el, spec) {
    const [x, y, w, h] = spec.split(',').map(Number);
    el.style.backgroundSize = `${(LARGURA_REF / w) * 100}% ${(ALTURA_REF / h) * 100}%`;
    el.style.backgroundPosition = `${(x / (LARGURA_REF - w)) * 100}% ${(y / (ALTURA_REF - h)) * 100}%`;
  }
  document.querySelectorAll('[data-recorte]').forEach((el) => recortar(el, el.dataset.recorte));

  // ---------- Telas ----------
  const portao = $('#portao'), intro = $('#intro'), hub = $('#hub');
  let mascoteIntro = null, mascoteHub = null;
  let introTimers = [];
  let introAtiva = false;

  function mostrar(tela) {
    [portao, intro, hub].forEach((t) => { t.hidden = t !== tela; });
  }

  function vistaNestaSessao() {
    try { return sessionStorage.getItem('mp_intro') === '1'; } catch (e) { return false; }
  }
  function marcarVista() {
    try { sessionStorage.setItem('mp_intro', '1'); } catch (e) { /* ignora */ }
  }

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
    setTimeout(() => {
      intro.classList.remove('sair', 'luz', 'titulo');
      abrirHub();
    }, reduzido() ? 0 : 500);
  }

  // ---------- Tela principal ----------
  const balao = $('#balao');
  const balaoTexto = balao.querySelector('.balao-texto');
  const balaoAcoes = balao.querySelector('.balao-acoes');
  const lista = $('#casos-lista');
  let selecionado = null;
  let ocupado = false;

  function abrirHub() {
    mostrar(hub);
    if (!mascoteHub) {
      mascoteHub = MP.Mascote.criar($('#mascote-hub'));
      montarCasos();
    }
    if (MP.Som.ativo) MP.Som.tocarMusica();
  }

  function montarCasos() {
    lista.innerHTML = CASOS.map((c) => `
      <button class="caso" data-id="${c.id}" aria-pressed="false">
        <span class="caso-capa" data-recorte="${c.capa}"></span>
        <span class="caso-info">
          <span class="caso-titulo">${esc(c.titulo)}</span>
          <span class="caso-tema">${esc(c.tema)}</span>
          <span class="caso-pill">${esc(c.jogadores)}</span>
        </span>
      </button>`).join('') + `
      <div class="caso-breve" aria-label="Novos mistérios em breve"><span class="pasta" aria-hidden="true">🗂️</span><span>Novos mistérios<br>em breve</span></div>`;
    lista.querySelectorAll('[data-recorte]').forEach((el) => recortar(el, el.dataset.recorte));
  }

  function falar(html, botoes = []) {
    balaoTexto.innerHTML = html;
    balaoAcoes.innerHTML = '';
    botoes.forEach(({ texto, classe, acao }) => {
      const b = document.createElement('button');
      b.className = 'botao ' + classe;
      b.textContent = texto;
      b.addEventListener('click', acao);
      balaoAcoes.appendChild(b);
    });
    balao.hidden = false;
    // reinicia a animação do balão
    balao.style.animation = 'none'; void balao.offsetWidth; balao.style.animation = '';
  }
  function calar() { balao.hidden = true; }

  async function selecionar(id) {
    if (ocupado) return;
    const caso = CASOS.find((c) => c.id === id);
    if (selecionado === id) { falarSelecionado(caso); return; }
    selecionado = id;
    lista.querySelectorAll('.caso').forEach((b) => {
      const sel = b.dataset.id === id;
      b.classList.toggle('selecionado', sel);
      b.setAttribute('aria-pressed', sel);
    });
    MP.Som.puf();
    ocupado = true;
    await mascoteHub.vestir(caso.roupa);
    ocupado = false;
    falarSelecionado(caso);
  }

  function falarSelecionado(caso) {
    falar(caso.fala, [
      { texto: 'OK, entrar', classe: 'botao-amarelo', acao: entrar },
      { texto: 'Trocar', classe: 'botao-creme', acao: desmarcar },
    ]);
    balaoAcoes.querySelector('button').focus({ preventScroll: true });
  }

  async function desmarcar() {
    if (ocupado || !selecionado) return;
    MP.Som.clique();
    selecionado = null;
    calar();
    lista.querySelectorAll('.caso').forEach((b) => { b.classList.remove('selecionado'); b.setAttribute('aria-pressed', 'false'); });
    MP.Som.puf();
    ocupado = true;
    await mascoteHub.vestir('detetive');
    ocupado = false;
  }

  async function entrar() {
    if (ocupado || !selecionado) return;
    const caso = CASOS.find((c) => c.id === selecionado);
    ocupado = true;
    MP.Som.clique();
    calar();
    document.querySelectorAll('.botao, .caso').forEach((b) => { b.disabled = true; });
    marcarVista();

    if (reduzido()) {
      $('#cortina').classList.add('ativa');
      await esperar(300);
      location.href = caso.caminho;
      return;
    }

    MP.Som.pararMusica();
    const risada = mascoteHub.risadaSombria();
    setTimeout(() => MP.Som.risada(), 1100);
    await risada;
    MP.Som.lamina();
    await mascoteHub.esconderFaca();
    $('#cortina').classList.add('ativa');
    await esperar(900);
    location.href = caso.caminho;
  }

  function jogarComAmigos() {
    MP.Som.clique();
    if (selecionado) { entrar(); return; }
    const casos = $('.casos');
    casos.classList.remove('chamar'); void casos.offsetWidth; casos.classList.add('chamar');
    mascoteHub.livre = false;
    mascoteHub.olharDirecao(0, 1);
    setTimeout(() => { mascoteHub.livre = true; }, 1400);
    falar('Primeiro, <strong>escolha um caso</strong> aqui embaixo.');
    setTimeout(() => { if (!selecionado) calar(); }, 3200);
  }

  function entrarComCodigo() {
    MP.Som.clique();
    marcarVista();
    const caso = CASOS.find((c) => c.id === selecionado) || CASOS[0];
    location.href = caso.caminho + '#entrar';
  }

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
  formCfg.addEventListener('change', (e) => { if (e.target.name === 'efeitos') MP.Som.clique(); });

  // ---------- Eventos ----------
  $('#comecar').addEventListener('click', iniciarIntro);
  $('#pular-intro').addEventListener('click', irParaHub);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && introAtiva) { e.preventDefault(); irParaHub(); }
  });

  lista.addEventListener('click', (e) => {
    const b = e.target.closest('.caso');
    if (b) selecionar(b.dataset.id);
  });
  $('#btn-jogar').addEventListener('click', jogarComAmigos);
  $('#btn-codigo').addEventListener('click', entrarComCodigo);
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

  // Olhos seguem o ponteiro (mouse ou toque)
  function seguir(e) { if (mascoteHub && !hub.hidden) mascoteHub.olharPara(e.clientX, e.clientY); }
  window.addEventListener('pointermove', seguir, { passive: true });
  window.addEventListener('pointerdown', seguir, { passive: true });

  // Quando a intro é pulada nesta sessão, o som começa no primeiro toque
  function primeiroToque() {
    MP.Som.iniciar();
    if (!hub.hidden) MP.Som.tocarMusica();
    window.removeEventListener('pointerdown', primeiroToque);
    window.removeEventListener('keydown', primeiroToque);
  }

  // Ao voltar do jogo pelo histórico, desfaz a cortina
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) location.reload();
  });

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

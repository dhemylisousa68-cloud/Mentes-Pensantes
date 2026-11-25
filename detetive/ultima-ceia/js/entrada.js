// Tela de entrada: menu, configurações, ativação do som e a porta da sala.
//
// Fluxo da porta:
//   1. "Abrir a porta" (ou Criar / Entrar): a câmera vai até a porta, ela abre e o jogador segue para a
//      escolha de personagem (ou para o formulário). Só abre com o clique, nunca com hover.
//   2. Quando todos os jogadores estão na sala com personagem escolhido e prontos, a sala chama
//      UC.Entrada.todosProntos(): a porta abre de novo e leva adiante.
(() => {
  const $ = (s) => document.querySelector(s);
  const veu = $('#veu');
  const entrada = $('#entrada');
  const pular = $('#pular');
  const proxima = $('#proxima');
  const dicaSom = $('#dica-som');
  const dialogo = $('#config');
  const reduzido = () => UC.Ajustes.get('reduzido');
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- Som só após a primeira interação ----------
  function ativarSom() {
    UC.Som.iniciar();
    dicaSom.classList.add('oculto');
    window.removeEventListener('pointerdown', ativarSom);
    window.removeEventListener('keydown', ativarSom);
  }
  window.addEventListener('pointerdown', ativarSom);
  window.addEventListener('keydown', ativarSom);

  // ---------- Configurações (pausam o ciclo das velas) ----------
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
    if (el.type === 'range') {
      el.nextElementSibling.value = el.value + '%';
      UC.Ajustes.definir(el.name, Number(el.value));
    } else if (el.type === 'checkbox') {
      UC.Ajustes.definir(el.name, el.checked);
    } else if (el.type === 'radio') {
      UC.Ajustes.definir(el.name, el.value);
    }
  });
  formCfg.addEventListener('change', (e) => { if (e.target.name === 'efeitos') UC.Som.clique(); });
  ['p', 'm', 'g'].forEach((v, i) => {
    formCfg.querySelectorAll('input[name="texto"]')[i].setAttribute('aria-label', ['Texto pequeno', 'Texto médio', 'Texto grande'][i]);
  });
  dialogo.addEventListener('close', () => UC.Velas.retomar());

  // ---------- Momento 1: abrir a porta para a escolha ----------
  let destino = null;
  let passagem = null; // sequência em andamento (pode ser pulada)

  async function irParaPorta(acao) {
    if (passagem) { concluir(); return; } // clique repetido: termina na hora, sem travar
    destino = acao;
    UC.Som.clique();
    entrada.classList.add('oculto');
    dicaSom.classList.add('oculto');
    UC.Velas.pausar();
    const s = passagem = { pulado: false };

    if (reduzido()) {
      UC.Porta.abrir('escolha');
      veu.classList.add('escuro', 'ativo');
      await esperar(350);
      if (!s.pulado) concluir();
      return;
    }
    pular.hidden = false;
    pular.focus({ preventScroll: true });
    const camera = UC.Camera.naPorta(1300);
    await esperar(450);
    if (s.pulado) return;
    await UC.Porta.abrir('escolha');
    await camera;
    if (s.pulado) return;
    veu.classList.add('ativo');   // a luz de dentro toma a tela e esconde a troca
    await esperar(650);
    if (!s.pulado) concluir();
  }

  function concluir() {
    if (passagem) passagem.pulado = true;
    passagem = null;
    pular.hidden = true;
    UC.Porta.concluir();
    if (UC.Porta.estado === 'fechada') UC.Porta.abrir(destino === 'todos-prontos' ? 'todos-prontos' : 'escolha');
    UC.Camera.naPorta(0);
    veu.classList.add('ativo');
    if (destino === 'todos-prontos') { mostrarSalao(); return; }
    if (destino === 'sala') UC.Sala.abrir(convite);
    else mostrarFormulario(destino);
  }

  function voltar() {
    UC.Som.clique();
    proxima.hidden = true;
    UC.Porta.fechar();
    UC.Camera.normal();
    veu.classList.remove('escuro');
    veu.classList.add('ativo');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      veu.classList.remove('ativo');
      entrada.classList.remove('oculto');
      UC.Velas.retomar();
      entrada.querySelector(`[data-acao="${destino}"]`)?.focus({ preventScroll: true });
    }));
  }

  // ---------- Momento 2: todos prontos → a porta abre de novo ----------
  // Chamado pela sala (UC.Sala) quando todos estão logados, com personagem e prontos.
  // Para ligar ao servidor depois, basta chamar UC.Entrada.todosProntos() quando o estado da sala mudar.
  async function todosProntos() {
    if (passagem) return;
    destino = 'todos-prontos';
    const s = passagem = { pulado: false };
    $('#sala').hidden = true;
    UC.Porta.fechar();
    UC.Camera.normal();
    if (reduzido()) { UC.Porta.abrir('todos-prontos'); concluir(); return; }
    veu.classList.remove('escuro');
    // revela a sala com a porta fechada; a câmera vai até ela e ela abre
    requestAnimationFrame(() => requestAnimationFrame(() => veu.classList.remove('ativo')));
    pular.hidden = false;
    await esperar(700);
    if (s.pulado) return;
    const camera = UC.Camera.naPorta(1400, 1.8);
    await esperar(600);
    if (s.pulado) return;
    await UC.Porta.abrir('todos-prontos');
    await camera;
    if (s.pulado) return;
    veu.classList.add('ativo');
    await esperar(700);
    if (!s.pulado) concluir();
  }
  // A porta abriu para todos: entra no mapa principal com o personagem escolhido.
  function mostrarSalao() {
    const id = UC.Sala.meuPersonagem();
    const n = UC.PERSONAGENS.findIndex((p) => p.id === id) + 1;
    try { if (n > 0) sessionStorage.setItem("uc_personagem_n", String(n)); } catch (e) { /* ignora */ }
    // antes do mapa: o convite de Tomás do seu personagem (se ele já tiver um)
    const p = UC.PERSONAGENS.find((q) => q.id === id);
    if (UC.Convite) UC.Convite.mostrar(p, () => { location.href = "mapa/"; });
    else location.href = "mapa/";
  }
  function voltarParaSala() {
    UC.Som.clique();
    $('#porta-jogo').hidden = true;
    destino = 'sala';
    $('#sala').hidden = false;
    $('#sala .pronto')?.focus();
  }
  $('#porta-jogo .pj-voltar').addEventListener('click', voltarParaSala);

  UC.Entrada = { todosProntos };

  // ---------- Formulários ----------
  const fCriar = $('#form-criar');
  const fEntrar = $('#form-entrar');

  function mostrarFormulario(acao) {
    fCriar.hidden = acao !== 'criar';
    fEntrar.hidden = acao !== 'entrar';
    const f = acao === 'criar' ? fCriar : fEntrar;
    const nomeSalvo = localStorage.getItem('uc_nome') || '';
    f.nome.value = nomeSalvo;
    f.querySelector('.aviso').hidden = true;
    proxima.hidden = false;
    (nomeSalvo && f.codigo ? f.codigo : f.nome).focus();
  }

  function enviar(e) {
    e.preventDefault();
    const f = e.target;
    const aviso = f.querySelector('.aviso');
    const nome = f.nome.value.trim();
    if (!nome) return;
    if (f.codigo) {
      f.codigo.value = f.codigo.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (f.codigo.value.length !== 5) {
        aviso.className = 'aviso';
        aviso.textContent = 'O código tem 5 caracteres.';
        aviso.hidden = false;
        return;
      }
    }
    const dados = f.codigo
      ? { caso: 'ultima-ceia', acao: 'entrar', nome, codigo: f.codigo.value }
      : { caso: 'ultima-ceia', acao: 'criar', nome, max: Number(f.max.value) };
    try {
      localStorage.setItem('uc_nome', nome);
      sessionStorage.setItem('mp_sala', JSON.stringify(dados));
    } catch (err) { /* ignora */ }
    UC.Som.clique();
    convite = dados;
    destino = 'sala';
    proxima.hidden = true;
    UC.Sala.abrir(dados);
  }
  fCriar.addEventListener('submit', enviar);
  fEntrar.addEventListener('submit', enviar);
  fEntrar.codigo.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  });

  // ---------- Eventos ----------
  entrada.addEventListener('click', (e) => {
    const b = e.target.closest('[data-acao]');
    if (!b) return;
    const acao = b.dataset.acao;
    if (acao === 'config') {
      UC.Som.clique();
      UC.Velas.pausar();
      preencherConfig();
      dialogo.showModal();
    } else {
      irParaPorta(acao);
    }
  });
  pular.addEventListener('click', concluir);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pular.hidden) { e.preventDefault(); concluir(); }
  });
  $('#proxima .voltar').addEventListener('click', voltar);

  // Convite vindo do painel do Mentes Pensantes: a tela mostra "Abrir a porta"
  let convite = null;
  try {
    const d = JSON.parse(sessionStorage.getItem('mp_sala') || 'null');
    if (d && d.caso === 'ultima-ceia' && d.nome) convite = d;
  } catch (e) { /* ignora */ }
  if (convite) {
    const saud = entrada.querySelector('.saudacao');
    saud.textContent = convite.acao === 'entrar'
      ? `${convite.nome}, seu convite para a sala ${convite.codigo} chegou.`
      : `${convite.nome}, sua sala está pronta.`;
    saud.hidden = false;
    entrada.querySelector('[data-acao="sala"]').hidden = false;
    entrada.querySelector('[data-acao="criar"]').hidden = true;
    entrada.querySelector('[data-acao="entrar"]').hidden = true;
  }

  // Vindo do "Entrar com código" do Mentes Pensantes: abre direto o formulário de código
  if (location.hash === '#entrar') {
    history.replaceState(null, '', location.pathname);
    entrada.classList.add('oculto');
    UC.Velas.pausar();
    destino = 'entrar';
    concluir();
  }
})();

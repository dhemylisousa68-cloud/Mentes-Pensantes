// Tela de entrada: menu, configurações, ativação do som e câmera até a porta.
(() => {
  const $ = (s) => document.querySelector(s);
  const camera = $('#camera');
  const porta = $('#porta');
  const veu = $('#veu');
  const entrada = $('#entrada');
  const pular = $('#pular');
  const proxima = $('#proxima');
  const dicaSom = $('#dica-som');
  const dialogo = $('#config');

  // ---------- Som só após a primeira interação ----------
  function ativarSom() {
    UC.Som.iniciar();
    dicaSom.classList.add('oculto');
    window.removeEventListener('pointerdown', ativarSom);
    window.removeEventListener('keydown', ativarSom);
  }
  window.addEventListener('pointerdown', ativarSom);
  window.addEventListener('keydown', ativarSom);

  // ---------- Configurações ----------
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

  // ---------- Câmera até a porta ----------
  let timers = [];
  let destino = null;
  const esperar = (ms, fn) => timers.push(setTimeout(fn, ms));

  function enquadrarPorta() {
    // mede a porta com a câmera na posição original
    const transicao = camera.style.transition;
    camera.style.transition = 'none';
    camera.style.transform = 'none';
    const r = $('#porta-moldura').getBoundingClientRect();
    camera.getBoundingClientRect();
    camera.style.transition = transicao;
    const cx = innerWidth / 2;
    const cy = innerHeight / 2;
    const px = r.left + r.width / 2;
    const py = r.top + r.height / 2;
    const escala = Math.min((innerHeight * 0.9) / r.height, (innerWidth * 0.8) / r.width, 7);
    camera.style.transformOrigin = `${px}px ${py}px`;
    camera.style.transform = `translate(${cx - px}px, ${cy - py}px) scale(${escala})`;
  }

  function irParaPorta(acao) {
    destino = acao;
    UC.Som.clique();
    entrada.classList.add('oculto');
    dicaSom.classList.add('oculto');

    if (UC.Ajustes.get('reduzido')) {
      veu.classList.add('escuro', 'ativo');
      esperar(450, concluir);
      return;
    }

    pular.hidden = false;
    pular.focus({ preventScroll: true });
    camera.style.transition = 'transform 3s cubic-bezier(.45,.05,.25,1)';
    requestAnimationFrame(enquadrarPorta);
    esperar(2300, () => { porta.classList.add('aberta'); UC.Som.rangido(); });
    esperar(3000, () => veu.classList.add('ativo'));
    esperar(3700, concluir);
  }

  function concluir() {
    timers.forEach(clearTimeout);
    timers = [];
    pular.hidden = true;
    porta.classList.add('aberta');
    camera.style.transition = 'none';
    enquadrarPorta();
    veu.classList.add('ativo');
    mostrarFormulario(destino);
  }

  function voltar() {
    UC.Som.clique();
    proxima.hidden = true;
    camera.style.transition = 'none';
    camera.style.transform = '';
    porta.classList.remove('aberta');
    veu.classList.remove('escuro');
    veu.classList.add('ativo');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      veu.classList.remove('ativo');
      entrada.classList.remove('oculto');
      entrada.querySelector(`[data-acao="${destino}"]`)?.focus({ preventScroll: true });
    }));
  }

  // ---------- Próxima etapa (formulários) ----------
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
    try { localStorage.setItem('uc_nome', nome); } catch (err) { /* ignora */ }
    UC.Som.clique();
    aviso.className = 'aviso ok';
    aviso.textContent = 'Tudo certo. A sala de espera será a próxima etapa do desenvolvimento.';
    aviso.hidden = false;
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
  window.addEventListener('resize', () => { if (!proxima.hidden) enquadrarPorta(); });
})();

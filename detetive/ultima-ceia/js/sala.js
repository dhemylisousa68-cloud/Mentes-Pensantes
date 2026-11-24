// Sala de espera da Última Ceia.
// ONLINE (padrão): salas e jogadores reais no Supabase, atualizados em tempo real (js/online.js).
// DEMONSTRAÇÃO: se o Supabase não carregar, a sala funciona só neste navegador com jogadores simulados.
window.UC = window.UC || {};

UC.Sala = (() => {
  const CHAVE = 'uc_sala_demo';
  const NOMES_TESTE = ['Ana', 'Caio', 'Duda', 'Léo', 'Bia', 'Rafa', 'Nina', 'Theo', 'Lia', 'Gui'];
  const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const $ = (s, r = document) => r.querySelector(s);
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const som = (nome) => { try { UC.Som && UC.Som[nome] && UC.Som[nome](); } catch (e) { /* ignora */ } };

  let st = null;
  let raiz = null;
  let detalhe = null; // personagem em destaque no painel lateral

  function gerarCodigo() {
    let c = '';
    for (let i = 0; i < 5; i++) c += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
    return c;
  }

  let online = false;
  let meuConvite = null;
  function salvar() { if (online) return; try { sessionStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) { /* ignora */ } }

  // ---------- modo online ----------
  function aviso(texto, erro) {
    raiz.innerHTML = `<div class="sala-painel sala-aviso">
      <p class="sala-rotulo">A Última Ceia · Sala de espera</p>
      <h2>${erro ? 'Não foi possível entrar' : 'Abrindo a sala…'}</h2>
      <p>${esc(texto)}</p>
      ${erro ? '<div class="sala-acoes"><button class="btn btn-principal tentar" type="button">Tentar de novo</button></div>' : ''}
      <a class="sala-sair" href="../../">‹ Voltar ao Mentes Pensantes</a>
    </div>`;
  }

  let atualizando = false, deNovo = false, agendado = 0;
  const intervalos = [];
  function agendarAtualizar() { clearTimeout(agendado); agendado = setTimeout(atualizar, 150); }

  async function atualizar() {
    if (!online || !st) return;
    if (atualizando) { deNovo = true; return; }
    atualizando = true;
    const g = geracao, feitas = fila.feitas, ocupada = fila.pendentes;
    try {
      const { sala, jogadores } = await UC.Online.estado(st.codigo);
      // uma escolha minha estava em andamento ou terminou durante esta consulta: a resposta pode ser
      // antiga; ignora (senão o personagem anterior volta por um instante e a tela pisca)
      if (ocupada || g !== geracao || feitas !== fila.feitas || fila.pendentes) { if (!fila.pendentes) deNovo = true; return; }
      const eu = UC.Online.usuario;
      if (!sala || !jogadores.some((j) => j.usuario === eu)) {
        // caiu da sala (aba parada por muito tempo): tenta voltar sozinho
        await UC.Online.rpc('entrar_sala', { p_codigo: st.codigo, p_nome: meuConvite.nome });
        deNovo = true;
        return;
      }
      st.max = sala.max;
      st.souAnfitriao = sala.anfitriao === eu;
      st.jogadores = jogadores.map((j) => ({
        id: j.usuario, nome: j.nome, voce: j.usuario === eu, anfitriao: j.usuario === sala.anfitriao,
        personagem: j.personagem, unidade: j.unidade, pronto: j.pronto, teste: j.teste,
      }));
      render();
    } catch (e) {
      const t = String(e && e.message || e);
      if (t.includes('SALA_NAO_EXISTE') || t.includes('SALA_CHEIA') || t.includes('EXPULSO')) {
        intervalos.forEach(clearInterval); online = false; // para de consultar a sala
        if (t.includes('EXPULSO')) { try { sessionStorage.removeItem('mp_sala'); } catch (err) { /* ignora */ } }
        aviso(UC.Online.mensagem(e), true);
      }
      // falha de rede: tenta de novo no próximo ciclo
    } finally {
      atualizando = false;
      if (deNovo) { deNovo = false; agendarAtualizar(); }
    }
  }

  async function abrirOnline(convite) {
    online = true;
    meuConvite = convite;
    aviso('Conectando…');
    try {
      await UC.Online.conectar();
      let codigo = convite.codigo;
      if (convite.acao !== 'entrar' && codigo) {
        // anfitrião recarregou a página: volta para a mesma sala (ou cria outra se ela acabou)
        try { await UC.Online.rpc('entrar_sala', { p_codigo: codigo, p_nome: convite.nome }); }
        catch (e) { if (String(e.message).includes('SALA_NAO_EXISTE')) codigo = null; else throw e; }
      }
      if (convite.acao !== 'entrar' && !codigo) {
        codigo = await UC.Online.rpc('criar_sala', { p_nome: convite.nome, p_max: Number(convite.max) || 10 });
        convite.codigo = codigo;
        try { sessionStorage.setItem('mp_sala', JSON.stringify(convite)); } catch (e) { /* ignora */ }
      } else if (convite.acao === 'entrar') {
        codigo = await UC.Online.rpc('entrar_sala', { p_codigo: codigo, p_nome: convite.nome });
      }
      st = { online: true, codigo, max: Number(convite.max) || 10, souAnfitriao: false, jogadores: [] };
      await atualizar();
      if (!st.jogadores.length) return;
      UC.Online.ouvir(codigo, agendarAtualizar);
      intervalos.forEach(clearInterval);
      intervalos.push(setInterval(() => UC.Online.rpc('estou_aqui', { p_codigo: st.codigo }).catch(() => {}), 20000));
      intervalos.push(setInterval(atualizar, 6000)); // reserva, caso o tempo real falhe
      raiz.querySelector('.bola')?.focus({ preventScroll: true });
    } catch (e) {
      aviso(UC.Online.mensagem(e), true);
    }
  }

  // As ações vão em fila, uma de cada vez e na ordem dos cliques: tocar em A e logo em B termina em B.
  let geracao = 0;
  const fila = { pendentes: 0, feitas: 0, ultima: Promise.resolve() };
  function acaoOnline(nome, args) {
    geracao++;
    fila.pendentes++;
    fila.ultima = fila.ultima.then(async () => {
      try { await UC.Online.rpc(nome, { p_codigo: st.codigo, ...args }); }
      catch (e) { dica(UC.Online.mensagem(e)); }
      fila.pendentes--;
      fila.feitas++;
      if (!fila.pendentes) agendarAtualizar();
    });
    return fila.ultima;
  }

  function novoEstado(convite) {
    const criar = convite.acao !== 'entrar';
    const s = {
      origem: JSON.stringify(convite),
      codigo: criar ? gerarCodigo() : convite.codigo,
      max: criar ? Number(convite.max) || 10 : 8,
      souAnfitriao: criar,
      jogadores: [{ id: 'voce', nome: convite.nome, voce: true, anfitriao: criar, personagem: null, unidade: null, pronto: false }],
      proximoTeste: 0,
    };
    if (!criar) {
      // quem entra com código encontra o anfitrião já na sala
      const p = 'isadora';
      s.jogadores.unshift({ id: 't0', nome: NOMES_TESTE[0], anfitriao: true, personagem: p, unidade: UC.unidadeDe(p, s.max), pronto: true });
      s.proximoTeste = 1;
    }
    return s;
  }

  function carregar(convite) {
    try {
      const s = JSON.parse(sessionStorage.getItem(CHAVE) || 'null');
      if (s && s.origem === JSON.stringify(convite)) return s;
    } catch (e) { /* ignora */ }
    return novoEstado(convite);
  }

  // ---------- regras ----------
  const eu = () => st.jogadores.find((j) => j.voce);
  const donoDaUnidade = (unidade) => st.jogadores.find((j) => j.unidade === unidade);
  const unidadesLivres = () => {
    const usadas = new Set(st.jogadores.map((j) => j.unidade).filter(Boolean));
    return [...new Set(UC.PERSONAGENS.map((p) => UC.unidadeDe(p.id, st.max)))].filter((u) => !usadas.has(u));
  };

  function escolher(id) {
    const unidade = UC.unidadeDe(id, st.max);
    const dono = donoDaUnidade(unidade);
    detalhe = id;
    if (dono && !dono.voce) {
      render();
      brincar(raiz.querySelector(`.bola[data-id="${id}"]`), 'recusa');
      return;
    }
    const j = eu();
    j.personagem = id;
    j.unidade = unidade;
    j.pronto = false;
    som('clique');
    salvar();
    render();
    brincar(raiz.querySelector(`.bola[data-id="${id}"]`), 'pulo');
    if (online) acaoOnline('escolher_personagem', { p_personagem: id });
  }

  function alternarPronto() {
    const j = eu();
    if (!j.personagem) return;
    j.pronto = !j.pronto;
    som('clique');
    salvar();
    render();
    if (online) acaoOnline('marcar_pronto', { p_pronto: j.pronto });
  }

  function adicionarTeste() {
    if (online) { som('clique'); acaoOnline('adicionar_teste', {}); return; }
    if (st.jogadores.length >= st.max) { dica('A sala está cheia.'); return; }
    const nome = NOMES_TESTE[st.proximoTeste % NOMES_TESTE.length] + (st.proximoTeste >= NOMES_TESTE.length ? ' ' + (Math.floor(st.proximoTeste / NOMES_TESTE.length) + 1) : '');
    const t = { id: 't' + (++st.proximoTeste), nome, teste: true, personagem: null, unidade: null, pronto: false };
    st.jogadores.push(t);
    som('clique');
    salvar();
    render();
    setTimeout(() => {
      const livres = unidadesLivres();
      if (!livres.length || !st.jogadores.includes(t)) return;
      t.unidade = livres[Math.floor(Math.random() * livres.length)];
      t.personagem = t.unidade.split('+')[0];
      salvar(); render();
      setTimeout(() => { t.pronto = true; salvar(); render(); }, 700);
    }, 600);
  }

  function removerTestes() {
    if (online) { som('clique'); acaoOnline('remover_testes', {}); return; }
    st.jogadores = st.jogadores.filter((j) => !j.teste);
    som('clique');
    salvar();
    render();
  }

  let dicaTimer = null;
  function dica(texto) {
    const d = $('.sala-dica', raiz);
    if (!d) return;
    d.textContent = texto;
    d.classList.add('alerta');
    clearTimeout(dicaTimer);
    dicaTimer = setTimeout(() => { d.classList.remove('alerta'); render(); }, 2600);
  }

  // ---------- tela ----------
  function bolaHTML(p, tamanho = "") {
    return `<span class="bola-esfera retrato ${tamanho}"><img src="${p.retrato}" alt="" draggable="false" loading="lazy"></span>`;
  }
  // boneco em pixel do personagem em foco, com a animação própria dele
  function bonecoHTML(p) {
    if (p.folha) {
      // boneco com animação quadro a quadro (folha de poses)
      return `<div class="palco-boneco" data-id="${p.id}">
        <div class="boneco boneco-folha chega" role="img" aria-label="Boneco de ${esc(p.nome)}" style="background-image:url(${p.folha.imagem});--proporcao:${p.folha.proporcao || '320 / 500'};--escala:${p.folha.escala || 1};background-size:${p.folha.total * 100}% 100%">
          <svg class="coracao" viewBox="0 0 8 6" shape-rendering="crispEdges" aria-hidden="true"><path fill="#f15275" d="M1 0h2v1h2V0h2v1h1v2H7v1H6v1H5v1H3V5H2V4H1V3H0V1h1z"/></svg>
        </div><span class="boneco-sombra"></span></div>`;
    }
    return `<div class="palco-boneco" data-id="${p.id}"><img class="boneco chega anim-${p.animBoneco}" src="${p.boneco}" alt="Boneco de ${esc(p.nome)}" draggable="false"><span class="boneco-sombra"></span></div>`;
  }

  // Toca a folha de poses: troca o quadro pela linha do tempo e solta o coração na hora do beijo.
  // Repete com uma pausa entre uma vez e outra; para sozinho quando o boneco sai da tela.
  function animarFolha(raizBoneco) {
    const el = raizBoneco?.querySelector('.boneco-folha');
    if (!el || el.dataset.tocando) return;
    el.dataset.tocando = '1';
    const p = UC.porId(raizBoneco.dataset.id);
    const { quadros, coracao, duracao, pausa, total, seq, fps } = p.folha;
    const ch = el.querySelector('.coracao');
    let inicio = performance.now() + 500; // depois do pulinho de chegada
    function quadro(agora) {
      if (!el.isConnected) return;
      const calmo = UC.Ajustes.get('reduzido');
      let f, t;
      if (seq) {
        // loop contínuo numa sequência fixa de poses
        // tempo dentro da volta atual (o coração e outros efeitos se repetem a cada volta)
        t = agora < inicio || calmo ? -1 : (agora - inicio) % ((seq.length * 1000) / fps);
        f = t < 0 ? seq[0] : seq[Math.floor((t * fps) / 1000) % seq.length];
      } else {
        t = (agora - inicio) % (duracao + pausa);
        if (agora < inicio || calmo) t = -1;
        f = t < 0 ? 0 : (quadros.find(([ate]) => t < ate) || [0, 0])[1];
      }
      el.style.backgroundPositionX = `${(f / (total - 1)) * 100}%`;
      if (coracao && t >= coracao.de && t < coracao.ate) {
        const q = (t - coracao.de) / (coracao.ate - coracao.de);
        ch.style.opacity = Math.sin(Math.PI * q).toFixed(2);
        ch.style.left = `${((coracao.x + q * coracao.dx) / 320) * 100}%`;
        ch.style.top = `${((coracao.y + q * coracao.dy) / 500) * 100}%`;
      } else ch.style.opacity = 0;
      requestAnimationFrame(quadro);
    }
    requestAnimationFrame(quadro);
  }

  // Momento 2 da porta: todos logados, com personagem escolhido e prontos.
  // Dispara uma vez por vez que a sala fica completa (se alguém desmarcar, pode disparar de novo).
  let avisoTimer = 0;
  function avisarTodosProntos(completo) {
    if (completo && !st.portaAberta) {
      st.portaAberta = true;
      salvar();
      clearTimeout(avisoTimer);
      avisoTimer = setTimeout(() => UC.Entrada?.todosProntos(), 1200);
    } else if (!completo && st.portaAberta) {
      st.portaAberta = false;
      clearTimeout(avisoTimer);
      salvar();
    }
  }

  function render() {
    const j = eu();
    const meu = j.personagem && UC.porId(j.personagem);
    const parceiroMeu = j.personagem && UC.parceiroDe(j.personagem, st.max);
    const todosProntos = st.jogadores.every((x) => x.pronto);
    avisarTodosProntos(st.jogadores.length === st.max && st.jogadores.every((x) => x.pronto && x.personagem));
    const cheia = st.jogadores.length === st.max;
    const foco = UC.porId(detalhe || j.personagem || 'alice');
    const focoParceiro = UC.parceiroDe(foco.id, st.max);
    const focoDono = donoDaUnidade(UC.unidadeDe(foco.id, st.max));

    const bolas = UC.PERSONAGENS.map((p) => {
      const unidade = UC.unidadeDe(p.id, st.max);
      const dono = donoDaUnidade(unidade);
      const daUnidade = dono && dono.voce;           // da minha dupla (o escolhido ou o par dele)
      const minha = daUnidade && dono.personagem === p.id; // só o que eu escolhi fica destacado
      const meuPar = daUnidade && !minha;
      const classes = ['bola', minha ? 'minha' : '', meuPar ? 'meu-par' : '', dono && !daUnidade ? 'ocupada' : '', foco.id === p.id ? 'em-foco' : ''].filter(Boolean).join(' ');
      const rotulo = dono ? (minha ? 'Você' : meuPar ? 'Sua dupla' : dono.nome) : 'Livre';
      return `<button class="${classes}" data-id="${p.id}" data-dono="${dono && !daUnidade ? esc(dono.id) : ''}" aria-pressed="${!!minha}" aria-label="${esc(p.nome)}: ${rotulo}">
        ${bolaHTML(p)}
        <span class="bola-nome">${esc(p.nome.replace(/^Personagem /, "Nº "))}</span>
        <span class="bola-dono">${esc(rotulo)}${unidade.includes('+') && !meuPar ? ' · dupla' : ''}</span>
      </button>`;
    }).join('');

    const jogadores = st.jogadores.map((x) => {
      const p = x.personagem && UC.porId(x.personagem);
      const estado = x.pronto ? '<span class="ok">Pronto ✓</span>' : (p ? 'Lendo a carta…' : 'Escolhendo…');
      return `<li class="${x.voce ? 'eu' : ''}" data-usuario="${x.voce ? '' : esc(x.id)}">
        ${p ? bolaHTML(p, 'mini') : '<span class="bola-esfera mini vazia"><span>?</span></span>'}
        <span class="j-nome">${esc(x.nome)}${x.voce ? ' (você)' : ''}${x.anfitriao ? ' <span class="coroa" title="Anfitrião">♛</span>' : ''}</span>
        <span class="j-estado">${p ? esc(p.nome) + (x.unidade.includes('+') ? ' + ' + esc(UC.porId(UC.parceiroDe(p.id, st.max)).nome) : '') + ' · ' : ''}${estado}</span>
      </li>`;
    }).join('');

    let dicaTexto;
    if (!j.personagem) dicaTexto = 'Toque em uma foto para escolher seu personagem.';
    else if (!j.pronto) dicaTexto = 'Quando estiver pronto, marque "Estou pronto".';
    else if (!cheia && online) dicaTexto = `Faltam ${st.max - st.jogadores.length} jogador(es). Mande o código ${st.codigo} para eles${st.souAnfitriao ? ' ou use "Adicionar jogador de teste"' : ''}.`;
    else if (!cheia) dicaTexto = `Faltam ${st.max - st.jogadores.length} jogador(es). Use "Adicionar jogador de teste" para simular.`;
    else if (!todosProntos) dicaTexto = 'Aguardando todos ficarem prontos.';
    else dicaTexto = 'Todos prontos! A porta vai se abrir…';

    const html = `
      <div class="sala-painel">
        <header class="sala-topo">
          <div>
            <p class="sala-rotulo">A Última Ceia · Sala de espera</p>
            <h2>Escolha seu personagem</h2>
          </div>
          <div class="sala-codigo">
            <span>Código da sala</span>
            <strong>${esc(st.codigo)}</strong>
            <button class="btn btn-discreto copiar" type="button">Copiar</button>
          </div>
        </header>
        <p class="sala-demo">${online
          ? `Sala online: mande o código <strong>${esc(st.codigo)}</strong> para os outros jogadores. Eles entram pelo Mentes Pensantes em "Entrar com código". Toque numa foto para ver o boneco que vai para o jogo.`
          : 'Versão de demonstração: sem conexão com o servidor. Os outros jogadores são simulados. Toque numa foto para ver o boneco que vai para o jogo.'}</p>

        <div class="sala-corpo">
          <section class="sala-bolas" aria-label="Personagens">${bolas}</section>

          <aside class="sala-lado">
            <div class="sala-detalhe">
              ${bonecoHTML(foco)}
              <div>
                <h3>${esc(foco.nome)}</h3>
                <p>${esc(foco.descricao)}</p>
                ${focoParceiro ? `<p class="par">Com ${st.max} jogadores, quem escolher ${esc(foco.nome)} também recebe as cartas de ${esc(UC.porId(focoParceiro).nome)}.</p>` : ''}
                <p class="dono">${focoDono ? (focoDono.voce ? 'Este é o seu personagem.' : `Escolhido por ${esc(focoDono.nome)}.`) : 'Disponível.'}</p>
              </div>
            </div>

            <h3 class="sala-sub">Jogadores <span>${st.jogadores.length}/${st.max}</span></h3>
            <ul class="sala-jogadores">${jogadores}</ul>

            <div class="sala-acoes">
              <button class="btn ${j.pronto ? '' : 'btn-principal'} pronto" type="button" ${meu ? '' : 'disabled'}>${j.pronto ? 'Não estou pronto' : 'Estou pronto'}</button>
              ${!online || st.souAnfitriao ? `<button class="btn testar" type="button" ${cheia ? 'disabled' : ''}>Adicionar jogador de teste</button>` : ''}
              ${(!online || st.souAnfitriao) && st.jogadores.some((x) => x.teste) ? '<button class="btn btn-discreto limpar" type="button">Remover jogadores de teste</button>' : ''}
            </div>
            <p class="sala-dica" role="status">${esc(dicaTexto)}</p>
            ${parceiroMeu ? `<p class="sala-par">Você joga com ${esc(meu.nome)} e também recebe as cartas de ${esc(UC.porId(parceiroMeu).nome)}.</p>` : ''}
          </aside>
        </div>

        <a class="sala-sair" href="../../">‹ Sair para o Mentes Pensantes</a>
      </div>`;
    // Atualiza só o que mudou: as fotos e o boneco continuam os mesmos elementos (nada pisca,
    // a animação não reinicia e o foco do teclado fica onde estava).
    const painel = raiz.firstElementChild;
    if (painel && painel.matches('.sala-painel:not(.sala-aviso)')) {
      const t = document.createElement('template');
      t.innerHTML = html.trim();
      mesclar(painel, t.content.firstElementChild);
    } else {
      raiz.innerHTML = html;
    }
    animarFolha(raiz.querySelector('.palco-boneco'));
  }

  // Animações de clique (pulo ao escolher, tremida ao recusar): reinicia e tira a classe quando termina.
  const TEMPORARIAS = ['pulo', 'recusa'];
  function brincar(el, classe) {
    if (!el) return;
    el.classList.remove(classe);
    void el.offsetWidth; // força o navegador a recomeçar a animação
    el.classList.add(classe);
    el.addEventListener('animationend', () => el.classList.remove(classe), { once: true });
  }

  // Deixa `velho` igual a `novo` mexendo o mínimo possível no DOM.
  function mesclar(velho, novo) {
    if (velho.nodeType !== novo.nodeType || velho.nodeName !== novo.nodeName) { velho.replaceWith(novo); return; }
    if (velho.nodeType === Node.TEXT_NODE || velho.nodeType === Node.COMMENT_NODE) {
      if (velho.data !== novo.data) velho.data = novo.data;
      return;
    }
    // o boneco em foco é animado por código: se é o mesmo personagem, fica como está
    // (outro personagem: troca o boneco inteiro, para a chegada e a animação começarem do zero)
    if (velho.classList.contains('palco-boneco')) {
      if (velho.dataset.id !== novo.dataset.id) velho.replaceWith(novo);
      return;
    }
    // o pulinho/recusa de um clique continua até acabar, mesmo se a tela atualizar no meio
    const efeitos = TEMPORARIAS.filter((c) => velho.classList.contains(c));
    const classe = [...new Set([...(novo.getAttribute('class') || '').split(/\s+/), ...efeitos])].filter(Boolean).join(' ');
    if (novo.hasAttribute('class') || efeitos.length) novo.setAttribute('class', classe);
    for (const a of [...velho.attributes]) if (!novo.hasAttribute(a.name)) velho.removeAttribute(a.name);
    for (const a of novo.attributes) if (velho.getAttribute(a.name) !== a.value) velho.setAttribute(a.name, a.value);
    if (velho.disabled !== novo.hasAttribute('disabled') && 'disabled' in velho) velho.disabled = novo.hasAttribute('disabled');
    const vs = [...velho.childNodes], ns = [...novo.childNodes];
    ns.forEach((n, i) => { if (vs[i]) mesclar(vs[i], n); else velho.appendChild(n); });
    for (let i = ns.length; i < vs.length; i++) vs[i].remove();
  }

  // ---------- abrir ----------
  function abrir(convite) {
    raiz = $('#sala');
    if (st && st.online) { raiz.hidden = false; render(); return; } // já conectado
    if (UC.Online && UC.Online.disponivel()) { raiz.hidden = false; abrirOnline(convite); return; }
    st = carregar(convite);
    salvar();
    raiz.hidden = false;
    render();
    raiz.querySelector('.bola')?.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    if (!raiz || raiz.hidden) return;
    if (e.target.closest('#sala .tentar')) { location.reload(); return; }
    // sair de verdade: libera a vaga e o personagem para os outros
    const sair = e.target.closest('#sala .sala-sair');
    if (sair && online && st && st.codigo) {
      e.preventDefault();
      try { sessionStorage.removeItem('mp_sala'); } catch (err) { /* ignora */ }
      UC.Online.rpc('sair_sala', { p_codigo: st.codigo }).catch(() => {}).finally(() => { location.href = sair.href; });
      return;
    }
    if (!st) return;
    const b = e.target.closest('.bola');
    if (b && raiz.contains(b)) { escolher(b.dataset.id); return; }
    if (e.target.closest('#sala .pronto')) alternarPronto();
    else if (e.target.closest('#sala .testar')) adicionarTeste();
    else if (e.target.closest('#sala .limpar')) removerTestes();
    else if (e.target.closest('#sala .copiar')) {
      navigator.clipboard?.writeText(st.codigo).then(() => dica('Código copiado.'), () => dica(`Código: ${st.codigo}`));
    }
  });

  // ---------- anfitrião: botão direito (ou toque longo) tira o jogador da sala ----------
  let menu = null;
  function fecharMenu() { menu?.remove(); menu = null; }
  function abrirMenu(x, y, alvo) {
    fecharMenu();
    menu = document.createElement('div');
    menu.className = 'menu-jogador';
    menu.setAttribute('role', 'menu');
    menu.innerHTML = `<p>${esc(alvo.nome)}${alvo.teste ? ' (teste)' : ''}</p>
      <button type="button" role="menuitem" class="tirar">Tirar da sala</button>
      <button type="button" role="menuitem" class="cancelar">Cancelar</button>`;
    document.body.appendChild(menu);
    const w = menu.offsetWidth, h = menu.offsetHeight;
    menu.style.left = `${Math.max(8, Math.min(innerWidth - w - 8, x))}px`;
    menu.style.top = `${Math.max(8, Math.min(innerHeight - h - 8, y))}px`;
    menu.querySelector('.cancelar').addEventListener('click', fecharMenu);
    menu.querySelector('.tirar').addEventListener('click', () => { fecharMenu(); tirar(alvo); });
    menu.querySelector('.tirar').focus();
  }
  function tirar(alvo) {
    som('clique');
    if (!online) { st.jogadores = st.jogadores.filter((j) => j !== alvo); salvar(); render(); return; }
    st.jogadores = st.jogadores.filter((j) => j !== alvo); // some na hora; o servidor confirma
    render();
    dica(`${alvo.nome} saiu da sala.`);
    acaoOnline('remover_jogador', { p_usuario: alvo.id });
  }
  document.addEventListener('contextmenu', (e) => {
    if (!raiz || raiz.hidden || !st) return;
    const el = e.target.closest('#sala .bola[data-dono]:not([data-dono=""]), #sala .sala-jogadores li[data-usuario]:not([data-usuario=""])');
    if (!el) return;
    e.preventDefault();
    if (online && !st.souAnfitriao) { dica('Só o anfitrião (♛) pode tirar alguém da sala.'); return; }
    if (!online && !st.souAnfitriao) return;
    const id = el.dataset.dono || el.dataset.usuario;
    const alvo = st.jogadores.find((j) => String(j.id) === id && !j.voce);
    if (alvo) abrirMenu(e.clientX, e.clientY, alvo);
  });
  document.addEventListener('pointerdown', (e) => { if (menu && !menu.contains(e.target)) fecharMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu) { e.stopPropagation(); fecharMenu(); } }, true);

  // personagem escolhido por este jogador (id da vaga), para levar ao mapa
  const meuPersonagem = () => (st && st.jogadores ? (st.jogadores.find((j) => j.voce) || {}).personagem : null) || null;

  return { abrir, meuPersonagem };
})();

// Sala de espera da Última Ceia: VERSÃO DE DEMONSTRAÇÃO, sem servidor.
// Os personagens aparecem como bolas coloridas até a arte deles ser definida.
// Os outros jogadores são simulados ("jogadores de teste"). Quando o Supabase entrar,
// esta tela passa a mostrar os jogadores reais da sala.
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

  function salvar() { try { sessionStorage.setItem(CHAVE, JSON.stringify(st)); } catch (e) { /* ignora */ } }

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
      raiz.querySelector(`.bola[data-id="${id}"]`)?.classList.add('recusa');
      return;
    }
    const j = eu();
    j.personagem = id;
    j.unidade = unidade;
    j.pronto = false;
    som('clique');
    salvar();
    render();
    raiz.querySelector(`.bola[data-id="${id}"]`)?.classList.add('pulo');
  }

  function alternarPronto() {
    const j = eu();
    if (!j.personagem) return;
    j.pronto = !j.pronto;
    som('clique');
    salvar();
    render();
  }

  function adicionarTeste() {
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
      const minha = dono && dono.voce;
      const classes = ['bola', minha ? 'minha' : '', dono && !minha ? 'ocupada' : '', foco.id === p.id ? 'em-foco' : ''].join(' ');
      const rotulo = dono ? (minha ? 'Você' : dono.nome) : 'Livre';
      return `<button class="${classes}" data-id="${p.id}" aria-pressed="${!!minha}" aria-label="${esc(p.nome)}: ${rotulo}">
        ${bolaHTML(p)}
        <span class="bola-nome">${esc(p.nome.replace(/^Personagem /, "Nº "))}</span>
        <span class="bola-dono">${esc(rotulo)}${unidade.includes('+') ? ' · dupla' : ''}</span>
      </button>`;
    }).join('');

    const jogadores = st.jogadores.map((x) => {
      const p = x.personagem && UC.porId(x.personagem);
      const estado = x.pronto ? '<span class="ok">Pronto ✓</span>' : (p ? 'Lendo a carta…' : 'Escolhendo…');
      return `<li class="${x.voce ? 'eu' : ''}">
        ${p ? bolaHTML(p, 'mini') : '<span class="bola-esfera mini vazia"><span>?</span></span>'}
        <span class="j-nome">${esc(x.nome)}${x.voce ? ' (você)' : ''}${x.anfitriao ? ' <span class="coroa" title="Anfitrião">♛</span>' : ''}</span>
        <span class="j-estado">${p ? esc(p.nome) + (x.unidade.includes('+') ? ' + ' + esc(UC.porId(UC.parceiroDe(p.id, st.max)).nome) : '') + ' · ' : ''}${estado}</span>
      </li>`;
    }).join('');

    let dicaTexto;
    if (!j.personagem) dicaTexto = 'Toque em uma foto para escolher seu personagem.';
    else if (!j.pronto) dicaTexto = 'Quando estiver pronto, marque "Estou pronto".';
    else if (!cheia) dicaTexto = `Faltam ${st.max - st.jogadores.length} jogador(es). Use "Adicionar jogador de teste" para simular.`;
    else if (!todosProntos) dicaTexto = 'Aguardando todos ficarem prontos.';
    else dicaTexto = 'Todos prontos! A porta vai se abrir…';

    // o boneco em foco continua o mesmo elemento entre atualizações (a animação não reinicia)
    const bonecoAnterior = raiz.querySelector(".palco-boneco");
    raiz.innerHTML = `
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
        <p class="sala-demo">Versão de demonstração: ainda sem servidor. Os outros jogadores são simulados. Toque numa foto para ver o boneco que vai para o jogo.</p>

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
              <button class="btn testar" type="button" ${cheia ? 'disabled' : ''}>Adicionar jogador de teste</button>
              ${st.jogadores.some((x) => x.teste) ? '<button class="btn btn-discreto limpar" type="button">Remover jogadores de teste</button>' : ''}
            </div>
            <p class="sala-dica" role="status">${esc(dicaTexto)}</p>
            ${parceiroMeu ? `<p class="sala-par">Você joga com ${esc(meu.nome)} e também recebe as cartas de ${esc(UC.porId(parceiroMeu).nome)}.</p>` : ''}
          </aside>
        </div>

        <a class="sala-sair" href="../../">‹ Sair para o Mentes Pensantes</a>
      </div>`;
    const bonecoNovo = raiz.querySelector('.palco-boneco');
    if (bonecoAnterior && bonecoNovo && bonecoAnterior.dataset.id === bonecoNovo.dataset.id) {
      bonecoNovo.replaceWith(bonecoAnterior);
    }
    animarFolha(raiz.querySelector('.palco-boneco'));
  }

  // ---------- abrir ----------
  function abrir(convite) {
    raiz = $('#sala');
    st = carregar(convite);
    salvar();
    raiz.hidden = false;
    render();
    raiz.querySelector('.bola')?.focus({ preventScroll: true });
  }

  document.addEventListener('click', (e) => {
    if (!raiz || raiz.hidden) return;
    const b = e.target.closest('.bola');
    if (b && raiz.contains(b)) { escolher(b.dataset.id); return; }
    if (e.target.closest('#sala .pronto')) alternarPronto();
    else if (e.target.closest('#sala .testar')) adicionarTeste();
    else if (e.target.closest('#sala .limpar')) removerTestes();
    else if (e.target.closest('#sala .copiar')) {
      navigator.clipboard?.writeText(st.codigo).then(() => dica('Código copiado.'), () => dica(`Código: ${st.codigo}`));
    }
  });

  return { abrir };
})();

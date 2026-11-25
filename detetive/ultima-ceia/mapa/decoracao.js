// Modo decoração da mansão: monte os cômodos você mesma.
//  P ............ abre/fecha o inventário (catálogo de móveis, objetos e pistas)
//  1–9 .......... escolhe o item da barra de baixo (hotbar)
//  scroll / R ... gira o item (sombra verde = cabe; vermelha = bate em parede)
//  clique ....... coloca o item · botão direito: remove o item embaixo do mouse · Ctrl+Z: desfaz
//  Esc .......... fecha o inventário / sai do modo decoração
// Disponível no mapa de teste (aberto direto, sem sala) ou com ?editar no endereço.
// A decoração fica salva neste navegador; "Exportar" baixa o arquivo decoracao.json, que é o que vai
// para o site (o jogo carrega mapa/decoracao.json para todos os jogadores).
(() => {
  const K = 3;
  const params = new URLSearchParams(location.search);
  let temSala = false;
  try { temSala = !!JSON.parse(sessionStorage.getItem('mp_sala') || 'null'); } catch (e) { /* ignora */ }
  const editavel = params.has('editar') || !temSala;

  // ---------- dados ----------
  const CHAVE = 'uc_decoracao_v1';
  const vazio = () => ({ versao: 1, andares: {}, pistas: {} });
  let dados = vazio(), local = false, publicado = null;
  try { const t = localStorage.getItem(CHAVE); if (t) { dados = { ...vazio(), ...JSON.parse(t) }; local = true; } } catch (e) { /* ignora */ }
  fetch('decoracao.json', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((j) => {
    if (!j) return;
    publicado = j;
    if (!local) { const antes = JSON.stringify(dados.andares); dados = { ...vazio(), ...j }; reaplicarTudo(antes); }
  }).catch(() => {});
  const andarDados = (n) => (dados.andares[n] || (dados.andares[n] = { vazio: false, itens: [] }));
  function salvar() {
    local = true;
    try { localStorage.setItem(CHAVE, JSON.stringify({ versao: 1, andares: dados.andares, pistas: dados.pistas })); } catch (e) { /* ignora */ }
  }
  function reaplicarTudo(andaresAntes) {
    if (!window.Interior) return;
    for (const n of Interior.construidos()) {
      const mudouVazio = andaresAntes !== undefined && JSON.stringify((JSON.parse(andaresAntes || '{}')[n] || {}).vazio || false) !== JSON.stringify(!!(dados.andares[n] || {}).vazio);
      if (mudouVazio) Interior.reconstruir(n); else aplicar(Interior.andarDe(n));
    }
  }

  // ---------- catálogo ----------
  const C = [];
  const peca = (id, nome, cat, f, extra = {}) => C.push({ id, nome, cat, f, ...extra });
  const corpo = (id, nome, tipo, v, extra = {}) => C.push({ id, nome, cat: 'Com física', corpo: tipo, v, ...extra });
  const cores = { azul: '#3c5f8f', verde: '#4f7d45', vermelho: '#9a3036', mostarda: '#b08a2e', roxo: '#6a4a8f', vinho: '#5a2a3a' };
  // mesas
  peca('mesa-p', 'Mesa pequena', 'Mesas', (L, A) => L.mesa(A, 0, 0, 24, 14));
  peca('mesa-m', 'Mesa média', 'Mesas', (L, A) => L.mesa(A, 0, 0, 40, 20));
  peca('mesa-g', 'Mesa grande', 'Mesas', (L, A) => L.mesa(A, 0, 0, 64, 24));
  peca('mesa-jantar', 'Mesa de jantar posta', 'Mesas', (L, A, P) => {
    L.mesa(A, 0, 0, 160, 32, '#5a3620'); P(3, 3, 154, 24, '#e8e0cc'); P(3, 13, 154, 4, '#8a2a30');
    for (const px of [12, 44, 76, 108, 140]) { P(px, 5, 7, 5, '#f4f0e6'); P(px + 2, 6, 3, 2, '#b86a3a'); P(px, 20, 7, 5, '#f4f0e6'); P(px + 2, 21, 3, 2, '#7a9a4a'); }
    for (const cx of [32, 128]) { P(cx - 3, 13, 8, 3, '#d0a850'); L.vela(A, cx - 3, 9); L.vela(A, cx + 3, 9); }
  });
  peca('escrivaninha', 'Escrivaninha', 'Mesas', (L, A) => L.escrivaninha(A, 0, 0, 44));
  peca('aparador', 'Aparador', 'Mesas', (L, A) => L.aparador(A, 0, 0, 44));
  peca('bancada', 'Bancada', 'Cozinha e banho', (L, A) => L.bancada(A, 0, 0, 48));
  peca('mesa-bilhar', 'Mesa de bilhar', 'Mesas', (L, A) => L.mesaBilhar(A, 0, 0));
  // quarto
  for (const [k, c] of Object.entries(cores)) if (k !== 'vinho') peca('cama-' + k, `Cama ${k}`, 'Quarto', (L, A) => L.cama(A, 0, 0, c));
  peca('cama-casal', 'Cama de casal', 'Quarto', (L, A) => L.cama(A, 0, 0, '#7a1f2a', 34));
  peca('criado', 'Criado-mudo', 'Quarto', (L, A) => L.criado(A, 0, 3));
  peca('armario', 'Armário', 'Quarto', (L, A) => L.armario(A, 0, 0));
  peca('bau', 'Baú', 'Quarto', (L, A) => L.bau(A, 0, 0));
  // sala
  peca('sofa-vinho', 'Sofá vinho', 'Sala', (L, A) => L.sofa(A, 0, 0, 48, cores.vinho));
  peca('sofa-azul', 'Sofá azul', 'Sala', (L, A) => L.sofa(A, 0, 0, 48, '#2a3a5a'));
  peca('sofa-verde', 'Sofá verde', 'Sala', (L, A) => L.sofa(A, 0, 0, 48, '#2a5a3a'));
  peca('piano', 'Piano', 'Sala', (L, A) => L.piano(A, 0, 0));
  peca('lareira', 'Lareira', 'Sala', (L, A) => L.lareira(A, 0, 0, 36));
  peca('relogio', 'Relógio de pêndulo', 'Sala', (L, A) => L.relogio(A, 0, 0));
  peca('estante-p', 'Estante pequena', 'Sala', (L, A) => L.estante(A, 0, 0, 28, 36));
  peca('estante-g', 'Estante grande', 'Sala', (L, A) => L.estante(A, 0, 0, 52, 40));
  peca('banco', 'Banco', 'Sala', (L, A) => L.banco(A, 0, 0, 30));
  // cozinha e banho
  peca('fogao', 'Fogão', 'Cozinha e banho', (L, A) => L.fogao(A, 2, 34));
  peca('pia', 'Pia', 'Cozinha e banho', (L, A) => L.pia(A, 0, 0));
  peca('sanitario', 'Vaso sanitário', 'Cozinha e banho', (L, A) => L.sanitario(A, 0, 0));
  peca('banheira', 'Banheira', 'Cozinha e banho', (L, A) => L.banheira(A, 0, 0));
  peca('prateleira', 'Prateleira com potes', 'Cozinha e banho', (L) => L.prateleira(0, 0, 40), { parede: true });
  peca('espelho', 'Espelho', 'Cozinha e banho', (L) => L.espelho(0, 0), { parede: true });
  // decoração
  peca('vaso-fixo', 'Vaso de planta (fixo)', 'Decoração', (L, A) => L.vasoFixo(A, 0, 0));
  peca('castical', 'Castiçal de pé', 'Decoração', (L, A) => L.castical(A, 0, 3));
  peca('arandela', 'Arandela (parede)', 'Decoração', (L, A) => L.arandela(A, 1, 3), { parede: true });
  peca('janela', 'Janela com cortina', 'Decoração', (L) => L.janela(4, 2, 12, 12), { parede: true });
  peca('janela-larga', 'Janela larga', 'Decoração', (L) => L.janela(1, 1, 30, 12, null), { parede: true });
  peca('quadro-paisagem', 'Quadro: paisagem', 'Decoração', (L) => L.quadro(0, 0, 30, 22, 0), { parede: true });
  peca('quadro-retrato', 'Quadro: retrato', 'Decoração', (L) => L.quadro(0, 0, 24, 30, 1), { parede: true });
  peca('quadro-mar', 'Quadro: natureza-morta', 'Decoração', (L) => L.quadro(0, 0, 26, 20, 2), { parede: true });
  peca('tapete-vermelho', 'Tapete vermelho', 'Tapetes', (L) => L.tapete(0, 0, 64, 40, '#6e1f26'), { camada: 0, parede: true });
  peca('tapete-azul', 'Tapete azul', 'Tapetes', (L) => L.tapete(0, 0, 64, 40, '#2a3450', '#b08a3e'), { camada: 0, parede: true });
  peca('tapete-verde', 'Tapete verde', 'Tapetes', (L) => L.tapete(0, 0, 64, 40, '#2a4a32', '#b08a3e'), { camada: 0, parede: true });
  peca('tapete-grande', 'Tapete grande', 'Tapetes', (L) => L.tapete(0, 0, 128, 80, '#6e1f26'), { camada: 0, parede: true });
  peca('passadeira', 'Passadeira (corredor)', 'Tapetes', (L) => L.tapete(0, 0, 128, 22, '#5e2228', '#b08a3e'), { camada: 0, parede: true });
  // outros
  peca('carro', 'Carro', 'Outros', (L, A) => L.carro(A, 1, 0));
  peca('caldeira', 'Caldeira', 'Outros', (L, A) => L.caldeira(A, 0, 20));
  peca('canos', 'Canos', 'Outros', (L) => L.canos(0, 1, 48), { parede: true });
  peca('telescopio', 'Telescópio', 'Outros', (L, A) => L.telescopio(A, 0, 0));
  peca('cofre', 'Cofre', 'Outros', (L, A) => L.cofre(A, 0, 0));
  // com física (empurrar / pegar)
  corpo('cadeira', 'Cadeira (gira com o scroll)', ['cadeiraC', 'cadeiraL', 'cadeiraB', 'cadeiraL']);
  corpo('poltrona-vinho', 'Poltrona vinho', 'poltrona', '#6a2a3a');
  corpo('poltrona-verde', 'Poltrona verde', 'poltrona', '#2a5a3a');
  corpo('poltrona-azul', 'Poltrona azul', 'poltrona', '#2a3a5a');
  corpo('banqueta', 'Banqueta', 'banqueta'); corpo('mesinha', 'Mesinha', 'mesinha');
  corpo('barril', 'Barril', 'barril'); corpo('caixote', 'Caixote', 'caixote'); corpo('caixinha', 'Caixinha', 'caixinha');
  corpo('vaso', 'Vaso de planta', 'vaso'); corpo('pneu', 'Pneu', 'pneu');
  corpo('livro', 'Livro', 'livro'); corpo('garrafa', 'Garrafa', 'garrafa'); corpo('bola', 'Bola', 'bola');
  corpo('almofada', 'Almofada', 'almofada'); corpo('balde', 'Balde', 'balde'); corpo('fruta', 'Fruta', 'fruta'); corpo('bilhar', 'Bola de bilhar', 'bilhar');
  const CAT = new Map(C.map((c) => [c.id, c]));
  function itensDePistas() {
    return ((window.Investigacao && Investigacao.PONTOS) || []).map((p) => ({ id: 'pista:' + p.id, nome: p.rot + ` (${p.id})`, cat: 'Pistas', pista: p.id }));
  }
  const item = (id) => CAT.get(id) || itensDePistas().find((p) => p.id === id);
  const CATEGORIAS = ['Mesas', 'Quarto', 'Sala', 'Cozinha e banho', 'Decoração', 'Tapetes', 'Outros', 'Com física', 'Pistas'];

  // ---------- desenho de uma peça em um sprite (recortado) ----------
  const cachePeca = new Map();
  function render(it) {
    if (cachePeca.has(it.id)) return cachePeca.get(it.id);
    const W = 280, H = 220, OX = 40, OY = 70;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.translate(OX, OY);
    const A = { fixos: [], luzes: [], anims: [], nivel: 0 };
    const P = (x, y, w, h, cor) => { g.fillStyle = cor; g.fillRect(x, y, w, h); };
    Interior.comG(g, () => it.f(Interior.pecas, A, P));
    const d = g.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3] > 0) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
    if (x1 < 0) { x0 = y0 = 0; x1 = y1 = 7; }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, out = document.createElement('canvas'); out.width = w; out.height = h;
    out.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
    const dx = x0 - OX, dy = y0 - OY;
    const r = {
      can: out, w, h,
      fixos: A.fixos.map(([fx, fy, fw, fh]) => [fx - dx, fy - dy, fw, fh]),
      luzes: A.luzes.map((l) => ({ ...l, x: l.x - dx, y: l.y - dy })),
      anims: A.anims.map((a) => ({ ...a, x: a.x - dx, y: a.y - dy })),
    };
    cachePeca.set(it.id, r); return r;
  }
  // gira 90° no sentido horário, r vezes (sprite, colisores, luzes e animações)
  const cacheRot = new Map();
  function girada(it, r) {
    const k = it.id + '|' + r;
    if (cacheRot.has(k)) return cacheRot.get(k);
    let s = render(it);
    for (let i = 0; i < r; i++) {
      const c = document.createElement('canvas'); c.width = s.h; c.height = s.w;
      const g = c.getContext('2d'); g.translate(s.h, 0); g.rotate(Math.PI / 2); g.drawImage(s.can, 0, 0);
      const H = s.h;
      s = {
        can: c, w: s.h, h: s.w,
        fixos: s.fixos.map(([x, y, w, h]) => [H - y - h, x, h, w]),
        luzes: s.luzes.map((l) => ({ ...l, x: H - l.y, y: l.x })),
        anims: s.anims.map((a) => ({ ...a, x: H - a.y, y: a.x })),
      };
    }
    cacheRot.set(k, s); return s;
  }
  function spriteCorpo(it, r) {
    const tipo = Array.isArray(it.corpo) ? it.corpo[r % it.corpo.length] : it.corpo;
    return { tipo, can: Interior.sprite(tipo, it.v), t: Interior.TIPOS[tipo] };
  }

  // ---------- aplicar no andar ----------
  function aplicar(A) {
    const n = A.nivel, b = A.base; if (!b) return;
    A.fixos = b.fixos.slice(); A.luzes = b.luzes.slice(); A.anims = b.anims.slice();
    A.corpos = b.corpos.slice(); A.assentosFixos = b.assentos.slice(); A.decor = [];
    const itens = (dados.andares[n] && dados.andares[n].itens) || [];
    itens.forEach((p, idx) => {
      const it = CAT.get(p.t); if (!it) return;
      if (it.corpo) {
        const { tipo, t } = spriteCorpo(it, p.r || 0);
        const c = Interior.D(A, tipo, Math.round(p.x - t.w / 2), Math.round(p.y - t.h / 2), it.v);
        c.id = `${n}:d${idx}`; return;
      }
      const s = girada(it, p.r || 0), x0 = Math.round(p.x - s.w / 2), y0 = Math.round(p.y - s.h / 2);
      for (const [fx, fy, fw, fh] of s.fixos) A.fixos.push([x0 + fx, y0 + fy, fw, fh]);
      for (const l of s.luzes) A.luzes.push({ ...l, x: x0 + l.x, y: y0 + l.y });
      for (const a of s.anims) A.anims.push({ ...a, x: x0 + a.x, y: y0 + a.y });
      A.decor.push({ can: s.can, x0, y0, w: s.w, h: s.h, camada: it.camada ?? 1, idx });
    });
    A.decor.sort((a, b2) => a.camada - b2.camada || (a.y0 + a.h) - (b2.y0 + b2.h));
  }
  function desenhar(A, g) {
    if (!A.decor) return;
    g.imageSmoothingEnabled = false;
    for (const d of A.decor) g.drawImage(d.can, d.x0 * K, d.y0 * K, d.w * K, d.h * K);
  }

  // ---------- editor ----------
  let modo = false, aberto = false, sel = 0, rot = 0, mouse = null, cat = 'Mesas';
  let hotbar = Array(9).fill(null);
  try { const h = JSON.parse(localStorage.getItem('uc_hotbar') || 'null'); if (Array.isArray(h)) hotbar = h.slice(0, 9).concat(Array(9).fill(null)).slice(0, 9); } catch (e) { /* ignora */ }
  const desfazer = [];
  const css = document.createElement('style');
  css.textContent = `
  #dec-inv{position:fixed;z-index:42;left:50%;top:50%;transform:translate(-50%,-50%);width:min(760px,calc(100vw - 24px));max-height:calc(100dvh - 140px);display:none;flex-direction:column;background:#211a15;border:2px solid #b08a3e;border-radius:10px;color:#f0e2c0;font:14px system-ui;box-shadow:0 12px 50px #000}
  #dec-inv.aberto{display:flex}
  #dec-inv header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-bottom:1px solid #4a3b2b}
  #dec-inv header b{font:18px Georgia;color:#e8bd70}
  #dec-inv nav{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px}
  #dec-inv button{padding:7px 11px;background:#3a3028;color:#f0e2c0;border:1px solid #8c7552;border-radius:6px;font:13px system-ui;cursor:pointer}
  #dec-inv nav button.sel{background:#6a5530;border-color:#e8bd70}
  #dec-inv .grade{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px;padding:6px 12px 12px;overflow:auto}
  #dec-inv .it{display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 4px;background:#2c241d;border:1px solid #4a3b2b;border-radius:8px;cursor:pointer;color:#f0e2c0;font:12px system-ui;text-align:center}
  #dec-inv .it:hover{border-color:#e8bd70}
  #dec-inv .it canvas{width:56px;height:56px;image-rendering:pixelated}
  #dec-inv footer{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:10px 12px;border-top:1px solid #4a3b2b}
  #dec-inv footer label{margin-right:auto;font-size:13px}
  #dec-inv .dica{padding:0 14px 8px;color:#a8977c;font-size:12px}
  #dec-hot{position:fixed;z-index:41;left:50%;bottom:54px;transform:translateX(-50%);display:none;gap:5px;padding:6px;background:rgba(20,14,10,.85);border:1px solid #b08a3e;border-radius:10px}
  #dec-hot.ver{display:flex}
  #dec-hot .slot{position:relative;width:54px;height:54px;background:#2c241d;border:2px solid #4a3b2b;border-radius:6px;cursor:pointer;display:grid;place-items:center}
  #dec-hot .slot.sel{border-color:#ffd770;box-shadow:0 0 0 2px rgba(255,215,112,.3)}
  #dec-hot .slot canvas{width:44px;height:44px;image-rendering:pixelated}
  #dec-hot .slot span{position:absolute;left:3px;top:1px;font:11px system-ui;color:#cdbb92}
  #dec-hot .sair{align-self:center;margin-left:4px;padding:6px 9px;background:#3a3028;color:#f0e2c0;border:1px solid #8c7552;border-radius:6px;cursor:pointer;font:12px system-ui}`;
  document.head.append(css);
  const inv = document.createElement('section'); inv.id = 'dec-inv';
  inv.innerHTML = `<header><b>Inventário · decoração</b><button class="x">Fechar (P)</button></header>
    <div class="dica">Clique num item para pô-lo no espaço escolhido da barra. Na casa: clique coloca · scroll ou R gira · botão direito remove · Ctrl+Z desfaz.</div>
    <nav></nav><div class="grade"></div>
    <footer><label><input type="checkbox" class="esvaziar"> Andar vazio (sem os móveis originais)</label>
    <button class="limpar">Limpar andar</button><button class="exportar">Exportar</button><button class="importar">Importar</button><button class="publicada">Voltar à publicada</button>
    <input type="file" accept=".json,application/json" hidden></footer>`;
  const hot = document.createElement('div'); hot.id = 'dec-hot';
  document.body.append(inv, hot);
  inv.querySelector('.x').onclick = () => abrir(false);
  inv.querySelector('nav').onclick = (e) => { const b = e.target.closest('button'); if (b) { cat = b.dataset.cat; montarGrade(); } };
  inv.querySelector('.esvaziar').onchange = (e) => {
    const n = Interior.nivel, antes = JSON.stringify(dados.andares);
    andarDados(n).vazio = e.target.checked; salvar(); reaplicarTudo(antes);
  };
  inv.querySelector('.limpar').onclick = () => {
    const n = Interior.nivel;
    if (!confirm('Tirar todos os itens que você colocou neste andar?')) return;
    desfazer.push(JSON.stringify(dados)); andarDados(n).itens = []; salvar(); aplicar(Interior.andarDe(n));
  };
  inv.querySelector('.exportar').onclick = () => {
    const blob = new Blob([JSON.stringify({ versao: 1, andares: dados.andares, pistas: dados.pistas }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'decoracao.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const arquivo = inv.querySelector('input[type=file]');
  inv.querySelector('.importar').onclick = () => arquivo.click();
  arquivo.onchange = async () => {
    const f = arquivo.files[0]; if (!f) return;
    try { const j = JSON.parse(await f.text()); const antes = JSON.stringify(dados.andares); desfazer.push(JSON.stringify(dados)); dados = { ...vazio(), ...j }; salvar(); reaplicarTudo(antes); montarRodape(); }
    catch (e) { alert('Arquivo inválido.'); }
    arquivo.value = '';
  };
  inv.querySelector('.publicada').onclick = () => {
    if (!confirm('Descartar a decoração deste navegador e voltar à versão publicada?')) return;
    const antes = JSON.stringify(dados.andares);
    try { localStorage.removeItem(CHAVE); } catch (e) { /* ignora */ }
    local = false; dados = publicado ? { ...vazio(), ...publicado } : vazio(); reaplicarTudo(antes); montarRodape();
  };

  function miniatura(it, tam = 56) {
    const c = document.createElement('canvas'); c.width = tam; c.height = tam;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    let can;
    if (it.pista) { g.fillStyle = '#ffd770'; g.beginPath(); g.moveTo(tam / 2, 8); g.lineTo(tam - 16, tam / 2); g.lineTo(tam / 2, tam - 8); g.lineTo(16, tam / 2); g.closePath(); g.fill(); return c; }
    can = it.corpo ? spriteCorpo(it, 0).can : render(it).can;
    const k = Math.max(1, Math.floor(Math.min((tam - 4) / can.width, (tam - 4) / can.height))) || 1;
    const esc = Math.min(k, (tam - 4) / Math.max(can.width, can.height));
    const w = can.width * esc, h = can.height * esc;
    g.drawImage(can, (tam - w) / 2, (tam - h) / 2, w, h);
    return c;
  }
  function montarAbas() {
    inv.querySelector('nav').innerHTML = CATEGORIAS.map((c) => `<button data-cat="${c}" class="${c === cat ? 'sel' : ''}">${c}</button>`).join('');
  }
  function montarGrade() {
    montarAbas();
    const grade = inv.querySelector('.grade'); grade.innerHTML = '';
    const lista = cat === 'Pistas' ? itensDePistas() : C.filter((c) => c.cat === cat);
    for (const it of lista) {
      const b = document.createElement('button'); b.className = 'it'; b.title = it.nome;
      b.append(miniatura(it)); const s = document.createElement('span'); s.textContent = it.nome; b.append(s);
      b.onclick = () => { hotbar[sel] = it.id; guardarHotbar(); montarHot(); };
      grade.append(b);
    }
  }
  function montarRodape() { inv.querySelector('.esvaziar').checked = !!(dados.andares[Interior.nivel] || {}).vazio; }
  function guardarHotbar() { try { localStorage.setItem('uc_hotbar', JSON.stringify(hotbar)); } catch (e) { /* ignora */ } }
  function montarHot() {
    hot.innerHTML = '';
    hotbar.forEach((id, i) => {
      const s = document.createElement('div'); s.className = 'slot' + (i === sel ? ' sel' : ''); s.title = id ? (item(id) || {}).nome || id : 'vazio';
      const n = document.createElement('span'); n.textContent = i + 1; s.append(n);
      const it = id && item(id); if (it) s.append(miniatura(it, 44));
      s.onclick = () => { sel = i; montarHot(); };
      s.oncontextmenu = (e) => { e.preventDefault(); hotbar[i] = null; guardarHotbar(); montarHot(); };
      hot.append(s);
    });
    const sair = document.createElement('button'); sair.className = 'sair'; sair.textContent = 'Sair (Esc)'; sair.onclick = () => ligar(false); hot.append(sair);
  }
  function ligar(v) { modo = v; hot.classList.toggle('ver', v); if (v) montarHot(); else abrir(false); }
  function abrir(v) {
    aberto = v; inv.classList.toggle('aberto', v);
    if (v) { if (!modo) ligar(true); montarGrade(); montarRodape(); keys = {}; }
  }

  addEventListener('keydown', (e) => {
    if (!editavel || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    const k = e.key.toLowerCase();
    if (k === 'p') {
      if (!inside) { msg.textContent = 'O modo decoração funciona dentro da casa.'; return; }
      e.preventDefault(); abrir(!aberto); return;
    }
    if (!modo) return;
    if (k === 'escape') { e.preventDefault(); e.stopPropagation(); if (aberto) abrir(false); else ligar(false); return; }
    if (aberto) { if (!['p', 'escape'].includes(k)) e.stopPropagation(); return; } // com o inventário aberto, as teclas não andam
    if (/^[1-9]$/.test(e.key)) { sel = +e.key - 1; montarHot(); return; }
    if (k === 'r') { rot = (rot + 1) % 4; return; }
    if (k === 'z' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.stopPropagation(); voltar(); }
  }, true);

  function voltar() {
    const s = desfazer.pop(); if (!s) return;
    const antes = JSON.stringify(dados.andares); dados = JSON.parse(s); salvar(); reaplicarTudo(antes);
  }
  const SNAP = 2;
  function posMouse(e) {
    const r = cv.getBoundingClientRect(), v = Interior.vista();
    const wx = (e.clientX - r.left) * cv.width / r.width + v.x, wy = (e.clientY - r.top) * cv.height / r.height + v.y;
    return { wx, wy, nx: Math.round(wx / K / SNAP) * SNAP, ny: Math.round(wy / K / SNAP) * SNAP };
  }
  cv.addEventListener('mousemove', (e) => { if (modo) mouse = posMouse(e); });
  cv.addEventListener('mouseleave', () => { mouse = null; });
  cv.addEventListener('wheel', (e) => { if (!modo || aberto) return; e.preventDefault(); rot = (rot + (e.deltaY > 0 ? 1 : 3)) % 4; }, { passive: false });
  cv.addEventListener('contextmenu', (e) => { if (modo) e.preventDefault(); });
  cv.addEventListener('mousedown', (e) => {
    if (!modo || aberto || !inside) return;
    const m = posMouse(e), n = Interior.nivel;
    if (e.button === 2) { remover(m, n); return; }
    if (e.button !== 0) return;
    const id = hotbar[sel], it = id && item(id); if (!it) { msg.textContent = 'Escolha um item na barra (P abre o inventário).'; return; }
    desfazer.push(JSON.stringify(dados)); if (desfazer.length > 60) desfazer.shift();
    if (it.pista) { dados.pistas[it.pista] = { andar: n, x: Math.round(m.wx), y: Math.round(m.wy) }; salvar(); return; }
    andarDados(n).itens.push({ t: it.id, x: m.nx, y: m.ny, r: rot });
    salvar(); aplicar(Interior.andarDe(n));
  });
  function remover(m, n) {
    // pista mais perto
    for (const [id, p] of Object.entries(dados.pistas)) if (p.andar === n && Math.hypot(p.x - m.wx, p.y - m.wy) < 30) { desfazer.push(JSON.stringify(dados)); delete dados.pistas[id]; salvar(); return; }
    const itens = andarDados(n).itens;
    for (let i = itens.length - 1; i >= 0; i--) {
      const p = itens[i], it = CAT.get(p.t); if (!it) continue;
      let w, h;
      if (it.corpo) { const t = spriteCorpo(it, p.r || 0).t; w = t.w; h = t.h; } else { const s = girada(it, p.r || 0); w = s.w; h = s.h; }
      if (Math.abs(m.wx / K - p.x) <= w / 2 && Math.abs(m.wy / K - p.y) <= h / 2) {
        desfazer.push(JSON.stringify(dados)); itens.splice(i, 1); salvar(); aplicar(Interior.andarDe(n)); return;
      }
    }
  }

  // sombra do item (verde = cabe, vermelha = bate em parede)
  const cacheSombra = new Map();
  function sombra(can, cor) {
    const k = can; let m = cacheSombra.get(k); if (!m) { m = {}; cacheSombra.set(k, m); }
    if (m[cor]) return m[cor];
    const c = document.createElement('canvas'); c.width = can.width; c.height = can.height;
    const g = c.getContext('2d'); g.drawImage(can, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = cor; g.fillRect(0, 0, c.width, c.height);
    return (m[cor] = c);
  }
  function cabe(A, fixos, x0, y0) {
    for (const [fx, fy, fw, fh] of fixos) for (const [px, py] of [[fx, fy], [fx + fw - 1, fy], [fx, fy + fh - 1], [fx + fw - 1, fy + fh - 1]]) {
      if (A.cel(Math.floor((x0 + px) / 16), Math.floor((y0 + py) / 16)) < 0) return false;
    }
    return true;
  }
  function desenharFrente(A, g, vx, vy) {
    if (!modo) return;
    // pistas do andar sempre visíveis no modo decoração
    g.save(); g.font = '12px system-ui'; g.textAlign = 'center';
    for (const p of ((window.Investigacao && Investigacao.PONTOS) || [])) {
      const o = dados.pistas[p.id] || p; if ((o.andar ?? p.andar) !== A.nivel) continue;
      g.fillStyle = 'rgba(255,215,112,.9)'; g.beginPath(); g.moveTo(o.x, o.y - 12); g.lineTo(o.x + 7, o.y); g.lineTo(o.x, o.y + 12); g.lineTo(o.x - 7, o.y); g.closePath(); g.fill();
      g.fillStyle = 'rgba(20,14,10,.75)'; const w = g.measureText(p.id).width + 8; g.fillRect(o.x - w / 2, o.y + 14, w, 16); g.fillStyle = '#ffd770'; g.fillText(p.id, o.x, o.y + 26);
    }
    g.restore();
    if (!mouse || aberto) return;
    const id = hotbar[sel], it = id && item(id);
    g.save(); g.imageSmoothingEnabled = false;
    if (it && it.pista) {
      g.globalAlpha = .7; g.fillStyle = '#8fff9a'; g.beginPath(); g.moveTo(mouse.wx, mouse.wy - 14); g.lineTo(mouse.wx + 8, mouse.wy); g.lineTo(mouse.wx, mouse.wy + 14); g.lineTo(mouse.wx - 8, mouse.wy); g.closePath(); g.fill();
    } else if (it) {
      let can, w, h, fixos = [], parede = !!it.parede;
      if (it.corpo) { const s = spriteCorpo(it, rot); can = s.can; w = s.t.w; h = s.t.h; fixos = [[0, h - s.t.fh, w, s.t.fh]]; }
      else { const s = girada(it, rot); can = s.can; w = s.w; h = s.h; fixos = s.fixos; }
      const x0 = Math.round(mouse.nx - w / 2), y0 = Math.round(mouse.ny - h / 2);
      const ok = parede || cabe(A, fixos, x0, y0);
      g.globalAlpha = .62;
      g.drawImage(sombra(can, ok ? 'rgba(110,255,140,.75)' : 'rgba(255,90,90,.75)'), x0 * K, y0 * K, w * K, h * K);
      g.globalAlpha = .9; g.strokeStyle = ok ? '#7dff98' : '#ff6a6a'; g.lineWidth = 2;
      for (const [fx, fy, fw, fh] of fixos) g.strokeRect((x0 + fx) * K + 1, (y0 + fy) * K + 1, fw * K - 2, fh * K - 2);
    }
    g.restore();
    // dica perto do cursor
    g.save(); g.font = '12px system-ui'; g.textAlign = 'left';
    const t = it ? `${it.nome} · scroll/R gira · clique coloca · direito remove` : 'Barra vazia: P abre o inventário';
    const w2 = g.measureText(t).width + 12; g.fillStyle = 'rgba(20,14,10,.8)'; g.fillRect(mouse.wx + 16, mouse.wy + 16, w2, 20);
    g.fillStyle = '#f0e2c0'; g.fillText(t, mouse.wx + 22, mouse.wy + 30); g.restore();
  }

  window.Decoracao = {
    vazio: (n) => !!(dados.andares[n] && dados.andares[n].vazio),
    pistas: () => dados.pistas,
    aplicar, desenhar, desenharFrente, CATALOGO: C,
    get modo() { return modo; }, get dados() { return dados; },
  };
})();

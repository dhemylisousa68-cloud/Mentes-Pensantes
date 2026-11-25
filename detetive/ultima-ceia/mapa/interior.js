// Interior da mansão de Tomás: 4 andares (porão, térreo, 2º e 3º), escadas, elevador e garagem no porão.
// Arte em pixel desenhada aqui mesmo (16 px por bloco, ampliada 3×), sem imagens de terceiros.
// Física: todo objeto é um corpo com colisor (caixa), massa e material (atrito e elasticidade).
//   - móveis pesados (camas, estantes, bancadas, carro…) são corpos fixos;
//   - cadeiras, barris, caixotes, vasos, banquetas, poltronas… são empurráveis (massa → quanto custa empurrar);
//   - objetos pequenos (livros, garrafas, bolas, baldes, frutas…) podem ser pegos (E) e arremessados (E de novo):
//     voam com gravidade, quicam conforme o material, deslizam com atrito e batem nas paredes e nos outros objetos.
// Usa as variáveis do mapa.js: x, y, dir, phase, seated, seatReturn, inside, garage, keys, msg, cv, ctx, act, hall, valid, pick, investigate.
(() => {
  const T = 16, K = 3, GW = 48, GH = 44, NW = GW * T, NH = GH * T, WW = NW * K, WH = NH * K;
  const O = '#1e130c';
  const NOMES_ANDAR = { '-1': 'Porão', '0': 'Térreo', '1': '2º andar', '2': '3º andar' };
  const ORDEM = [-1, 0, 1, 2];

  // ---------- utilidades de pixel ----------
  let G = null; // contexto em que se desenha agora (andar ou sprite)
  const P = (x, y, w, h, c) => { G.fillStyle = c; G.fillRect(x, y, w, h); };
  const box = (x, y, w, h, c) => { P(x, y, w, h, O); P(x + 1, y + 1, w - 2, h - 2, c); };
  function tom(c, k) {
    const n = parseInt(c.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
    return '#' + ((1 << 24) | (f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).slice(1);
  }
  let semente = 1;
  const rnd = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
  const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0);

  // ---------- planta comum dos andares (blocos de 16 px) ----------
  const PLANTA = {
    A1: [1, 3, 11, 12], A2: [13, 3, 22, 12], A3: [36, 3, 11, 12],
    C: [1, 18, 46, 3],
    B1: [1, 24, 6, 8], B2: [8, 24, 6, 8], H: [15, 24, 18, 17], B3: [34, 24, 6, 8], B4: [41, 24, 6, 8],
    C1: [1, 35, 13, 6], C2: [34, 35, 13, 6],
  };
  const PORTAS = [
    [5, 15, 2, 3, 'C'], [22, 15, 4, 3, 'C'], [40, 15, 2, 3, 'C'], [12, 9, 1, 2, 'A2'],
    [3, 21, 2, 3, 'B1'], [10, 21, 2, 3, 'B2'], [18, 21, 12, 3, 'H'], [36, 21, 2, 3, 'B3'], [43, 21, 2, 3, 'B4'],
    [14, 39, 1, 2, 'C1'], [33, 37, 1, 2, 'C2'],
  ];
  // escadas (px nativos) e elevador, iguais em todos os andares
  const SOBE = [240, 400, 48, 80], DESCE = [240, 528, 48, 80];
  const ELEV = { x: 31 * T * K, y: 24 * T * K + 22 };
  const CHEGA_SUBINDO = [19 * 48, 35.6 * 48], CHEGA_DESCENDO = [19 * 48, 27.6 * 48];

  // estilos de parede/piso
  const papel = (p, r, l = '#5b3520') => ({ papel: p, risca: r, lambri: l });

  // ---------- andares ----------
  const ANDARES = {
    0: {
      salas: {
        A1: { nome: 'Cozinha', piso: 'pedra', parede: 'tijolo', txt: 'Cozinha: o fogão ainda está quente e há pão sobre a mesa.' },
        A2: { nome: 'Salão de jantar', piso: 'madeira', ...papel('#6b2a2f', '#5b2227', '#4f2e1b'), txt: 'Salão de jantar: a mesa está posta — dez lugares e a cabeceira de Tomás.' },
        A3: { nome: 'Biblioteca', piso: 'escura', ...papel('#2f4a3a', '#283f31', '#3e2717'), txt: 'Biblioteca: estantes cheias e papéis sobre a escrivaninha.' },
        C: { nome: 'Corredor do térreo', piso: 'madeira', ...papel('#bfa47a', '#b09670'), txt: 'Corredor que liga os cômodos do térreo.' },
        B1: { nome: 'Lavabo', piso: 'azulejo', ...papel('#9fb4b8', '#93a8ac', '#5b3520'), txt: 'Lavabo: espelho, pia e toalhas limpas.' },
        B2: { nome: 'Despensa', piso: 'pedra', parede: 'tijolo', txt: 'Despensa: mantimentos, garrafas e caixotes.' },
        H: { nome: 'Hall de entrada', piso: 'marmore', ...papel('#d4c29c', '#c7b48e'), txt: 'Hall de entrada: escadas, elevador e a porta para o jardim.' },
        B3: { nome: 'Sala de música', piso: 'escura', ...papel('#3b3f62', '#33375a', '#3e2717'), txt: 'Sala de música: um piano de cauda e partituras.' },
        B4: { nome: 'Escritório de Tomás', piso: 'escura', ...papel('#4a3b2a', '#403325', '#3e2717'), txt: 'Escritório de Tomás.' },
        C1: { nome: 'Jardim de inverno', piso: 'verde', ...papel('#7d9a86', '#728f7b'), txt: 'Jardim de inverno: plantas, regador e um banco.' },
        C2: { nome: 'Sala de estar', piso: 'escura', ...papel('#5a2433', '#4e1f2c', '#3e2717'), txt: 'Sala de estar: a lareira crepita.' },
      },
      extras: [[23, 41, 2, 1, 'H']],
      sobe: true, desce: true,
    },
    1: {
      salas: {
        A1: { nome: 'Quarto 1', piso: 'clara', ...papel('#3f5873', '#36506a'), cama: '#3c5f8f', txt: 'Quarto 1: duas camas arrumadas para os convidados.' },
        A2: { nome: 'Galeria do 2º andar', piso: 'madeira', ...papel('#2e3d52', '#27354a', '#3e2717'), txt: 'Galeria: quadros da família e poltronas.' },
        A3: { nome: 'Quarto 2', piso: 'clara', ...papel('#4d6a4a', '#425d40'), cama: '#4f7d45', txt: 'Quarto 2: duas camas arrumadas para os convidados.' },
        C: { nome: 'Corredor dos quartos', piso: 'madeira', ...papel('#b9a07a', '#ab9370'), txt: 'Corredor dos quartos de hóspedes.' },
        B1: { nome: 'Quarto 3', piso: 'clara', ...papel('#7a4a55', '#6c404a'), cama: '#9a3036', txt: 'Quarto 3: duas camas arrumadas para os convidados.' },
        B2: { nome: 'Rouparia', piso: 'clara', ...papel('#c9b99a', '#bcac8e'), txt: 'Rouparia: lençóis e toalhas dobrados.' },
        H: { nome: 'Patamar do 2º andar', piso: 'madeira', ...papel('#d4c29c', '#c7b48e'), txt: 'Patamar: escadas e elevador.' },
        B3: { nome: 'Banheiro', piso: 'azulejo', ...papel('#9fb4b8', '#93a8ac'), txt: 'Banheiro dos hóspedes.' },
        B4: { nome: 'Quarto 4', piso: 'clara', ...papel('#8a7440', '#7b6738'), cama: '#b08a2e', txt: 'Quarto 4: duas camas arrumadas para os convidados.' },
        C1: { nome: 'Quarto 5', piso: 'clara', ...papel('#5d4a72', '#524066'), cama: '#6a4a8f', txt: 'Quarto 5: duas camas arrumadas para os convidados.' },
        C2: { nome: 'Sala de leitura', piso: 'escura', ...papel('#3a4a3a', '#324032', '#3e2717'), txt: 'Sala de leitura: poltronas e uma estante.' },
      },
      extras: [], sobe: true, desce: true,
    },
    2: {
      salas: {
        A1: { nome: 'Suíte de Tomás', piso: 'escura', ...papel('#4a2430', '#401f29', '#3e2717'), txt: 'Suíte de Tomás: cama de casal e uma lareira pequena.' },
        A2: { nome: 'Salão de bilhar', piso: 'madeira', ...papel('#2f4a3a', '#283f31', '#3e2717'), txt: 'Salão de bilhar: a mesa verde e um alvo de dardos.' },
        A3: { nome: 'Gabinete particular', piso: 'escura', ...papel('#4a3b2a', '#403325', '#3e2717'), txt: 'Gabinete particular: um cofre, estantes e papéis.' },
        C: { nome: 'Corredor do 3º andar', piso: 'madeira', ...papel('#a8916e', '#9a8464'), txt: 'Corredor do 3º andar.' },
        B1: { nome: 'Closet', piso: 'clara', ...papel('#b9a58a', '#ab977e'), txt: 'Closet: roupas, chapéus e baús.' },
        B2: { nome: 'Banheiro da suíte', piso: 'azulejo', ...papel('#9fb4b8', '#93a8ac'), txt: 'Banheiro da suíte: banheira e espelho.' },
        H: { nome: 'Patamar do 3º andar', piso: 'madeira', ...papel('#d4c29c', '#c7b48e'), txt: 'Patamar do 3º andar.' },
        B3: { nome: 'Sala de troféus', piso: 'escura', ...papel('#5a4a2a', '#4e4024', '#3e2717'), txt: 'Sala de troféus: taças, quadros e um globo.' },
        B4: { nome: 'Observatório', piso: 'escura', ...papel('#1f2a44', '#1a243c', '#2e1d12'), txt: 'Observatório: um telescópio aponta para o céu nevado.' },
        C1: { nome: 'Sótão', piso: 'clara', ...papel('#7a6a55', '#6c5d4a', '#4a3020'), txt: 'Sótão: caixotes, baús e coisas esquecidas.' },
        C2: { nome: 'Terraço de inverno', piso: 'verde', ...papel('#7d9a86', '#728f7b'), txt: 'Terraço de inverno: plantas e janelas para a neve.' },
      },
      extras: [], sobe: false, desce: true,
    },
    '-1': {
      salas: {
        A1: { nome: 'Adega', piso: 'porao', parede: 'pedraEscura', txt: 'Adega: barris e garrafas antigas.' },
        A2: { nome: 'Depósito', piso: 'porao', parede: 'pedraEscura', txt: 'Depósito: caixotes empilhados e prateleiras.' },
        A3: { nome: 'Casa da caldeira', piso: 'porao', parede: 'pedraEscura', txt: 'Casa da caldeira: canos quentes e um zumbido constante.' },
        C: { nome: 'Corredor do porão', piso: 'porao', parede: 'pedraEscura', txt: 'Corredor do porão: frio e úmido.' },
        B1: { nome: 'Lavanderia', piso: 'porao', parede: 'pedraEscura', txt: 'Lavanderia: tanque, cestos e baldes.' },
        B2: { nome: 'Câmara fria', piso: 'porao', parede: 'pedraEscura', txt: 'Câmara fria: caixas de mantimentos.' },
        H: { nome: 'Patamar do porão', piso: 'porao', parede: 'pedraEscura', txt: 'Patamar do porão: escada e elevador.' },
        B3: { nome: 'Oficina', piso: 'porao', parede: 'pedraEscura', txt: 'Oficina: bancada com ferramentas.' },
        B4: { nome: 'Gerador', piso: 'porao', parede: 'pedraEscura', txt: 'Gerador: o quadro de energia da mansão.' },
        C1: { nome: 'Garagem', piso: 'porao', parede: 'pedraEscura', txt: 'Garagem: o carro de Tomás. O portão leva ao jardim.' },
        C2: { nome: 'Arquivo', piso: 'porao', parede: 'pedraEscura', txt: 'Arquivo: gavetas e caixas de documentos.' },
      },
      extras: [[5, 41, 4, 1, 'C1']], sobe: true, desce: false,
    },
  };

  // ---------- materiais (atrito e elasticidade) e tipos de objeto ----------
  const MAT = {
    madeira: { a: .55, e: .25 }, metal: { a: .4, e: .35 }, tecido: { a: .85, e: .08 }, vidro: { a: .3, e: .45 },
    borracha: { a: .14, e: .82 }, ceramica: { a: .6, e: .15 }, papel: { a: .75, e: .08 }, fruta: { a: .5, e: .3 },
  };
  const cor = { madeira: '#6b4227', clara: '#8d5a34', escura: '#4a2c1a', veludo: '#7a2a30' };
  const TIPOS = {
    cadeiraC: { w: 10, h: 13, fh: 6, m: 4, mat: 'madeira', sentar: [0, 1, 0], d() { P(0, 0, 10, 6, O); P(1, 1, 8, 4, cor.madeira); P(1, 1, 8, 1, cor.clara); P(3, 2, 1, 3, cor.escura); P(6, 2, 1, 3, cor.escura); P(0, 5, 10, 7, O); P(1, 6, 8, 5, cor.veludo); P(1, 6, 8, 1, tom(cor.veludo, 1.3)); P(1, 12, 1, 1, O); P(8, 12, 1, 1, O); } },
    cadeiraB: { w: 10, h: 13, fh: 6, m: 4, mat: 'madeira', sentar: [0, -1, 3], d() { P(0, 0, 10, 7, O); P(1, 1, 8, 5, cor.veludo); P(1, 1, 8, 1, tom(cor.veludo, 1.3)); P(0, 6, 10, 7, O); P(1, 7, 8, 5, cor.madeira); P(1, 7, 8, 1, cor.clara); P(3, 8, 1, 4, cor.escura); P(6, 8, 1, 4, cor.escura); } },
    cadeiraL: { w: 12, h: 12, fh: 7, m: 5, mat: 'madeira', sentar: [1, 0, 2], d() { P(0, 0, 4, 12, O); P(1, 1, 2, 10, '#8a6a2a'); P(1, 1, 2, 1, '#c9a050'); P(3, 2, 9, 9, O); P(4, 3, 7, 7, '#8a1f2a'); P(4, 3, 7, 1, '#b03040'); } },
    poltrona: { w: 13, h: 13, fh: 7, m: 9, mat: 'tecido', sentar: [0, 0, 0], d(c = '#6a2a3a') { P(0, 0, 13, 13, O); P(1, 1, 11, 4, tom(c, .75)); P(1, 5, 11, 7, c); P(1, 4, 2, 8, tom(c, .65)); P(10, 4, 2, 8, tom(c, .65)); P(3, 5, 7, 1, tom(c, 1.25)); } },
    banqueta: { w: 8, h: 9, fh: 4, m: 2, mat: 'madeira', sentar: [0, 0, 0], d() { P(0, 1, 8, 5, O); P(1, 2, 6, 3, cor.clara); P(1, 2, 6, 1, '#b07d48'); P(1, 6, 1, 3, O); P(6, 6, 1, 3, O); } },
    barril: { w: 10, h: 13, fh: 7, m: 12, mat: 'madeira', d() { P(1, 0, 8, 13, O); P(0, 1, 10, 11, O); P(1, 1, 8, 11, '#7a4a28'); P(2, 1, 6, 3, '#5e3820'); P(1, 4, 8, 1, '#3a3a3a'); P(1, 9, 8, 1, '#3a3a3a'); P(3, 4, 1, 8, '#9a6236'); } },
    caixote: { w: 12, h: 11, fh: 7, m: 8, mat: 'madeira', d() { box(0, 0, 12, 11, '#9a6a3a'); P(1, 1, 10, 1, '#b8844e'); P(1, 4, 10, 1, '#6b4227'); P(1, 7, 10, 1, '#6b4227'); P(5, 1, 1, 9, '#7d5530'); } },
    caixinha: { w: 7, h: 6, fh: 4, m: 1.5, mat: 'madeira', peg: true, d() { box(0, 0, 7, 6, '#a8743e'); P(1, 1, 5, 1, '#c89458'); P(3, 1, 1, 4, '#7d5530'); } },
    vaso: { w: 11, h: 15, fh: 5, m: 5, mat: 'ceramica', d() { P(2, 1, 7, 8, '#245a2c'); P(0, 3, 11, 5, '#2f6a35'); P(1, 0, 4, 4, '#3f8a45'); P(6, 1, 4, 4, '#3f8a45'); P(3, 2, 2, 2, '#5fb065'); P(7, 3, 2, 2, '#5fb065'); P(2, 8, 7, 7, O); P(3, 9, 5, 5, '#9a5a34'); P(2, 8, 7, 2, '#b06a3e'); } },
    livro: { w: 6, h: 4, fh: 4, m: .5, mat: 'papel', peg: true, d(c = '#8e2f2f') { P(0, 0, 6, 4, O); P(1, 1, 4, 2, c); P(1, 2, 4, 1, '#e8e0cc'); } },
    garrafa: { w: 4, h: 8, fh: 3, m: .6, mat: 'vidro', peg: true, d() { P(1, 0, 2, 2, '#1a2a1a'); P(0, 2, 4, 6, O); P(1, 3, 2, 4, '#2f6a3a'); P(1, 3, 1, 2, '#7fc08a'); } },
    bola: { w: 6, h: 6, fh: 4, m: .4, mat: 'borracha', peg: true, d(c = '#c8402a') { P(1, 0, 4, 6, O); P(0, 1, 6, 4, O); P(1, 1, 4, 4, c); P(2, 1, 1, 1, '#f4c0a0'); } },
    almofada: { w: 8, h: 5, fh: 4, m: .3, mat: 'tecido', peg: true, d(c = '#9a3a50') { box(0, 0, 8, 5, c); P(1, 1, 6, 1, tom(c, 1.3)); } },
    balde: { w: 7, h: 7, fh: 4, m: 1.5, mat: 'metal', peg: true, d() { P(1, 0, 5, 1, '#3a3a3a'); P(0, 1, 7, 6, O); P(1, 2, 5, 4, '#8a9098'); P(1, 2, 5, 1, '#4a5058'); P(2, 3, 1, 3, '#b0b8c0'); } },
    fruta: { w: 3, h: 3, fh: 3, m: .2, mat: 'fruta', peg: true, d(c = '#b83a2a') { P(0, 0, 3, 3, c); P(1, 0, 1, 1, '#3a8a3a'); P(0, 0, 1, 1, tom(c, 1.4)); } },
    mesinha: { w: 14, h: 9, fh: 6, m: 6, mat: 'madeira', d() { box(0, 0, 14, 7, '#7a4a2a'); P(1, 1, 12, 1, '#9a6236'); P(1, 7, 2, 2, O); P(11, 7, 2, 2, O); } },
    pneu: { w: 9, h: 9, fh: 6, m: 3, mat: 'borracha', d() { P(1, 0, 7, 9, O); P(0, 1, 9, 7, O); P(1, 1, 7, 7, '#2a2a2c'); P(3, 3, 3, 3, '#5a5a5e'); P(2, 1, 2, 1, '#4a4a4e'); } },
    bilhar: { w: 4, h: 4, fh: 4, m: .3, mat: 'borracha', peg: true, d(c = '#e8e0cc') { P(1, 0, 2, 4, O); P(0, 1, 4, 2, O); P(1, 1, 2, 2, c); P(1, 1, 1, 1, '#ffffff'); } },
  };
  const spriteCache = new Map();
  function sprite(tipo, var1) {
    const k = tipo + '|' + (var1 || '');
    if (spriteCache.has(k)) return spriteCache.get(k);
    const t = TIPOS[tipo], c = document.createElement('canvas');
    c.width = t.w; c.height = t.h;
    const antes = G; G = c.getContext('2d'); t.d(var1); G = antes;
    spriteCache.set(k, c); return c;
  }

  // ---------- construção de um andar ----------
  function construir(nivel) {
    const def = ANDARES[nivel];
    const grade = new Int8Array(GW * GH).fill(-1);
    const chaves = Object.keys(PLANTA), salas = chaves.map((k) => ({ chave: k, ...PLANTA_RECT(k), ...def.salas[k] }));
    salas.forEach((s, i) => { for (let yy = s.y; yy < s.y + s.h; yy++) for (let xx = s.x; xx < s.x + s.w; xx++) grade[yy * GW + xx] = i; });
    for (const [px, py, pw, ph, k] of [...PORTAS, ...def.extras]) {
      const i = chaves.indexOf(k);
      for (let yy = py; yy < py + ph; yy++) for (let xx = px; xx < px + pw; xx++) grade[yy * GW + xx] = i;
    }
    const cel = (cx, cy) => (cx < 0 || cy < 0 || cx >= GW || cy >= GH ? -1 : grade[cy * GW + cx]);
    const A = { nivel, grade, cel, salas, fixos: [], corpos: [], luzes: [], anims: [], assentos: [] };
    const tela = document.createElement('canvas'); tela.width = NW; tela.height = NH;
    G = tela.getContext('2d'); semente = 11 + nivel * 7;
    P(0, 0, NW, NH, '#0b0908');

    // pisos
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      const i = cel(cx, cy); if (i < 0) continue;
      piso(salas[i].piso, cx * T, cy * T, cx, cy);
    }
    // paredes: topo escuro ou face (parte de cima = papel, de baixo = lambri)
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      if (cel(cx, cy) >= 0) continue;
      const X = cx * T, Y = cy * T, b1 = cel(cx, cy + 1), b2 = cel(cx, cy + 2);
      if (b1 >= 0) face(salas[b1], X, Y, false);
      else if (b2 >= 0) face(salas[b2], X, Y, true);
      else {
        P(X, Y, T, T, '#1d1714');
        const borda = '#5c4f44';
        if (cel(cx - 1, cy) >= 0) P(X, Y, 1, T, borda);
        if (cel(cx + 1, cy) >= 0) P(X + T - 1, Y, 1, T, borda);
        if (cel(cx, cy - 1) >= 0) P(X, Y, T, 1, borda);
        if (b1 < 0 && b2 >= 0) P(X, Y + T - 1, T, 1, borda);
      }
    }
    // sombras das paredes sobre o piso
    for (let cy = 0; cy < GH; cy++) for (let cx = 0; cx < GW; cx++) {
      if (cel(cx, cy) < 0) continue;
      if (cel(cx, cy - 1) < 0) { G.fillStyle = 'rgba(0,0,0,.28)'; G.fillRect(cx * T, cy * T, T, 3); }
      if (cel(cx - 1, cy) < 0) { G.fillStyle = 'rgba(0,0,0,.22)'; G.fillRect(cx * T, cy * T, 2, T); }
    }
    // batentes nas portas (postes de madeira nos dois lados do vão)
    for (const [px, py, pw, ph] of [...PORTAS, ...def.extras]) {
      if (ph >= 2 && pw >= 1 && py + ph < GH - 2) { P(px * T - 2, py * T, 2, ph * T, '#3a2516'); P((px + pw) * T, py * T, 2, ph * T, '#3a2516'); }
    }
    // só o elevador liga os andares (sem escadas)
    elevador(A);
    A.escadas = { sobe: null, desce: null };

    // móveis originais: cada um vira uma peça separada (dá para mover ou excluir no modo decoração).
    // "Andar vazio" na decoração pula todos eles.
    const gravados = [];
    if (!(window.Decoracao && Decoracao.vazio(nivel))) {
      L = new Proxy({}, { get: (_, nome) => (...args) => { gravados.push({ nome, args }); } });
      try { MOBILIA[nivel](A, salas); } finally { L = LIB; }
    }
    A.orig = separar(A, gravados);
    G = tela.getContext('2d');
    A.tela = tela;
    A.base = { fixos: A.fixos.slice(), luzes: A.luzes.slice(), anims: A.anims.slice(), corpos: A.corpos.slice(), assentos: (A.assentosFixos || []).slice() };
    G = null;
    if (window.Decoracao) Decoracao.aplicar(A);
    G = null;
    return A;
  }
  function PLANTA_RECT(k) { const [x, y, w, h] = PLANTA[k]; return { x, y, w, h }; }

  function piso(tipo, X, Y, cx, cy) {
    if (tipo === 'madeira' || tipo === 'escura' || tipo === 'clara') {
      const cores = tipo === 'madeira' ? ['#8a5a36', '#83552f', '#90603a'] : tipo === 'escura' ? ['#5c3b25', '#563722', '#62402a'] : ['#a0703f', '#996a3a', '#a87846'];
      const esc = tipo === 'madeira' ? '#62402a' : tipo === 'escura' ? '#3c2617' : '#7a5230';
      for (let r = 0; r < 4; r++) {
        const yy = Y + r * 4, seam = ((cy * 4 + r) * 7 + cx * 3) % 16;
        P(X, yy, T, 4, cores[hash(cx, cy * 4 + r) % 3]);
        P(X + seam, yy, T - seam, 4, cores[hash(cx + 9, cy * 4 + r) % 3]);
        P(X + seam, yy, 1, 3, esc); P(X, yy + 3, T, 1, esc);
      }
    } else if (tipo === 'pedra' || tipo === 'verde' || tipo === 'porao') {
      const cores = tipo === 'pedra' ? ['#6b6a63', '#625f59', '#706e66'] : tipo === 'verde' ? ['#6f7d6a', '#67755f', '#768471'] : ['#3d5552', '#38504d', '#425a57'];
      const rej = tipo === 'porao' ? '#2a3a38' : '#4a4842';
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        P(X + a * 8, Y + b * 8, 8, 8, cores[hash(cx * 2 + a, cy * 2 + b) % 3]);
        P(X + a * 8, Y + b * 8, 8, 1, tom(cores[0], 1.12)); P(X + a * 8 + 7, Y + b * 8, 1, 8, rej); P(X + a * 8, Y + b * 8 + 7, 8, 1, rej);
      }
      if (tipo === 'porao' && hash(cx, cy) % 9 === 0) P(X + 5, Y + 6, 2, 2, '#4f6d69');
    } else if (tipo === 'marmore') {
      const claro = (cx + cy) % 2 === 0;
      P(X, Y, T, T, claro ? '#d6cfc0' : '#3b3532');
      const v = claro ? '#c4bcac' : '#4a4440';
      const h = hash(cx, cy);
      for (let i = 0; i < 5; i++) P(X + ((h >> i) % 12) + i, Y + i * 3, 2, 1, v);
      P(X, Y, T, 1, claro ? '#e6dfd2' : '#47403c');
    } else if (tipo === 'azulejo') {
      for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) {
        P(X + a * 8, Y + b * 8, 8, 8, (a + b) % 2 ? '#dfe6e6' : '#cdd8d9');
        P(X + a * 8 + 7, Y + b * 8, 1, 8, '#a8b4b6'); P(X + a * 8, Y + b * 8 + 7, 8, 1, '#a8b4b6');
      }
    }
  }
  function face(s, X, Y, cima) {
    if (s.parede === 'tijolo' || s.parede === 'pedraEscura') {
      const base = s.parede === 'tijolo' ? ['#5d5952', '#56524c', '#625e57'] : ['#3c4447', '#363e41', '#41494c'];
      const rej = s.parede === 'tijolo' ? '#3c3934' : '#262c2e';
      P(X, Y, T, T, rej);
      for (let r = 0; r < 4; r++) {
        const off = (r % 2) * 4;
        for (let bx = -8; bx < T; bx += 8) {
          const x0 = Math.max(X, X + bx + off), x1 = Math.min(X + T, X + bx + off + 7);
          if (x1 > x0) P(x0, Y + r * 4, x1 - x0, 3, base[hash(X + bx, Y + r) % 3]);
        }
      }
      if (cima) { P(X, Y, T, 2, '#151110'); P(X, Y + 2, T, 1, tom(base[0], 1.25)); }
      else { P(X, Y + T - 2, T, 2, '#151110'); }
      return;
    }
    if (cima) {
      P(X, Y, T, T, s.papel);
      for (let i = 1; i < T; i += 4) P(X + i, Y + 3, 1, T - 3, s.risca);
      for (let i = 3; i < T; i += 8) { P(X + i, Y + 8, 1, 1, tom(s.papel, 1.25)); P(X + i + 4, Y + 12, 1, 1, tom(s.papel, 1.25)); }
      P(X, Y, T, 2, '#2a1b12'); P(X, Y + 2, T, 1, '#8a6a44');
    } else {
      P(X, Y, T, T, s.lambri);
      P(X, Y, T, 2, '#8d5a34'); P(X, Y + 2, T, 1, '#2a1a10');
      P(X + 2, Y + 5, 5, 7, tom(s.lambri, 1.18)); P(X + 9, Y + 5, 5, 7, tom(s.lambri, 1.18));
      P(X + 3, Y + 6, 3, 5, s.lambri); P(X + 10, Y + 6, 3, 5, s.lambri);
      P(X, Y + T - 3, T, 3, '#24160d');
    }
  }

  // ---------- peças fixas (desenho + colisor) ----------
  function fixo(A, r) { A.fixos.push(r); }
  function luz(A, x, y, r, tipo = 'vela') { A.luzes.push({ x, y, r, tipo, s: rnd() * 10 }); }
  function vela(A, x, y) { P(x, y, 2, 3, '#efe6cf'); P(x, y, 1, 3, '#ffffff'); A.anims.push({ t: 'chama', x: x + 1, y: y - 1, s: rnd() * 9 }); luz(A, x + 1, y - 1, 26); }
  function arandela(A, x, y) { P(x - 1, y + 4, 5, 2, '#b08a3e'); P(x, y + 6, 3, 1, '#7a5a2a'); vela(A, x, y + 1); }
  function castical(A, x, y) { P(x, y + 18, 7, 3, O); P(x + 1, y + 18, 5, 2, '#4a4a4e'); P(x + 3, y + 5, 1, 13, '#6a6a6e'); P(x, y + 4, 7, 2, '#8a8a8e'); vela(A, x, y + 1); vela(A, x + 5, y + 1); vela(A, x + 2, y - 1); fixo(A, [x, y + 16, 7, 5]); }
  function janela(x, y, w = 12, h = 12, cortina = '#7a1f26') {
    if (cortina) { P(x - 4, y - 2, 4, h + 5, O); P(x - 3, y - 1, 2, h + 3, cortina); P(x + w, y - 2, 4, h + 5, O); P(x + w + 1, y - 1, 2, h + 3, cortina); }
    box(x, y, w, h, '#1c2a44'); P(x + 1, y + 1, w - 2, 2, '#26385a');
    P(x + (w >> 1), y + 1, 1, h - 2, '#5b3a22'); P(x + 1, y + (h >> 1), w - 2, 1, '#5b3a22');
    for (let i = 0; i < 4; i++) P(x + 2 + ((i * 5) % (w - 3)), y + 2 + ((i * 3) % (h - 4)), 1, 1, '#c9d8ea');
    P(x - 1, y + h - 1, w + 2, 2, '#e8eef5');
  }
  function quadro(x, y, w, h, tema = 0) {
    box(x, y, w, h, '#b08a3e'); P(x + 1, y + 1, w - 2, 1, '#d8b060');
    const ix = x + 2, iy = y + 2, iw = w - 4, ih = h - 4;
    if (tema === 0) { P(ix, iy, iw, ih, '#3a4a6a'); P(ix, iy + ih * .6, iw, ih * .4, '#3f5a3a'); P(ix + iw - 5, iy + 2, 3, 3, '#e8e0b0'); }
    else if (tema === 1) { P(ix, iy, iw, ih, '#2a1e18'); P(ix + iw / 2 - 3, iy + 3, 6, 6, '#7a5a40'); P(ix + iw / 2 - 5, iy + 9, 10, ih - 9, '#4a3020'); }
    else { P(ix, iy, iw, ih, '#5a3a2a'); P(ix + 2, iy + ih - 5, iw - 4, 3, '#2f5a6a'); P(ix + 3, iy + 3, 4, 4, '#c87a3a'); }
  }
  function tapete(x, y, w, h, c = '#7a1f26', b = '#c9a050') {
    P(x, y, w, h, b); P(x + 2, y + 2, w - 4, h - 4, c);
    P(x + 4, y + 4, w - 8, 1, b); P(x + 4, y + h - 5, w - 8, 1, b); P(x + 4, y + 4, 1, h - 8, b); P(x + w - 5, y + 4, 1, h - 8, b);
    for (let i = 6; i < w - 6; i += 8) P(x + i, y + h / 2 - 1, 3, 2, tom(c, 1.3));
  }
  function mesa(A, x, y, w, h, c = '#7a4a2a') { box(x, y, w, h, c); P(x + 1, y + 1, w - 2, 1, tom(c, 1.3)); P(x + 1, y + h - 4, w - 2, 3, tom(c, .65)); P(x + 1, y + h, 2, 2, O); P(x + w - 3, y + h, 2, 2, O); fixo(A, [x, y + 2, w, h]); }
  function cama(A, x, y, c, larga = 15) {
    const w = larga, h = 28;
    P(x, y, w, h, O); P(x + 1, y + 1, w - 2, 4, '#6b4227'); P(x + 1, y + 1, w - 2, 1, '#8d5a34');
    P(x + 1, y + 5, w - 2, 6, '#e9e2d2'); P(x + 2, y + 6, w - 4, 4, '#fbf7ee'); if (w > 20) P(x + w / 2, y + 6, 1, 4, '#cfc6b4');
    P(x + 1, y + 11, w - 2, h - 14, c); P(x + 1, y + 11, w - 2, 2, tom(c, 1.3)); P(x + 1, y + h - 5, w - 2, 1, tom(c, .7));
    P(x + 1, y + h - 3, w - 2, 2, '#6b4227'); fixo(A, [x, y + 6, w, h - 6]);
  }
  function criado(A, x, y) { box(x, y, 10, 9, '#6b4227'); P(x + 1, y + 1, 8, 1, '#8d5a34'); P(x + 1, y + 5, 8, 1, '#3a2516'); P(x + 4, y + 6, 2, 1, '#d0a850'); vela(A, x + 4, y - 2); fixo(A, [x, y + 2, 10, 7]); }
  function armario(A, x, y, w = 22, h = 30, c = '#5a3620') { box(x, y, w, h, c); P(x + 1, y + 1, w - 2, 2, tom(c, 1.3)); P(x + w / 2, y + 3, 1, h - 4, O); P(x + w / 2 - 3, y + h / 2, 2, 2, '#d0a850'); P(x + w / 2 + 2, y + h / 2, 2, 2, '#d0a850'); fixo(A, [x, y + h - 10, w, 10]); }
  function estante(A, x, y, w, h = 36) {
    box(x, y, w, h, '#4a2c1a'); const cores = ['#8e2f2f', '#2f5a8e', '#2f7a4a', '#b08a2e', '#6a3f8e', '#a85a2a', '#d8cfb8'];
    for (let sy = y + 2; sy < y + h - 8; sy += 8) {
      P(x + 1, sy + 6, w - 2, 2, '#2a180e');
      for (let bx = x + 2; bx < x + w - 3;) { const bw = 1 + Math.floor(rnd() * 3), bh = 4 + Math.floor(rnd() * 2); P(bx, sy + 6 - bh, bw, bh, cores[Math.floor(rnd() * cores.length)]); bx += bw + (rnd() < .15 ? 2 : 0); }
    }
    fixo(A, [x, y + h - 10, w, 10]);
  }
  function prateleira(x, y, w, itens = true) {
    P(x, y + 8, w, 2, '#5a3620'); P(x, y + 10, w, 1, O);
    if (itens) for (let i = x + 1; i < x + w - 4; i += 5) { const c = ['#c8b48a', '#7a9a5a', '#a85a2a', '#d8cfb8', '#5a7a9a'][Math.floor(rnd() * 5)]; P(i, y + 3, 4, 5, O); P(i + 1, y + 4, 2, 4, c); }
  }
  function bancada(A, x, y, w, c = '#6b4227') { P(x, y, w, 7, O); P(x + 1, y + 1, w - 2, 5, '#b9b2a2'); P(x + 1, y + 1, w - 2, 1, '#d4cdbd'); P(x, y + 6, w, 12, O); P(x + 1, y + 7, w - 2, 10, c); for (let i = x + 12; i < x + w - 2; i += 12) P(i, y + 8, 1, 8, O); for (let i = x + 9; i < x + w - 2; i += 12) P(i, y + 11, 2, 2, '#d0a850'); fixo(A, [x, y + 4, w, 14]); }
  function bancadaSimples(x, y, w, c) { P(x, y, w, 12, O); P(x + 1, y + 1, w - 2, 10, c); P(x + 1, y + 1, w - 2, 1, tom(c, 1.3)); }
  function aparador(A, x, y, w) { box(x, y, w, 14, '#4a2c1a'); P(x + 1, y + 1, w - 2, 2, '#6b4227'); for (let i = x + 2; i < x + w - 6; i += 10) { P(i, y + 5, 8, 7, '#3a2214'); P(i + 3, y + 8, 2, 1, '#d0a850'); } fixo(A, [x, y + 4, w, 10]); }
  function fogao(A, x, y) {
    P(x - 2, y - 24, 32, 18, O); P(x - 1, y - 23, 30, 16, '#4a4a50'); P(x + 8, y - 34, 12, 11, O); P(x + 9, y - 34, 10, 11, '#3a3a40');
    box(x, y, 28, 24, '#2b2b2e'); P(x + 1, y + 1, 26, 9, '#3e3e44');
    for (const bx of [x + 4, x + 16]) { P(bx, y + 2, 8, 6, '#1a1a1c'); P(bx + 2, y + 3, 4, 4, '#555'); }
    P(x + 15, y, 10, 6, O); P(x + 16, y + 1, 8, 4, '#6a6a72');
    P(x + 4, y + 13, 20, 9, '#1a1a1c'); P(x + 6, y + 15, 16, 5, '#7a2a0a');
    A.anims.push({ t: 'brasa', x: x + 6, y: y + 15, w: 16, h: 5 }); luz(A, x + 14, y + 18, 60, 'fogo'); fixo(A, [x, y + 6, 28, 18]);
  }
  function lareira(A, x, y, w = 36) {
    box(x, y, w, 34, '#6a625a'); for (let i = 0; i < 6; i++) P(x + 2 + (i * 11) % (w - 6), y + 3 + (i * 7) % 24, 5, 3, '#7a7268');
    P(x - 2, y + 8, w + 4, 3, '#4a2c1a'); P(x - 2, y + 8, w + 4, 1, '#6b4227');
    P(x + 8, y + 14, w - 16, 18, '#140c08'); P(x + 10, y + 28, w - 20, 3, '#5a3420');
    vela(A, x + 3, y + 4); vela(A, x + w - 5, y + 4);
    A.anims.push({ t: 'fogo', x: x + 10, y: y + 18, w: w - 20, h: 12 }); luz(A, x + w / 2, y + 26, 95, 'fogo'); fixo(A, [x, y + 20, w, 14]);
  }
  function sofa(A, x, y, w, c = '#5a2a3a') { P(x, y, w, 14, O); P(x + 1, y + 1, w - 2, 7, c); P(x + 1, y + 1, w - 2, 1, tom(c, 1.3)); P(x + 1, y + 8, w - 2, 5, tom(c, .7)); P(x + 1, y + 1, 3, 12, tom(c, .6)); P(x + w - 4, y + 1, 3, 12, tom(c, .6)); for (let i = x + 4; i < x + w - 6; i += Math.floor((w - 8) / 2)) P(i, y + 2, 1, 6, tom(c, .8)); fixo(A, [x, y + 2, w, 12]); }
  function piano(A, x, y) { box(x, y, 34, 20, '#141014'); P(x + 1, y + 1, 32, 2, '#2a2430'); P(x + 2, y + 12, 30, 5, '#f0ece0'); for (let i = x + 3; i < x + 32; i += 3) P(i, y + 12, 1, 3, '#141014'); fixo(A, [x, y + 4, 34, 16]); }
  function relogio(A, x, y) { box(x, y, 12, 38, '#4a2c1a'); P(x + 2, y + 3, 8, 8, '#e8dfc8'); P(x + 5, y + 4, 1, 4, O); P(x + 5, y + 7, 3, 1, O); P(x + 3, y + 14, 6, 18, '#1a120c'); A.anims.push({ t: 'pendulo', x: x + 6, y: y + 15 }); fixo(A, [x, y + 28, 12, 10]); }
  function escrivaninha(A, x, y, w = 44) { mesa(A, x, y, w, 18, '#5a3620'); P(x + 4, y + 3, 8, 6, '#ece4d0'); P(x + 6, y + 5, 6, 6, '#f4eee0'); P(x + w - 14, y + 3, 3, 3, '#1a1a2a'); P(x + w - 9, y + 2, 5, 3, '#d0a850'); P(x + w - 8, y - 4, 3, 6, '#2a6a3a'); luz(A, x + w - 6, y - 2, 46, 'lampada'); }
  function vasoFixo(A, x, y) { P(x + 2, y + 1, 7, 8, '#245a2c'); P(x, y + 3, 11, 5, '#2f6a35'); P(x + 1, y, 4, 4, '#3f8a45'); P(x + 6, y + 1, 4, 4, '#3f8a45'); P(x + 2, y + 8, 7, 7, O); P(x + 3, y + 9, 5, 5, '#9a5a34'); fixo(A, [x + 2, y + 9, 7, 6]); }
  function pia(A, x, y) { box(x, y, 16, 12, '#e8eef0'); P(x + 3, y + 3, 10, 6, '#9fb0b8'); P(x + 7, y + 1, 2, 3, '#8a8a90'); fixo(A, [x, y + 2, 16, 10]); }
  function sanitario(A, x, y) { box(x, y, 10, 6, '#f0f4f4'); P(x + 1, y + 5, 8, 9, O); P(x + 2, y + 6, 6, 7, '#e8eef0'); P(x + 3, y + 7, 4, 4, '#b8c8d0'); fixo(A, [x, y + 4, 10, 10]); }
  function banheira(A, x, y) { box(x, y, 40, 18, '#f0f4f4'); P(x + 3, y + 3, 34, 12, '#8ab8d0'); P(x + 4, y + 4, 10, 2, '#c0e0f0'); P(x + 2, y + 7, 2, 3, '#b08a3e'); fixo(A, [x, y + 2, 40, 16]); }
  function espelho(x, y) { box(x, y, 12, 14, '#b08a3e'); P(x + 2, y + 2, 8, 10, '#a8c8d8'); P(x + 3, y + 3, 2, 6, '#e0f0f8'); }
  function carro(A, x, y) {
    P(x, y, 30, 52, O); P(x + 1, y + 1, 28, 50, '#2a3a5a'); P(x + 3, y + 8, 24, 10, '#7aa0c0'); P(x + 3, y + 34, 24, 8, '#6a90b0');
    P(x + 4, y + 19, 22, 14, '#34466a'); P(x + 1, y + 1, 28, 2, '#4a5a7a'); P(x + 4, y + 1, 4, 2, '#f0e0a0'); P(x + 22, y + 1, 4, 2, '#f0e0a0');
    P(x - 1, y + 6, 2, 8, '#111'); P(x + 29, y + 6, 2, 8, '#111'); P(x - 1, y + 38, 2, 8, '#111'); P(x + 29, y + 38, 2, 8, '#111'); fixo(A, [x, y + 4, 30, 48]);
  }
  function caldeira(A, x, y) { box(x, y, 34, 30, '#5a3a2a'); P(x + 2, y + 2, 30, 4, '#7a4a32'); P(x + 10, y + 14, 14, 10, '#1a0c08'); P(x + 12, y + 16, 10, 6, '#7a2a0a'); P(x + 26, y + 6, 4, 4, '#d0a850'); P(x + 30, y - 20, 4, 24, '#6a6a6e'); A.anims.push({ t: 'brasa', x: x + 12, y: y + 16, w: 10, h: 6 }); luz(A, x + 17, y + 22, 70, 'fogo'); fixo(A, [x, y + 10, 34, 20]); }
  function canos(x, y, w) { P(x, y, w, 3, '#6a6a6e'); P(x, y, w, 1, '#8a8a90'); P(x, y + 7, w, 2, '#5a4a3a'); for (let i = x + 6; i < x + w; i += 18) P(i, y - 1, 3, 5, '#4a4a4e'); }
  function mesaBilhar(A, x, y) { box(x, y, 84, 46, '#4a2c1a'); P(x + 4, y + 4, 76, 38, '#1f6a3a'); P(x + 6, y + 6, 72, 1, '#2f7a4a'); for (const [a, b] of [[3, 3], [41, 2], [79, 3], [3, 41], [41, 42], [79, 41]]) P(x + a, y + b, 3, 3, '#0a0a0a'); P(x + 20, y + 22, 3, 3, '#f4f0e6'); fixo(A, [x, y + 4, 84, 42]); }
  function telescopio(A, x, y) { P(x + 6, y + 10, 2, 12, '#3a3a3e'); P(x + 2, y + 20, 10, 2, '#3a3a3e'); P(x, y + 2, 16, 6, O); P(x + 1, y + 3, 14, 4, '#b08a3e'); P(x + 1, y + 3, 14, 1, '#d8b060'); fixo(A, [x + 2, y + 16, 10, 6]); }
  function cofre(A, x, y) { box(x, y, 16, 16, '#3a3e44'); P(x + 2, y + 2, 12, 12, '#4a4e56'); P(x + 7, y + 6, 4, 4, '#b0b8c0'); P(x + 8, y + 7, 2, 2, '#3a3e44'); fixo(A, [x, y + 4, 16, 12]); }
  function bau(A, x, y, c = '#7a4a28') { box(x, y, 18, 12, c); P(x + 1, y + 1, 16, 3, tom(c, 1.2)); P(x + 1, y + 5, 16, 1, '#3a3a3a'); P(x + 8, y + 5, 2, 3, '#d0a850'); fixo(A, [x, y + 2, 18, 10]); }
  function banco(A, x, y, w = 30) { P(x, y, w, 8, O); P(x + 1, y + 1, w - 2, 4, '#8d5a34'); P(x + 1, y + 1, w - 2, 1, '#b07d48'); P(x + 2, y + 5, 2, 3, O); P(x + w - 4, y + 5, 2, 3, O); fixo(A, [x, y + 1, w, 7]); }
  function porta(x, y, w = 32) { P(x - 2, y, w + 4, 16, O); P(x, y, w / 2 - 1, 15, '#6b4227'); P(x + w / 2 + 1, y, w / 2 - 1, 15, '#6b4227'); for (let i = x + 3; i < x + w; i += 5) P(i, y + 1, 1, 13, '#4a2c1a'); P(x + w / 2 - 3, y + 7, 2, 2, '#d0a850'); P(x + w / 2 + 1, y + 7, 2, 2, '#d0a850'); }
  function portaoGaragem(x, y, w) { P(x - 2, y, w + 4, 16, O); P(x, y, w, 15, '#5a5e64'); for (let i = y + 2; i < y + 15; i += 3) P(x, i, w, 1, '#3e4248'); }

  function escada(A, [x, y, w, h], sobe) {
    // degraus: subindo ficam mais claros em cima; descendo, mais escuros embaixo
    P(x, y, w, h, O);
    const n = Math.floor(h / 6);
    for (let i = 0; i < n; i++) {
      const k = sobe ? 1.25 - i / n * .5 : .95 - i / n * .55;
      P(x + 2, y + 1 + i * 6, w - 6, 5, tom('#8a6a4a', k)); P(x + 2, y + 1 + i * 6, w - 6, 1, tom('#8a6a4a', k * 1.25));
    }
    P(x + w - 4, y, 3, h, '#4a2c1a'); P(x + w - 4, y, 1, h, '#8d5a34');
    for (let i = y + 4; i < y + h; i += 8) P(x + w - 5, i, 1, 3, '#d0a850');
    // seta indicando
    const cx = x + w / 2 - 2, cy = sobe ? y + 6 : y + h - 10;
    G.fillStyle = 'rgba(240,220,170,.55)';
    if (sobe) { G.fillRect(cx, cy, 2, 2); G.fillRect(cx - 2, cy + 2, 6, 2); } else { G.fillRect(cx - 2, cy, 6, 2); G.fillRect(cx, cy + 2, 2, 2); }
  }
  function elevador(A) {
    // porta de metal na face da parede (blocos 30-31, linhas 22-23)
    const x = 30 * T, y = 22 * T;
    P(x - 3, y - 2, 38, 34, O); P(x - 2, y - 1, 36, 3, '#b08a3e');
    P(x, y + 2, 15, 30, '#7d848c'); P(x + 17, y + 2, 15, 30, '#7d848c');
    P(x + 15, y + 2, 2, 30, '#2a2c30'); P(x + 2, y + 4, 2, 26, '#a0a8b0'); P(x + 19, y + 4, 2, 26, '#a0a8b0');
    P(x + 34, y + 12, 4, 6, '#3a3a3e'); P(x + 35, y + 13, 2, 2, '#f0d070');
    A.anims.push({ t: 'elevador', x, y: y + 2 });
  }

  // posição de um corpo novo: (x,y) = canto do sprite em px nativos
  function D(A, tipo, x, y, var1) {
    const t = TIPOS[tipo], m = MAT[t.mat];
    const c = {
      id: `${A.nivel}:${A.corpos.length}`, andar: A.nivel, tipo, var1,
      x: (x + t.w / 2) * K, y: (y + t.h - t.fh / 2) * K, w: t.w * K, h: t.fh * K, z: 0,
      vx: 0, vy: 0, vz: 0, m: t.m, atrito: m.a, elast: m.e, peg: !!t.peg, sentar: t.sentar,
    };
    A.corpos.push(c); return c;
  }

  // ---------- móveis originais como peças separadas ----------
  // A mobília chama tudo por L.*: na construção, L só anota as chamadas; depois cada móvel vira um sprite
  // com seus colisores, luzes e animações. Pixels soltos dentro de um móvel (pratos na mesa…) vão junto dele;
  // os que sobram e as portas da casa ficam pintados no chão.
  const LIB = {
    P: (...a) => P(...a), box: (...a) => box(...a), D: (...a) => D(...a),
    mesa, cama, criado, armario, estante, prateleira, bancada, bancadaSimples, aparador, fogao, lareira, sofa, piano, relogio,
    escrivaninha, vasoFixo, pia, sanitario, banheira, espelho, carro, caldeira, canos, mesaBilhar, telescopio, cofre, bau, banco,
    castical, arandela, janela, quadro, tapete, porta, portaoGaragem, vela,
  };
  let L = LIB;
  const FIXAS = new Set(['porta', 'portaoGaragem']), SOLTOS = new Set(['P', 'box']);
  let rascunho = null;
  function separar(A, lista) {
    const tela = G;
    if (!rascunho) { rascunho = document.createElement('canvas'); rascunho.width = NW; rascunho.height = NH; }
    const rg = rascunho.getContext('2d', { willReadFrequently: true });
    const info = lista.map((r, i) => ({ ...r, i }));
    const desenha = (r, A2) => { LIB[r.nome](...r.args.map((v) => (v === A ? A2 : v))); };
    function caixa(rs) {
      const A2 = { fixos: [], luzes: [], anims: [], nivel: A.nivel };
      let rx0 = NW, ry0 = NH, rx1 = 0, ry1 = 0;
      for (const r of rs) {
        const n = r.args.filter((v) => typeof v === 'number'), x = n[0] || 0, y = n[1] || 0;
        rx0 = Math.min(rx0, x - 48); ry0 = Math.min(ry0, y - 48);
        rx1 = Math.max(rx1, x + Math.max(176, (n[2] || 0) + 60)); ry1 = Math.max(ry1, y + Math.max(120, (n[3] || 0) + 60));
      }
      rx0 = Math.max(0, Math.floor(rx0)); ry0 = Math.max(0, Math.floor(ry0)); rx1 = Math.min(NW, Math.ceil(rx1)); ry1 = Math.min(NH, Math.ceil(ry1));
      const W = rx1 - rx0, H = ry1 - ry0; if (W <= 0 || H <= 0) return null;
      rg.clearRect(rx0, ry0, W, H);
      comG(rg, () => { for (const r of rs) desenha(r, A2); });
      const d = rg.getImageData(rx0, ry0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) if (d[(yy * W + xx) * 4 + 3]) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      if (x1 < 0) return null;
      return { x0: rx0 + x0, y0: ry0 + y0, w: x1 - x0 + 1, h: y1 - y0 + 1, A2 };
    }
    // 1) tamanho de cada coisa
    for (const r of info) {
      if (r.nome === 'D' || FIXAS.has(r.nome)) continue;
      if (SOLTOS.has(r.nome)) { const [x, y, w, h] = r.args; r.bb = { x0: x, y0: y, w, h }; continue; }
      const c = caixa([r]); if (c) { r.bb = c; r.peca = true; }
    }
    // 2) o que está dentro de um móvel maior desenhado antes vai junto dele (tapete não carrega nada)
    const area = (b) => b.w * b.h;
    for (const r of info) {
      if (!r.bb) continue;
      const cx = r.bb.x0 + r.bb.w / 2, cy = r.bb.y0 + r.bb.h / 2;
      let pai = null;
      for (const q of info) {
        if (q.i >= r.i) break;
        if (!q.peca || q.nome === 'tapete') continue;
        const b = q.bb;
        if (cx >= b.x0 && cx < b.x0 + b.w && cy >= b.y0 && cy < b.y0 + b.h && area(b) > 2 * area(r.bb) && (!pai || area(b) < area(pai.bb))) pai = q;
      }
      if (pai) { while (pai.pai) pai = pai.pai; r.pai = pai; (pai.filhos || (pai.filhos = [])).push(r); }
    }
    // 3) pixels soltos que não são de nenhum móvel e as portas da casa: pintados no chão
    G = tela;
    for (const r of info) if ((SOLTOS.has(r.nome) && !r.pai) || FIXAS.has(r.nome)) desenha(r, A);
    // 4) cada móvel (com o que leva junto) vira uma peça
    const elems = [];
    for (const r of info) {
      if (!r.peca || r.pai) continue;
      const c = caixa([r, ...(r.filhos || [])].sort((a, b) => a.i - b.i)); if (!c) continue;
      const can = document.createElement('canvas'); can.width = c.w; can.height = c.h;
      can.getContext('2d').drawImage(rascunho, c.x0, c.y0, c.w, c.h, 0, 0, c.w, c.h);
      elems.push({
        id: 'o' + r.i, tipo: 'peca', nome: r.nome, can, x0: c.x0, y0: c.y0, w: c.w, h: c.h, camada: r.nome === 'tapete' ? 0 : 1,
        fixos: c.A2.fixos.map(([x, y, w, h]) => [x - c.x0, y - c.y0, w, h]),
        luzes: c.A2.luzes.map((l) => ({ ...l, x: l.x - c.x0, y: l.y - c.y0 })),
        anims: c.A2.anims.map((a) => ({ ...a, x: a.x - c.x0, y: a.y - c.y0 })),
      });
    }
    for (const r of info) if (r.nome === 'D') elems.push({ id: 'o' + r.i, tipo: 'corpo', tipoCorpo: r.args[1], x: r.args[2], y: r.args[3], v: r.args[4] });
    G = tela;
    return elems;
  }

  // ---------- mobília de cada andar ----------
  const MOBILIA = {
    0(A) {
      // Cozinha
      L.fogao(A, 22, 40); L.bancada(A, 60, 42, 112); L.pia(A, 120, 42);
      L.prateleira(64, 18, 50); L.prateleira(122, 18, 46); L.P(30, 20, 2, 8, '#5a7a3a'); L.P(36, 20, 2, 7, '#7a9a4a');
      L.mesa(A, 72, 118, 52, 22, '#8a5a34'); L.P(78, 122, 8, 5, '#c89458'); L.P(92, 121, 6, 6, '#b83a2a'); L.P(104, 123, 10, 4, '#d8c088');
      L.D(A, 'banqueta', 80, 144); L.D(A, 'banqueta', 104, 144);
      L.D(A, 'barril', 20, 196); L.D(A, 'barril', 34, 200); L.D(A, 'barril', 22, 214);
      L.D(A, 'caixote', 160, 198); L.D(A, 'caixote', 166, 214);
      L.D(A, 'garrafa', 150, 150); L.D(A, 'fruta', 132, 176); L.D(A, 'fruta', 140, 182, '#d8a020'); L.D(A, 'balde', 40, 150);
      // Salão de jantar
      for (const jx of [226, 286, 470, 530]) L.janela(jx, 18);
      L.quadro(364, 17, 40, 24, 1);
      for (const ax of [258, 328, 436, 506]) L.arandela(A, ax, 24);
      L.tapete(268, 100, 232, 104, '#6e1f26');
      L.mesa(A, 304, 128, 160, 32, '#5a3620');
      L.P(307, 131, 154, 24, '#e8e0cc'); L.P(307, 141, 154, 4, '#8a2a30');
      for (const px of [316, 348, 380, 412, 444]) { L.P(px, 133, 7, 5, '#f4f0e6'); L.P(px + 2, 134, 3, 2, '#b86a3a'); L.P(px, 148, 7, 5, '#f4f0e6'); L.P(px + 2, 149, 3, 2, '#7a9a4a'); L.P(px + 8, 134, 2, 3, '#c9d6e0'); L.P(px + 8, 148, 2, 3, '#c9d6e0'); }
      for (const cx of [336, 432]) { L.P(cx - 3, 141, 8, 3, '#d0a850'); L.vela(A, cx - 3, 137); L.vela(A, cx + 3, 137); L.vela(A, cx, 135); }
      for (const cx of [320, 352, 384, 416, 448]) { L.D(A, 'cadeiraC', cx - 5, 113); L.D(A, 'cadeiraB', cx - 5, 158); }
      L.D(A, 'cadeiraL', 290, 138);
      L.castical(A, 256, 84); L.castical(A, 504, 84); L.castical(A, 256, 196); L.castical(A, 504, 196);
      L.aparador(A, 230, 46, 44); L.aparador(A, 494, 46, 44);
      L.D(A, 'vaso', 212, 218); L.D(A, 'vaso', 544, 218);
      // Biblioteca
      L.estante(A, 580, 12, 50, 40); L.estante(A, 696, 12, 52, 40); L.janela(650, 18, 14, 12, '#2a4a2a');
      L.tapete(604, 140, 116, 72, '#2a4a32', '#b08a3e');
      L.escrivaninha(A, 636, 104, 52); L.D(A, 'cadeiraB', 657, 122);
      L.D(A, 'poltrona', 596, 184, '#2a5a3a'); L.D(A, 'poltrona', 716, 184, '#2a5a3a'); L.D(A, 'mesinha', 655, 196);
      L.D(A, 'livro', 700, 160, '#2f5a8e'); L.D(A, 'livro', 612, 118, '#8e2f2f'); L.D(A, 'livro', 730, 214, '#2f7a4a'); L.D(A, 'banqueta', 724, 120);
      // Corredor
      L.tapete(24, 298, 720, 26, '#5e2228', '#b08a3e');
      for (const ax of [40, 140, 232, 300, 440, 520, 600, 700]) L.arandela(A, ax, 262);
      L.quadro(166, 260, 26, 20, 0); L.quadro(262, 260, 26, 20, 2); L.quadro(470, 260, 26, 20, 1); L.quadro(560, 260, 26, 20, 0);
      L.D(A, 'vaso', 20, 300); L.D(A, 'vaso', 736, 300);
      // Lavabo
      L.espelho(26, 358); L.pia(A, 24, 386); L.sanitario(A, 92, 386); L.D(A, 'balde', 90, 490); L.D(A, 'almofada', 30, 488, '#e8e0cc');
      // Despensa
      L.prateleira(130, 354, 90); L.prateleira(130, 364, 90);
      L.D(A, 'caixote', 132, 390); L.D(A, 'caixote', 132, 404); L.D(A, 'barril', 206, 390); L.D(A, 'caixote', 190, 480);
      L.D(A, 'garrafa', 170, 440); L.D(A, 'garrafa', 176, 446); L.D(A, 'fruta', 150, 470, '#d8a020'); L.D(A, 'caixinha', 200, 452);
      // Hall de entrada
      L.tapete(344, 392, 80, 248, '#6e1f26');
      L.quadro(246, 356, 36, 24, 1);
      L.relogio(A, 506, 420); L.castical(A, 304, 600); L.castical(A, 456, 600); L.castical(A, 304, 400); L.castical(A, 456, 400);
      L.banco(A, 486, 520, 34); L.banco(A, 300, 470, 30);
      L.D(A, 'vaso', 330, 626); L.D(A, 'vaso', 428, 626); L.D(A, 'vaso', 490, 600);
      L.P(368, 640, 32, 14, '#7a5a2a'); L.P(370, 642, 28, 10, '#9a7a3a');
      L.porta(368, 656);
      // Sala de música
      L.piano(A, 572, 384); L.D(A, 'banqueta', 584, 410); L.D(A, 'poltrona', 548, 480, '#3b3f8a'); L.quadro(548, 356, 22, 18, 2);
      L.D(A, 'livro', 620, 460, '#d8cfb8'); L.D(A, 'bola', 600, 470);
      // Escritório
      L.estante(A, 724, 348, 24, 36); L.estante(A, 658, 348, 26, 36); L.escrivaninha(A, 672, 430, 48); L.D(A, 'cadeiraB', 691, 448); L.D(A, 'caixinha', 664, 490); L.D(A, 'livro', 730, 480, '#b08a2e');
      // Jardim de inverno
      for (const jx of [30, 80, 130, 180]) L.janela(jx, 532, 14, 12, null);
      for (const [vx, vy] of [[22, 566], [44, 566], [190, 566], [22, 632], [110, 600], [150, 630]]) L.D(A, 'vaso', vx, vy);
      L.banco(A, 70, 630, 34); L.D(A, 'balde', 130, 576);
      // Sala de estar
      L.lareira(A, 630, 522, 40); L.estante(A, 552, 524, 40, 34); L.piano(A, 708, 528);
      L.tapete(586, 580, 120, 64, '#4a1e2a', '#b08a3e');
      L.sofa(A, 616, 630, 56); L.D(A, 'poltrona', 586, 584); L.D(A, 'poltrona', 694, 584); L.D(A, 'mesinha', 637, 600);
      L.D(A, 'almofada', 600, 612); L.D(A, 'almofada', 690, 612, '#3a6a9a'); L.D(A, 'livro', 652, 612, '#6a3f8e');
      A.assentosFixos = [[640 * K, 634 * K, 3], [656 * K, 634 * K, 3]];
    },
    1(A) {
      // Quarto 1 e Quarto 2 (em cima), com janelas para a neve
      for (const [ox, c] of [[16, '#3c5f8f'], [576, '#4f7d45']]) {
        L.cama(A, ox + 12, 36, c); L.criado(A, ox + 32, 44); L.cama(A, ox + 48, 36, c); L.janela(ox + 86, 18, 14, 12, tom(c, .8));
        L.armario(A, ox + 140, 20); L.tapete(ox + 20, 110, 80, 50, tom(c, .7), '#c9a050');
        L.D(A, 'poltrona', ox + 110, 180, tom(c, .9)); L.D(A, 'mesinha', ox + 60, 196); L.D(A, 'almofada', ox + 30, 170, '#e8e0cc'); L.D(A, 'livro', ox + 80, 210);
      }
      // Galeria
      for (let i = 0; i < 6; i++) L.quadro(224 + i * 56, 17, 30, 24, i % 3);
      for (const ax of [214, 548]) L.arandela(A, ax, 24);
      L.tapete(240, 90, 288, 120, '#2a3450', '#b08a3e');
      L.sofa(A, 300, 190, 60, '#2a3a5a'); L.sofa(A, 410, 190, 60, '#2a3a5a');
      L.D(A, 'poltrona', 260, 120, '#2a3a5a'); L.D(A, 'poltrona', 494, 120, '#2a3a5a'); L.D(A, 'mesinha', 378, 150);
      L.castical(A, 228, 60); L.castical(A, 532, 60); L.D(A, 'vaso', 212, 218); L.D(A, 'vaso', 544, 218);
      // Corredor
      L.tapete(24, 298, 720, 26, '#2a3450', '#b08a3e');
      for (const ax of [40, 140, 232, 300, 440, 520, 600, 700]) L.arandela(A, ax, 262);
      L.quadro(166, 260, 26, 20, 1); L.quadro(470, 260, 26, 20, 2); L.quadro(560, 260, 26, 20, 0); L.D(A, 'vaso', 20, 300); L.D(A, 'vaso', 736, 300);
      // Quarto 3 e Quarto 4 (6 blocos: camas dos lados da porta)
      for (const [ox, c] of [[16, '#9a3036'], [656, '#b08a2e']]) {
        L.cama(A, ox + 2, 372, c); L.cama(A, ox + 79, 372, c); L.criado(A, ox + 20, 382); L.criado(A, ox + 66, 382);
        L.tapete(ox + 14, 430, 68, 34, tom(c, .7), '#c9a050'); L.bau(A, ox + 38, 490, '#6b4227'); L.D(A, 'almofada', ox + 12, 480, tom(c, 1.2)); L.D(A, 'cadeiraB', ox + 74, 470);
      }
      // Rouparia
      L.prateleira(130, 354, 90); L.prateleira(130, 364, 90); L.armario(A, 140, 380, 30, 30, '#6b4227'); L.armario(A, 180, 380, 30, 30, '#6b4227');
      L.D(A, 'almofada', 140, 450, '#e8e0cc'); L.D(A, 'almofada', 160, 470, '#c8d8e8'); L.D(A, 'caixinha', 196, 480); L.D(A, 'balde', 136, 494);
      // Patamar
      L.tapete(344, 392, 80, 248, '#2a3450', '#b08a3e'); L.quadro(246, 356, 36, 24, 0);
      L.castical(A, 304, 400); L.castical(A, 456, 400); L.sofa(A, 470, 600, 46, '#2a3a5a'); L.D(A, 'vaso', 330, 626); L.D(A, 'vaso', 428, 626); L.banco(A, 300, 470, 30);
      // Banheiro
      L.espelho(574, 358); L.pia(A, 570, 386); L.banheira(A, 596, 470); L.sanitario(A, 620, 386); L.D(A, 'balde', 556, 490); L.D(A, 'almofada', 552, 450, '#e8e0cc');
      // Quarto 5 (largo)
      L.cama(A, 30, 528, '#6a4a8f'); L.criado(A, 50, 536); L.cama(A, 66, 528, '#6a4a8f'); L.armario(A, 120, 522); L.escrivaninha(A, 160, 600, 44);
      L.D(A, 'cadeiraB', 177, 618); L.tapete(30, 590, 100, 50, '#4a3462', '#c9a050'); L.D(A, 'almofada', 40, 610, '#e8e0cc');
      // Sala de leitura
      L.estante(A, 552, 524, 44, 34); L.estante(A, 700, 524, 48, 34); L.lareira(A, 630, 522, 36);
      L.D(A, 'poltrona', 590, 590, '#2a5a3a'); L.D(A, 'poltrona', 700, 590, '#2a5a3a'); L.D(A, 'mesinha', 640, 610); L.D(A, 'livro', 660, 630, '#2f5a8e'); L.D(A, 'livro', 620, 636, '#8e2f2f');
    },
    2(A) {
      // Suíte de Tomás
      L.cama(A, 70, 34, '#7a1f2a', 34); L.criado(A, 54, 44); L.criado(A, 108, 44); L.janela(30, 18, 14, 12, '#5a1f2a'); L.lareira(A, 140, 14, 34);
      L.tapete(50, 110, 110, 70, '#4a1e2a', '#b08a3e'); L.D(A, 'poltrona', 40, 190, '#5a1f2a'); L.D(A, 'poltrona', 150, 190, '#5a1f2a'); L.D(A, 'mesinha', 96, 200);
      L.D(A, 'livro', 120, 120, '#2a2a2a'); L.D(A, 'almofada', 80, 140, '#b03040');
      // Salão de bilhar
      L.mesaBilhar(A, 342, 100); for (const ax of [258, 328, 436, 506]) L.arandela(A, ax, 24);
      L.P(220, 18, 14, 14, O); L.P(221, 19, 12, 12, '#e8dfc8'); L.P(224, 22, 6, 6, '#9a2a2a'); L.P(226, 24, 2, 2, '#e8dfc8'); // alvo de dardos
      L.aparador(A, 470, 46, 70); L.D(A, 'banqueta', 480, 70); L.D(A, 'banqueta', 500, 70); L.D(A, 'banqueta', 520, 70);
      ['#e8e0cc', '#d8b020', '#2a4ab0', '#c8302a', '#6a2a8a', '#e07020', '#2a8a4a', '#1a1a1a'].forEach((c, i) => L.D(A, 'bilhar', 300 + (i % 4) * 9, 196 + Math.floor(i / 4) * 9, c));
      L.D(A, 'poltrona', 230, 120, '#2a5a3a'); L.D(A, 'poltrona', 230, 160, '#2a5a3a'); L.castical(A, 520, 190);
      // Escritório de Tomás
      L.estante(A, 580, 12, 50, 40); L.cofre(A, 700, 30); L.janela(650, 18, 14, 12, '#3a2a1a');
      L.escrivaninha(A, 636, 110, 54); L.D(A, 'cadeiraB', 658, 128); L.D(A, 'caixinha', 600, 150); L.D(A, 'caixinha', 720, 170); L.D(A, 'livro', 740, 210, '#8e2f2f'); L.D(A, 'caixote', 590, 210);
      // Corredor
      L.tapete(24, 298, 720, 26, '#3a2a1a', '#b08a3e'); for (const ax of [40, 140, 232, 300, 440, 520, 600, 700]) L.arandela(A, ax, 262);
      L.quadro(166, 260, 26, 20, 2); L.quadro(470, 260, 26, 20, 0); L.D(A, 'vaso', 20, 300); L.D(A, 'vaso', 736, 300);
      // Closet
      for (let i = 0; i < 4; i++) { L.P(20 + i * 22, 362, 18, 2, '#3a3a3e'); L.P(21 + i * 22, 364, 6, 14, ['#3a4a6a', '#6a2a2a', '#2a2a2a', '#5a4a3a'][i]); L.P(29 + i * 22, 364, 6, 14, ['#6a5a3a', '#2a3a2a', '#4a2a4a', '#7a6a5a'][i]); }
      L.bau(A, 26, 480); L.D(A, 'caixinha', 80, 470); L.D(A, 'almofada', 60, 440, '#6a2a2a');
      // Banheiro da suíte
      L.espelho(140, 358); L.pia(A, 138, 386); L.banheira(A, 160, 470); L.sanitario(A, 196, 386); L.D(A, 'balde', 136, 494);
      // Patamar (sem escada para cima)
      L.tapete(344, 392, 80, 248, '#3a2a1a', '#b08a3e'); L.telescopio(A, 470, 600); L.castical(A, 304, 600); L.castical(A, 456, 400); L.D(A, 'vaso', 330, 626); L.D(A, 'vaso', 428, 626);
      // Sala de troféus
      for (let i = 0; i < 4; i++) { L.P(552 + i * 20, 358, 10, 2, '#5a3620'); L.P(554 + i * 20, 350, 6, 8, '#d0a850'); L.P(556 + i * 20, 352, 2, 3, '#f0d070'); }
      L.quadro(560, 400, 30, 20, 1); L.D(A, 'bola', 590, 470, '#2a6ab0'); L.D(A, 'vaso', 548, 490); L.bau(A, 600, 490, '#5a3620');
      // Observatório
      L.telescopio(A, 694, 400); L.janela(680, 356, 30, 12, null); L.D(A, 'banqueta', 680, 440); L.D(A, 'livro', 720, 480, '#1a2a5a'); L.D(A, 'caixinha', 670, 490);
      // Sótão
      for (const [cx, cy] of [[24, 566], [24, 582], [40, 570], [180, 570], [196, 570], [190, 590], [100, 620]]) L.D(A, 'caixote', cx, cy);
      L.bau(A, 120, 540); L.bau(A, 60, 630, '#5a3620'); L.D(A, 'barril', 150, 620); L.D(A, 'caixinha', 80, 590); L.D(A, 'bola', 140, 600, '#d8b020'); L.D(A, 'almofada', 170, 640);
      // Terraço de inverno
      for (const jx of [560, 610, 660, 710]) L.janela(jx, 532, 16, 12, null);
      for (const [vx, vy] of [[550, 566], [730, 566], [550, 632], [730, 632], [640, 600]]) L.D(A, 'vaso', vx, vy);
      L.banco(A, 600, 630, 34); L.banco(A, 670, 630, 34); L.D(A, 'balde', 700, 600);
    },
    '-1'(A) {
      // Adega
      for (let i = 0; i < 4; i++) { const bx = 24 + i * 40; L.P(bx, 18, 34, 30, O); L.P(bx + 1, 19, 32, 28, '#3a2416'); for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) { L.P(bx + 3 + c * 6, 21 + r * 9, 5, 7, '#5a3620'); L.P(bx + 4 + c * 6, 23 + r * 9, 3, 3, '#2a0a10'); } fixo(A, [bx, 40, 34, 10]); }
      for (const [bx, by] of [[30, 120], [44, 124], [30, 140], [150, 120], [164, 126]]) L.D(A, 'barril', bx, by);
      for (const [gx, gy] of [[90, 160], [96, 166], [104, 158], [120, 200]]) L.D(A, 'garrafa', gx, gy);
      // Depósito
      for (let i = 0; i < 3; i++) L.prateleira(230 + i * 110, 20, 90);
      for (const [cx, cy] of [[230, 70], [244, 70], [230, 84], [400, 120], [414, 120], [407, 106], [500, 200], [514, 204], [330, 190]]) L.D(A, 'caixote', cx, cy);
      L.D(A, 'barril', 300, 120); L.D(A, 'barril', 520, 80); L.D(A, 'caixinha', 360, 160); L.D(A, 'caixinha', 470, 150); L.D(A, 'balde', 260, 200); L.D(A, 'pneu', 440, 200);
      // Casa da caldeira
      L.caldeira(A, 640, 40); L.canos(580, 30, 170); L.canos(580, 220, 170); L.D(A, 'balde', 600, 150); L.D(A, 'caixote', 720, 200); L.D(A, 'caixinha', 700, 120);
      // Corredor
      for (const ax of [40, 232, 440, 600, 700]) L.arandela(A, ax, 262); L.canos(24, 258, 720);
      // Lavanderia
      L.bancadaSimples(22, 378, 40, '#8a9098'); fixo(A, [22, 380, 40, 10]); L.P(26, 380, 32, 6, '#6a8aa0'); L.D(A, 'balde', 70, 400); L.D(A, 'caixinha', 30, 470); L.D(A, 'almofada', 80, 480, '#c8d8e8');
      // Câmara fria
      L.prateleira(130, 354, 90); L.prateleira(130, 364, 90); L.D(A, 'caixote', 134, 400); L.D(A, 'caixote', 200, 400); L.D(A, 'fruta', 160, 460, '#3a8a3a'); L.D(A, 'fruta', 170, 470); L.D(A, 'caixinha', 190, 480);
      // Patamar
      for (const ax of [304, 456]) L.arandela(A, ax, 358);
      L.D(A, 'caixote', 470, 600); L.D(A, 'caixote', 486, 610); L.D(A, 'barril', 320, 610);
      // Oficina
      L.bancada(A, 552, 380, 80, '#4a3a2a'); for (let i = 0; i < 6; i++) L.P(556 + i * 12, 360, 2, 10, '#8a8a90'); L.D(A, 'banqueta', 580, 410); L.D(A, 'caixinha', 600, 470); L.D(A, 'pneu', 560, 480);
      // Gerador
      L.box(670, 380, 40, 26, '#4a5a4a'); L.P(674, 384, 32, 8, '#3a4a3a'); L.P(700, 396, 4, 4, '#f0d070'); fixo(A, [670, 384, 40, 22]); A.anims.push({ t: 'pisca', x: 700, y: 396 }); luz(A, 702, 398, 40, 'lampada');
      L.box(724, 356, 20, 26, '#5a5e64'); L.P(728, 360, 12, 2, '#d0a850'); L.D(A, 'balde', 680, 480);
      // Garagem (o portão leva ao jardim)
      L.carro(A, 34, 566); L.prateleira(110, 532, 100); L.D(A, 'pneu', 170, 600); L.D(A, 'pneu', 186, 616); L.D(A, 'pneu', 172, 630);
      L.D(A, 'caixote', 120, 620); L.D(A, 'balde', 150, 580); L.D(A, 'bola', 140, 640, '#2a6ab0');
      L.portaoGaragem(80, 656, 64);
      // Arquivo
      for (let i = 0; i < 5; i++) { L.box(552 + i * 24, 528, 20, 30, '#5a5e64'); for (let r = 0; r < 3; r++) L.P(554 + i * 24, 532 + r * 9, 16, 1, '#3a3e44'), L.P(560 + i * 24, 535 + r * 9, 4, 1, '#b0b8c0'); fixo(A, [552 + i * 24, 548, 20, 10]); }
      L.D(A, 'caixote', 700, 600); L.D(A, 'caixote', 714, 610); L.D(A, 'caixinha', 620, 600); L.D(A, 'caixinha', 650, 620); L.D(A, 'livro', 600, 630, '#5a4a3a');
    },
  };

  // ---------- estado ----------
  const cache = {};
  const andarDe = (n) => cache[n] || (cache[n] = construir(n));
  let andar = 0, ultimoQuadro = 0, salaAtual = -2, escuro = 0, segurado = null, vistaX = 0, vistaY = 0;
  let elevAnim = { abre: 1, alvo: 1 }, viagem = null, ultimoEnvioFis = 0, cooldownEscada = 0;
  let dentroAntes = false;
  (function vigiar() { if (!inside) dentroAntes = false; requestAnimationFrame(vigiar); })();

  // ---------- colisão ----------
  function blocoLivre(A, nx, ny) { // nx, ny em px nativos
    return A.cel(Math.floor(nx / T), Math.floor(ny / T)) >= 0;
  }
  function bateFixo(A, x0, y0, x1, y1) { // retângulo em px nativos
    for (const [fx, fy, fw, fh] of A.fixos) if (x1 > fx && x0 < fx + fw && y1 > fy && y0 < fy + fh) return true;
    return false;
  }
  function areaLivre(A, x0, y0, x1, y1, corpo) {
    if (window.Investigacao && Investigacao.bloqueia(A.nivel, x0, y0, x1, y1)) return false;
    for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [(x0 + x1) / 2, y0], [(x0 + x1) / 2, y1]]) if (!blocoLivre(A, px, py)) return false;
    if (bateFixo(A, x0, y0, x1, y1)) return false;
    if (corpo) { // objetos não passam pela porta da frente / portão nem entram nas escadas
      if (y1 > 41 * T - 2) return false;
      for (const e of [A.escadas.sobe, A.escadas.desce]) if (e && x1 > e[0] && x0 < e[0] + e[2] && y1 > e[1] && y0 < e[1] + e[3]) return false;
    }
    return true;
  }
  const PE = { w: 22, h: 10 }; // pés do personagem (px do mundo)
  function corpoLivre(A, c, x, y) {
    return areaLivre(A, (x - c.w / 2) / K, (y - c.h / 2) / K, (x + c.w / 2) / K - .01, (y + c.h / 2) / K - .01, true);
  }
  const sobrepoe = (a, b) => Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;

  function livre(a, b) {
    const A = andarDe(andar);
    if (a < 20 || b < 20 || a > WW - 20 || b > WH - 4) return false;
    if (document.getElementById('free')?.checked) return true;
    if (!areaLivre(A, (a - PE.w / 2) / K, (b - PE.h) / K, (a + PE.w / 2) / K, b / K, false)) return false;
    // empurrar: o personagem é um corpo de massa 10 que transfere impulso aos objetos que toca
    const eu = { x: a, y: b - PE.h / 2, w: PE.w, h: PE.h };
    const dx = a - x, dy = b - y, vel = keys.shift ? 190 : 110;
    let bloqueia = false;
    for (const c of A.corpos) {
      if (c === segurado || c.seg || c.z > 40 || (c.ignora && performance.now() < c.ignora)) continue;
      if (!sobrepoe(eu, c)) continue;
      const nx = Math.sign(dx), ny = Math.sign(dy);
      const MP = 10, fator = (1 + c.elast) * MP / (MP + c.m);
      if (nx) { const alvo = nx * vel * fator; if (Math.abs(c.vx) < Math.abs(alvo) || Math.sign(c.vx) !== nx) c.vx = alvo; }
      if (ny) { const alvo = ny * vel * fator; if (Math.abs(c.vy) < Math.abs(alvo) || Math.sign(c.vy) !== ny) c.vy = alvo; }
      possuir(c);
      // objetos leves saem da frente na hora; pesados seguram o personagem até andarem
      const sx = c.x + (nx ? nx * (Math.abs(eu.x - c.x) < (eu.w + c.w) / 2 ? ((eu.w + c.w) / 2 - Math.abs(eu.x - c.x)) : 0) : 0);
      const sy = c.y + (ny ? ny * (Math.abs(eu.y - c.y) < (eu.h + c.h) / 2 ? ((eu.h + c.h) / 2 - Math.abs(eu.y - c.y)) : 0) : 0);
      if (c.m <= 4 && corpoLivre(A, c, sx, sy) && !A.corpos.some((o) => o !== c && !o.seg && o !== segurado && sobrepoe({ ...c, x: sx, y: sy }, o))) { c.x = sx; c.y = sy; }
      else bloqueia = true;
    }
    return !bloqueia;
  }

  // ---------- física ----------
  const GRAV = 1800;
  function passo(A, dt) {
    const agora = performance.now();
    for (const c of A.corpos) {
      if (c === segurado) { c.x = x; c.y = y + 2; c.z = 62; c.vx = c.vy = c.vz = 0; continue; }
      if (c.seg) { const o = window.MapaOnline && MapaOnline.jogador(c.seg); if (o) { c.x = o.x; c.y = o.y + 2; c.z = 62; } continue; }
      if (c.z > 0 || c.vz !== 0) {
        c.vz -= GRAV * dt; c.z += c.vz * dt;
        if (c.z <= 0) { c.z = 0; c.vz = -c.vz * c.elast; if (c.vz < 60) c.vz = 0; else { c.vx *= .85; c.vy *= .85; } }
      }
      const sp = Math.hypot(c.vx, c.vy);
      if (sp > 0) {
        if (c.z === 0) { const ns = Math.max(0, sp - c.atrito * 1400 * dt); c.vx *= ns / sp; c.vy *= ns / sp; }
        if (Math.abs(c.vx) < 2 && Math.abs(c.vy) < 2) { c.vx = c.vy = 0; continue; }
        // passos pequenos para não atravessar paredes
        const n = Math.max(1, Math.ceil(sp * dt / 8)), h = dt / n;
        for (let i = 0; i < n; i++) {
          const nx = c.x + c.vx * h; if (corpoLivre(A, c, nx, c.y)) c.x = nx; else c.vx = -c.vx * c.elast;
          const ny = c.y + c.vy * h; if (corpoLivre(A, c, c.x, ny)) c.y = ny; else c.vy = -c.vy * c.elast;
        }
      }
    }
    // corpo com corpo: separa pelo eixo de menor sobreposição e troca impulso (massa e elasticidade)
    const cs = A.corpos;
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) {
      const a = cs[i], b = cs[j];
      if (a === segurado || b === segurado || a.seg || b.seg || Math.abs(a.z - b.z) > 24) continue;
      const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x), oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
      if (ox <= 0 || oy <= 0) continue;
      const eixoX = ox < oy, n = eixoX ? Math.sign(b.x - a.x) || 1 : Math.sign(b.y - a.y) || 1;
      const ia = 1 / a.m, ib = 1 / b.m, sep = (eixoX ? ox : oy) / (ia + ib);
      const mover = (c, d) => { const tx = eixoX ? c.x + d : c.x, ty = eixoX ? c.y : c.y + d; if (corpoLivre(A, c, tx, ty)) { c.x = tx; c.y = ty; } };
      mover(a, -n * sep * ia); mover(b, n * sep * ib);
      const va = eixoX ? a.vx : a.vy, vb = eixoX ? b.vx : b.vy, vrel = (vb - va) * n;
      if (vrel < 0) {
        const e = Math.min(a.elast, b.elast), jj = -(1 + e) * vrel / (ia + ib);
        if (eixoX) { a.vx -= jj * ia * n; b.vx += jj * ib * n; } else { a.vy -= jj * ia * n; b.vy += jj * ib * n; }
        if (a.dono === MapaOnline?.meuId || b.dono === MapaOnline?.meuId) { possuir(a); possuir(b); }
      }
    }
    // objeto em movimento que bate no personagem parado volta (o personagem é uma parede para ele)
    const eu = { x, y: y - PE.h / 2, w: PE.w, h: PE.h };
    for (const c of cs) {
      if (c === segurado || c.seg || c.z > 40 || (c.ignora && agora < c.ignora) || seated) continue;
      if (!sobrepoe(eu, c) || Math.hypot(c.vx, c.vy) < 30) continue;
      const ox = (eu.w + c.w) / 2 - Math.abs(c.x - eu.x), oy = (eu.h + c.h) / 2 - Math.abs(c.y - eu.y);
      if (ox < oy) { c.vx = Math.abs(c.vx) * c.elast * Math.sign(c.x - eu.x || 1); } else { c.vy = Math.abs(c.vy) * c.elast * Math.sign(c.y - eu.y || 1); }
    }
  }

  // ---------- multijogador dos objetos ----------
  function possuir(c) { if (window.MapaOnline && MapaOnline.meuId) c.dono = MapaOnline.meuId; c.ateEnviar = performance.now() + 1500; }
  function enviarFisica(t) {
    if (!window.MapaOnline || !MapaOnline.pronto || t - ultimoEnvioFis < 70) return;
    const A = cache[andar]; if (!A) return;
    const lista = [];
    for (const c of A.corpos) {
      if (c.dono !== MapaOnline.meuId) continue;
      const mexendo = c === segurado || c.z > 0 || Math.abs(c.vx) + Math.abs(c.vy) > 0;
      if (!mexendo && !(c.ateEnviar && t < c.ateEnviar)) continue;
      lista.push([c.id, Math.round(c.x), Math.round(c.y), Math.round(c.z), Math.round(c.vx), Math.round(c.vy), Math.round(c.vz), c === segurado ? 1 : 0]);
    }
    if (!lista.length) return;
    ultimoEnvioFis = t;
    MapaOnline.mandar('fis', { a: andar, l: lista });
  }
  addEventListener('mapa:fis', ({ detail: p }) => {
    if (!p || !Array.isArray(p.l) || ANDARES[p.a] === undefined) return;
    const A = andarDe(p.a);
    for (const [id, cx, cy, cz, vx, vy, vz, seg] of p.l) {
      const c = A.corpos.find((o) => o.id === id); if (!c || c === segurado) continue;
      Object.assign(c, { x: cx, y: cy, z: cz, vx, vy, vz, dono: p.id, seg: seg ? p.id : null });
    }
  });

  // ---------- trocar de andar ----------
  function irPara(n, px, py, d) {
    if (segurado) segurado.andar = n; // leva o objeto junto
    andar = n; x = px; y = py; if (d !== undefined) dir = d; escuro = 1; salaAtual = -2;
    const A = andarDe(n);
    if (segurado) { const de = cache[segurado.andarOrigem]; if (de && de !== A) { de.corpos.splice(de.corpos.indexOf(segurado), 1); A.corpos.push(segurado); segurado.andarOrigem = n; } }
    msg.textContent = `${NOMES_ANDAR[n]}`;
    if (window.MapaOnline) MapaOnline.enviar(performance.now(), true);
  }
  function sair(ex, ey) {
    if (segurado) soltar(0);
    inside = false; garage = false; x = ex; y = ey; dir = 0; msg.textContent = 'Jardim';
  }

  // ---------- elevador (painel) ----------
  const painel = document.createElement('div');
  painel.id = 'painel-elevador';
  painel.innerHTML = '<div class="pe-caixa"><b>Elevador</b><div class="pe-bts"></div><button class="pe-fechar">Fechar</button></div>';
  const estilo = document.createElement('style');
  estilo.textContent = `#painel-elevador{position:fixed;inset:0;z-index:40;display:none;place-items:center;background:rgba(0,0,0,.35)}
  #painel-elevador.aberto{display:grid}
  #painel-elevador .pe-caixa{background:#2a2420;border:2px solid #b08a3e;border-radius:10px;padding:16px 18px;color:#f0e2c0;font:15px system-ui;text-align:center;min-width:220px;box-shadow:0 10px 40px #000}
  #painel-elevador .pe-bts{display:grid;gap:8px;margin:12px 0}
  #painel-elevador button{padding:11px 14px;background:#3a3028;color:#f0e2c0;border:1px solid #8c7552;border-radius:6px;font:15px system-ui;cursor:pointer}
  #painel-elevador button.aqui{background:#6a5530;border-color:#e8bd70}
  #painel-elevador button:hover{background:#4a3b2b}`;
  document.head.append(estilo); document.body.append(painel);
  painel.querySelector('.pe-fechar').onclick = () => painel.classList.remove('aberto');
  painel.addEventListener('click', (e) => { if (e.target === painel) painel.classList.remove('aberto'); });
  function abrirElevador() {
    const bts = painel.querySelector('.pe-bts'); bts.innerHTML = '';
    for (const n of [2, 1, 0, -1]) {
      const b = document.createElement('button'); b.textContent = NOMES_ANDAR[n] + (n === andar ? ' (aqui)' : '');
      if (n === andar) b.classList.add('aqui');
      b.onclick = () => { painel.classList.remove('aberto'); if (n !== andar) viajar(n); };
      bts.append(b);
    }
    painel.classList.add('aberto');
    keys = {};
  }
  function viajar(n) {
    elevAnim.alvo = 0; msg.textContent = 'Elevador…';
    viagem = { n, t: performance.now() };
  }

  // ---------- pegar e arremessar ----------
  function pegar(c) { segurado = c; c.andarOrigem = andar; c.vx = c.vy = c.vz = 0; possuir(c); msg.textContent = 'Segurando — E para arremessar'; }
  function soltar(forca) {
    const c = segurado; if (!c) return;
    segurado = null;
    const dirs = [[0, 1], [-1, 0], [1, 0], [0, -1]], [ux, uy] = dirs[dir] || [0, 1];
    const andando = keys.w || keys.a || keys.s || keys.d || keys.arrowup || keys.arrowdown || keys.arrowleft || keys.arrowright;
    const v = forca * (andando ? 1.25 : 1);
    c.x = x + ux * 26; c.y = y + uy * 18 + 2; c.z = 50;
    const A = andarDe(andar);
    if (!corpoLivre(A, c, c.x, c.y)) { c.x = x; c.y = y + 2; }
    c.vx = ux * v; c.vy = uy * v; c.vz = forca ? 330 : 0; c.ignora = performance.now() + 350;
    possuir(c);
    msg.textContent = forca ? 'Arremessou!' : 'Soltou';
  }

  // ---------- desenho ----------
  function desenharCorpo(c) {
    const t = TIPOS[c.tipo], sp = sprite(c.tipo, c.var1);
    const sx = Math.round(c.x - t.w * K / 2), sy = Math.round(c.y + c.h / 2 - t.h * K - c.z);
    if (c.z > 0) { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + c.h / 2 - 2, c.w / 2.2, 4, 0, 0, 7); ctx.fill(); }
    ctx.drawImage(sp, sx, sy, t.w * K, t.h * K);
  }
  function animar(A, t) {
    const z = t / 1000;
    for (const a of A.anims) {
      const X = a.x * K, Y = a.y * K;
      if (a.t === 'chama') {
        const f = Math.sin(z * 11 + a.s) + Math.sin(z * 17 + a.s * 2);
        ctx.fillStyle = '#ff9a2a'; ctx.fillRect(X - 3, Y - 6 - (f > .6 ? 3 : 0), 5, 8 + (f > .6 ? 3 : 0));
        ctx.fillStyle = '#ffe9a0'; ctx.fillRect(X - 1, Y - 3, 2, 4);
      } else if (a.t === 'fogo' || a.t === 'brasa') {
        const w = a.w * K, h = a.h * K;
        for (let i = 0; i < (a.t === 'fogo' ? 9 : 5); i++) {
          const q = (Math.sin(z * 7 + i * 1.7) + 1) / 2, fx = X + (i + .5) * w / (a.t === 'fogo' ? 9 : 5), fh = (a.t === 'fogo' ? h * (.45 + .55 * q) : h * .5 * q + 3);
          ctx.fillStyle = i % 2 ? '#ff7a1a' : '#ffb02a'; ctx.fillRect(Math.round(fx - 4), Math.round(Y + h - fh), 6, Math.round(fh));
          if (a.t === 'fogo') { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(Math.round(fx - 2), Math.round(Y + h - fh * .5), 3, Math.round(fh * .5)); }
        }
      } else if (a.t === 'pendulo') {
        const ang = Math.sin(z * 3.2) * .35;
        ctx.save(); ctx.translate(X, Y); ctx.rotate(ang); ctx.fillStyle = '#b08a3e'; ctx.fillRect(-1, 0, 3, 36); ctx.fillRect(-5, 34, 11, 10); ctx.restore();
      } else if (a.t === 'pisca') {
        ctx.fillStyle = Math.sin(z * 4) > 0 ? '#7af07a' : '#2a5a2a'; ctx.fillRect(X, Y, 12, 12);
      } else if (a.t === 'elevador') {
        const ab = elevAnim.abre; // 0 = fechado, 1 = aberto (portas deslizam para os lados)
        if (ab > 0) {
          const larg = 15 * K * ab;
          ctx.fillStyle = '#2a2420'; ctx.fillRect(X + 16 * K - larg, Y, larg * 2, 30 * K);
          ctx.fillStyle = '#f0d890'; ctx.fillRect(X + 16 * K - larg + 6, Y + 6, larg * 2 - 12, 6);
        }
      }
    }
  }
  function iluminar(A, t, vx, vy, vw, vh) {
    ctx.save();
    ctx.fillStyle = andar === -1 ? 'rgba(4,10,14,.5)' : 'rgba(8,6,18,.36)';
    ctx.fillRect(vx, vy, vw, vh);
    ctx.globalCompositeOperation = 'lighter';
    const z = t / 1000;
    for (const l of A.luzes) {
      const X = l.x * K, Y = l.y * K, R = l.r * K * (1 + .05 * Math.sin(z * 9 + l.s));
      if (X + R < vx || X - R > vx + vw || Y + R < vy || Y - R > vy + vh) continue;
      const g = ctx.createRadialGradient(X, Y, 0, X, Y, R);
      const a = l.tipo === 'fogo' ? .3 : l.tipo === 'lampada' ? .2 : .16;
      g.addColorStop(0, `rgba(255,170,80,${a})`); g.addColorStop(1, 'rgba(255,140,60,0)');
      ctx.fillStyle = g; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    }
    ctx.restore();
  }

  function desenhar() {
    const agora = performance.now();
    const dt = Math.min(.05, (agora - (ultimoQuadro || agora)) / 1000);
    // entrou agora (porta da frente ou portão da garagem). Não usa o tempo entre quadros:
    // com a aba em segundo plano os quadros param, e isso não pode mandar ninguém de volta ao hall.
    if (!dentroAntes) {
      dentroAntes = true;
      if (garage) { garage = false; andar = -1; x = 6.5 * 48; y = 40 * 48; dir = 3; msg.textContent = 'Garagem (porão)'; }
      else { andar = 0; x = 24 * 48; y = 40 * 48 + 14; dir = 3; msg.textContent = 'Hall de entrada'; }
      escuro = 1; salaAtual = -2; seated = false;
      if (window.MapaOnline) MapaOnline.enviar(agora, true);
    }
    ultimoQuadro = agora;
    const A = andarDe(andar);

    // saídas para o jardim
    if (andar === 0 && y > 41 * 48 + 6 && x > 22.5 * 48 && x < 25.5 * 48) { sair(768, 405); return; }
    if (andar === -1 && y > 41 * 48 + 6 && x > 4.5 * 48 && x < 9.5 * 48) { sair(225, 448); return; }
    // escadas: chegar ao fim do degrau troca de andar
    if (agora > cooldownEscada && !seated) {
      const nx = x / K, ny = y / K;
      if (A.escadas.sobe && nx > SOBE[0] && nx < SOBE[0] + SOBE[2] && ny < SOBE[1] + 10 && ny > SOBE[1] - 4) { cooldownEscada = agora + 700; irPara(ORDEM[ORDEM.indexOf(andar) + 1], ...CHEGA_SUBINDO, 2); }
      else if (A.escadas.desce && nx > DESCE[0] && nx < DESCE[0] + DESCE[2] && ny > DESCE[1] + DESCE[3] - 10) { cooldownEscada = agora + 700; irPara(ORDEM[ORDEM.indexOf(andar) - 1], ...CHEGA_DESCENDO, 2); }
    }
    // elevador: fecha, viaja, abre
    elevAnim.abre += (elevAnim.alvo - elevAnim.abre) * Math.min(1, dt * 6);
    if (viagem && agora - viagem.t > 700) { irPara(viagem.n, ELEV.x, ELEV.y + 14, 0); viagem = null; elevAnim.abre = 0; elevAnim.alvo = 1; msg.textContent = NOMES_ANDAR[andar]; }
    if (!viagem) elevAnim.alvo = Math.hypot(x - ELEV.x, y - ELEV.y) < 110 ? 1 : 0;

    passo(A, dt);

    // câmera própria do interior
    const vw = cv.width, vh = cv.height;
    vistaX = WW <= vw ? (WW - vw) / 2 : Math.max(0, Math.min(WW - vw, x - vw / 2));
    vistaY = WH <= vh ? (WH - vh) / 2 : Math.max(0, Math.min(WH - vh, y - vh / 2));
    vistaX = Math.round(vistaX); vistaY = Math.round(vistaY);
    ctx.translate(-vistaX, -vistaY);
    ctx.fillStyle = '#0b0908'; ctx.fillRect(vistaX, vistaY, vw, vh);
    ctx.imageSmoothingEnabled = false;
    const sx = Math.max(0, Math.floor(vistaX / K)), sy = Math.max(0, Math.floor(vistaY / K));
    const sw = Math.min(NW - sx, Math.ceil(vw / K) + 2), sh = Math.min(NH - sy, Math.ceil(vh / K) + 2);
    ctx.drawImage(A.tela, sx, sy, sw, sh, sx * K, sy * K, sw * K, sh * K);
    if (window.Decoracao) Decoracao.desenhar(A, ctx, agora);
    animar(A, agora);
    if (window.Investigacao) Investigacao.desenharMundo(A.nivel, ctx, agora);
    // objetos atrás do personagem
    const atras = (c) => c.y <= y || (seated && Math.hypot(c.x - x, c.y - y) < 40);
    for (const c of A.corpos.filter((c) => c !== segurado && atras(c)).sort((a, b) => a.y - b.y)) desenharCorpo(c);
    iluminar(A, agora, vistaX, vistaY, vw, vh);

    // nome do cômodo
    const i = A.cel(Math.floor(x / 48), Math.floor((y - 4) / 48));
    if (i >= 0 && i !== salaAtual) { salaAtual = i; if (window.Investigacao) Investigacao.entrouEm(andar, A.salas[i].chave); msg.textContent = `${NOMES_ANDAR[andar]} — ${A.salas[i].nome}`; }
    enviarFisica(agora);
  }
  // por cima do personagem: objetos à frente, objeto segurado, rótulo do andar e escurecimento das transições
  function desenharFrente() {
    const A = cache[andar]; if (!A) return;
    for (const c of A.corpos.filter((c) => c !== segurado && !(c.y <= y || (seated && Math.hypot(c.x - x, c.y - y) < 40))).sort((a, b) => a.y - b.y)) desenharCorpo(c);
    if (segurado) desenharCorpo(segurado);
    ctx.save();
    ctx.font = 'bold 15px Georgia'; ctx.textAlign = 'center';
    const rot = NOMES_ANDAR[andar] + (salaAtual >= 0 ? ' · ' + A.salas[salaAtual].nome : '');
    const w = ctx.measureText(rot).width + 20;
    const mx = vistaX + cv.width / 2;
    ctx.fillStyle = 'rgba(20,14,10,.72)'; ctx.fillRect(mx - w / 2, vistaY + 12, w, 28);
    ctx.fillStyle = '#f0e2c0'; ctx.fillText(rot, mx, vistaY + 31);
    if (window.Investigacao) Investigacao.desenharFrente(andar, ctx, vistaX, vistaY, cv.width, cv.height, performance.now());
    if (window.Decoracao) Decoracao.desenharFrente(A, ctx, vistaX, vistaY);
    if (escuro > 0) { ctx.fillStyle = `rgba(0,0,0,${escuro})`; ctx.fillRect(vistaX, vistaY, cv.width, cv.height); escuro = Math.max(0, escuro - .05); }
    ctx.restore();
  }

  // ---------- ganchos no mapa.js ----------
  const hallOrig = hall, validOrig = valid, pickOrig = pick, investigarOrig = investigate;
  hall = function () { desenhar(); };
  valid = function (a, b) { return inside ? livre(a, b) : validOrig(a, b); };
  investigate = function () {
    if (!inside) return investigarOrig();
    const A = andarDe(andar), i = A.cel(Math.floor(x / 48), Math.floor((y - 4) / 48));
    msg.textContent = i >= 0 ? A.salas[i].txt : NOMES_ANDAR[andar];
  };
  pick = function () {
    if (!inside) return pickOrig();
    const A = andarDe(andar);
    if (seated) { seated = false;[x, y] = seatReturn; msg.textContent = 'Levantou'; return; }
    if (segurado) { soltar(380); return; }
    if (Math.hypot(x - ELEV.x, y - ELEV.y) < 80) { abrirElevador(); return; }
    if (andar === 0 && Math.hypot(x - 24 * 48, y - 41 * 48) < 90) { sair(768, 405); return; }
    if (andar === -1 && Math.hypot(x - 6.5 * 48, y - 41 * 48) < 120) { sair(225, 448); return; }
    // sentar: cadeiras (onde estiverem), poltronas, banquetas e sofá
    let melhor = null, dist = 64;
    for (const c of A.corpos) if (c.sentar && c.z === 0 && !c.seg) { const d = Math.hypot(x - c.x, y - c.y); if (d < dist) { dist = d; melhor = c; } }
    for (const [sx, sy, sd] of A.assentosFixos || []) { const d = Math.hypot(x - sx, y - sy); if (d < dist) { dist = d; melhor = { fixo: [sx, sy, sd] }; } }
    // pegar: objeto pequeno mais perto
    let peg = null, dp = 56;
    for (const c of A.corpos) if (c.peg && !c.seg && c.z < 20) { const d = Math.hypot(x - c.x, y - c.y); if (d < dp) { dp = d; peg = c; } }
    if (peg && (!melhor || dp < dist)) { pegar(peg); return; }
    if (melhor) {
      seatReturn = [x, y];
      if (melhor.fixo) { [x, y, dir] = melhor.fixo; }
      else { const [ox, oy, d] = melhor.sentar; x = melhor.x + ox * K; y = melhor.y + oy * K; dir = d; melhor.vx = melhor.vy = 0; }
      phase = 0; seated = true; msg.textContent = 'Sentado — E para levantar'; return;
    }
    msg.textContent = 'Nada para usar aqui. Espaço: investigar';
  };
  act.onclick = () => pick();
  // objetos da frente: desenhados logo depois dos outros jogadores
  const esperarOnline = setInterval(() => {
    if (!window.MapaOnline || MapaOnline.__interior) return;
    const orig = MapaOnline.desenhar;
    MapaOnline.desenhar = function (dt) { orig.call(this, dt); if (inside) desenharFrente(); };
    MapaOnline.__interior = true; clearInterval(esperarOnline);
  }, 50);

  // para a decoração: as mesmas peças desenhadas aqui, o desenho num contexto qualquer e a câmera
  const comG = (g, fn) => { const antes = G; G = g; try { return fn(); } finally { G = antes; } };
  const reconstruir = (n) => { const velho = cache[n]; delete cache[n]; if (velho && velho === cache[andar]) salaAtual = -2; return andarDe(n); };
  window.Interior = {
    get andar() { return inside ? andar : null; }, get nivel() { return andar; }, irPara, andarDe, reconstruir, K, T, NW, NH,
    vista: () => ({ x: vistaX, y: vistaY }), construidos: () => Object.keys(cache).map(Number),
    comG, D, TIPOS, sprite, MAT,
    pecas: { mesa, cama, criado, armario, estante, prateleira, bancada, aparador, fogao, lareira, sofa, piano, relogio, escrivaninha, vasoFixo, pia, sanitario, banheira, espelho, carro, caldeira, canos, mesaBilhar, telescopio, cofre, bau, banco, castical, arandela, janela, quadro, tapete, porta, portaoGaragem, vela },
  };
})();

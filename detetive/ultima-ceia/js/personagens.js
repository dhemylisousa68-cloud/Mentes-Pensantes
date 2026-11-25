// Dados PÚBLICOS dos personagens (o que aparece na seleção).
// As cartas privadas NÃO ficam aqui: elas vivem no Supabase (ou em segredos/ no modo demonstração).
window.UC = window.UC || {};

// Cada vaga tem um retrato (para escolher) e um boneco em pixel (o que vai para o jogo).
// Os nomes ainda não foram definidos: "nome" é provisório e pode ser trocado aqui sem mexer no resto.
// "id" é só a chave interna da vaga (usada nas duplas abaixo).
// "animBoneco" escolhe a animação do boneco (css/sala.css → .boneco.anim-*).
UC.PERSONAGENS = [
  ['alice', 'pulo'],
  ['bruno', 'balanco'],
  ['cecilia', 'aceno'],
  ['diego', 'passinho'],
  ['eva', 'olhar'],
  ['felipe', 'respira'],
  ['isadora', 'gira'],
  ['lucas', 'tremor'],
  ['maya', 'flutua'],
  ['nicolas', 'marcha'],
].map(([id, animBoneco], i) => {
  const n = String(i + 1).padStart(2, '0');
  return {
    id,
    nome: `Personagem ${i + 1}`,
    descricao: 'Nome e história ainda a definir.',
    retrato: `assets/personagens/p${n}-retrato.jpg`,
    boneco: `assets/personagens/p${n}-boneco.png`,
    animBoneco,
  };
});

// Nº 7: animação quadro a quadro mandando um beijo (folha com 6 poses de 320 × 500, ancoradas pelos pés).
// quadros = [até que milissegundo, qual pose]; coracao = trajeto em pixels da pose.
// Nº 3: dancinha em loop (6 poses de 284 × 470 tocadas na ordem 0,1,2,1,3,4,5,4 a 5 quadros/s).
// Convite de Tomás (vídeo antes de entrar no mapa). Por enquanto: Nº 3, Nº 7, Nº 8 e Nº 9.
// Sem narração: fica só o som de ambiente do vídeo (para narrar, acrescente voz: 'arquivo' e falaEm: segundo).
UC.PERSONAGENS.find((p) => p.id === 'cecilia').convite = {
  video: 'assets/convites/p03.mp4',
  capa: 'assets/convites/p03-capa.jpg',
};
// Nº 7: a coruja mensageira no parque.
UC.PERSONAGENS.find((p) => p.id === 'isadora').convite = {
  video: 'assets/convites/p07.mp4',
  capa: 'assets/convites/p07-capa.jpg',
};
// Nº 8: o ajudante na academia.
UC.PERSONAGENS.find((p) => p.id === 'lucas').convite = {
  video: 'assets/convites/p08.mp4',
  capa: 'assets/convites/p08-capa.jpg',
};
// Nº 9: o mensageiro de quatro patas.
UC.PERSONAGENS.find((p) => p.id === 'maya').convite = {
  video: 'assets/convites/p09.mp4',
  capa: 'assets/convites/p09-capa.jpg',
};

UC.PERSONAGENS.find((p) => p.id === 'cecilia').folha = {
  imagem: 'assets/personagens/p03-danca.png',
  total: 6,
  proporcao: '284 / 470',
  escala: 1,
  seq: [0, 1, 2, 1, 3, 4, 5, 4],
  fps: 5,
};

// Nº 4: abre a latinha, dá um gole e brinda (6 poses de 300 × 483, alinhadas pelos pés, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'diego').folha = {
  imagem: 'assets/personagens/p04-brinde.png',
  total: 6,
  proporcao: '300 / 483',
  escala: 1,
  seq: [0, 0, 1, 2, 2, 3, 4, 4, 4, 3, 5, 5, 5, 5],
  fps: 5,
};

// Nº 10: tenta resolver o cubo mágico (6 poses de 260 × 478, alinhadas pelos pés, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'nicolas').folha = {
  imagem: 'assets/personagens/p10-cubo.png',
  total: 6,
  proporcao: '260 / 478',
  escala: 1,
  seq: [0, 0, 1, 2, 1, 2, 3, 4, 3, 4, 5, 5, 5, 0],
  fps: 5,
};

// Nº 9: faz carinho no cachorro (6 poses de 478 × 436 com o cachorro ao lado, alinhadas pelos pés, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'maya').folha = {
  imagem: 'assets/personagens/p09-carinho.png',
  total: 6,
  proporcao: '478 / 436',
  escala: .95,
  seq: [0, 1, 2, 3, 2, 3, 4, 5, 5, 1],
  fps: 5,
};

// Nº 8: treino com halteres e pose de força no final (8 poses de 242 × 424, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'lucas').folha = {
  imagem: 'assets/personagens/p08-pesos.png',
  total: 8,
  proporcao: '242 / 424',
  escala: 1,
  seq: [0, 0, 1, 2, 2, 3, 4, 1, 2, 2, 3, 4, 5, 5, 6, 7, 7, 7, 7, 6, 5, 0],
  fps: 5,
};

// Nº 2: prepara um drink na mesinha e prova (8 poses de 344 × 396 com a mesa ao lado, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'bruno').folha = {
  imagem: 'assets/personagens/p02-drink.png',
  total: 8,
  proporcao: '344 / 396',
  escala: 1,
  seq: [0, 0, 1, 1, 2, 2, 2, 3, 3, 3, 5, 5, 6, 6, 6, 7, 7, 7, 7],
  fps: 5,
};

// Nº 1: tocando violão (6 poses de 348 × 496, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'alice').folha = {
  imagem: 'assets/personagens/p01-violao.png',
  total: 6,
  proporcao: '348 / 496',
  escala: 1,
  seq: [0, 1, 2, 3, 4, 5],
  fps: 5,
};

// Nº 6: o frasco misterioso (6 poses de 335 × 474, alinhadas pelos pés, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'felipe').folha = {
  imagem: 'assets/personagens/p06-frasco.png',
  total: 6,
  proporcao: '335 / 474',
  escala: 1,
  seq: [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5, 5],
  fps: 5,
};

// Nº 5: coloca os fones e entra no ritmo da música (8 poses de 299 × 416, a 5 quadros/s).
UC.PERSONAGENS.find((p) => p.id === 'eva').folha = {
  imagem: 'assets/personagens/p05-fones.png',
  total: 8,
  proporcao: '299 / 416',
  escala: 1,
  seq: [0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 6, 6, 7, 7, 5, 5],
  fps: 5,
};

UC.PERSONAGENS.find((p) => p.id === 'isadora').folha = {
  imagem: 'assets/personagens/p07-beijo.png',
  total: 6,
  // 5 quadros/s (200 ms cada): acena, mão na boca, pisca, beijo, mão aberta, volta e pausa
  seq: [0, 1, 2, 2, 3, 4, 4, 5, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  fps: 5,
  coracao: { de: 800, ate: 1800, x: 242, y: 185, dx: 50, dy: -110 },
};

// Duplas para partidas com menos de 10 pessoas (ordem do roteiro).
// Com N jogadores, as primeiras (N - 5) duplas são desfeitas.
UC.PARES = [
  ['alice', 'isadora'],
  ['bruno', 'lucas'],
  ['cecilia', 'maya'],
  ['diego', 'nicolas'],
  ['eva', 'felipe'],
];

UC.porId = (id) => UC.PERSONAGENS.find((p) => p.id === id);

// Mesma regra da função SQL unidade_de().
UC.unidadeDe = (id, max) => {
  for (let i = 0; i < UC.PARES.length; i++) {
    const par = UC.PARES[i];
    if (par.includes(id)) return i < max - 5 ? id : par.join('+');
  }
  return null;
};

UC.parceiroDe = (id, max) => {
  const unidade = UC.unidadeDe(id, max);
  if (!unidade || !unidade.includes('+')) return null;
  return unidade.split('+').find((x) => x !== id);
};

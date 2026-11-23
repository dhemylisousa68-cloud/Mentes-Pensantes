// Dados PÚBLICOS dos personagens (o que aparece na seleção).
// As cartas privadas NÃO ficam aqui: elas vivem no Supabase (ou em segredos/ no modo demonstração).
window.UC = window.UC || {};

UC.PERSONAGENS = [
  { id: 'alice',   nome: 'Alice',   descricao: 'Observadora, próxima de Gabriel, carrega um celular antigo.', acao: 'Segura o celular e olha para a porta.', anim: 'olhar',    prop: '📱', pele: '#e8b896', cabelo: '#3b2416', estilo: 'longo',    roupa: '#7a2e3a' },
  { id: 'bruno',   nome: 'Bruno',   descricao: 'Impulsivo, tenta proteger os amigos, usa jaqueta escura.',     acao: 'Cruza os braços.',                       anim: 'bracos',   prop: '',   pele: '#c68a5e', cabelo: '#1c1410', estilo: 'curto',    roupa: '#23262f' },
  { id: 'cecilia', nome: 'Cecília', descricao: 'Atenta a sons, evita conflitos.',                              acao: 'Inclina a cabeça para ouvir.',           anim: 'inclinar', prop: '',   pele: '#f1c9a5', cabelo: '#a0522d', estilo: 'coque',    roupa: '#3d5a4a' },
  { id: 'diego',   nome: 'Diego',   descricao: 'Conhece equipamentos e câmeras.',                              acao: 'Ajusta um pequeno rádio.',               anim: 'ajustar',  prop: '📻', pele: '#8d5a3b', cabelo: '#0f0d0c', estilo: 'raspado',  roupa: '#4a4f63' },
  { id: 'eva',     nome: 'Eva',     descricao: 'Curiosa e habilidosa com objetos.',                            acao: 'Gira uma pequena chave.',                anim: 'girar',    prop: '🔑', pele: '#f0c8a8', cabelo: '#d9a441', estilo: 'longo',    roupa: '#5b3a6e' },
  { id: 'felipe',  nome: 'Felipe',  descricao: 'Conhece fotografia e tenta parecer calmo.',                    acao: 'Examina uma câmera.',                    anim: 'examinar', prop: '📷', pele: '#d9a07a', cabelo: '#4a3020', estilo: 'curto',    roupa: '#6b5a3a' },
  { id: 'isadora', nome: 'Isadora', descricao: 'Amiga de Laura, desconfiada de Helena.',                       acao: 'Segura um envelope.',                    anim: 'segurar',  prop: '✉️', pele: '#7a4a32', cabelo: '#1a1210', estilo: 'cacheado', roupa: '#2f4b6e' },
  { id: 'lucas',   nome: 'Lucas',   descricao: 'Observador, fala pouco.',                                      acao: 'Olha por cima do ombro.',                anim: 'ombro',    prop: '',   pele: '#e6b08a', cabelo: '#2b2b2b', estilo: 'curto',    roupa: '#3a3a40' },
  { id: 'maya',    nome: 'Maya',    descricao: 'Guarda lembranças em áudio.',                                  acao: 'Testa os fones.',                        anim: 'fones',    prop: '🎧', pele: '#b97a56', cabelo: '#2a1a12', estilo: 'longo',    roupa: '#8a5a2b' },
  { id: 'nicolas', nome: 'Nicolas', descricao: 'Ajudou na decoração e conhece os mecanismos.',                 acao: 'Testa uma pequena lanterna.',            anim: 'lanterna', prop: '🔦', pele: '#f3d0b0', cabelo: '#6e4b2a', estilo: 'cacheado', roupa: '#2e5d3a' },
];

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

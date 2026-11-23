// Catálogo de abas e jogos do Mentes Pensantes.
// Para adicionar um jogo: inclua um objeto em "jogos" da aba correspondente.
// Para adicionar uma aba: inclua um novo objeto em ABAS.
const ABAS = [
  {
    id: 'detetive',
    nome: 'Detetive',
    descricao: 'Casos para investigar em grupo. Juntem as pistas, desconfiem das versões e cheguem à verdade antes que o tempo acabe.',
    jogos: [
      {
        id: 'ultima-ceia',
        titulo: 'Última Ceia',
        lema: 'Ninguém sai antes da meia-noite.',
        resumo: 'Dez convidados, uma festa de Natal e uma cadeira vazia na cabeceira. Reconstruam o que aconteceu e decidam em quem confiar.',
        detalhes: ['Cooperativo', '5 a 10 jogadores', '40 minutos'],
        caminho: 'detetive/ultima-ceia/',
        capa: 'ultima-ceia',
      },
    ],
  },
];

const CAPAS = {
  'ultima-ceia': `
    <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="cp-parede" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140c0f"/><stop offset="1" stop-color="#24161b"/></linearGradient>
        <linearGradient id="cp-cone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd99a" stop-opacity="0"/><stop offset=".3" stop-color="#ffd99a" stop-opacity=".2"/><stop offset="1" stop-color="#ffd99a" stop-opacity=".05"/></linearGradient>
        <radialGradient id="cp-vela"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".7"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>
      </defs>
      <rect width="320" height="180" fill="url(#cp-parede)"/>
      <rect y="140" width="320" height="40" fill="#0d0807"/>
      <polygon points="150,0 170,0 215,140 105,140" fill="url(#cp-cone)"/>
      <polygon points="40,40 18,86 62,86" fill="#10291b"/><polygon points="40,62 10,118 70,118" fill="#0d2418"/>
      <g fill="#ffcf7a"><circle cx="34" cy="80" r="1.6"/><circle cx="48" cy="100" r="1.6"/><circle cx="28" cy="108" r="1.6"/></g>
      <path d="M140 132 V88 Q140 72 160 70 Q180 72 180 88 V132 Z" fill="#4a2c1c"/>
      <rect x="92" y="126" width="136" height="24" fill="#4a111b"/>
      <polygon points="98,122 222,122 228,128 92,128" fill="#5a1520"/>
      <circle cx="132" cy="112" r="14" fill="url(#cp-vela)"/><rect x="130" y="114" width="4" height="10" fill="#e9dfcf"/>
      <circle cx="188" cy="112" r="14" fill="url(#cp-vela)"/><rect x="186" y="114" width="4" height="10" fill="#e9dfcf"/>
      <rect x="262" y="50" width="38" height="90" fill="#3a2418"/><rect x="262" y="138" width="38" height="2" fill="#ffd08a"/>
    </svg>`,
};

const abas = document.querySelector('.abas');
const painel = document.getElementById('painel');

function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function abaInicial() {
  const hash = location.hash.slice(1);
  return ABAS.some((a) => a.id === hash) ? hash : ABAS[0].id;
}

function mostrar(id) {
  const aba = ABAS.find((a) => a.id === id);
  abas.querySelectorAll('[role="tab"]').forEach((b) => {
    const ativa = b.dataset.id === id;
    b.setAttribute('aria-selected', ativa);
    b.tabIndex = ativa ? 0 : -1;
  });
  painel.setAttribute('aria-labelledby', 'aba-' + id);
  painel.innerHTML = `
    <p class="descricao">${esc(aba.descricao)}</p>
    <div class="grade">
      ${aba.jogos.map((j) => `
        <a class="cartao" href="${esc(j.caminho)}">
          <div class="capa">${CAPAS[j.capa] || ''}</div>
          <div class="info">
            <h2>${esc(j.titulo)}</h2>
            <p class="lema">${esc(j.lema)}</p>
            <p class="resumo">${esc(j.resumo)}</p>
            <ul class="etiquetas">${j.detalhes.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>
            <span class="jogar">Jogar <span aria-hidden="true">›</span></span>
          </div>
        </a>`).join('')}
      <div class="cartao vazio" aria-hidden="true">
        <span>Próximo caso em breve</span>
      </div>
    </div>`;
}

abas.innerHTML = ABAS.map((a) => `
  <button role="tab" id="aba-${a.id}" data-id="${a.id}" aria-controls="painel">${esc(a.nome)}</button>`).join('');

abas.addEventListener('click', (e) => {
  const b = e.target.closest('[role="tab"]');
  if (!b) return;
  history.replaceState(null, '', '#' + b.dataset.id);
  mostrar(b.dataset.id);
});
abas.addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  const lista = [...abas.querySelectorAll('[role="tab"]')];
  const i = lista.indexOf(document.activeElement);
  const prox = lista[(i + (e.key === 'ArrowRight' ? 1 : -1) + lista.length) % lista.length];
  prox.focus();
  prox.click();
});

mostrar(abaInicial());

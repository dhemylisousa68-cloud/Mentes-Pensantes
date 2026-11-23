// Preferências do jogador (compartilhadas por todo o Mentes Pensantes), salvas apenas neste navegador.
window.UC = window.UC || {};

UC.Ajustes = (() => {
  const CHAVE = 'mp_ajustes';
  const padrao = {
    musica: 60,
    efeitos: 70,
    reduzido: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    texto: 'm',
  };
  let valores = { ...padrao };
  try { Object.assign(valores, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) { /* sem armazenamento */ }

  const ouvintes = [];

  function aplicar() {
    const raiz = document.documentElement;
    raiz.classList.toggle('reduzido', !!valores.reduzido);
    raiz.dataset.texto = valores.texto;
  }

  function definir(chave, valor) {
    valores[chave] = valor;
    try { localStorage.setItem(CHAVE, JSON.stringify(valores)); } catch (e) { /* ignora */ }
    aplicar();
    ouvintes.forEach((fn) => fn(valores));
  }

  aplicar();

  return {
    get: (k) => valores[k],
    todos: () => ({ ...valores }),
    definir,
    aoMudar: (fn) => ouvintes.push(fn),
  };
})();

// Preferências do jogador (compartilhadas por todo o Mentes Pensantes), salvas apenas neste navegador.
window.UC = window.UC || {};

UC.Ajustes = (() => {
  const CHAVE = 'mp_ajustes';
  // As animações fazem parte da jogabilidade, então vêm sempre ligadas.
  // "Movimento reduzido" só vale quando a pessoa escolhe em Configurações
  // (muitos notebooks com Windows pedem menos movimento só por terem as animações do sistema desligadas).
  const padrao = {
    musica: 60,
    efeitos: 70,
    reduzido: false,
    reduzidoEscolhido: false,
    texto: 'm',
  };
  let valores = { ...padrao };
  try { Object.assign(valores, JSON.parse(localStorage.getItem(CHAVE) || '{}')); } catch (e) { /* sem armazenamento */ }
  // versões anteriores copiavam a preferência do sistema; só mantém se foi escolha da pessoa
  if (!valores.reduzidoEscolhido) valores.reduzido = false;

  const ouvintes = [];

  function aplicar() {
    const raiz = document.documentElement;
    raiz.classList.toggle('reduzido', !!valores.reduzido);
    raiz.dataset.texto = valores.texto;
  }

  function definir(chave, valor) {
    valores[chave] = valor;
    if (chave === 'reduzido') valores.reduzidoEscolhido = true;
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

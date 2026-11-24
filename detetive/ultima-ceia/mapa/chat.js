// Chat de texto do mapa: conversa com quem está na mesma sala (canal do Supabase do multijogador).
// - Enter abre/envia, Esc fecha. No celular: botão 💬.
// - A mensagem aparece na lista e num balão em cima do personagem por alguns segundos.
// - Enquanto digita, as teclas não mexem o personagem.
// As mensagens não ficam guardadas: quem entra depois não vê as antigas.
(() => {
  const MAX = 200, BALAO_MS = 6000;
  const css = document.createElement('style');
  css.textContent = `
    .chat-bt { position: fixed; z-index: 25; top: 76px; left: 12px; width: 42px; height: 42px; border-radius: 50%; padding: 0; font-size: 19px;
      background: rgba(12, 10, 9, .65); border: 1px solid #a38b62; color: #fff; }
    .chat-bt .novo { position: absolute; top: -4px; right: -4px; min-width: 18px; height: 18px; border-radius: 9px; background: #b8323f; color: #fff;
      font: 700 11px/18px system-ui; text-align: center; padding: 0 4px; }
    .chat-bt .novo:empty { display: none; }
    .chat { position: fixed; z-index: 27; left: 12px; top: 126px; width: min(340px, calc(100vw - 24px)); display: flex; flex-direction: column;
      background: rgba(18, 14, 12, .88); border: 1px solid #a38b62; border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, .5); }
    .chat[hidden] { display: none; }
    .chat ol { list-style: none; margin: 0; padding: 8px 10px; max-height: min(38vh, 260px); overflow-y: auto; font-size: 14px; color: #f2e3c2; }
    .chat li { margin: 3px 0; overflow-wrap: anywhere; }
    .chat li b { color: #e3c37a; font-weight: 600; }
    .chat li.eu b { color: #9fd3a0; }
    .chat li.sis { color: #a99c84; font-style: italic; }
    .chat form { display: flex; gap: 6px; padding: 8px; border-top: 1px solid rgba(163, 139, 98, .4); }
    .chat input { flex: 1; min-width: 0; padding: 8px 10px; border-radius: 6px; border: 1px solid #a38b62; background: #1d1714; color: #fff; font: 14px system-ui; }
    .chat form button { padding: 8px 12px; }
    body.com-toque .chat { top: 126px; max-height: calc(100dvh - 300px); }`;
  document.head.appendChild(css);

  const bt = document.createElement('button');
  bt.type = 'button'; bt.className = 'chat-bt'; bt.title = 'Chat (Enter)'; bt.setAttribute('aria-label', 'Abrir o chat');
  bt.innerHTML = '💬<span class="novo"></span>';
  const caixa = document.createElement('div');
  caixa.className = 'chat'; caixa.hidden = true; caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-label', 'Chat');
  caixa.innerHTML = `<ol aria-live="polite"></ol>
    <form><input type="text" maxlength="${MAX}" placeholder="Escreva e aperte Enter…" aria-label="Mensagem" autocomplete="off" enterkeyhint="send"><button type="submit">Enviar</button></form>`;
  document.body.append(bt, caixa);
  const lista = caixa.querySelector('ol'), form = caixa.querySelector('form'), campo = caixa.querySelector('input'), novo = bt.querySelector('.novo');
  let naoLidas = 0, ultimoEnvio = 0;

  function adicionar(nome, texto, classe) {
    const li = document.createElement('li');
    if (classe) li.className = classe;
    if (nome) { const b = document.createElement('b'); b.textContent = nome + ': '; li.appendChild(b); }
    li.appendChild(document.createTextNode(texto));
    lista.appendChild(li);
    while (lista.children.length > 80) lista.firstChild.remove();
    lista.scrollTop = lista.scrollHeight;
  }

  function abrir() {
    caixa.hidden = false; naoLidas = 0; novo.textContent = '';
    try { for (const k in keys) keys[k] = false; } catch (e) { /* ignora */ } // para de andar
    campo.focus();
    lista.scrollTop = lista.scrollHeight;
  }
  function fechar() { caixa.hidden = true; campo.blur(); }

  bt.addEventListener('click', () => (caixa.hidden ? abrir() : fechar()));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const texto = campo.value.replace(/\s+/g, ' ').trim().slice(0, MAX);
    if (!texto) { fechar(); return; }
    const agora = performance.now();
    if (agora - ultimoEnvio < 400) return; // sem enxurrada
    ultimoEnvio = agora;
    if (!window.MapaOnline || !MapaOnline.mandar('chat', { texto })) { adicionar('', 'Sem conexão: a mensagem não foi enviada.', 'sis'); return; }
    adicionar('Você', texto, 'eu');
    MapaOnline.falas.set('eu', { texto, ate: agora + BALAO_MS });
    campo.value = '';
  });
  // digitando: as teclas ficam no campo (não andam, não interagem, não falam)
  ['keydown', 'keyup', 'keypress'].forEach((t) => campo.addEventListener(t, (e) => {
    e.stopPropagation();
    if (t === 'keydown' && e.key === 'Escape') { e.preventDefault(); fechar(); }
  }));
  // Enter fora do campo abre o chat
  addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && caixa.hidden && !e.repeat && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault(); abrir();
    }
  });

  addEventListener('mapa:chat', ({ detail: p }) => {
    const texto = String(p.texto || '').replace(/\s+/g, ' ').trim().slice(0, MAX);
    if (!texto) return;
    const nome = String(p.nome || 'Alguém').slice(0, 40);
    adicionar(nome, texto);
    MapaOnline.falas.set(p.id, { texto, ate: performance.now() + BALAO_MS });
    if (caixa.hidden) { naoLidas++; novo.textContent = naoLidas > 9 ? '9+' : String(naoLidas); }
  });
  addEventListener('mapa:conectado', () => adicionar('', 'Chat ligado. Enter para escrever · segure Z para falar.', 'sis'), { once: true });
})();

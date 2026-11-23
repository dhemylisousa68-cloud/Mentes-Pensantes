// Conexão com o Supabase (sala de espera online).
// A URL e a chave "publishable" são públicas por natureza: a segurança fica nas regras do banco
// (supabase/01-sala-de-espera.sql). Nunca coloque aqui a chave secreta.
window.UC = window.UC || {};

UC.Online = (() => {
  const URL = 'https://nfdizvsskgdpnznxyejf.supabase.co';
  const CHAVE = 'sb_publishable_Fp3px8I0KcPXpc3wR6AjPg_ceJ5zqNr';

  let sb = null;
  let usuario = null;

  const disponivel = () => !!(window.supabase && window.supabase.createClient);

  // Cada aparelho recebe um login anônimo (sem cadastro), guardado neste navegador.
  async function conectar() {
    if (!disponivel()) throw new Error('SEM_CONEXAO');
    if (!sb) sb = window.supabase.createClient(URL, CHAVE, { auth: { persistSession: true, autoRefreshToken: true } });
    let { data: { session } } = await sb.auth.getSession();
    if (!session) {
      const r = await sb.auth.signInAnonymously();
      if (r.error) throw r.error;
      session = r.data.session;
    }
    usuario = session.user.id;
    return usuario;
  }

  async function rpc(nome, args) {
    const { data, error } = await sb.rpc(nome, args);
    if (error) throw error;
    return data;
  }

  // Estado atual da sala: dados da sala e lista de jogadores (na ordem de entrada).
  async function estado(codigo) {
    const [s, j] = await Promise.all([
      sb.from('salas').select('codigo, max, anfitriao').eq('codigo', codigo).maybeSingle(),
      sb.from('jogadores').select('usuario, nome, personagem, unidade, pronto, teste, entrou_em').eq('sala', codigo).order('entrou_em'),
    ]);
    if (s.error) throw s.error;
    if (j.error) throw j.error;
    return { sala: s.data, jogadores: j.data || [] };
  }

  // Avisa a cada mudança nas tabelas (o site então busca o estado de novo).
  function ouvir(codigo, aoMudar) {
    const canal = sb.channel(`sala-${codigo}-${Math.random().toString(36).slice(2, 7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jogadores' }, aoMudar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'salas' }, aoMudar)
      .subscribe();
    return () => sb.removeChannel(canal);
  }

  // Traduz os erros do banco para mensagens para o jogador.
  function mensagem(erro) {
    const t = String(erro && (erro.message || erro) || '');
    if (t.includes('SALA_NAO_EXISTE')) return 'Não existe sala com esse código. Confira as letras e tente de novo.';
    if (t.includes('SALA_CHEIA')) return 'Essa sala já está cheia.';
    if (t.includes('EXPULSO')) return 'O anfitrião tirou você desta sala.';
    if (t.includes('NAO_SE_REMOVE')) return 'Para sair, use "Sair para o Mentes Pensantes".';
    if (t.includes('remover_jogador')) return 'Falta rodar o arquivo supabase/03-remover-jogador.sql no Supabase.';
    if (t.includes('OCUPADO')) return 'Alguém acabou de escolher esse personagem.';
    if (t.includes('SO_ANFITRIAO')) return 'Só o anfitrião (♛) pode fazer isso.';
    if (t.includes('SEM_CONEXAO') || t.includes('Failed to fetch')) return 'Sem conexão com o servidor. Verifique a internet e recarregue a página.';
    if (t.toLowerCase().includes('anonymous')) return 'O login anônimo está desligado no Supabase (Authentication → Sign In / Providers).';
    return 'Algo deu errado: ' + t;
  }

  return { disponivel, conectar, rpc, estado, ouvir, mensagem, get usuario() { return usuario; } };
})();

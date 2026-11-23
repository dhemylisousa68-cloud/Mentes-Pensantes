-- =====================================================================
-- Mentes Pensantes · Última Ceia · ANFITRIÃO TIRA JOGADOR DA SALA
-- Cole no Supabase → SQL Editor → Run (depois dos arquivos 01 e 02).
-- Quem for tirado não consegue voltar para a mesma sala.
-- =====================================================================

create table if not exists public.expulsos (
  sala     text not null references public.salas(codigo) on delete cascade,
  usuario  uuid not null,
  primary key (sala, usuario)
);
alter table public.expulsos enable row level security;   -- sem regras de leitura: só as funções mexem aqui
revoke all on public.expulsos from anon, authenticated;

-- Entrar na sala agora recusa quem foi tirado pelo anfitrião.
create or replace function public.entrar_sala(p_codigo text, p_nome text)
returns text language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(p_codigo)); mx int;
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN'; end if;
  perform public._limpar_inativos(c);
  select s.max into mx from salas s where codigo = c for update;
  if mx is null then raise exception 'SALA_NAO_EXISTE'; end if;
  if exists (select 1 from expulsos where sala = c and usuario = auth.uid()) then raise exception 'EXPULSO'; end if;
  if exists (select 1 from jogadores where sala = c and usuario = auth.uid()) then
    update jogadores set nome = left(trim(p_nome), 24), visto_em = now()
    where sala = c and usuario = auth.uid();
    return c;
  end if;
  if (select count(*) from jogadores where sala = c) >= mx then raise exception 'SALA_CHEIA'; end if;
  insert into jogadores (sala, usuario, nome) values (c, auth.uid(), left(trim(p_nome), 24));
  return c;
end $$;

-- Só o anfitrião tira alguém (e não pode tirar a si mesmo). Jogadores de teste saem sem bloqueio.
create or replace function public.remover_jogador(p_codigo text, p_usuario uuid)
returns void language plpgsql security definer set search_path = public as $$
declare era_teste boolean;
begin
  perform public._exigir_membro(p_codigo);
  if not exists (select 1 from salas where codigo = p_codigo and anfitriao = auth.uid()) then
    raise exception 'SO_ANFITRIAO';
  end if;
  if p_usuario = auth.uid() then raise exception 'NAO_SE_REMOVE'; end if;
  delete from jogadores where sala = p_codigo and usuario = p_usuario returning teste into era_teste;
  if era_teste is false then
    insert into expulsos (sala, usuario) values (p_codigo, p_usuario) on conflict do nothing;
  end if;
end $$;

revoke all on function public.remover_jogador(text, uuid) from public, anon;
grant execute on function public.remover_jogador(text, uuid) to authenticated;
revoke all on function public.entrar_sala(text, text) from public, anon;
grant execute on function public.entrar_sala(text, text) to authenticated;

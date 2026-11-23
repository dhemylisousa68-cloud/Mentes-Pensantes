-- =====================================================================
-- Mentes Pensantes · Última Ceia · SALA DE ESPERA ONLINE
-- Cole tudo no Supabase → SQL Editor → Run. Pode rodar de novo sem problema.
--
-- Segurança:
--  - Ninguém escreve direto nas tabelas: tudo passa pelas funções abaixo,
--    que conferem quem é o jogador (login anônimo) e as regras da sala.
--  - Cada jogador só enxerga as salas em que está.
--  - Aqui NÃO há cartas nem soluções do caso (isso vem numa etapa separada).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- tabelas ----------
create table if not exists public.salas (
  codigo     text primary key,
  caso       text not null default 'ultima-ceia',
  max        int  not null check (max between 5 and 10),
  anfitriao  uuid not null,
  criada_em  timestamptz not null default now()
);

create table if not exists public.jogadores (
  sala        text not null references public.salas(codigo) on delete cascade,
  usuario     uuid not null,
  nome        text not null check (char_length(nome) between 1 and 24),
  personagem  text,
  unidade     text,
  pronto      boolean not null default false,
  teste       boolean not null default false,
  entrou_em   timestamptz not null default now(),
  visto_em    timestamptz not null default now(),
  primary key (sala, usuario),
  unique (sala, unidade)          -- dois jogadores nunca ficam com o mesmo personagem/dupla
);

-- ---------- regra das duplas (igual a UC.unidadeDe no site) ----------
-- Com N jogadores, as primeiras (N - 5) duplas são desfeitas.
create or replace function public.unidade_de(p text, mx int)
returns text language sql immutable as $$
  select case when v.i <= mx - 5 then p else v.a || '+' || v.b end
  from (values (1,'alice','isadora'), (2,'bruno','lucas'), (3,'cecilia','maya'),
               (4,'diego','nicolas'), (5,'eva','felipe')) as v(i, a, b)
  where p in (v.a, v.b)
$$;

-- ---------- quem pode ver o quê ----------
create or replace function public.eh_membro(c text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from jogadores where sala = c and usuario = auth.uid())
$$;

alter table public.salas     enable row level security;
alter table public.jogadores enable row level security;

drop policy if exists "ver sala" on public.salas;
create policy "ver sala" on public.salas for select to authenticated using (public.eh_membro(codigo));

drop policy if exists "ver jogadores" on public.jogadores;
create policy "ver jogadores" on public.jogadores for select to authenticated using (public.eh_membro(sala));

-- ---------- ajudantes internos ----------
-- Se o anfitrião saiu, passa a coroa para quem entrou primeiro; se não sobrou ninguém, apaga a sala.
create or replace function public._ajustar_sala(c text)
returns void language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if not exists (select 1 from jogadores where sala = c and not teste) then
    delete from salas where codigo = c;
    return;
  end if;
  if not exists (select 1 from jogadores j join salas s on s.codigo = j.sala
                 where j.sala = c and j.usuario = s.anfitriao) then
    select usuario into novo from jogadores where sala = c and not teste order by entrou_em limit 1;
    update salas set anfitriao = novo where codigo = c;
  end if;
end $$;

-- Tira quem fechou a aba há mais de 2 minutos.
create or replace function public._limpar_inativos(c text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from jogadores where sala = c and not teste and visto_em < now() - interval '2 minutes';
  perform public._ajustar_sala(c);
end $$;

create or replace function public._exigir_membro(c text)
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN'; end if;
  if not exists (select 1 from jogadores where sala = c and usuario = auth.uid()) then
    raise exception 'FORA_DA_SALA';
  end if;
end $$;

-- ---------- ações do jogo ----------
create or replace function public.criar_sala(p_nome text, p_max int)
returns text language plpgsql security definer set search_path = public as $$
declare
  c text;
  alfabeto text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN'; end if;
  if p_max not between 5 and 10 then raise exception 'MAX_INVALIDO'; end if;
  loop
    c := '';
    for i in 1..5 loop
      c := c || substr(alfabeto, 1 + floor(random() * length(alfabeto))::int, 1);
    end loop;
    exit when not exists (select 1 from salas where codigo = c);
  end loop;
  insert into salas (codigo, max, anfitriao) values (c, p_max, auth.uid());
  insert into jogadores (sala, usuario, nome) values (c, auth.uid(), left(trim(p_nome), 24));
  return c;
end $$;

create or replace function public.entrar_sala(p_codigo text, p_nome text)
returns text language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(p_codigo)); mx int;
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN'; end if;
  perform public._limpar_inativos(c);
  select s.max into mx from salas s where codigo = c for update;
  if mx is null then raise exception 'SALA_NAO_EXISTE'; end if;
  if exists (select 1 from jogadores where sala = c and usuario = auth.uid()) then
    update jogadores set nome = left(trim(p_nome), 24), visto_em = now()
    where sala = c and usuario = auth.uid();
    return c;
  end if;
  if (select count(*) from jogadores where sala = c) >= mx then raise exception 'SALA_CHEIA'; end if;
  insert into jogadores (sala, usuario, nome) values (c, auth.uid(), left(trim(p_nome), 24));
  return c;
end $$;

create or replace function public.escolher_personagem(p_codigo text, p_personagem text)
returns text language plpgsql security definer set search_path = public as $$
declare mx int; u text;
begin
  perform public._exigir_membro(p_codigo);
  select s.max into mx from salas s where codigo = p_codigo;
  u := public.unidade_de(p_personagem, mx);
  if u is null then raise exception 'PERSONAGEM_INVALIDO'; end if;
  if exists (select 1 from jogadores where sala = p_codigo and unidade = u and usuario <> auth.uid()) then
    raise exception 'OCUPADO';
  end if;
  begin
    update jogadores set personagem = p_personagem, unidade = u, pronto = false, visto_em = now()
    where sala = p_codigo and usuario = auth.uid();
  exception when unique_violation then
    raise exception 'OCUPADO';
  end;
  return u;
end $$;

create or replace function public.marcar_pronto(p_codigo text, p_pronto boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_membro(p_codigo);
  update jogadores set pronto = p_pronto and personagem is not null, visto_em = now()
  where sala = p_codigo and usuario = auth.uid();
end $$;

-- Chamado a cada ~20 s pelo site: avisa que o jogador continua na sala.
create or replace function public.estou_aqui(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update jogadores set visto_em = now() where sala = p_codigo and usuario = auth.uid();
  perform public._limpar_inativos(p_codigo);
end $$;

create or replace function public.sair_sala(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from jogadores where sala = p_codigo and usuario = auth.uid();
  perform public._ajustar_sala(p_codigo);
end $$;

-- Jogadores de teste (só o anfitrião): para testar a sala cheia com poucas pessoas.
create or replace function public.adicionar_teste(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
declare mx int; n int; u text;
begin
  perform public._exigir_membro(p_codigo);
  select s.max into mx from salas s where codigo = p_codigo and anfitriao = auth.uid();
  if mx is null then raise exception 'SO_ANFITRIAO'; end if;
  select count(*) into n from jogadores where sala = p_codigo;
  if n >= mx then raise exception 'SALA_CHEIA'; end if;
  select x.u into u
  from (select distinct public.unidade_de(p, mx) as u
        from unnest(array['alice','bruno','cecilia','diego','eva','felipe','isadora','lucas','maya','nicolas']) as p) x
  where x.u not in (select unidade from jogadores where sala = p_codigo and unidade is not null)
  order by random() limit 1;
  insert into jogadores (sala, usuario, nome, personagem, unidade, pronto, teste)
  values (p_codigo, gen_random_uuid(), 'Teste ' || (n + 1), split_part(u, '+', 1), u, u is not null, true);
end $$;

create or replace function public.remover_testes(p_codigo text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._exigir_membro(p_codigo);
  if not exists (select 1 from salas where codigo = p_codigo and anfitriao = auth.uid()) then
    raise exception 'SO_ANFITRIAO';
  end if;
  delete from jogadores where sala = p_codigo and teste;
end $$;

-- ---------- permissões ----------
revoke all on function public._ajustar_sala(text), public._limpar_inativos(text), public._exigir_membro(text)
  from public, anon, authenticated;
revoke all on function public.criar_sala(text, int), public.entrar_sala(text, text),
  public.escolher_personagem(text, text), public.marcar_pronto(text, boolean), public.estou_aqui(text),
  public.sair_sala(text), public.adicionar_teste(text), public.remover_testes(text)
  from public, anon;
grant execute on function public.criar_sala(text, int), public.entrar_sala(text, text),
  public.escolher_personagem(text, text), public.marcar_pronto(text, boolean), public.estou_aqui(text),
  public.sair_sala(text), public.adicionar_teste(text), public.remover_testes(text)
  to authenticated;

-- leitura das tabelas (as regras acima limitam cada jogador à própria sala; ninguém escreve direto)
grant usage on schema public to authenticated;
grant select on public.salas, public.jogadores to authenticated;
revoke insert, update, delete on public.salas, public.jogadores from anon, authenticated;

-- ---------- tempo real ----------
do $$
begin
  begin alter publication supabase_realtime add table public.jogadores; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.salas;     exception when duplicate_object then null; end;
end $$;

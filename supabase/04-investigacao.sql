-- =====================================================================
-- Mentes Pensantes · Última Ceia · INVESTIGAÇÃO (dias, pistas, diário, salvamento)
-- Cole no Supabase → SQL Editor → Run (depois dos arquivos 01, 02 e 03). Pode rodar de novo.
--
-- Este arquivo é público e NÃO tem nenhum texto do caso: só a estrutura e as regras.
-- O conteúdo (pistas, enigmas e respostas) fica em um arquivo privado, fora do GitHub,
-- que também é colado aqui no SQL Editor (pasta "segredos", que o Git ignora).
--
-- Segurança:
--  - As tabelas de conteúdo (uc_objetos, uc_enigmas, uc_dias) não podem ser lidas por ninguém:
--    o site só recebe o texto de uma pista quando alguém da sala a encontra.
--  - As respostas dos enigmas são conferidas aqui no servidor (nunca vão para o site).
--  - Cada sala só vê o próprio progresso. Ninguém escreve direto nas tabelas.
--  - Os nomes das "marcas" de progresso (flags) são visíveis para a sala: use nomes neutros.
-- =====================================================================

-- ---------- conteúdo do caso (secreto) ----------
create table if not exists public.uc_objetos (
  id         text primary key,
  dia        int  not null default 1,
  tipo       text not null default 'documento' check (tipo in ('documento', 'objeto', 'narrativa', 'enigma', 'acao')),
  pista      text,                                 -- 'P01'… (null = achado comum)
  titulo     text not null,
  resumo     text not null default '',
  ampliado   text not null default '',
  requer     text[] not null default '{}',         -- marcas necessárias para examinar
  da_flags   text[] not null default '{}',         -- marcas ganhas ao examinar
  bloqueado  text not null default 'Ainda não dá para fazer nada aqui.',
  no_diario  boolean not null default true,
  enigma     text,                                 -- para tipo = 'enigma'
  ja_feito   text                                  -- texto depois que o enigma foi resolvido
);

create table if not exists public.uc_enigmas (
  id         text primary key,
  dia        int  not null default 1,
  resposta   text not null,
  requer     text[] not null default '{}',
  da_flags   text[] not null default '{}',
  objeto_ok  text,                                 -- objeto que entra no diário ao acertar
  texto_ok   text not null,
  texto_erro text not null default 'Não funcionou.'
);

create table if not exists public.uc_dias (
  dia            int primary key,
  titulo         text not null,
  objetivo       text not null,
  requer         text[] not null default '{}',     -- para encerrar o dia
  min_hipoteses  int  not null default 0,
  fechamento     text not null,
  gancho         text not null default ''
);

-- ---------- progresso de cada sala ----------
create table if not exists public.uc_partidas (
  sala           text primary key references public.salas(codigo) on delete cascade,
  dia            int  not null default 1,
  flags          text[] not null default '{}',
  eventos        jsonb not null default '{}'::jsonb,
  dia_concluido  int  not null default 0,
  criada_em      timestamptz not null default now(),
  atualizada_em  timestamptz not null default now()
);

create table if not exists public.uc_achados (
  sala      text not null references public.salas(codigo) on delete cascade,
  objeto    text not null,
  por       uuid,
  por_nome  text,
  dia       int,
  em        timestamptz not null default now(),
  primary key (sala, objeto)
);

create table if not exists public.uc_hipoteses (
  id         bigint generated always as identity primary key,
  sala       text not null references public.salas(codigo) on delete cascade,
  autor      uuid not null,
  nome       text not null,
  dia        int  not null,
  texto      text not null check (char_length(texto) between 3 and 400),
  criada_em  timestamptz not null default now()
);

create table if not exists public.uc_salvamentos (
  sala      text not null references public.salas(codigo) on delete cascade,
  dia       int  not null,
  salvo_em  timestamptz not null default now(),
  resumo    jsonb not null,
  primary key (sala, dia)
);

create table if not exists public.uc_tentativas (
  sala  text not null,
  em    timestamptz not null default now()
);
create index if not exists uc_tentativas_sala on public.uc_tentativas (sala, em);

-- ---------- quem vê o quê ----------
alter table public.uc_objetos     enable row level security;
alter table public.uc_enigmas     enable row level security;
alter table public.uc_dias        enable row level security;
alter table public.uc_partidas    enable row level security;
alter table public.uc_achados     enable row level security;
alter table public.uc_hipoteses   enable row level security;
alter table public.uc_salvamentos enable row level security;
alter table public.uc_tentativas  enable row level security;

-- conteúdo e tentativas: nenhuma regra de leitura (só as funções abaixo usam)
revoke all on public.uc_objetos, public.uc_enigmas, public.uc_dias, public.uc_tentativas from anon, authenticated;

drop policy if exists "ver partida" on public.uc_partidas;
create policy "ver partida" on public.uc_partidas for select to authenticated using (public.eh_membro(sala));
drop policy if exists "ver achados" on public.uc_achados;
create policy "ver achados" on public.uc_achados for select to authenticated using (public.eh_membro(sala));
drop policy if exists "ver hipoteses" on public.uc_hipoteses;
create policy "ver hipoteses" on public.uc_hipoteses for select to authenticated using (public.eh_membro(sala));
drop policy if exists "ver salvamentos" on public.uc_salvamentos;
create policy "ver salvamentos" on public.uc_salvamentos for select to authenticated using (public.eh_membro(sala));

grant select on public.uc_partidas, public.uc_achados, public.uc_hipoteses, public.uc_salvamentos to authenticated;
revoke insert, update, delete on public.uc_partidas, public.uc_achados, public.uc_hipoteses, public.uc_salvamentos from anon, authenticated;

-- ---------- a sala não some entre um dia e outro ----------
-- Antes, a sala era apagada quando todos saíam. Com uma investigação em andamento, ela fica guardada
-- (mesmo código no dia seguinte) e a coroa passa para quem entrar primeiro.
create or replace function public._ajustar_sala(c text)
returns void language plpgsql security definer set search_path = public as $$
declare novo uuid;
begin
  if not exists (select 1 from jogadores where sala = c and not teste) then
    if exists (select 1 from uc_partidas where sala = c) then return; end if;
    delete from salas where codigo = c;
    return;
  end if;
  if not exists (select 1 from jogadores j join salas s on s.codigo = j.sala
                 where j.sala = c and j.usuario = s.anfitriao) then
    select usuario into novo from jogadores where sala = c and not teste order by entrou_em limit 1;
    update salas set anfitriao = novo where codigo = c;
  end if;
end $$;

-- ---------- ajudantes ----------
create or replace function public._uc_partida(c text)
returns public.uc_partidas language plpgsql security definer set search_path = public as $$
declare p uc_partidas;
begin
  insert into uc_partidas (sala) values (c) on conflict (sala) do nothing;
  select * into p from uc_partidas where sala = c for update;
  return p;
end $$;

create or replace function public._uc_norm(t text)
returns text language sql immutable as $$
  select upper(regexp_replace(translate(coalesce(t, ''),
    'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'), '[^A-Za-z0-9]', '', 'g'))
$$;

create or replace function public._uc_nome(c text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nome from jogadores where sala = c and usuario = auth.uid()), 'Alguém')
$$;

create or replace function public._uc_add_flags(c text, novas text[])
returns text[] language plpgsql security definer set search_path = public as $$
declare f text[];
begin
  update uc_partidas set flags = array(select distinct x from unnest(flags || novas) x order by x), atualizada_em = now()
  where sala = c returning flags into f;
  return f;
end $$;

-- ---------- ações ----------
-- Estado da investigação: dia, marcas, eventos e o diário (só o que a sala já encontrou).
create or replace function public.uc_estado(p_sala text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p uc_partidas; d uc_dias; r jsonb;
begin
  perform public._exigir_membro(p_sala);
  p := public._uc_partida(p_sala);
  select * into d from uc_dias where dia = p.dia;
  r := jsonb_build_object(
    'dia', p.dia, 'flags', to_jsonb(p.flags), 'eventos', p.eventos, 'dia_concluido', p.dia_concluido, 'agora', now(),
    'titulo', d.titulo, 'objetivo', d.objetivo,
    'anfitriao', (select anfitriao = auth.uid() from salas where codigo = p_sala),
    'achados', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'tipo', o.tipo, 'pista', o.pista, 'titulo', o.titulo,
                  'resumo', o.resumo, 'ampliado', o.ampliado, 'por', a.por_nome, 'em', a.em, 'dia', a.dia) order by a.em), '[]'::jsonb)
                from uc_achados a join uc_objetos o on o.id = a.objeto where a.sala = p_sala and o.no_diario),
    'vistos', (select coalesce(jsonb_agg(objeto), '[]'::jsonb) from uc_achados where sala = p_sala),
    'hipoteses', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'nome', h.nome, 'texto', h.texto, 'dia', h.dia, 'em', h.criada_em)
                  order by h.criada_em), '[]'::jsonb) from uc_hipoteses h where h.sala = p_sala)
  );
  if p.dia_concluido >= p.dia and d.dia is not null then
    r := r || jsonb_build_object('fechamento', d.fechamento, 'gancho', d.gancho);
  end if;
  return r;
end $$;

-- Examinar um ponto da casa. Devolve o texto só se as condições estão cumpridas.
create or replace function public.uc_examinar(p_sala text, p_objeto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p uc_partidas; o uc_objetos; e uc_enigmas; novo int; f text[];
begin
  perform public._exigir_membro(p_sala);
  p := public._uc_partida(p_sala);
  select * into o from uc_objetos where id = p_objeto;
  if o.id is null or o.dia > p.dia then return jsonb_build_object('ok', false, 'texto', 'Nada de especial aqui.'); end if;
  if not (o.requer <@ p.flags) then return jsonb_build_object('ok', false, 'texto', o.bloqueado); end if;
  if o.tipo = 'enigma' then
    select * into e from uc_enigmas where id = o.enigma;
    if e.id is not null and e.da_flags <@ p.flags then
      return jsonb_build_object('ok', true, 'tipo', 'objeto', 'titulo', o.titulo, 'ampliado', coalesce(o.ja_feito, 'Já foi resolvido.'));
    end if;
    return jsonb_build_object('ok', true, 'tipo', 'enigma', 'enigma', o.enigma, 'titulo', o.titulo, 'ampliado', o.ampliado);
  end if;
  insert into uc_achados (sala, objeto, por, por_nome, dia)
  values (p_sala, o.id, auth.uid(), public._uc_nome(p_sala), p.dia) on conflict do nothing;
  get diagnostics novo = row_count;
  f := public._uc_add_flags(p_sala, o.da_flags);
  return jsonb_build_object('ok', true, 'novo', novo > 0, 'id', o.id, 'tipo', o.tipo, 'pista', o.pista, 'titulo', o.titulo,
    'resumo', o.resumo, 'ampliado', o.ampliado, 'no_diario', o.no_diario, 'flags', to_jsonb(f));
end $$;

-- Responder um enigma (a resposta certa nunca sai do servidor). Limite de 20 tentativas por minuto por sala.
create or replace function public.uc_resolver(p_sala text, p_enigma text, p_resposta text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p uc_partidas; e uc_enigmas; f text[];
begin
  perform public._exigir_membro(p_sala);
  p := public._uc_partida(p_sala);
  select * into e from uc_enigmas where id = p_enigma;
  if e.id is null or e.dia > p.dia then return jsonb_build_object('ok', false, 'texto', 'Nada acontece.'); end if;
  if not (e.requer <@ p.flags) then return jsonb_build_object('ok', false, 'texto', 'Ainda falta algo para tentar isso.'); end if;
  if e.da_flags <@ p.flags then return jsonb_build_object('ok', true, 'texto', e.texto_ok, 'flags', to_jsonb(p.flags)); end if;
  delete from uc_tentativas where em < now() - interval '10 minutes';
  if (select count(*) from uc_tentativas where sala = p_sala and em > now() - interval '1 minute') >= 20 then
    return jsonb_build_object('ok', false, 'texto', 'Muitas tentativas seguidas. Esperem um pouco e pensem juntos.');
  end if;
  insert into uc_tentativas (sala) values (p_sala);
  if public._uc_norm(p_resposta) <> public._uc_norm(e.resposta) then
    return jsonb_build_object('ok', false, 'texto', e.texto_erro);
  end if;
  f := public._uc_add_flags(p_sala, e.da_flags);
  if e.objeto_ok is not null then
    insert into uc_achados (sala, objeto, por, por_nome, dia)
    values (p_sala, e.objeto_ok, auth.uid(), public._uc_nome(p_sala), p.dia) on conflict do nothing;
  end if;
  return jsonb_build_object('ok', true, 'texto', e.texto_ok, 'flags', to_jsonb(f));
end $$;

create or replace function public.uc_hipotese(p_sala text, p_texto text)
returns void language plpgsql security definer set search_path = public as $$
declare p uc_partidas;
begin
  perform public._exigir_membro(p_sala);
  p := public._uc_partida(p_sala);
  insert into uc_hipoteses (sala, autor, nome, dia, texto) values (p_sala, auth.uid(), public._uc_nome(p_sala), p.dia, left(trim(p_texto), 400));
end $$;

-- Eventos da noite (ex.: alguém entrou no salão). Só registra a primeira vez; devolve todos os eventos.
create or replace function public.uc_evento(p_sala text, p_evento text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p uc_partidas; ev jsonb;
begin
  perform public._exigir_membro(p_sala);
  if p_evento !~ '^[a-z0-9_]{1,30}$' then raise exception 'EVENTO_INVALIDO'; end if;
  p := public._uc_partida(p_sala);
  update uc_partidas set eventos = case when eventos ? (p.dia || ':' || p_evento) then eventos
                                        else eventos || jsonb_build_object(p.dia || ':' || p_evento, now()) end
  where sala = p_sala returning eventos into ev;
  return jsonb_build_object('eventos', ev, 'agora', now());
end $$;

-- Encerrar o dia (anfitrião): confere se o essencial foi encontrado e salva um resumo do dia.
create or replace function public.uc_concluir_dia(p_sala text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p uc_partidas; d uc_dias; n int;
begin
  perform public._exigir_membro(p_sala);
  if not exists (select 1 from salas where codigo = p_sala and anfitriao = auth.uid()) then raise exception 'SO_ANFITRIAO'; end if;
  p := public._uc_partida(p_sala);
  select * into d from uc_dias where dia = p.dia;
  if d.dia is null then return jsonb_build_object('ok', false, 'texto', 'Este dia ainda não está pronto.'); end if;
  select count(*) into n from uc_hipoteses where sala = p_sala and dia = p.dia;
  if not (d.requer <@ p.flags) then return jsonb_build_object('ok', false, 'texto', 'Ainda há algo importante para investigar hoje.'); end if;
  if n < d.min_hipoteses then
    return jsonb_build_object('ok', false, 'texto', format('Antes de encerrar, escrevam pelo menos %s hipóteses no diário.', d.min_hipoteses));
  end if;
  insert into uc_salvamentos (sala, dia, resumo) values (p_sala, p.dia, jsonb_build_object(
    'flags', to_jsonb(p.flags),
    'achados', (select coalesce(jsonb_agg(objeto), '[]'::jsonb) from uc_achados where sala = p_sala),
    'hipoteses', (select coalesce(jsonb_agg(jsonb_build_object('nome', nome, 'texto', texto)), '[]'::jsonb) from uc_hipoteses where sala = p_sala and dia = p.dia),
    'presentes', (select coalesce(jsonb_agg(nome), '[]'::jsonb) from jogadores where sala = p_sala and not teste)))
  on conflict (sala, dia) do update set resumo = excluded.resumo, salvo_em = now();
  update uc_partidas set dia_concluido = greatest(dia_concluido, p.dia), atualizada_em = now() where sala = p_sala;
  return jsonb_build_object('ok', true, 'fechamento', d.fechamento, 'gancho', d.gancho);
end $$;

-- Começar o próximo dia (anfitrião), quando o anterior foi encerrado e o conteúdo do novo dia existe.
create or replace function public.uc_iniciar_dia(p_sala text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare p uc_partidas;
begin
  perform public._exigir_membro(p_sala);
  if not exists (select 1 from salas where codigo = p_sala and anfitriao = auth.uid()) then raise exception 'SO_ANFITRIAO'; end if;
  p := public._uc_partida(p_sala);
  if p.dia_concluido < p.dia then return jsonb_build_object('ok', false, 'texto', 'Encerrem o dia atual primeiro.'); end if;
  if not exists (select 1 from uc_dias where dia = p.dia + 1) then return jsonb_build_object('ok', false, 'texto', 'O próximo dia ainda não está pronto.'); end if;
  update uc_partidas set dia = dia + 1, atualizada_em = now() where sala = p_sala;
  return jsonb_build_object('ok', true, 'dia', p.dia + 1);
end $$;

-- ---------- permissões ----------
revoke all on function public._uc_partida(text), public._uc_add_flags(text, text[]), public._uc_nome(text)
  from public, anon, authenticated;
revoke all on function public.uc_estado(text), public.uc_examinar(text, text), public.uc_resolver(text, text, text),
  public.uc_hipotese(text, text), public.uc_evento(text, text), public.uc_concluir_dia(text), public.uc_iniciar_dia(text)
  from public, anon;
grant execute on function public.uc_estado(text), public.uc_examinar(text, text), public.uc_resolver(text, text, text),
  public.uc_hipotese(text, text), public.uc_evento(text, text), public.uc_concluir_dia(text), public.uc_iniciar_dia(text)
  to authenticated;

-- ---------- tempo real ----------
do $$
begin
  begin alter publication supabase_realtime add table public.uc_partidas;  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.uc_achados;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.uc_hipoteses; exception when duplicate_object then null; end;
end $$;

-- recarrega a lista de tabelas e funções do Supabase (para o site enxergar na hora)
notify pgrst, 'reload schema';

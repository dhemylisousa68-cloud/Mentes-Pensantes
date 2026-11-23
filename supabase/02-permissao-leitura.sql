-- Correção: libera a LEITURA das tabelas para jogadores logados.
-- As regras de segurança (RLS) continuam limitando cada jogador à própria sala,
-- e ninguém consegue escrever direto nas tabelas (só pelas funções do jogo).
grant usage on schema public to authenticated;
grant select on public.salas, public.jogadores to authenticated;
revoke insert, update, delete on public.salas, public.jogadores from anon, authenticated;

# Mentes Pensantes

Jogos para pensar em grupo, direto no navegador.

## Abas e jogos

| Aba | Jogo | Situação |
| --- | --- | --- |
| Detetive | **Última Ceia**: mistério cooperativo de Natal, de 5 a 10 jogadores, 40 minutos | Tela de entrada pronta |

## Estrutura

```
index.html                  → tela inicial do Mentes Pensantes (abas)
css/hub.css, js/hub.js      → estilo e catálogo de abas/jogos
detetive/ultima-ceia/       → jogo Última Ceia
servidor-local.ps1          → servidor para testar no computador
```

Para adicionar um jogo ou uma aba, edite a lista `ABAS` em `js/hub.js`.

## Testar no computador

No PowerShell, dentro desta pasta:

```powershell
powershell -ExecutionPolicy Bypass -File servidor-local.ps1
```

Depois abra http://localhost:8080.

## Publicação

O site é publicado pelo GitHub Pages a partir da branch `main` (pasta raiz).

## Segredos

Este repositório é público. Cartas privadas, soluções e o roteiro completo **não** entram aqui:
ficam no Supabase ou na pasta `segredos/`, que é ignorada pelo git.

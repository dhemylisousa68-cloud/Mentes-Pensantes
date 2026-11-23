# Mentes Pensantes

Jogos para pensar em grupo, direto no navegador.

## Abas e jogos

| Aba | Jogo | Situação |
| --- | --- | --- |
| Detetive | **Última Ceia**: mistério cooperativo de Natal, de 5 a 10 jogadores, 40 minutos | Tela de entrada pronta |

## Estrutura

```
index.html              → portão, intro e tela principal (escolha do caso)
js/hub.js               → fluxo da intro e da tela principal + catálogo CASOS
js/mascote.js           → mascote em vetor (olhos, piscadela, roupas, risada, faca)
js/som-hub.js           → música e efeitos da intro e da tela principal
js/ajustes.js           → configurações compartilhadas (volume, movimento, texto)
css/hub.css, css/mascote.css
assets/                 → logo e quadro de referência (fotos do quadro e capa do caso)
detetive/ultima-ceia/   → jogo Última Ceia
servidor-local.ps1      → servidor para testar no computador
```

Para adicionar um caso, inclua um objeto na lista `CASOS` em `js/hub.js`
(o campo `roupa` define a roupa que o mascote veste ao selecionar).

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

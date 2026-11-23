# Mentes Pensantes

Jogos para pensar em grupo, direto no navegador.

## Abas e jogos

| Aba | Jogo | Situação |
| --- | --- | --- |
| Detetive | **Última Ceia**: mistério cooperativo de Natal, de 5 a 10 jogadores, 40 minutos | Tela de entrada pronta |

## Estrutura

```
index.html              → portão, abertura e tela principal na frente da mansão
js/hub.js               → câmera, abertura, escolha do caso + catálogo CASOS
js/mascote-rig.js       → mascote articulado a partir da arte original
js/neve.js              → neve em três camadas
js/som-hub.js           → música, vento e efeitos
js/ajustes.js           → configurações compartilhadas (volume, movimento, texto)
css/hub.css
assets/cena/            → camadas do cenário (veja docs/cena-e-mascote.md)
assets/mascote/         → arte do mascote
detetive/ultima-ceia/   → jogo Última Ceia
servidor-local.ps1      → servidor para testar no computador
```

Para adicionar um caso, inclua um objeto na lista `CASOS` em `js/hub.js`
e a placa correspondente no cenário.

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

# Última Ceia · tela de entrada

## Camadas (coordenadas da arte, 1024 × 572)

| Camada | Arquivo / elemento | O que faz |
| --- | --- | --- |
| Cenário | `assets/sala.jpg` | ilustração sem textos e sem as chamas (viram camadas) |
| Neve | `#neve-janela` (canvas) | flocos só dentro do vidro, com corrente de ar |
| Grade da janela | `assets/janela-grade.png` | caixilhos por cima da neve |
| Porta | `#porta` (`.porta-vao` + `assets/porta-folha.png`) | folha gira na dobradiça; vão e piso se iluminam |
| Velas | `#velas` (montadas em `js/cena.js`) | halo, chama, fumaça e sombra local |
| Penumbra e olhos | `.penumbra`, `.olhos-vermelhos` | escurecem a sala e acendem os olhos por cima da arte |
| Interface | `#entrada` (HTML) | título, status, botões, configurações e aviso de som |

## Porta (`UC.Porta`)

`fechada → abrindo → aberta`, com o motivo:

- `abrir('escolha')`: clique em "Abrir a porta" (ou Criar / Entrar). Leva à escolha de personagem.
- `abrir('todos-prontos')`: quando todos estão na sala, com personagem e prontos.
  A sala chama `UC.Entrada.todosProntos()`; para ligar ao servidor, chame o mesmo método
  quando o estado da sala mudar.

`abrir()` devolve uma promessa e é idempotente durante a animação; `concluir()` termina na hora
(cliques rápidos ou "Pular" nunca travam). O evento `uc:porta` avisa cada mudança.

## Ciclo das velas (`UC.Velas`)

A cada ~6 s (entre 5 e 7 s): uma a três velas enfraquecem → apagam (fumaça, penumbra) → os olhos do mascote
brilham em vermelho → as velas reacendem com um clarão suave. Pausa durante a porta, com
configurações ou formulários abertos, logo após cliques e com a aba oculta. Desligado com movimento
reduzido.

# Cena da mansão e mascote

## Como a tela é montada

Tudo fica em coordenadas da arte (1672 × 941). A câmera move a cena inteira.

| Camada | Arquivo | Movimento |
| --- | --- | --- |
| Fundo limpo (sem mascote, sem textos) | `assets/cena/fundo.jpg` | parado; luzes, janelas, lua e porta respiram por cima |
| Placa "Mentes Pensantes" | `assets/cena/placa-logo.png` | balança pelas correntes; desce na abertura |
| Tábuas dos botões (sem letras) | `assets/cena/tabua-1.png`, `tabua-2.png` | texto real por cima |
| Placa do caso | `assets/cena/placa-caso.png` | balança de leve; luzinhas ao passar o mouse |
| Ícones de som e configurações | `assets/cena/icone-*.png` | botões reais |
| Mascote | `assets/mascote/natal.webp` (o PNG original, sem alteração) | rig por articulações |
| Neve | `js/neve.js` | três camadas de profundidade, em canvas |

O fundo limpo foi gerado a partir da ilustração: o mascote, os textos e as placas foram
retirados e o espaço foi preenchido com a textura ao redor. Se houver uma versão da
ilustração **sem** mascote e **sem** placas, basta trocar `assets/cena/fundo.jpg`.

## Mascote articulado (`js/mascote-rig.js`)

A animação não usa quadros. A mesma imagem é recortada em peças por polígonos:

- **cabeça + gorro**, girando no pescoço (506, 530);
- **braço com o envelope**, girando e se aproximando da câmera a partir do punho (325, 640);
- **pompom**, que é um pêndulo e reage ao giro da cabeça e ao vento;
- **corpo**, que respira a partir dos pés.

As poses (`repouso`, `antecipar`, `oferecer`, `segurar`) só definem alvos; molas
amortecidas levam cada osso até o alvo, por isso tudo sai suave.

## Arquivos que faltam para ir além

Sem estes arquivos, os movimentos abaixo ficam de fora. Eles não são simulados
deformando a imagem.

| Movimento | Arquivo necessário (mesmo tamanho e posição do `natal.webp`, fundo transparente) |
| --- | --- |
| Piscar | `palpebras-fechadas.png`: só as duas pálpebras fechadas |
| Mover os olhos | `olhos-sem-pupila.png` + `pupila-esq.png` + `pupila-dir.png` |
| Expressões (susto, desconfiança) | uma boca e sobrancelhas por expressão |
| Braço da cintura | `braco-cintura.png` separado do casaco, com o casaco pintado por trás |
| Entregar o envelope de verdade | `mao-sem-envelope.png` + `envelope.png` |
| Galhos balançando | as árvores da direita em uma camada própria |

Os nomes dos arquivos podem ser outros; o importante é que cada parte venha separada e que
o que fica escondido atrás dela esteja pintado.

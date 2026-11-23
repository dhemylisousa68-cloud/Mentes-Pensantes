# Mascote do Mentes Pensantes: camadas para animação

O mascote já está montado em camadas com os nomes abaixo. Hoje, cada camada usa um
**desenho provisório em vetor**. Quando a imagem da **arte original** de uma camada
ficar pronta, ela substitui o vetor sem nenhuma mudança na animação.

## Como trocar uma camada pela arte original

1. Salve a imagem em `assets/mascote/` com o nome da tabela (por exemplo, `assets/mascote/cabeca.png`).
2. Em `js/mascote-imagens.js`, descomente a linha da camada.
3. Recarregue a página. As camadas sem imagem continuam em vetor, então dá para trocar uma de cada vez.

## Regras para todas as imagens

1. **Tela de exatamente 2000 × 2300 px em todas as imagens**, com o personagem sempre na mesma posição.
   Assim, ao empilhar as camadas, tudo se encaixa. A mesma proporção é usada no vetor.
2. **Fundo transparente:** PNG 32 bits ou WebP com transparência.
3. **Sem a borda creme externa (o "adesivo")** nas partes. O código aplica essa borda
   em volta da silhueta inteira.
4. **Partes completas por baixo:** pinte também o que fica escondido, como o corpo atrás do braço
   e o rosto debaixo do gorro. Quando uma parte se move, não pode aparecer buraco.
5. **Sem sangue, sem vítima e sem Papai Noel caído** em nenhuma camada.
6. Mesmo traço, cores e sombreamento da arte original.

## Pontos de referência usados pela animação

Medidas em pixels na tela de 2000 × 2300:

| Ponto | Posição aproximada | Para que serve |
| --- | --- | --- |
| Pescoço (giro da cabeça) | x 1000, y 1100 | A cabeça gira em torno desse ponto. |
| Ombro direito | x 1573, y 1120 | Os braços da faca e do convite giram em torno dele. |
| Centro dos olhos | x 813, y 953 e x 1187, y 953 | As pupilas se movem em volta desses pontos. |

Se a arte tiver outras posições, é só me avisar: ajusto esses pontos no código.

## Camadas

### Corpo
| Arquivo | O que contém |
| --- | --- |
| `cabeca.png` | O M com o "?", do topo até a linha dos ombros, **mais uma sobra pintada abaixo** (fica escondida pelo tronco). Sem olhos, sem sobrancelhas e sem boca. |
| `tronco-detetive.png` | A parte de baixo do corpo, com as lapelas roxas, os botões, as pernas e os tênis. Sem braços. |
| `tronco-natal.png` | O casaco de Papai Noel com pelúcia, o cinto com fivela, os botões, as pernas e as botas. Sem braços. |

### Rosto
| Arquivo | O que contém |
| --- | --- |
| `olho-esq.png`, `olho-dir.png` | Só a parte branca de cada olho. A transparência delas também serve de "molde" para a pupila e a pálpebra não saírem do olho. |
| `pupila-esq.png`, `pupila-dir.png` | Cada pupila no centro do seu olho, com o brilhinho. |
| `palpebra-esq.png`, `palpebra-dir.png` | A pálpebra na cor do corpo, com a borda de baixo inclinada (o olhar desconfiado). O código desliza para piscar, semicerrar e abrir. |
| `sobrancelha-esq.png`, `sobrancelha-dir.png` | Cada sobrancelha na posição neutra. O código levanta e gira. |
| `boca-malicioso.png` | O sorriso largo com dentes da arte de Natal. |
| `boca-inocente.png` | Um sorriso fechado de falsa inocência. |
| `boca-surpresa.png` | Uma boca pequena em "o", para quando ele percebe a faca. |
| `boca-detetive.png` | O meio-sorriso de canto do detetive, usado na piscadela da intro. |

### Gorro (a troca de roupa)
| Arquivo | O que contém |
| --- | --- |
| `gorro.png` | O gorro de Papai Noel na posição normal, com pompom. |
| `gorro-cobrindo.png` | O mesmo gorro **puxado para baixo, cobrindo os olhos**. |
| `bracos-puxando-gorro.png` | Os dois braços erguidos, com as luvas segurando a aba do gorro já puxado. Mangas do detetive. |
| `bracos-puxando-gorro-natal.png` | A mesma pose, com mangas vermelhas e punhos de pelúcia. |

### Braços
Cada braço vem com a sua luva e é desenhado a partir do ombro.

| Arquivo | O que contém |
| --- | --- |
| `braco-esq-queixo.png` | Detetive: a mão no queixo, pensando. |
| `braco-dir-caderno.png` | Detetive: segurando o caderno roxo com a lupa. |
| `braco-esq-cintura.png` | Natal: a mão na cintura. |
| `braco-dir-faca.png` | Natal: o braço erguido segurando a faca, **sem sangue**. |
| `braco-dir-atras.png` | Natal: o braço escondido atrás das costas, só com o cotovelo aparecendo. |
| `braco-dir-convite.png` | Natal: o braço estendido para a frente, com a mão aberta, como quem oferece algo. |

### Objeto
| Arquivo | O que contém |
| --- | --- |
| `convite.png` | O convite vermelho com selo dourado, na posição em que fica na mão aberta. Depois ele cresce até virar o painel. |

**Total: 28 imagens.** Dá para trocar aos poucos, porque as camadas sem imagem continuam em vetor.
Para a cena de Natal, comece por: `cabeca`, `tronco-natal`, os olhos, as pupilas, as pálpebras,
as sobrancelhas, `gorro` e os braços de Natal.

## Roteiro da seleção (cerca de 6,5 segundos)

| Tempo | Ação |
| --- | --- |
| 0,0 s | Ele percebe o clique: **os olhos** vão até o cartão e **a cabeça** acompanha um instante depois. Toque curto de sinos. |
| 0,4 s | O fundo, a coluna da esquerda e os botões secundários escurecem, e uma luz quente destaca o mascote e o cartão. |
| 0,8 s | Ele olha para o jogador. |
| 1,1 s | Os braços puxam o gorro sobre os olhos. Atrás do gorro, a roupa vira a de Natal, com uma leve encolhida. |
| 1,9 s | Ele levanta o gorro e aparece de Natal, com a faca e o sorriso malicioso. |
| 2,5 s | Percebe a faca: os olhos vão até ela, a cabeça vem depois, as sobrancelhas sobem e a boca faz "o". |
| 3,1 s | Os olhos voltam para o jogador e ele esconde a faca atrás das costas. |
| 3,9 s | Falsa inocência: sorriso fechado e uma sobrancelha erguida. O balão aparece junto ao rosto, com a ponta voltada para ele: "Você foi convidado. Álibi não incluso." Ele pisca. |
| 5,4 s | Oferece o convite com a mão aberta. Toque de sinos. |
| 6,0 s | O convite voa, cresce e vira o painel. |

**Espera:** a faca continua escondida. O mascote fica no canto, respirando e piscando,
segue o ponteiro (olhos primeiro, cabeça depois) e de vez em quando levanta a sobrancelha.

**Sempre:** botão "Pular" (ou a tecla Esc), versão suave com movimento reduzido e bloqueio de cliques repetidos.

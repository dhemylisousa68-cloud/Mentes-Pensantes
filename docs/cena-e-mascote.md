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

## Pacote de camadas para a cena da faca ("Criar sala")

A folha com quatro poses (desconfiado, surpreso, "shh" e oferecendo o envelope) é ótima
como referência de expressões, mas são desenhos inteiros e diferentes entre si: não dá para
passar de um para o outro sem saltos, e nenhum tem a faca. Para a atuação pedida, a arte
precisa vir separada assim.

**Formato:** PNGs com fundo transparente, todos com o **mesmo tamanho de tela** (sugestão:
2048 × 3072) e cada peça **no lugar exato** em que fica na pose de espera, como camadas de um
mesmo arquivo exportadas uma a uma. Um PSD com as camadas nomeadas também serve.
O que fica escondido atrás de outra peça precisa estar **pintado** (ex.: o casaco atrás do
braço, o pescoço sob a gola, a parte de cima da bota dentro da calça).

| Grupo | Arquivos |
| --- | --- |
| Corpo | `tronco.png` (casaco inteiro, sem braços), `gola.png` |
| Pernas | `perna-esq.png`, `perna-dir.png`, `bota-esq.png`, `bota-dir.png` |
| Braço da faca | `braco-dir.png`, `antebraco-dir.png`, `mao-dir.png` (fechada, segurando o cabo) |
| Faca | `faca.png` (lâmina para baixo, com respingos estilizados), desenhada já na posição da mão |
| Outro braço | `braco-esq.png`, `antebraco-esq.png`, `mao-esq.png` |
| Cabeça | `cabeca.png` (o "M" com a interrogação, **sem** olhos, boca e sobrancelhas) |
| Olhos | `olho-esq.png`, `olho-dir.png` (só o branco), `pupila-esq.png`, `pupila-dir.png` |
| Pálpebras | `palpebra-esq-1..4.png` e `palpebra-dir-1..4.png` (aberta → meio → quase → fechada) |
| Sobrancelhas | `sobrancelha-esq.png`, `sobrancelha-dir.png` (neutras; erguer é feito no código) |
| Boca | `boca-0.png` (neutra) até `boca-4.png` (sorriso demoníaco assimétrico), mesma posição |
| Gorro | `gorro.png`, `gorro-ponta.png`, `pompom.png` |

**Esconder a faca:** a mão com a faca passa por trás do tronco. Para isso basta que o braço
direito venha inteiro e separado; o código troca a ordem das camadas no meio do gesto, e
o tronco cobre a faca de verdade (sem transparência).

**Opcional, deixa o gesto mais rico:** uma pose intermediária do braço já dobrado para trás
(`braco-dir-tras.png` + `antebraco-dir-tras.png`), caso o cotovelo dobrado fique estranho só
girando as peças.

## Reação ao "Criar sala" (`js/reacao-botao.js`)

A lógica já está pronta e funcionando com a arte atual; quando as camadas chegarem, só a
parte visual muda.

- Estados: espera → atenção → esconder → aguardando → (voltando → espera) ou abrir.
- Entra a 120 px do botão, com foco pelo teclado ou ao tocar no celular; só sai depois de
  220 px e de um instante longe (não reinicia na borda).
- Sequência de ~1,2 s com movimentos sobrepostos: olhadela ao botão, volta ao jogador,
  sobrancelha, sorriso em 4 etapas (começa antes de a mão sumir) e a mão indo para trás.
- O clique nunca espera o gesto.
- Hoje, sem as camadas, aparecem só a olhadela (cabeça), o braço recolhendo e o corpo
  se inclinando. Sobrancelha e sorriso ficam registrados em `data-sobrancelha` e
  `data-sorriso` no SVG do mascote, prontos para as camadas novas.

## Arte da faca (`assets/mascote/faca.png`) — mascote principal

Recortada da arte enviada (fundo preto removido; as gotas soltas no ar foram retiradas, as
da lâmina ficaram). Peças: cabeça + gorro, pompom e o **braço com a faca**, que gira no
cotovelo (203, 442).

- **Esconder a faca:** o braço passa para a camada de trás logo no início do gesto e gira
  ~150°; a cabeça e o tronco cobrem a faca de verdade (sem transparência). Na volta, ele só
  retorna para a frente quando já está quase no lugar.
- **Escolha do caso:** ergue a faca, esconde atrás das costas, fala "Álibi não incluso" e o
  convite sai de trás dele até virar o painel; depois a faca volta devagar para a mão.
- **"Criar sala":** a reação esconde a faca de novo e ela fica escondida até a sala abrir.
- A arte do envelope (`natal.webp`) continua disponível no rig (`arte: 'envelope'`).

Ainda dependem das camadas listadas acima: pupilas, piscar, sobrancelha e as etapas do
sorriso. O pacote "Mascote_M_Referencia_Tecnica" traz pivôs e ordem de camadas, mas não traz
as peças desenhadas.

### Olhos, vergonha e cartinha (feito com a própria arte)

- **Olhos:** as pupilas foram recortadas da arte (`faca-pupilas.png`) e o lugar delas foi
  preenchido com a textura do olho (`faca-olhos.png`). Elas seguem o cursor até a borda do
  olho; a cabeça acompanha menos e mais devagar; ao sair da janela, voltam ao centro.
- **Piscar:** a pálpebra de cima da arte desce até fechar, em intervalos variados.
- **Sangue:** as gotas da arte ficam e novas gotas (`gota.png`) pingam da lâmina.
- **Vergonha (passar na placa do caso):** olha para baixo e para o lado, pálpebras pesadas,
  bochechas coradas, esconde a faca e assobia (notas ♪ e som). A boca não faz "bico": isso
  precisa de uma boca desenhada.
- **Clique na placa:** lá atrás ele troca a faca pela cartinha (a mão da arte do envelope,
  encaixada na mesma mão), puxa a cartinha para a frente, ela voa, a aba abre e o painel sai
  de dentro dela. Depois a faca volta para a mão.

### Poses de assobio (`assobio.png`, `assobio-dedo.png`)

Desenhadas alinhadas com a arte da faca (mesmo corpo, botas e cabeça no mesmo lugar). Por isso
entram como **variantes**: com a faca já escondida atrás do corpo, o rig cruza rapidamente
para a pose desenhada; a cabeça dela continua girando junto com a do rig.

- Passar pela placa do caso → mãos para trás, lábios em bico, assobiando (notas e som).
- Perto do "Criar sala", esperando o clique → dedo erguido, assobiando.
- Novas poses no mesmo enquadramento podem ser adicionadas em `variantes` (js/mascote-rig.js).

# Brasil sabor Ticket · v0.9

Jogo de estratégia ferroviária para 2 a 6 pessoas. A versão traz 27 tabuleiros com contornos cartográficos, um por unidade federativa, com 135 trechos principais em cada um. Os nomes são de localidades reais. A abertura e cada tabuleiro usam o mesmo contorno simplificado. Os trajetos são fictícios e as posições das estações foram ajustadas para o jogo.

## Jogar no mesmo computador

Extraia o ZIP e abra `index.html` em um navegador compatível. Escolha **Local · mesmo computador**. Cada jogador indica uma das seis cores e vota em um mapa. Em caso de empate na liderança, só as opções empatadas vão ao segundo turno. Um novo empate é resolvido por sorteio entre os líderes. O mapa do Brasil dá zoom na unidade escolhida antes de mostrar o tabuleiro. Depois vêm os bilhetes privados e a passagem de controle. Esse modo funciona offline sem Node.js.

## Iniciar servidor com um clique

- **Windows 64 bits** · abra `iniciaTrilhosDoCerrado.exe` ou `iniciaTrilhosDoCerrado.bat`.
- **Windows 32 bits** · abra `iniciaTrilhosDoCerrado-32.exe` ou o mesmo `.bat`.
- **Linux** · rode `./iniciaTrilhosDoCerrado.sh`. Se o extrator remover a permissão de execução, use `sh iniciaTrilhosDoCerrado.sh`.

Os inicializadores rodam com usuário comum, abrem o navegador padrão e usam a porta **81** quando disponível. Se uma porta estiver ocupada, o terminal interativo permite escolher outra. Digite um número de **1 a 65535**, aceite a sugestão com **Enter** ou digite **0** para usar uma porta livre. Se a porta escolhida também estiver ocupada, o servidor pede outra. Quando a porta 81 exige privilégios, os inicializadores tentam a 8081. Sem terminal interativo, os inicializadores mantêm a tentativa automática nas portas 81, 8081 e, por fim, em uma porta livre. A janela ou o terminal informa a URL efetiva. Para encerrar, use Ctrl+C ou feche essa janela.

O servidor é JavaScript e os inicializadores precisam de Node.js no PATH ou de um runtime portátil na pasta extraída. Coloque `node.exe` em `runtime\node.exe` no Windows ou `node` em `runtime/bin/node` no Linux. Nenhum pacote npm é necessário. No Windows 7, escolha um runtime compatível com esse sistema, como o [Node.js 12 portátil](https://nodejs.org/download/release/v12.22.12/), e um navegador com suporte a diálogos HTML. Esse runtime legado é indicado apenas para uso local.

Durante uma partida, use **Encerrar** para voltar à abertura. No modo online, o anfitrião pode encerrar para todos; os convidados podem voltar e retomar a sala enquanto ela estiver aberta.

## Jogar em rede

Inicie o servidor e abra a URL que aparece no terminal. Na abertura, clique em **Criar sala online**. O jogo sugere o IP do anfitrião e a porta atual. Você pode escolher outro IPv4 do computador, trocar a porta e definir de **2 a 6 vagas**, incluindo a do anfitrião. Para alterar o endereço de escuta ou a porta, abra o jogo no próprio computador que executa o servidor.

Os convidados podem abrir o endereço mostrado na sala ou iniciar esta mesma versão em seus próprios computadores na mesma rede local. Em **Online · entrar em uma sala**, a busca mostra as salas abertas com vaga. Escolha uma sala e clique em **Pedir para entrar**. O anfitrião recebe o pedido e pode aprová-lo ou recusá-lo. Para atualizar a lista, clique em **Buscar salas na rede**.

A descoberta entre computadores usa broadcast UDP na porta **43891** na rede local. Se o Wi-Fi ou o firewall bloquear a descoberta, abra diretamente o endereço mostrado na sala e selecione **Online · entrar em uma sala**. A porta TCP escolhida para a sala precisa estar acessível aos convidados.

Em um servidor convencional, rode `node server.js`. Para iniciar sem pergunta, defina `HOST` explicitamente. Execuções sem terminal interativo usam `HOST` quando definido e escutam em todas as interfaces IPv4 por padrão. O comando mantém a porta padrão 81 e aceita a variável `PORT`. As salas ficam em memória. Uma aba pode ser recarregada para retomar a própria sessão.

## Regras do tabuleiro

Com o cursor sobre o mapa, use **Ctrl + +** para ampliar, **Ctrl + −** para reduzir e **Ctrl + 0** para voltar ao tamanho inicial. Os botões **+** e **−** também ajustam o zoom. Arraste o mapa com o mouse ou com o dedo, ou use os botões **↑ ← ↓ →**. Com o mapa em foco, as setas do teclado também funcionam.

Clique no ícone de uma estação para exibir apenas os trechos ligados a ela, com a cor e a quantidade de cartas de cada trecho. Clique novamente na estação ou escolha **Todas** no filtro para restaurar o tabuleiro. Clique em um vagão para ver, no painel **Trecho selecionado**, as duas estações que ele liga e quem opera o trecho.

Antes do primeiro turno, cada operadora recebe quatro bilhetes privados e conserva pelo menos dois. Cada bilhete indica duas estações. Conecte os extremos com sua rede para marcar seu valor no final. Bilhetes incompletos são descontados. Depois de concluir os bilhetes em mãos, é possível gastar um turno posterior para receber mais e conservar entre dois e quatro.

Cada jogador começa com 48 miniaturas. Os trechos usam entre um e oito quadrinhos. Pague um crédito por espaço e uma carta de vagão da cor pedida a cada dois espaços, arredondando para cima. Uma locomotiva pode substituir até uma carta. Um trecho rende pontos iguais ao comprimento e um bônus de dois pontos quando toca uma estação já operada pelo jogador. Quando nenhum trecho principal livre cabe na reserva do jogador da vez, abrem-se vias paralelas.

Quando uma operadora fica com dois vagões ou menos, cada adversário ainda joga uma vez. Ao fim dessas jogadas, são contabilizados os bilhetes e vence quem tem mais pontos.

## Licença e créditos

O código e os recursos originais de Brasil sabor Ticket são distribuídos sob a GNU General Public License, versão 3 (GPL-3.0-only). O arquivo [LICENSE](LICENSE) traz o texto integral, e a aba **Sobre e licença** exibe os termos e os créditos.

Criação orientada por **Alex Ricardo dos Santos**, com desenvolvimento por **Codex (GPT)**. Declaração de licença de **19 de novembro de 2026**.

Os contornos foram adaptados de [mapa-brasil-svg](https://github.com/LucasBassetti/mapa-brasil-svg), de Lucas Bassetti, a partir do trabalho de Felipe Duardo. Consulte [CARTOGRAFIA-LICENSE](CARTOGRAFIA-LICENSE) para a licença MIT dos contornos.

## Referências

- [Ticket to Ride: Europe — Days of Wonder](https://www.daysofwonder.com/game/ticket-to-ride-europe/)
- [Regiões administrativas do Distrito Federal — IPEDF](https://pdad.ipe.df.gov.br/)
- [Cidades e estados — IBGE](https://www.ibge.gov.br/cidades-e-estados.html)

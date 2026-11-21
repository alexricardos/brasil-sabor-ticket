(function (root) {
  // Municípios em uma seleção para jogo. Depois da barra, bairros da capital.
  const regions = [
    ['AC','Acre','Rio Branco;Cruzeiro do Sul;Sena Madureira;Tarauacá;Feijó;Brasiléia;Epitaciolândia;Senador Guiomard;Xapuri;Mâncio Lima;Plácido de Castro;Acrelândia;Capixaba;Porto Acre;Jordão;Manoel Urbano|Bosque;Aviário;Estação Experimental;Quinze'],
    ['AL','Alagoas','Maceió;Arapiraca;Rio Largo;Palmeira dos Índios;União dos Palmares;Penedo;São Miguel dos Campos;Coruripe;Delmiro Gouveia;Maragogi;Santana do Ipanema;Atalaia;Pilar;Marechal Deodoro;São Luís do Quitunde;Porto Calvo|Pajuçara;Jatiúca;Benedito Bentes;Farol'],
    ['AP','Amapá','Macapá;Santana;Laranjal do Jari;Oiapoque;Mazagão;Porto Grande;Tartarugalzinho;Pedra Branca do Amapari;Vitória do Jari;Calçoene;Amapá;Ferreira Gomes;Pracuúba;Serra do Navio;Cutias;Itaubal|Buritizal;Pacoval;Beirol;Novo Horizonte'],
    ['AM','Amazonas','Manaus;Parintins;Itacoatiara;Manacapuru;Coari;Tefé;Tabatinga;Maués;Humaitá;Iranduba;Presidente Figueiredo;Autazes;Careiro;Lábrea;São Gabriel da Cachoeira;Benjamin Constant|Adrianópolis;Cidade Nova;Flores;Compensa'],
    ['BA','Bahia','Salvador;Feira de Santana;Vitória da Conquista;Camaçari;Juazeiro;Itabuna;Ilhéus;Barreiras;Porto Seguro;Jequié;Alagoinhas;Lauro de Freitas;Teixeira de Freitas;Santo Antônio de Jesus;Guanambi;Jacobina|Barra;Itapuã;Rio Vermelho;Liberdade'],
    ['CE','Ceará','Fortaleza;Caucaia;Juazeiro do Norte;Maracanaú;Sobral;Crato;Itapipoca;Maranguape;Iguatu;Quixadá;Canindé;Russas;Aracati;Tianguá;Pacatuba;Limoeiro do Norte|Aldeota;Benfica;Meireles;Parangaba'],
    ['ES','Espírito Santo','Vitória;Serra;Vila Velha;Cariacica;Cachoeiro de Itapemirim;Linhares;Colatina;Guarapari;São Mateus;Aracruz;Viana;Nova Venécia;Barra de São Francisco;Anchieta;Santa Teresa;Alegre|Jardim da Penha;Praia do Canto;Goiabeiras;Maruípe'],
    ['GO','Goiás','Goiânia;Aparecida de Goiânia;Anápolis;Rio Verde;Luziânia;Águas Lindas de Goiás;Valparaíso de Goiás;Trindade;Formosa;Catalão;Itumbiara;Jataí;Senador Canedo;Caldas Novas;Goianésia;Porangatu|Setor Bueno;Setor Marista;Campinas;Jardim Goiás'],
    ['MA','Maranhão','São Luís;Imperatriz;São José de Ribamar;Timon;Caxias;Paço do Lumiar;Codó;Açailândia;Bacabal;Balsas;Santa Inês;Pinheiro;Barreirinhas;Chapadinha;Pedreiras;Grajaú|Renascença;Cohama;Anil;Turu'],
    ['MT','Mato Grosso','Cuiabá;Várzea Grande;Rondonópolis;Sinop;Tangará da Serra;Sorriso;Lucas do Rio Verde;Primavera do Leste;Cáceres;Barra do Garças;Alta Floresta;Campo Verde;Pontes e Lacerda;Nova Mutum;Juína;Colíder|Boa Esperança;CPA I;Santa Rosa;Goiabeiras'],
    ['MS','Mato Grosso do Sul','Campo Grande;Dourados;Três Lagoas;Corumbá;Ponta Porã;Naviraí;Nova Andradina;Aquidauana;Maracaju;Sidrolândia;Paranaíba;Coxim;Jardim;Amambai;Chapadão do Sul;Rio Brilhante|Amambaí;Tiradentes;Vila Carvalho;Bandeirantes'],
    ['MG','Minas Gerais','Belo Horizonte;Uberlândia;Contagem;Juiz de Fora;Montes Claros;Betim;Uberaba;Governador Valadares;Ribeirão das Neves;Ipatinga;Sete Lagoas;Divinópolis;Poços de Caldas;Patos de Minas;Teófilo Otoni;Varginha|Savassi;Pampulha;Santa Tereza;Barreiro'],
    ['PA','Pará','Belém;Ananindeua;Santarém;Marabá;Parauapebas;Castanhal;Abaetetuba;Marituba;Cametá;Altamira;Bragança;Tucuruí;Itaituba;Barcarena;Tailândia;Redenção|Nazaré;Umarizal;Marco;Pedreira'],
    ['PB','Paraíba','João Pessoa;Campina Grande;Santa Rita;Patos;Bayeux;Sousa;Cabedelo;Cajazeiras;Guarabira;Sapé;Mamanguape;Queimadas;Monteiro;Pombal;Catolé do Rocha;Itabaiana|Tambaú;Manaíra;Mangabeira;Bessa'],
    ['PR','Paraná','Curitiba;Londrina;Maringá;Ponta Grossa;Cascavel;São José dos Pinhais;Foz do Iguaçu;Colombo;Guarapuava;Paranaguá;Araucária;Apucarana;Toledo;Campo Largo;Umuarama;Pato Branco|Batel;Água Verde;Santa Felicidade;Boqueirão'],
    ['PE','Pernambuco','Recife;Jaboatão dos Guararapes;Olinda;Caruaru;Petrolina;Paulista;Cabo de Santo Agostinho;Camaragibe;Garanhuns;Vitória de Santo Antão;Igarassu;São Lourenço da Mata;Serra Talhada;Gravatá;Arcoverde;Goiana|Boa Viagem;Casa Forte;Várzea;Recife Antigo'],
    ['PI','Piauí','Teresina;Parnaíba;Picos;Piripiri;Floriano;Barras;Campo Maior;União;Altos;Esperantina;José de Freitas;Oeiras;São Raimundo Nonato;Corrente;Bom Jesus;Pedro II|Ilhotas;Jóquei;Dirceu Arcoverde;São Cristóvão'],
    ['RJ','Rio de Janeiro','Rio de Janeiro;São Gonçalo;Duque de Caxias;Nova Iguaçu;Niterói;Belford Roxo;Campos dos Goytacazes;São João de Meriti;Petrópolis;Volta Redonda;Macaé;Magé;Itaboraí;Nova Friburgo;Cabo Frio;Angra dos Reis|Copacabana;Tijuca;Madureira;Barra da Tijuca'],
    ['RN','Rio Grande do Norte','Natal;Mossoró;Parnamirim;São Gonçalo do Amarante;Macaíba;Ceará-Mirim;Caicó;Açu;Currais Novos;São José de Mipibu;Santa Cruz;Nova Cruz;João Câmara;Pau dos Ferros;Apodi;Touros|Ponta Negra;Petrópolis;Alecrim;Lagoa Nova'],
    ['RS','Rio Grande do Sul','Porto Alegre;Caxias do Sul;Canoas;Pelotas;Santa Maria;Gravataí;Viamão;Novo Hamburgo;São Leopoldo;Rio Grande;Passo Fundo;Alvorada;Uruguaiana;Bagé;Santa Cruz do Sul;Bento Gonçalves|Moinhos de Vento;Bom Fim;Menino Deus;Restinga'],
    ['RO','Rondônia','Porto Velho;Ji-Paraná;Ariquemes;Vilhena;Cacoal;Jaru;Rolim de Moura;Guajará-Mirim;Pimenta Bueno;Ouro Preto do Oeste;Buritis;Machadinho d’Oeste;Nova Mamoré;Presidente Médici;Espigão d’Oeste;Alta Floresta d’Oeste|Caiari;Olaria;Embratel;Aponiã'],
    ['RR','Roraima','Boa Vista;Rorainópolis;Caracaraí;Alto Alegre;Pacaraima;Mucajaí;Cantá;Bonfim;Amajari;Normandia;Iracema;São João da Baliza;São Luiz;Caroebe;Uiramutã|Cauamé;Caimbé;Buritis;Asa Branca;Paraviana'],
    ['SC','Santa Catarina','Florianópolis;Joinville;Blumenau;São José;Chapecó;Itajaí;Criciúma;Jaraguá do Sul;Palhoça;Lages;Balneário Camboriú;Brusque;Tubarão;São Bento do Sul;Concórdia;Caçador|Trindade;Campeche;Estreito;Ingleses'],
    ['SP','São Paulo','São Paulo;Guarulhos;Campinas;São Bernardo do Campo;Santo André;Osasco;São José dos Campos;Ribeirão Preto;Sorocaba;Santos;Mauá;Diadema;Jundiaí;São José do Rio Preto;Bauru;Presidente Prudente|Pinheiros;Mooca;Santana;Itaquera'],
    ['SE','Sergipe','Aracaju;Nossa Senhora do Socorro;Lagarto;Itabaiana;São Cristóvão;Estância;Tobias Barreto;Simão Dias;Capela;Propriá;Nossa Senhora da Glória;Barra dos Coqueiros;Itabaianinha;Poço Redondo;Canindé de São Francisco;Laranjeiras|Atalaia;Farolândia;Industrial;Jardins'],
    ['TO','Tocantins','Palmas;Araguaína;Gurupi;Porto Nacional;Paraíso do Tocantins;Colinas do Tocantins;Guaraí;Tocantinópolis;Dianópolis;Miracema do Tocantins;Formoso do Araguaia;Taguatinga;Araguatins;Pedro Afonso;Augustinópolis;Alvorada|Taquaralto;Aurenys;Taquaruçu;Plano Diretor Norte']
  ];
  const district = [
    ['Brazlândia',115,122],['Ceilândia',170,255],['Taguatinga',269,267],
    ['Samambaia',177,360],['Águas Claras',319,347],['Guará',410,287],
    ['Brasília',508,217],['Sobradinho',586,113],['Planaltina',750,94],
    ['Paranoá',650,238],['São Sebastião',671,344],['Recanto das Emas',270,427],
    ['Gama',330,505],['Santa Maria',469,499],['Núcleo Bandeirante',422,386],
    ['Jardim Botânico',549,365],['Vicente Pires',326,229],['Cruzeiro',443,204],
    ['Sudoeste',463,252],['Lago Norte',589,183],['Itapoã',716,223],
    ['Lago Sul',589,283],['Park Way',386,454],['Fercal',525,96],
    ['Sol Nascente',108,304],['Riacho Fundo',302,396],['Arniqueira',360,364],
    ['Candangolândia',462,329],['SIA',367,255],['Estrutural',368,195]
  ];
  const districtLinks = [
    [0,1],[0,7],[0,6],[1,2],[1,3],[2,3],[2,4],[2,5],[3,4],[3,11],[4,5],
    [4,11],[4,14],[5,6],[5,14],[6,7],[6,9],[6,15],[7,8],[7,9],[8,9],[8,10],
    [9,10],[9,15],[10,15],[10,13],[11,12],[11,14],[12,13],[12,14],[13,14],[13,15],[14,15]
  ];
  const layouts = typeof module === 'undefined' ? root.RailLayouts : require('./layout');
  function geography(code,list) {
    const [municipalities,boroughs]=list.split('|').map(group=>group.split(';'));
    return [...municipalities,...boroughs].map((name,i)=>[
      name,...layouts[code].cities[i],i===0?'capital':i>=municipalities.length?'bairro':'município'
    ]);
  }
  function buildMap(code,name,cities,suggested) {
    const distance=(a,b)=>Math.hypot(cities[b][1]-cities[a][1],cities[b][2]-cities[a][2]);
    const all=cities.flatMap((_,a)=>cities.slice(a+1).map((__,j)=>[a,a+j+1]))
      .sort(([a,b],[c,d])=>distance(a,b)-distance(c,d));
    const links=new Map();
    const add=([a,b])=>links.set(a+':'+b,[a,b]);
    suggested.forEach(add);
    for(let i=0;i<cities.length;i++){
      all.filter(([a,b])=>a===i||b===i).slice(0,3).forEach(add);
    }
    const target=135;
    for(let i=0;i<all.length&&links.size<target;i+=Math.max(1,Math.floor(all.length/95))) add(all[i]);
    for(const edge of all) { if(links.size>=target) break; add(edge); }
    // Uma ligação longa mantém a escala de 1 a 8 nos mapas menores.
    const longest=all[all.length-1];
    if(!links.has(longest.join(':'))){
      links.delete(Array.from(links.keys()).pop());
      add(longest);
    }
    const max=distance(...longest);
    const primary=Array.from(links.values(),([a,b])=>[a,b,Math.max(1,Math.min(8,Math.round((distance(a,b)-28)/(max-28)*8)))]);
    return {code,name,cities,primary,pairs:Array.from({length:6},()=>primary).flat()};
  }
  const maps=[buildMap('DF','Distrito Federal',district.map(([name],i)=>[name,...layouts.DF.cities[i]]),districtLinks),...regions.map(([code,name,list])=>
    buildMap(code,name,geography(code,list),[]))];
  maps.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  const catalog=maps.map(({code,name})=>({code,name}));
  const lookup=new Map(maps.map(map=>[map.code,map]));
  const api={catalog,lookup};
  if(typeof module!=='undefined') module.exports=api;
  else root.RailMaps=api;
})(globalThis);

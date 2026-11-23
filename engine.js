(function (root) {
  const maps = typeof module === 'undefined' ? root.RailMaps : require('./maps');
  const mapFor = code => maps.lookup.get(code);
  function parallelAccess(state,index,route) {
    const {pairs,primary}=mapFor(state.mapCode), count=primary.length;
    if (route<count || state.owners[route]>=0) return true;
    if (state.players[index].cars<pairs[route][2]) return false;
    if (primary.some((edge,id)=>state.owners[id]<0 && edge[2]<=state.players[index].cars)) return false;
    return state.owners[route-count]>=0;
  }
  const colors = ['#ff765f','#48dabb','#f9c95f','#9a92ff','#f58fcb','#56baff'];
  const paintNames = ['Cobre rubi','Verde esmeralda','Ouro','Violeta','Rosa metálico','Azul cobalto'];
  const createElection = count => ({choices:maps.catalog.map(map=>map.code),ballots:Array(count).fill(null),round:1,winner:null,random:false});
  function castVote(election,index,code) {
    if (election.winner || !Number.isInteger(index) || index<0 || index>=election.ballots.length ||
        election.ballots[index] || !election.choices.includes(code)) throw Error('Voto inválido ou já registrado.');
    election.ballots[index]=code;
    if (election.ballots.includes(null)) return;
    const counts=election.ballots.reduce((result,vote)=>result.set(vote,(result.get(vote)||0)+1),new Map());
    const high=Math.max(...counts.values());
    const tied=election.choices.filter(candidate=>counts.get(candidate)===high);
    if (tied.length===1) election.winner=tied[0];
    else if (election.round===1) {
      election.round=2;
      election.choices=tied;
      election.ballots.fill(null);
    } else {
      election.winner=tied[Math.floor(Math.random()*tied.length)];
      election.random=true;
    }
  }
  const districtTickets = [
    [0,3,6],[1,6,7],[2,12,7],[3,5,6],[4,6,6],[5,13,6],[6,10,7],[7,10,6],
    [8,6,6],[9,15,4],[10,14,6],[11,13,6],[12,4,6],[13,15,4],[14,2,6],[15,7,6],
    [0,8,7],[1,12,7],[3,6,8],[5,10,7],[4,9,7],[2,13,7],[11,6,7],[14,9,6],
    [0,13,10],[1,8,10],[3,10,10],[7,12,10],[8,11,11],[0,15,9]
  ];
  const cardTypes = [
    ['Coral','#ff846b','●'], ['Turquesa','#60ebce','✦'], ['Ouro','#ffd36d','◆'],
    ['Violeta','#b7a4ff','▲'], ['Rosa','#ff9ed6','♥'], ['Azul','#7cc5ff','■'],
    ['Lima','#b8ea76','✚'], ['Laranja','#ffb479','⬟'], ['Locomotiva','#f1f7ff','★']
  ];
  const loco = cardTypes.length - 1;
  const startingCars = 48;
  const routeColor = id => (id * 3) % loco;
  function shuffle(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }
  function draw(state) {
    if (!state.deck.length) state.deck = shuffle(state.discard.splice(0));
    return state.deck.pop();
  }
  function payment(player, route, mapCode) {
    const {pairs}=mapFor(mapCode);
    const needed = Math.ceil(pairs[route][2]/2);
    const color = routeColor(route), matching = Math.min(needed,player.hand[color]);
    if (needed - matching > Math.min(1,player.hand[loco])) return null;
    return Array(matching).fill(color).concat(Array(needed-matching).fill(loco));
  }
  function create(names, mapCode='DF', paints=names.map((_,i)=>i)) {
    if (!Array.isArray(names) || names.length < 2 || names.length > 6) throw Error('Escolha de 2 a 6 jogadores.');
    const map=mapFor(mapCode);
    if (!map || paints.length!==names.length || new Set(paints).size!==paints.length ||
        paints.some(paint=>!Number.isInteger(paint) || !colors[paint])) throw Error('Escolha um mapa e cores distintas.');
    const {pairs,cities}=map;
    const distance=(a,b)=>Math.hypot(cities[b][1]-cities[a][1],cities[b][2]-cities[a][2]);
    const destinations=mapCode==='DF' ? districtTickets : [];
    const existing = new Set(destinations.map(([a,b])=>Math.min(a,b)+':'+Math.max(a,b)));
    const extra = cities.flatMap((_,a)=>cities.slice(a+1).map((__,offset)=>a+offset+1)
      .filter(b=>!existing.has(a+':'+b))
      .map(b=>[a,b,Math.min(12,Math.max(4,Math.round(distance(a,b)/49)+3))]));
    const ticketDeck = shuffle(extra);
    const offers = destinations.length ? shuffle(destinations.slice()) : ticketDeck.splice(0,names.length*4);
    const deck = shuffle(cardTypes.flatMap((_,id)=>Array(id===loco ? 14 : 12).fill(id)));
    const state = { mapCode, deck, ticketDeck, discard: [], market: [], ticketDeckCount: ticketDeck.length, phase: 'draft', players: names.map((name, i) => ({
      name: String(name).trim().slice(0,24) || 'Operadora ' + (i+1),
      paint: paints[i], funds: 5, points: 0, cars: startingCars, hand: cardTypes.map(()=>0), offer: offers.splice(0,4), tickets: null
    })), owners: pairs.map(() => -1), engines: pairs.map(() => false), turn: 0, round: 1, final: null, ended: false,
    log: ['As operadoras chegaram ao Distrito Federal.'], version: 0 };
    for (const player of state.players) {
      for (let i=0;i<4;i++) player.hand[draw(state)]++;
    }
    state.market = Array.from({length:3},()=>draw(state));
    return state;
  }
  function keepTickets(state,index,selection) {
    const player = state.players && state.players[index];
    const initial = state.phase === 'draft';
    if (!(player && player.offer) || (!initial && (state.ended || state.turn!==index))) {
      throw Error('A escolha de bilhetes não está disponível.');
    }
    const distinct = new Set(Array.isArray(selection) ? selection : []);
    if (distinct.size < 2 || [...distinct].some(i => !Number.isInteger(i) || !player.offer[i])) {
      throw Error('Escolha pelo menos dois bilhetes válidos.');
    }
    player.tickets = (player.tickets || []).concat([...distinct].map(i => player.offer[i]));
    player.offer = null;
    if (!initial) advance(state,index);
    else if (state.players.every(candidate => candidate.tickets)) {
      state.phase = 'play';
      state.log.unshift('Todos escolheram seus destinos. As obras podem começar.');
    }
    state.version++;
    return state;
  }
  function connected(state, index, start, end) {
    const {pairs}=mapFor(state.mapCode);
    const seen = new Set([start]);
    const queue = [start];
    for (const city of queue) {
      pairs.forEach(([a,b], id) => {
        if (state.owners[id] !== index) return;
        const next = a === city ? b : b === city ? a : -1;
        if (next >= 0 && !seen.has(next)) { seen.add(next); queue.push(next); }
      });
    }
    return seen.has(end);
  }
  function canDrawTickets(state,index) {
    const player = state.players[index];
    return !state.ended && state.phase==='play' && state.turn===index && !player.offer &&
      state.ticketDeckCount >= 2 && player.tickets.every(([a,b])=>connected(state,index,a,b));
  }
  function advance(state,index) {
    const next=(index+1)%state.players.length;
    state.turn=next;
    if (state.final && next===state.final.trigger) {
      state.ended=true;
      state.players.forEach((player,i)=>{
        let completed=0, incomplete=0;
        player.finalTickets=player.tickets.map(([a,b,value])=>{
          const done=connected(state,i,a,b);
          if (done) completed+=value; else incomplete-=value;
          return {a,b,value,complete:done};
        });
        const routes=startingCars-player.cars;
        player.finalScore={routes,connections:player.points-routes,completed,incomplete};
        player.ticketPoints=completed+incomplete;
        player.points+=player.ticketPoints;
      });
      state.log.unshift('Partida encerrada. Os bilhetes foram contabilizados.');
    } else if (!next) state.round++;
    state.log.length=Math.min(state.log.length,8);
  }
  function play(state, index, action, route) {
    if (state.phase !== 'play' || state.ended || state.turn !== index) throw Error('Aguarde sua vez.');
    const player = state.players[index];
    if (player.offer) throw Error('Confirme seus novos bilhetes primeiro.');
    if (action === 'tickets') {
      if (!canDrawTickets(state,index)) throw Error('Conclua seus bilhetes para receber novos.');
      player.offer=state.ticketDeck.splice(0,4);
      state.ticketDeckCount=state.ticketDeck.length;
      state.version++;
      return state;
    }
    if (action === 'build') {
      const {pairs,cities}=mapFor(state.mapCode);
      const edge = pairs[route];
      if (!Number.isInteger(route) || !edge || state.owners[route] !== -1 || !parallelAccess(state,index,route)) throw Error('Trecho indisponível.');
      const [a,b,cost] = edge;
      if (player.cars < cost) throw Error('Vagões insuficientes na reserva.');
      if (player.funds < cost) throw Error('Créditos insuficientes.');
      const spent = payment(player,route,state.mapCode);
      if (!spent) throw Error('Faltam cartas compatíveis para este trecho.');
      for (const card of spent) {
        player.hand[card]--;
        state.discard.push(card);
      }
      const sharedStation = pairs.some(([from,to], id) =>
        state.owners[id] === index && [from,to].some(city => city === a || city === b));
      state.owners[route] = index;
      state.engines[route] = spent.includes(loco);
      player.funds -= cost;
      player.cars -= cost;
      player.points += cost + (sharedStation ? 2 : 0);
      state.log.unshift(player.name + ' inaugurou ' + cities[a][0] + ' — ' + cities[b][0] + '.');
      if (player.cars<=2 && !state.final) {
        state.final={trigger:index};
        state.log.unshift(player.name+' acionou a rodada final.');
      }
    } else if (action === 'fund') {
      player.funds += 4;
      let count = 0;
      for (let i=0;i<2;i++) {
        const card = draw(state);
        if (card === undefined) break;
        player.hand[card]++;
        count++;
      }
      state.log.unshift(player.name + ' recebeu 4 créditos e comprou ' + count + ' carta(s).');
    } else if (action === 'market') {
      if (!Number.isInteger(route) || state.market[route] == null) throw Error('Carta indisponível.');
      player.hand[state.market[route]]++;
      state.market[route] = draw(state)
      if (state.market[route]===undefined) state.market[route]=null;
      player.funds += 2;
      state.log.unshift(player.name + ' escolheu uma carta da oficina e recebeu 2 créditos.');
    } else throw Error('Ação inválida.');
    advance(state,index);
    state.version++;
    return state;
  }
  const engine = {mapFor,catalog:maps.catalog,colors,paintNames,createElection,castVote,cardTypes,routeColor,
    payment,parallelAccess,canDrawTickets,create,keepTickets,connected,startingCars,play};
  if (typeof module !== 'undefined') module.exports = engine;
  else root.Rail = engine;
})(globalThis);

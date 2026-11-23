'use strict';
const $ = id => document.getElementById(id);
const {colors,paintNames,cardTypes,routeColor,payment,connected,startingCars,parallelAccess,canDrawTickets,mapFor,catalog} = Rail;
let cities,pairs,corridorCount,currentMap,focusStation;
let localElection, localPlayers, lobbyEpoch=0;
const svg = (tag, attrs, label) => {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([key,value]) => el.setAttribute(key,value));
  if (label) el.textContent = label;
  return el;
};
let zoomTimer, parkedSession;
for(const {code,name} of catalog) {
  const shape=svg('path',{d:RailShapes[code],class:'brazil-country',id:'shape-'+code});
  shape.append(svg('title',{},name));
  $('brazil-states').append(shape);
}
function showBoard(code,onReady,animate=true) {
  const complete=()=>{
    $('opening').hidden=true;
    $('game-board').hidden=false;
    onReady?.();
  };
  if ($('opening').hidden || !animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    complete();
    return;
  }
  const art=$('brazil-art'), shape=$('shape-'+code);
  const bounds=art.getBoundingClientRect(), point=shape.getBoundingClientRect();
  const x=point.left+point.width/2-bounds.left, y=point.top+point.height/2-bounds.top;
  art.style.transformOrigin=x+'px '+y+'px';
  art.style.setProperty('--pan-x',(bounds.width/2-x)+'px');
  art.style.setProperty('--pan-y',(bounds.height/2-y)+'px');
  art.style.setProperty('--zoom-scale',Math.min(60,.82*Math.min(bounds.width/point.width,bounds.height/point.height)));
  shape.classList.add('destination-shape');
  $('zoom-label').textContent='Explorando '+mapFor(code).name;
  $('opening').classList.add('zooming');
  clearTimeout(zoomTimer);
  zoomTimer=setTimeout(complete,2800);
}
let state, session, poll, revealed = false, selected = null, busy = false, sound = true, audio;
let events=null, chatSeen=new Set(), chatIds=[], chatUnread=0, localChatSeq=0, titleTimer;
const baseTitle=document.title;
const routeName = ([a,b]) => cities[a][0] + ' — ' + cities[b][0];
function complementary(hex) {
  const channels = hex.slice(1).match(/../g).map(channel=>parseInt(channel,16));
  const extremes = Math.max(...channels)+Math.min(...channels);
  return '#'+channels.map(channel=>(extremes-channel).toString(16).padStart(2,'0')).join('');
}
function playerColor(element,index) {
  paintElement(element,state?.players[index]?.paint);
}
function paintElement(element,paint) {
  element.classList.toggle('player-name',Number.isInteger(paint));
  element.style.setProperty('--player-color',colors[paint] || '');
}
const routeElements = [];
const choose = id => { selected = id; render(); tone(330); };
const mapViewport=$('map-scroll');
const panDirections={ArrowUp:[0,-1],ArrowLeft:[-1,0],ArrowDown:[0,1],ArrowRight:[1,0]};
function panMap([x,y]) {
  mapViewport.scrollLeft+=x*mapViewport.clientWidth*.25;
  mapViewport.scrollTop+=y*mapViewport.clientHeight*.25;
}
$('map-directions').querySelectorAll('button').forEach(button=>{
  button.onclick=()=>panMap(panDirections[button.dataset.direction]);
});
mapViewport.addEventListener('keydown',event=>{
  if (event.ctrlKey || event.altKey || event.metaKey || !panDirections[event.key]) return;
  event.preventDefault();
  panMap(panDirections[event.key]);
});
let mapDrag, suppressMapClick=false;
mapViewport.addEventListener('pointerdown',event=>{
  if (!event.isPrimary || event.button!==0) return;
  suppressMapClick=false;
  if (mapViewport.scrollWidth<=mapViewport.clientWidth && mapViewport.scrollHeight<=mapViewport.clientHeight) return;
  const bounds=mapViewport.getBoundingClientRect();
  if (event.clientX>=bounds.left+mapViewport.clientLeft+mapViewport.clientWidth ||
      event.clientY>=bounds.top+mapViewport.clientTop+mapViewport.clientHeight) return;
  mapDrag={id:event.pointerId,x:event.clientX,y:event.clientY,
    left:mapViewport.scrollLeft,top:mapViewport.scrollTop};
});
mapViewport.addEventListener('pointermove',event=>{
  if (!mapDrag || mapDrag.id!==event.pointerId) return;
  const dx=event.clientX-mapDrag.x, dy=event.clientY-mapDrag.y;
  if (!suppressMapClick) {
    if (Math.hypot(dx,dy)<6) return;
    mapViewport.setPointerCapture(event.pointerId);
    suppressMapClick=true;
    mapViewport.classList.add('map-dragging');
  }
  mapViewport.scrollLeft=mapDrag.left-dx;
  mapViewport.scrollTop=mapDrag.top-dy;
});
function stopMapDrag(event) {
  if (mapDrag?.id!==event.pointerId) return;
  mapDrag=null;
  mapViewport.classList.remove('map-dragging');
}
for (const event of ['pointerup','pointercancel']) {
  mapViewport.addEventListener(event,stopMapDrag);
}
mapViewport.addEventListener('lostpointercapture',event=>{
  if (event.target===mapViewport) stopMapDrag(event);
});
mapViewport.addEventListener('pointerleave',event=>{
  if (!suppressMapClick) stopMapDrag(event);
});
mapViewport.addEventListener('click',event=>{
  if (!suppressMapClick || !event.detail) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  suppressMapClick=false;
},true);
let mapZoom=1;
function setMapZoom(value) {
  const next=Math.max(1,Math.min(3,value));
  if (next===mapZoom) return;
  const scene=$('scene');
  const {clientWidth,clientHeight,scrollLeft,scrollTop}=mapViewport;
  const x=(scrollLeft+clientWidth/2)/scene.offsetWidth;
  const y=(scrollTop+clientHeight/2)/scene.offsetHeight;
  mapZoom=next;
  scene.style.width=(mapZoom*100)+'%';
  scene.style.minWidth=(mapZoom*590)+'px';
  mapViewport.classList.toggle('map-zoomed',mapZoom>1);
  mapViewport.scrollLeft=mapZoom===1 ? 0 : x*scene.offsetWidth-mapViewport.clientWidth/2;
  mapViewport.scrollTop=mapZoom===1 ? 0 : y*scene.offsetHeight-mapViewport.clientHeight/2;
  $('map-zoom-out').disabled=mapZoom===1;
  $('map-zoom-in').disabled=mapZoom===3;
}
$('map-zoom-in').onclick=()=>setMapZoom(mapZoom+.25);
$('map-zoom-out').onclick=()=>setMapZoom(mapZoom-.25);
window.addEventListener('keydown',event=>{
  if (!event.ctrlKey || event.altKey || event.metaKey || $('game-board').hidden) return;
  if (!mapViewport.matches(':hover, :focus-within')) return;
  if (!['+','=','-','0'].includes(event.key)) return;
  event.preventDefault();
  setMapZoom(event.key==='0' ? 1 : mapZoom+(event.key==='-' ? -.25 : .25));
});
function drawMap(code) {
  if (currentMap===code) return;
  currentMap=code;
  setMapZoom(1);
  const map=mapFor(code);
  ({cities,pairs}=map);
  corridorCount=map.primary.length;
  focusStation=null;
  $('scene').classList.remove('station-filtered');
  selected=null;
  routeElements.length=0;
  $('map').dataset.region=code;
  const [cx,cy,scale]=RailLayouts[code].box;
  const transform='translate(430 285) scale('+scale+') translate('+(-cx)+' '+(-cy)+')';
  $('board-outline').querySelectorAll('path').forEach(path=>{
    path.setAttribute('d',RailShapes[code]);
    path.setAttribute('transform',path.classList.contains('shadow') ?
      'translate(0 10) '+transform : transform);
  });
  $('map-name').textContent=map.name+' · '+corridorCount+' trechos · mapa esquemático';
  $('map-caption').textContent=map.name.toUpperCase();
  $('routes').replaceChildren();
  $('stations').replaceChildren();
  $('route-picker').replaceChildren(new Option('Escolha no mapa',''));
  $('station-filter').replaceChildren(new Option('Todas',''));
  pairs.forEach((edge,id) => {
  const [a,b,cost] = edge;
  const [,ax,ay] = cities[a], [,bx,by] = cities[b];
  const angle=Math.atan2(by-ay,bx-ax), length=Math.hypot(bx-ax,by-ay);
  const lane=Math.floor(id/corridorCount), offset=lane ? Math.ceil(lane/2)*14*(lane%2 ? 1 : -1) : 0;
  const x1=ax-Math.sin(angle)*offset, y1=ay+Math.cos(angle)*offset;
  const x2=bx-Math.sin(angle)*offset, y2=by+Math.cos(angle)*offset;
  const midX=(x1+x2)/2-Math.sin(angle)*13, midY=(y1+y2)/2+Math.cos(angle)*13;
  const spacing=(length-22)/cost, width=Math.min(43,spacing-3);
  const slots=svg('g',{class:'slots'});
  const centers=Array.from({length:cost},(_,i)=>{
    const d=11+spacing*(i+.5);
    const x=x1+Math.cos(angle)*d,y=y1+Math.sin(angle)*d;
    slots.append(svg('rect',{x:x-width/2,y:y-6,width,height:12,rx:2,
      transform:'rotate('+angle*180/Math.PI+' '+x+' '+y+')'}));
    return [x,y];
  });
  const [colorName,color,symbol] = cardTypes[routeColor(id)];
  const required=Math.ceil(cost/2);
  const group = svg('g',{class:'route'+(id>=corridorCount ? ' parallel' : '')});
  const rail = svg('line',{x1,y1,x2,y2,class:'rail'});
  group.append(svg('title',{},routeName(edge)+' · '+required+' × '+colorName),rail,slots,svg('line',{x1,y1,x2,y2,class:'hit'}),
    svg('rect',{x:midX-15,y:midY-9,width:30,height:18,rx:7,class:'cost',style:'fill:'+color}),
    svg('text',{x:midX,y:midY,class:'cost-label'},symbol+' '+required));
  group.addEventListener('click',()=>choose(id));
  $('routes').append(group);
  const option=new Option(routeName(edge)+(lane ? ' · via paralela' : '')+' · '+required+' × '+colorName,id);
  $('route-picker').add(option);
  routeElements.push({group,option,centers,angle,width,a,b});
});
  cities.forEach(([name,x,y,kind],i)=>{
    const offset = i%2===0 ? -12 : 17;
    const station=svg('g',{class:'station-group'+(kind==='bairro'?' neighborhood':'')});
    station.append(svg('title',{},name),svg('circle',{cx:x,cy:y,r:kind==='capital'?8:6,class:'station'}),
      svg('text',{x,y:y+offset,class:'station-label'},name));
    station.addEventListener('click',()=>filterStation(focusStation===i ? null : i));
    $('stations').append(station);
  });
  const stationOptions=cities.map(([name],index)=>new Option(name,index));
  stationOptions.sort((a,b)=>a.text.localeCompare(b.text,'pt-BR'));
  stationOptions.forEach(option=>$('station-filter').add(option));
}
function filterStation(index) {
  focusStation=index;
  const edge=pairs[selected];
  if (index!=null && edge && edge[0]!==index && edge[1]!==index) selected=null;
  $('station-filter').value=index ?? '';
  $('scene').classList.toggle('station-filtered',index!=null);
  Array.from($('stations').children).forEach((station,i)=>station.classList.toggle('active',i===index));
  render();
}
$('station-filter').onchange=event=>filterStation(event.target.value==='' ? null : Number(event.target.value));
$('my-routes-only').onchange=render;
function tone(note, success=false) {
  if (!sound) return;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  audio ||= new Audio();
  audio.resume().catch(()=>{});
  const time = audio.currentTime;
  [note,...(success ? [note*1.25,note*1.5] : [])].forEach((frequency,i)=>{
    const at = time+i*.085, osc = audio.createOscillator(), gain = audio.createGain();
    osc.type = 'triangle'; osc.frequency.value = frequency;
    gain.gain.setValueAtTime(.065,at);
    gain.gain.exponentialRampToValueAtTime(.001,at+.17);
    osc.connect(gain); gain.connect(audio.destination); osc.start(at); osc.stop(at+.18);
  });
}
function chatTone() {
  if (!sound) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audio ||= new Ctx();
  audio.resume().catch(()=>{});
  const start=audio.currentTime;
  [[784,0],[1046,.12]].forEach(([frequency,delay])=>{
    const at=start+delay, osc=audio.createOscillator(), gain=audio.createGain();
    osc.type='sine'; osc.frequency.value=frequency;
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(.09,at+.015);
    gain.gain.exponentialRampToValueAtTime(.001,at+.2);
    osc.connect(gain); gain.connect(audio.destination); osc.start(at); osc.stop(at+.21);
  });
}
function setChatStatus(text) { $('chat-status').textContent=text; }
function updateChatBadge() {
  const badge=$('chat-badge');
  badge.hidden=!chatUnread;
  badge.textContent=chatUnread>9 ? '9+' : chatUnread;
}
function clearChatBadge() { chatUnread=0; updateChatBadge(); }
function updateChatAvailability() {
  const active=Boolean(session || state);
  $('chat-panel').hidden=!active;
  $('chat-focus').hidden=!active;
  if (!active) setChatStatus('');
  else if (!events && session) setChatStatus('Conectando…');
}
function flashTitle() {
  if (document.hidden && !titleTimer) {
    let on=false;
    titleTimer=setInterval(()=>{
      on=!on;
      document.title=on ? '💬 Nova mensagem · '+baseTitle : baseTitle;
      if (!document.hidden) {
        clearInterval(titleTimer); titleTimer=null; document.title=baseTitle;
      }
    },900);
  }
}
function syncChat(messages) {
  if (!Array.isArray(messages)) return;
  const log=$('chat-log');
  let added=false, incoming=0;
  for (const message of messages) {
    if (!message || !Number.isInteger(message.id) || chatSeen.has(message.id)) continue;
    chatSeen.add(message.id); chatIds.push(message.id); added=true;
    const mine=Boolean(message.local || (session && message.index===session.index));
    const row=document.createElement('li');
    row.className='chat-message'+(mine ? ' mine' : '');
    row.style.setProperty('--chat-color',colors[message.paint] || '#9fd7e8');
    const meta=document.createElement('span'), who=document.createElement('strong'), time=document.createElement('time');
    meta.className='chat-meta';
    who.textContent=message.name || 'Jogador';
    if (Number.isInteger(message.paint)) paintElement(who,message.paint);
    const when=new Date(Number(message.time) || Date.now());
    time.dateTime=when.toISOString();
    time.textContent=when.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    meta.append(who,time);
    const text=document.createElement('span');
    text.className='chat-text'; text.textContent=message.text;
    row.append(meta,text); log.append(row);
    if (!mine) { incoming++; chatUnread++; }
  }
  while (chatIds.length>200) {
    chatSeen.delete(chatIds.shift());
    while (log.children.length>6) log.firstElementChild.remove();
  }
  while (log.children.length>6) log.firstElementChild.remove();
  if (added) {
    log.scrollTop=log.scrollHeight;
    if (incoming) { chatTone(); flashTitle(); updateChatBadge(); }
  }
}
async function sendChat(value) {
  const text=String(value ?? '').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,240);
  if (!text) return false;
  if (session) {
    const result=await api('chat',{...session,text});
    syncChat(result.chat); apply(result);
    return true;
  }
  if (state) {
    const index=localIndex();
    const player=localPlayers?.[index] || state.players[index];
    syncChat([{id:++localChatSeq,index,name:player.name,paint:player.paint,
      time:Date.now(),text,local:true}]);
    return true;
  }
  return false;
}
function connectEvents() {
  events?.close(); events=null;
  if (!session || location.protocol==='file:') { updateChatAvailability(); return; }
  events=new EventSource('/api/events?code='+encodeURIComponent(session.code)+
    '&token='+encodeURIComponent(session.token));
  events.onopen=()=>setChatStatus('Ao vivo');
  events.onerror=()=>setChatStatus('Reconectando…');
  events.addEventListener('update',event=>{
    try {
      const data=JSON.parse(event.data);
      syncChat(data.chat); apply(data);
    } catch { /* Evento inválido: a consulta periódica faz a sincronização. */ }
  });
  events.addEventListener('closed',event=>{
    events?.close(); events=null;
    let message='A sala foi encerrada.';
    try { message=JSON.parse(event.data).error || message; } catch { /* Mantém o padrão. */ }
    reset(); $('opening-notice').textContent=message;
  });
  updateChatAvailability();
}
function cardTile(id, count, slot, allowed) {
  const [name,color,symbol] = cardTypes[id];
  const card = document.createElement(slot === undefined ? 'div' : 'button');
  card.className = 'card-tile';
  card.style.setProperty('--wagon',color);
  const icon = document.createElement('strong');
  icon.textContent = symbol;
  card.append(icon,document.createTextNode(name+(count === undefined ? '' : ' ×'+count)));
  if (slot !== undefined) {
    card.type = 'button';
    card.disabled = !allowed;
    card.onclick = () => move('market',slot);
  }
  return card;
}
function localIndex() {
  return state.phase === 'draft' ? state.players.findIndex(player=>!player.tickets) : state.turn;
}
function handoff() {
  revealed=false;
  selected=null;
  render();
  if (!state.ended) {
    const next = localIndex();
    $('handoff-title').textContent='Vez de '+state.players[next].name;
    playerColor($('handoff-title'),next);
    $('handoff').showModal();
  }
}
function renderTickets(index, player, drafting) {
  const offer = player?.offer;
  const tickets = player?.tickets;
  const list = $('ticket-list');
  $('ticket-panel').hidden = !player || (!drafting && !tickets);
  $('ticket-title').textContent = drafting ? 'Escolha seus destinos' : 'Seus destinos';
  $('ticket-status').textContent = drafting ?
    (offer ? 'Conserve pelo menos dois bilhetes.' : 'Aguardando os outros jogadores.') :
    'Conecte as estações com trechos da sua operadora.';
  $('ticket-form').hidden = !offer;
  const signature = offer ? JSON.stringify([index,offer]) : '';
  if (list.dataset.offer !== signature) {
    list.dataset.offer=signature;
    list.replaceChildren();
    $('keep').disabled=true;
    offer?.forEach((ticket,i)=>{
      const label=document.createElement('label'), input=document.createElement('input');
      input.type='checkbox'; input.value=i;
      label.append(input,document.createTextNode(routeName(ticket)+' · '+ticket[2]+' pts'));
      list.append(label);
    });
  }
  const pending=(tickets || []).filter(ticket=>!connected(state,index,ticket[0],ticket[1]));
  const completedCount=(tickets?.length || 0)-pending.length;
  $('private-tickets').replaceChildren(...pending.map(ticket=>{
    const row=document.createElement('li');
    row.textContent=routeName(ticket)+' · '+ticket[2]+' pts · pendente';
    return row;
  }));
  const completedButton=$('completed-tickets');
  completedButton.hidden=!tickets || !completedCount;
  completedButton.textContent='Ver bilhetes concluídos ('+completedCount+')';
  if (!drafting && tickets && !pending.length) {
    $('ticket-status').textContent='Todos os seus bilhetes foram concluídos.';
  }
}
function renderFinalResults() {
  const button=$('show-results');
  const first=button.hidden;
  button.hidden=!state?.ended;
  if (button.hidden) return;
  const signed=new Intl.NumberFormat('pt-BR',{signDisplay:'exceptZero'});
  const players=state.players.slice().sort((a,b)=>b.points-a.points);
  const winners=players.filter(player=>player.points===players[0].points);
  $('result-winners').textContent=winners.length===1 ? winners[0].name+' venceu!' :
    'Empate: '+winners.map(player=>player.name).join(', ');
  $('results-rows').replaceChildren(...players.map(player=>{
    const row=document.createElement('tr');
    const name=document.createElement('th');
    name.scope='row';
    name.textContent=player.name;
    row.append(name);
    const {routes,connections,completed,incomplete}=player.finalScore || {};
    for (const value of [routes,connections,completed,incomplete,player.ticketPoints]) {
      const cell=document.createElement('td');
      cell.textContent=value==null ? '—' : signed.format(value);
      row.append(cell);
    }
    const total=document.createElement('td');
    total.textContent=player.points;
    row.append(total);
    return row;
  }));
  $('final-tickets').replaceChildren(...players.map(player=>{
    const box=document.createElement('section');
    const heading=document.createElement('h3');
    const index=state.players.indexOf(player);
    heading.textContent=player.name;
    playerColor(heading,index);
    const list=document.createElement('ul');
    const details=player.finalTickets || (player.tickets ? player.tickets.map(([a,b,value])=>({
      a,b,value,complete:connected(state,index,a,b)})) : []);
    for (const ticket of details) {
      const item=document.createElement('li');
      item.className=ticket.complete ? 'complete' : 'incomplete';
      item.textContent=routeName([ticket.a,ticket.b])+' · '+ticket.value+' pts · '+
        (ticket.complete ? 'concluído' : 'incompleto');
      list.append(item);
    }
    if (!list.children.length) {
      const empty=document.createElement('li');
      empty.textContent='Nenhum bilhete registrado.';
      list.append(empty);
    }
    box.append(heading,list);
    return box;
  }));
  if (first) $('results').showModal();
}
$('show-results').onclick=()=>$('results').showModal();
$('completed-tickets').onclick=()=>{
  if (!state) return;
  const index=session ? session.index : localIndex();
  const player=state.players[index];
  const done=(player?.tickets || []).filter(ticket=>connected(state,index,ticket[0],ticket[1]));
  $('completed-list').replaceChildren(...done.map(ticket=>{
    const item=document.createElement('li');
    item.textContent=routeName(ticket)+' · '+ticket[2]+' pts';
    return item;
  }));
  $('completed-note').textContent=player ? player.name+' concluiu '+done.length+
    (done.length===1 ? ' bilhete.' : ' bilhetes.') : '';
  $('completed').showModal();
};
function render() {
  drawMap(state?.mapCode || 'DF');
  $('end-game').hidden=!state;
  const index = state?.turn;
  const drafting = state?.phase === 'draft';
  const mine = state && (session ? session.index === index : revealed);
  const player = state?.players[index];
  const viewer = state && (session ? session.index : revealed ? localIndex() : -1);
  const handOwner = state?.players[viewer];
  const routeFilter=$('my-routes-only');
  routeFilter.disabled=!handOwner;
  const onlyMine=Boolean(handOwner && routeFilter.checked);
  const allowed = Boolean(mine && !drafting && !state.ended && !busy && !handOwner?.offer);
  renderTickets(viewer,handOwner,drafting || Boolean(handOwner?.offer));
  $('new-tickets').disabled = !allowed || !canDrawTickets(state,index);
  $('new-tickets').hidden = drafting || !state || state.ended;
  $('final-note').textContent = state?.final && !state.ended ?
    state.players[state.final.trigger].name+' ficou com 2 vagões ou menos. Os demais têm uma última jogada.' : '';
  const deckCount = state?.deck?.length ?? state?.deckCount;
  $('deck').textContent = deckCount == null ? '' : deckCount+' no monte';
  $('market').replaceChildren();
  state?.market.forEach((card,slot)=>{
    if (card != null) $('market').append(cardTile(card,undefined,slot,allowed));
  });
  $('hand').replaceChildren();
  handOwner?.hand?.forEach((count,card)=>{
    if (count) $('hand').append(cardTile(card,count));
  });
  $('hand-title').textContent = handOwner ? 'Mão de '+handOwner.name : 'Sua mão';
  playerColor($('hand-title'),handOwner ? viewer : null);
  $('round').textContent = drafting ? 'Escolha de destinos' : state?.ended ? 'Partida encerrada' : state?.final ? 'Rodada final' : state ? 'Rodada '+state.round : '2 a 6 jogadores';
  $('current').textContent = drafting ? 'Preparação' : player ? 'Vez de '+player.name : 'Prepare a partida';
  playerColor($('current'),!drafting && !state?.ended ? index : null);
  const ready = state?.players.filter(p=>p.ready || p.tickets).length;
  $('goal').textContent = drafting ? ready+' de '+state.players.length+' operadoras prontas.' :
    player ? (handOwner?.offer ? 'Confirme os novos bilhetes para encerrar o turno.' : allowed ? 'Escolha uma ação para este turno.' : 'Aguarde sua vez.') : 'Abra uma partida para começar.';
  $('credits').textContent = state && handOwner ? handOwner.funds+' créditos' : '';
  $('reserve').textContent = player && !state.ended ? player.cars+' de '+startingCars+' vagões na reserva de '+player.name : '';
  $('event').textContent = state?.log[0] || '';
  const deployed=state ? state.players.reduce((total,p)=>total+startingCars-p.cars,0) : 0;
  $('cars-total').textContent=deployed+(deployed===1?' vagão no tabuleiro':' vagões no tabuleiro');
  $('scores').replaceChildren();
  state?.players.forEach(({name,points,ticketPoints,cars},i)=>{
    const row = document.createElement('li'), label = document.createElement('span');
    const dot = document.createElement('i'), score = document.createElement('strong');
    dot.className='dot'; dot.style.background=colors[state.players[i].paint];
    playerColor(label,i);
    label.append(dot,document.createTextNode(name)); score.textContent=points+' pts · '+(startingCars-cars)+' no mapa · '+cars+' na reserva';
    if (state.ended) score.textContent+=' · '+ticketPoints+' de bilhetes';
    row.append(label,score); $('scores').append(row);
  });
  if (state?.ended) {
    const max = Math.max(...state.players.map(p=>p.points));
    const winners = state.players.filter(p=>p.points===max).map(p=>p.name);
    if (winners.length===1) playerColor($('current'),state.players.findIndex(p=>p.points===max));
    $('current').textContent = winners.length===1 ? winners[0]+' venceu!' : 'Empate';
    $('goal').textContent = winners.join(', ')+' · '+max+' pontos';
    $('credits').textContent = '';
  }
  renderFinalResults();
  $('trains').replaceChildren();
  routeElements.forEach(({group,option,centers,angle,width,a,b},id)=>{
    const owner = state?.owners[id] ?? -1;
    const available=id<corridorCount || owner>=0 ||
      Boolean(state && !drafting && !state.ended && parallelAccess(state,index,id));
    const focused=focusStation==null || focusStation===a || focusStation===b;
    const visible=available && focused && (!onlyMine || owner===viewer);
    if (!visible && id===selected) selected=null;
    group.classList.toggle('selected',id===selected);
    group.classList.toggle('occupied',owner>=0);
    group.style.display=visible ? '' : 'none';
    option.hidden=!visible;
    option.disabled=!visible;
    const routePaint = owner>=0 ? colors[state.players[owner].paint] : cardTypes[routeColor(id)][1];
    group.style.setProperty('--route-paint',routePaint);
    group.style.setProperty('--route-complement',complementary(routePaint));
    if (owner<0 || !visible) return;
    centers.forEach(([x,y],i)=>{
      const car=document.createElement('span');
      car.className=state.engines[id] && i===0 ? 'train locomotive' : 'train';
      car.title=routeName(pairs[id])+(id>=corridorCount ? ' · via paralela' : '')+
        ' · Operada por '+state.players[owner].name;
      car.addEventListener('click',()=>choose(id));
      for (const face of ['base','roof','side near','side far','end front','end rear']) {
        const panel = document.createElement('i');
        panel.className = face;
        car.append(panel);
      }
      car.style.left=(x/8.6)+'%';
      car.style.top=(y/5.7)+'%';
      car.style.width=(width/8.6)+'%';
      car.style.setProperty('--car',colors[state.players[owner].paint]);
      car.style.setProperty('--angle',angle+'rad');
      $('trains').append(car);
    });
  });
  const route = pairs[selected], owner = state?.owners[selected] ?? -1;
  $('route-picker').value = selected ?? '';
  playerColor($('route-info'),owner>=0 ? owner : null);
  const kind = route && cardTypes[routeColor(selected)];
  const required = route && Math.ceil(route[2]/2);
  $('route-info').textContent = route ? routeName(route)+(selected>=corridorCount ? ' · via paralela' : '')+
    ' · '+(owner>=0 ? 'Operada por '+state.players[owner].name : route[2]+' créditos · '+route[2]+' vagões da reserva')+
    ' · '+required+' × '+kind[2]+' '+kind[0] : 'Selecione um trecho para ver o custo.';
  $('fund').disabled = !allowed;
  $('build').disabled = !allowed || !route || owner>=0 || player.funds<route[2] || player.cars<route[2] || !payment(player,selected,state.mapCode) || !parallelAccess(state,index,selected);
  updateChatAvailability();
}
const sessionKey='cerrado-session';
function loadSession() {
  for (const name of ['sessionStorage','localStorage']) {
    try {
      const value=window[name].getItem(sessionKey);
      if (value) return value;
    } catch { /* Alguns navegadores restringem armazenamento em arquivos locais. */ }
  }
  return null;
}
function saveSession(value) {
  for (const name of ['localStorage','sessionStorage']) {
    try {
      if (value) window[name].setItem(sessionKey,JSON.stringify(value));
      else window[name].removeItem(sessionKey);
    } catch { /* Alguns navegadores restringem armazenamento em arquivos locais. */ }
  }
}
async function api(path, data) {
  if (location.protocol==='file:') throw Error('Inicie o servidor para usar o modo online.');
  let response;
  try {
    response = await fetch('/api/'+path,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data),signal:AbortSignal.timeout(5500)});
  } catch {
    throw Error('Servidor indisponível. Verifique a conexão.');
  }
  if (!(response.headers.get('content-type') || '').includes('application/json')) throw Error('Abra o endereço do servidor do jogo.');
  const result = await response.json();
  if (!response.ok) {
    const error=Error(result.error);
    error.status=response.status;
    throw error;
  }
  return result;
}
function paintOptions(select,current,unavailable=[]) {
  const signature=JSON.stringify([current,unavailable]);
  if (select.dataset.paints===signature && select.value===(current==null?'':String(current))) return;
  select.dataset.paints=signature;
  select.replaceChildren(new Option('Escolha sua cor',''));
  paintNames.forEach((name,i)=>{
    const choice=new Option(name,i);
    choice.disabled=unavailable.includes(i)&&i!==current;
    select.add(choice);
  });
  select.value=current ?? '';
  paintElement(select,current);
}
function showVote(election, members, index) {
  $('lobby').close();
  const select=$('vote-select');
  const signature=election.choices.join(',');
  if (select.dataset.choices!==signature) {
    select.replaceChildren(new Option('Selecione um mapa',''));
    election.choices.forEach(code=>select.add(new Option(mapFor(code).name,code)));
    select.dataset.choices=signature;
  }
  const active=!election.myVote;
  const voter=members[index];
  $('vote-title').textContent=session ? 'Votar no mapa' : 'Voto de '+voter.name;
  paintElement($('vote-title'),session ? null : voter.paint);
  $('vote-status').textContent=(election.round===2 ? 'Desempate entre os mapas mais votados. ' : '')+
    election.voted+' de '+members.length+' votos registrados.'+(active?'':' Aguarde os demais.');
  $('vote-field').hidden=!active;
  $('vote-send').disabled=!active || !select.value;
  if (!$('vote').open) $('vote').showModal();
}
function apply(snapshot,animate=true) {
  syncChat(snapshot.chat);
  updateChatAvailability();
  if (state && (!snapshot.state || snapshot.state.version<=state.version)) return;
  session.index = snapshot.index;
  saveSession(session);
  const firstBoard=!state;
  state = snapshot.state;
  if (state) {
    $('vote').close(); $('lobby').close(); render();
    if (firstBoard) showBoard(state.mapCode,null,animate);
    return;
  }
  if (snapshot.election) { showVote(snapshot.election,snapshot.members,snapshot.index); return; }
  $('vote').close();
  $('share-url').textContent='Endereço da sala: http://'+snapshot.shareIp+':'+snapshot.sharePort;
  $('room-capacity').textContent=snapshot.members.length+' de '+snapshot.capacity+' vagas ocupadas';
  $('join-requests').hidden=!snapshot.requests.length;
  const pending=$('pending-players');
  const requests=JSON.stringify(snapshot.requests);
  if (pending.dataset.requests!==requests) {
    pending.dataset.requests=requests;
    pending.replaceChildren(...snapshot.requests.map(({id,name})=>{
      const item=document.createElement('li');
      item.append(document.createTextNode(name+' '));
      for (const [accept,label] of [[true,'Aprovar'],[false,'Recusar']]) {
        const button=document.createElement('button');
        button.textContent=label;
        button.setAttribute('aria-label',label+' pedido de '+name);
        button.onclick=()=>decideJoin(id,accept);
        item.append(button);
      }
      return item;
    }));
  }
  $('members').replaceChildren(...snapshot.members.map(({name,paint})=>{
    const item=document.createElement('li');
    item.textContent=name+(paint==null?' · escolhendo cor':' · '+paintNames[paint]);
    paintElement(item,paint);
    return item;
  }));
  paintOptions($('lobby-paint'),snapshot.members[snapshot.index].paint,snapshot.members.map(p=>p.paint));
  $('start').disabled = !snapshot.host || snapshot.members.length<2 || snapshot.members.some(p=>p.paint==null);
  $('lobby-status').textContent = snapshot.host ? 'Todos precisam escolher uma cor para iniciar.' : 'Aguardando o anfitrião iniciar a votação.';
  if (!$('lobby').open) $('lobby').showModal();
}
function track(value) {
  session=value; saveSession(value); clearInterval(poll);
  connectEvents();
  let pending=false;
  poll=setInterval(async ()=>{
    if (busy || pending) return;
    pending=true;
    const epoch=lobbyEpoch;
    try {
      const snapshot=await api('status',value);
      if (session===value && !busy && epoch===lobbyEpoch) apply(snapshot);
    } catch (error) {
      if (session===value && !busy && epoch===lobbyEpoch) {
        if (error.status===410) {
          $('vote').close(); $('lobby').close(); $('handoff').close(); $('end-confirm').close();
          reset();
          $('opening-notice').textContent=error.message;
        } else $(state ? 'event' : $('vote').open ? 'vote-status' : 'lobby-status').textContent=error.message;
      }
    } finally { pending=false; }
  },1500);
}
function reset() {
  $('completed').close();
  events?.close(); events=null;
  if (titleTimer) { clearInterval(titleTimer); titleTimer=null; document.title=baseTitle; }
  $('chat-log').replaceChildren();
  chatSeen.clear(); chatIds.length=0; clearChatBadge(); localChatSeq=0;
  $('chat-input').value=''; $('chat-send').disabled=true; setChatStatus('');
  $('results').close();
  $('my-routes-only').checked=false;
  clearInterval(poll); clearTimeout(zoomTimer);
  $('opening').classList.remove('zooming');
  $('brazil-states').querySelector('.destination-shape')?.classList.remove('destination-shape');
  $('zoom-label').textContent='';
  $('opening-notice').textContent='';
  $('opening').hidden=false; $('game-board').hidden=true;
  session=null; state=null; selected=null; revealed=false; localElection=null; localPlayers=null; saveSession(null); render();
}
async function move(action,route=selected) {
  if (busy || !state) return;
  busy=true; render();
  try {
    if (session) apply(await api('move',{...session,action,route,version:state.version}));
    else {
      Rail.play(state,state.turn,action,route);
      if (action!=='tickets') handoff();
    }
    tone(action==='build'?390:260,true);
  } catch (error) {
    busy=false; render(); $('event').textContent=error.message; return;
  }
  busy=false; render();
}
$('handoff').addEventListener('cancel',event=>event.preventDefault());
$('reveal').onclick=()=>{ revealed=true; $('handoff').close(); render(); };
const chosenTickets=()=>Array.from($('ticket-list').querySelectorAll('input:checked'),input=>Number(input.value));
$('ticket-list').addEventListener('change',()=>{
  $('keep').disabled=busy || chosenTickets().length<2;
});
$('ticket-form').onsubmit=async event=>{
  event.preventDefault();
  if (busy || !$('ticket-form').checkValidity()) return;
  const selection=chosenTickets();
  busy=true; $('keep').disabled=true;
  try {
    if (session) apply(await api('tickets',{...session,selection}));
    else { Rail.keepTickets(state,localIndex(),selection); handoff(); }
    tone(350,true);
  } catch(error) {
    $('ticket-status').textContent=error.message;
  } finally {
    busy=false;
    $('keep').disabled=chosenTickets().length<2;
    if (state?.phase==='play') render();
  }
};
for(let i=2;i<=6;i++) $('count').add(new Option(i,i));
function nameFields() {
  const previous=Array.from($('names').querySelectorAll('input'),input=>input.value);
  $('names').replaceChildren();
  for(let i=0;i<Number($('count').value);i++){
    const label=document.createElement('label'), input=document.createElement('input');
    const paint=document.createElement('select');
    label.textContent='Jogador '+(i+1); input.maxLength=24;
    input.value=previous[i] ?? 'Operadora '+(i+1);
    paint.setAttribute('aria-label','Cor do jogador '+(i+1));
    paintOptions(paint,i);
    paint.options[0].disabled=true;
    paint.dataset.previous=i;
    paint.onchange=()=>{
      const next=Number(paint.value), old=Number(paint.dataset.previous);
      const duplicate=Array.from($('names').querySelectorAll('select')).find(other=>other!==paint && other.value===paint.value);
      if(duplicate) {
        duplicate.value=old;
        duplicate.dataset.previous=old;
        paintElement(duplicate,old);
      }
      paint.dataset.previous=next;
      paintElement(paint,next);
    };
    label.append(input,paint);
    $('names').append(label);
  }
}
function localVote() {
  const index=localElection.ballots.indexOf(null);
  showVote({...localElection,voted:localElection.ballots.filter(Boolean).length},localPlayers,index);
}
let setupEpoch=0, roomChoices=[], joinRequest=null;
function updateSetupSubmit() {
  const mode=$('mode').value;
  $('setup-submit').disabled=Boolean(joinRequest) || (mode==='host' && !$('lan-ip').value) ||
    (mode==='join' && !$('available-rooms').value);
}
async function refreshOnlineFields() {
  const mode=$('mode').value, epoch=++setupEpoch;
  $('setup-status').textContent='';
  $('setup-error').textContent='';
  if (mode==='local') return;
  if (location.protocol==='file:') {
    $('setup-status').textContent='Inicie o servidor e abra o endereço exibido no terminal para jogar em rede.';
    return;
  }
  try {
    if (mode==='host') {
      const config=await api('setup',{});
      if (epoch!==setupEpoch) return;
      $('lan-ip').replaceChildren(...config.addresses.map(ip=>new Option(ip,ip)));
      $('lan-ip').value=config.ip;
      $('lan-port').value=config.port;
    } else {
      $('setup-status').textContent='Buscando salas na rede…';
      const select=$('available-rooms'), previous=select.value;
      const rooms=await api('rooms',{});
      if (epoch!==setupEpoch) return;
      roomChoices=rooms;
      const key=room=>room.ip+':'+room.port+'/'+room.code;
      select.replaceChildren(new Option('Selecione uma sala',''),...rooms.map(room=>
        new Option(room.name+' · '+room.players+'/'+room.capacity+' · '+room.ip+':'+room.port,key(room))));
      if (rooms.some(room=>key(room)===previous)) select.value=previous;
      $('setup-status').textContent=rooms.length ? '' : 'Nenhuma sala aberta com vaga encontrada.';
    }
  } catch (error) {
    if (epoch===setupEpoch) $('setup-error').textContent=error.message;
  } finally {
    if (epoch===setupEpoch) updateSetupSubmit();
  }
}
function modeFields() {
  const mode=$('mode').value;
  $('setup-submit').textContent=mode==='host' ? 'Criar sala' : mode==='join' ? 'Pedir para entrar' : 'Começar';
  $('local-fields').hidden=mode!=='local'; $('online-fields').hidden=mode==='local';
  $('host-fields').hidden=mode!=='host';
  $('join-fields').hidden=mode!=='join';
  updateSetupSubmit();
  if ($('setup').open) refreshOnlineFields();
}
$('available-rooms').onchange=updateSetupSubmit;
$('refresh-rooms').onclick=refreshOnlineFields;
$('count').addEventListener('change',nameFields);
$('mode').addEventListener('change',modeFields);
$('route-picker').addEventListener('change',event=>choose(event.target.value==='' ? null : Number(event.target.value)));
$('new-tickets').onclick=()=>move('tickets');
$('fund').onclick=()=>move('fund'); $('build').onclick=()=>move('build');
$('sound').onclick=()=>{ sound=!sound; $('sound').textContent=sound?'Som ligado':'Som desligado'; $('sound').setAttribute('aria-pressed',sound); if(sound) tone(330); };
$('chat-input').addEventListener('input',()=>{ $('chat-send').disabled=!$('chat-input').value.trim(); });
$('chat-input').addEventListener('keydown',event=>{
  if (event.key==='Enter' && !event.shiftKey) {
    event.preventDefault();
    $('chat-form').requestSubmit();
  }
});
$('chat-input').addEventListener('focus',clearChatBadge);
$('chat-focus').onclick=()=>{
  clearChatBadge();
  $('chat-panel').scrollIntoView({behavior:'smooth',block:'start'});
  $('chat-input').focus();
};
$('chat-form').onsubmit=async event=>{
  event.preventDefault();
  const input=$('chat-input'), button=$('chat-send');
  if (!input.value.trim() || button.disabled) return;
  button.disabled=true; input.disabled=true;
  try {
    await sendChat(input.value);
    input.value='';
    setChatStatus(events?.readyState===1 ? 'Ao vivo' : 'Enviado');
  } catch(error) {
    setChatStatus(error.message);
  } finally {
    button.disabled=!input.value.trim();
    input.disabled=false;
    input.focus();
  }
};
document.addEventListener('visibilitychange',()=>{
  if (document.hidden) return;
  if (titleTimer) { clearInterval(titleTimer); titleTimer=null; document.title=baseTitle; }
  clearChatBadge();
});
$('tilt').onclick=()=>{ const flat=$('scene').classList.toggle('flat'); $('tilt').textContent=flat?'Vista plana':'Vista 3D'; $('tilt').setAttribute('aria-pressed',!flat); };
$('help').onclick=()=>$('rules').showModal();
$('license-tab').onclick=()=>$('license').showModal();
$('opening-license').onclick=$('license-tab').onclick;
$('configure-ip').onclick=()=>{
  $('mode').value='host'; $('menu').click(); $('lan-ip').focus();
};
$('end-game').onclick=()=>{
  $('end-error').textContent='';
  $('end-message').textContent=!session ? 'A partida local será encerrada e você voltará à abertura.' :
    session.index===0 ? 'A sala e a partida serão encerradas para todos os jogadores.' :
      'Você voltará à abertura. Pode retomar sua sala enquanto ela estiver aberta.';
  $('end-confirm').showModal();
};
$('end-cancel').onclick=()=>$('end-confirm').close();
$('end-accept').onclick=async ()=>{
  if (busy) return;
  busy=true;
  $('end-accept').disabled=true;
  try {
    if (session?.index===0) await api('close',session);
    else if(session) parkedSession=session;
    $('end-confirm').close();
    reset();
    $('resume-room').hidden=!parkedSession;
    $('opening-notice').textContent='Você voltou à abertura.';
  } catch(error) {
    $('end-error').textContent=error.message;
  } finally {
    busy=false;
    $('end-accept').disabled=false;
  }
};
$('resume-room').onclick=async ()=>{
  if (!parkedSession || busy) return;
  busy=true;
  try {
    const snapshot=await api('status',parkedSession);
    track(parkedSession);
    parkedSession=null;
    $('resume-room').hidden=true;
    apply(snapshot,false);
    $('opening-notice').textContent='Sessão retomada.';
  } catch(error) {
    $('opening-notice').textContent=error.message;
    if (error.status===410) {parkedSession=null; $('resume-room').hidden=true;}
  } finally {busy=false;}
};
$('play-now').onclick=()=>$('menu').click();
$('menu').onclick=()=>{ $('setup').showModal(); modeFields(); };
$('cancel').onclick=()=>{ if (joinRequest) joinRequest.cancel=true; else $('setup').close(); };
$('setup').addEventListener('cancel',event=>{
  if (joinRequest) { event.preventDefault(); joinRequest.cancel=true; }
});
async function decideJoin(id,accept) {
  if (!session || busy) return;
  lobbyEpoch++; busy=true;
  try { apply(await api('admit',{...session,id,accept})); }
  catch(error) { $('lobby-status').textContent=error.message; }
  finally { busy=false; }
}
$('lobby-paint').onchange=async event=>{
  if (!session || busy || event.target.value==='') return;
  lobbyEpoch++; busy=true;
  event.target.disabled=true;
  try { apply(await api('paint',{...session,paint:Number(event.target.value)})); }
  catch(error) { $('lobby-status').textContent=error.message; }
  finally { busy=false; event.target.disabled=false; }
};
$('vote-select').onchange=()=>{ $('vote-send').disabled=!$('vote-select').value; };
$('vote').addEventListener('cancel',event=>event.preventDefault());
$('vote-form').onsubmit=async event=>{
  event.preventDefault();
  const select=$('vote-select'),mapCode=select.value;
  if (busy || !mapCode) return;
  lobbyEpoch++; busy=true; $('vote-send').disabled=true;
  try {
    if (session) {
      const snapshot=await api('vote',{...session,mapCode});
      select.value='';
      apply(snapshot);
    } else {
      Rail.castVote(localElection,localElection.ballots.indexOf(null),mapCode);
      select.value='';
      if (localElection.winner) {
        state=Rail.create(localPlayers.map(p=>p.name),localElection.winner,localPlayers.map(p=>p.paint));
        if (localElection.random) state.log.unshift('Mapa sorteado após o segundo empate.');
        $('vote').close(); render(); showBoard(state.mapCode,handoff);
      } else localVote();
    }
    tone(365,true);
  } catch(error) {
    $('vote-status').textContent=error.message;
    $('vote-send').disabled=!select.value;
  } finally { busy=false; render(); }
};
$('vote-exit').onclick=()=>{ if(session) $('leave').click(); else {reset(); $('vote').close(); $('setup').showModal();} };
$('leave').onclick=async ()=>{
  if (!session || busy) return;
  lobbyEpoch++; busy=true;
  $('leave').disabled=true;
  try { await api('leave',session); }
  catch (error) { $('lobby-status').textContent=error.message; }
  reset(); $('lobby').close(); $('vote').close(); $('menu').click(); $('leave').disabled=false; busy=false;
};
$('lobby').addEventListener('cancel',event=>event.preventDefault());
$('start').onclick=async ()=>{
  if (!session || busy) return;
  lobbyEpoch++; busy=true;
  $('start').disabled=true;
  try { apply(await api('start',session)); tone(370,true); }
  catch(error) { $('lobby-status').textContent=error.message; $('start').disabled=false; }
  finally { busy=false; }
};
function joinLobby(snapshot) {
  reset();
  track({code:snapshot.code,token:snapshot.token,index:snapshot.index});
  $('setup').close();
  apply(snapshot);
}
async function requestEntry(code,name) {
  const waiting={cancel:false};
  joinRequest=waiting;
  $('mode').disabled=true;
  $('refresh-rooms').disabled=true;
  $('cancel').textContent='Cancelar pedido';
  $('setup-status').textContent='Aguardando a confirmação do anfitrião…';
  updateSetupSubmit();
  try {
    const {id}=await api('join',{code,name});
    while (true) {
      const result=await api(waiting.cancel ? 'join-cancel' : 'join-status',{code,id});
      if (result.status==='approved') {
        const {token}=result.snapshot;
        joinLobby(await api('status',{code,token}).then(snapshot=>({...snapshot,token})));
        return;
      }
      if (result.status==='cancelled') return;
      if (result.status==='denied') throw Error('O anfitrião recusou o pedido de entrada.');
      if (result.status==='expired') throw Error('O pedido expirou. Tente novamente.');
      if (result.status==='closed') throw Error('A sala ficou cheia ou a votação já começou.');
      await new Promise(resolve=>setTimeout(resolve,1200));
    }
  } finally {
    joinRequest=null;
    $('mode').disabled=false;
    $('refresh-rooms').disabled=false;
    $('cancel').textContent='Voltar';
    $('setup-status').textContent='';
    updateSetupSubmit();
  }
}
$('setup-form').onsubmit=async event=>{
  event.preventDefault();
  if (joinRequest) return;
  $('setup-submit').disabled=true; $('setup-error').textContent='';
  try {
    const mode=$('mode').value;
    if(mode==='local'){
      reset();
      localPlayers=Array.from($('names').children,(label,i)=>({
        name:label.querySelector('input').value.trim() || 'Operadora '+(i+1),
        paint:Number(label.querySelector('select').value)
      }));
      localElection=Rail.createElection(localPlayers.length);
      $('vote-select').value='';
      $('setup').close(); localVote();
    } else {
      if (location.protocol==='file:') {
        throw Error('Inicie o servidor pelo terminal, abra o endereço exibido e volte a criar ou entrar na sala.');
      }
      const name=$('nickname').value.trim();
      if (mode==='host') {
        joinLobby(await api('host',{name,ip:$('lan-ip').value,port:Number($('lan-port').value),
          capacity:Number($('capacity').value)}));
      } else {
        const room=roomChoices.find(candidate=>candidate.ip+':'+candidate.port+'/'+candidate.code===$('available-rooms').value);
        if (!room) throw Error('Selecione uma sala com vaga.');
        if (!room.local) {
          const invitation=encodeURIComponent(JSON.stringify({code:room.code,name}));
          location.assign('http://'+room.ip+':'+room.port+'/#entrar='+invitation);
          return;
        }
        await requestEntry(room.code,name);
      }
    }
    tone(310,true);
  } catch(error) { $('setup-error').textContent=error.message; }
  finally { updateSetupSubmit(); }
};
nameFields(); modeFields(); render();
(async ()=>{
  const invitation=location.hash.startsWith('#entrar=') ? location.hash.slice(8) : '';
  if (invitation && location.protocol!=='file:') {
    history.replaceState(null,'',location.pathname+location.search);
    $('mode').value='join';
    modeFields();
    $('setup').showModal();
    try {
      const {code,name}=JSON.parse(decodeURIComponent(invitation));
      if (!/^[A-F0-9]{8}$/.test(code) || typeof name!=='string') throw Error('Convite inválido.');
      $('nickname').value=name;
      await requestEntry(code,name);
      if ($('setup').open) await refreshOnlineFields();
    } catch(error) {
      await refreshOnlineFields();
      $('setup-error').textContent=error.message;
    }
    return;
  }
  const raw=loadSession();
  if (raw) {
    let saved=null;
    try { saved=JSON.parse(raw); } catch { saveSession(null); }
    if (saved) {
      try {
        const snapshot=await api('status',saved);
        track(saved); apply(snapshot,false);
        $('opening-notice').textContent='Sessão retomada automaticamente.';
        return;
      } catch(error) {
        if (error.status===410) {
          saveSession(null);
          $('opening-notice').textContent='A sala salva não existe mais. Crie ou entre em outra.';
        } else {
          parkedSession=saved;
          $('resume-room').hidden=false;
          $('opening-notice').textContent='Servidor indisponível. Use Retomar sala quando a conexão voltar.';
        }
      }
    }
  }
})();

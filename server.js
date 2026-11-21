'use strict';
const http = require('http');
const dgram = require('dgram');
const {randomBytes} = require('crypto');
const {readFileSync} = require('fs');
const {join} = require('path');
const Rail = require('./engine');
const rooms = new Map();
const files = new Map([
  ['/', ['index.html','text/html']], ['/index.html',['index.html','text/html']],
  ['/style.css',['style.css','text/css']], ['/game.js',['game.js','text/javascript']],
  ['/engine.js',['engine.js','text/javascript']], ['/maps.js',['maps.js','text/javascript']],
  ['/layout.js',['layout.js','text/javascript']], ['/shapes.js',['shapes.js','text/javascript']],
  ['/LICENSE',['LICENSE','text/plain']], ['/CARTOGRAFIA-LICENSE',['CARTOGRAFIA-LICENSE','text/plain']]
].map(([url,[name,type]])=>[url,[readFileSync(join(__dirname,name)),type+'; charset=utf-8']]));

const send = (response,status,body) => {
  response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
  response.end(JSON.stringify(body));
};
function snapshot(room,member) {
  const index=room.members.indexOf(member);
  let state = null;
  if (room.state) {
    const {deck,discard,ticketDeck,players,...openState} = room.state;
    state = {...openState, deckCount:deck.length, players:players.map((player,i)=>{
      const {offer,tickets,hand,...publicPlayer}=player;
      return i===index ? player : {...publicPlayer,ready:Boolean(tickets)};
    })};
  }
  const election=room.election && {
    choices:room.election.choices,round:room.election.round,random:room.election.random,
    winner:room.election.winner,voted:room.election.ballots.filter(Boolean).length,
    myVote:room.election.ballots[index]
  };
  return {code:room.code,index,host:index===0,shareIp:room.shareIp,sharePort:room.port,
    capacity:room.capacity,requests:index===0 && hasSpace(room) ? [...room.requests]
      .filter(([,entry])=>entry.status==='pending' && entry.expires>Date.now())
      .map(([id,entry])=>({id,name:entry.name})) : [],
    members:room.members.map(({name,paint})=>({name,paint})),election,state};
}
const hasSpace=room=>!room.state && !room.election && room.members.length<room.capacity;
const cleanName=(name,fallback)=>String(name ?? '').trim().slice(0,24)||fallback;
function enter(room,name) {
  if (!hasSpace(room)) throw Error('Sala cheia ou partida iniciada.');
  const member={name:cleanName(name,'Operadora '+(room.members.length+1)),
    paint:null, token:randomBytes(24).toString('hex')};
  room.members.push(member);
  room.touched=Date.now();
  return {...snapshot(room,member),token:member.token};
}
async function readBody(request) {
  const chunks=[];
  let size=0;
  for await (const chunk of request) {
    size+=chunk.length;
    if (size>4096) throw Error('Solicitação grande demais.');
    chunks.push(chunk);
  }
  const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!value || typeof value!=='object') throw Error('Solicitação inválida.');
  return value;
}
function removeRoom(room) {
  rooms.delete(room.code);
  room.listener?.close();
}
function openRoomListener(ip,port) {
  const listener=http.createServer(handleRequest);
  return new Promise((resolve,reject)=>{
    listener.once('error',reject);
    listener.listen(port,ip,()=>resolve(listener));
  }).catch(error=>{
    if (error.code==='EADDRINUSE') throw Error('A porta '+port+' já está em uso. Escolha outra.');
    if (['EACCES','EPERM'].includes(error.code)) throw Error('Sem permissão para usar a porta '+port+'. Escolha outra.');
    throw error;
  });
}
async function dispatch(action,data,request) {
  const socket=request.socket;
  const normalize=ip=>(ip || '').replace(/^::ffff:/,'');
  const local=normalize(socket.localAddress), remote=normalize(socket.remoteAddress);
  const hostname=request.headers.host?.split(':')[0];
  const onHost=(local===remote || remote==='::1' || remote.startsWith('127.')) &&
    (hostname==='localhost' || localHostAddresses().includes(hostname));
  if (action==='setup') {
    const addresses=shareAddresses();
    const choices=onHost ? localHostAddresses() : [...new Set([...addresses,local])];
    return {ip:addresses.includes(local) ? local : addresses[0] || choices[0],
      port:socket.localPort,addresses:choices};
  }
  if (action==='rooms') return discoverRooms(local);
  if (action==='host') {
    if (rooms.size>=500) throw Error('O servidor atingiu seu limite de salas.');
    let code;
    do {code=randomBytes(4).toString('hex').toUpperCase();} while(rooms.has(code));
    const {ip,port,capacity}=data;
    if (!localHostAddresses().includes(ip)) throw Error('Escolha um IPv4 disponível no computador do anfitrião.');
    if (!Number.isInteger(port) || port<1 || port>65535) throw Error('Escolha uma porta entre 1 e 65535.');
    if (!Number.isInteger(capacity) || capacity<2 || capacity>6) throw Error('Escolha entre 2 e 6 jogadores.');
    const primary=server.address();
    const needsListener=port!==primary.port || !(ip===primary.address || shareAddresses().includes(ip) ||
      (ip==='127.0.0.1' && ['0.0.0.0','::'].includes(primary.address)));
    if (needsListener && !onHost) throw Error('Para alterar IP ou porta, abra o jogo no computador do servidor.');
    const listener=needsListener ? await openRoomListener(ip,port) : null;
    const room={code,members:[],state:null,shareIp:ip,port,capacity,listener,requests:new Map()};
    rooms.set(code,room);
    return enter(room,data.name);
  }
  const room=rooms.get(data.code);
  if (!room) {
    const error=Error('A sala foi encerrada ou expirou.');
    error.status=410;
    throw error;
  }
  if (action==='join') {
    if (!hasSpace(room)) throw Error('Sala cheia ou partida iniciada.');
    const now=Date.now();
    for (const [id,entry] of room.requests) if (entry.expires<now) room.requests.delete(id);
    if (room.requests.size>=24) throw Error('Há muitos pedidos nesta sala. Tente novamente em instantes.');
    const id=randomBytes(24).toString('hex');
    room.requests.set(id,{name:cleanName(data.name,'Operadora'),status:'pending',expires:now+120000});
    return {id};
  }
  if (action==='join-status' || action==='join-cancel') {
    const entry=room.requests.get(data.id);
    if (!entry || entry.expires<Date.now()) return {status:'expired'};
    if (action==='join-cancel' && (entry.status==='pending' ||
      (entry.status==='approved' && !room.state && !room.election))) {
      if (entry.status==='approved') {
        room.members=room.members.filter(member=>member.token!==entry.snapshot.token);
      }
      room.requests.delete(data.id);
      return {status:'cancelled'};
    }
    if (entry.status==='approved') return {status:entry.status,snapshot:entry.snapshot};
    if (entry.status==='pending' && !hasSpace(room)) return {status:'closed'};
    return {status:entry.status};
  }
  const member=room.members.find(candidate=>candidate.token===data.token);
  if (!member) throw Error('Sessão inválida.');
  room.touched=Date.now();
  switch (action) {
    case 'close':
      if (room.members[0]!==member) throw Error('Somente o anfitrião pode encerrar a sala.');
      removeRoom(room);
      return {};
    case 'leave':
      if (room.members[0]===member) { removeRoom(room); return {}; }
      if (!room.state) {
        room.election=null;
        room.members.splice(room.members.indexOf(member),1);
      }
      return {};
    case 'admit': {
      if (room.members[0]!==member) throw Error('Somente o anfitrião pode responder aos pedidos.');
      const entry=room.requests.get(data.id);
      if (!entry || entry.status!=='pending' || entry.expires<Date.now()) throw Error('Este pedido expirou.');
      if (data.accept===true) {
        entry.snapshot=enter(room,entry.name);
        entry.status='approved';
      } else {
        entry.status='denied';
      }
      entry.expires=Date.now()+120000;
      break;
    }
    case 'paint':
      if (room.election || room.state || !Number.isInteger(data.paint) || !Rail.colors[data.paint] ||
          room.members.some(other=>other!==member && other.paint===data.paint)) throw Error('Cor indisponível.');
      member.paint=data.paint;
      break;
    case 'start':
      if (room.members[0]!==member || room.election || room.state || room.members.length<2 ||
          room.members.some(candidate=>candidate.paint===null)) throw Error('Aguarde todos escolherem uma cor.');
      room.election=Rail.createElection(room.members.length);
      break;
    case 'vote':
      if (!room.election || room.state) throw Error('A votação está fechada.');
      Rail.castVote(room.election,room.members.indexOf(member),data.mapCode);
      if (room.election.winner) {
        room.state=Rail.create(room.members.map(candidate=>candidate.name),room.election.winner,
          room.members.map(candidate=>candidate.paint));
        if (room.election.random) room.state.log.unshift('Mapa sorteado após o segundo empate.');
      }
      break;
    case 'tickets':
      Rail.keepTickets(room.state || {},room.members.indexOf(member),data.selection);
      break;
    case 'move':
      if (!room.state || room.state.version!==data.version) throw Error('O turno mudou. Tente novamente.');
      if (data.action==='build' && !Number.isInteger(data.route)) throw Error('Escolha um trecho.');
      Rail.play(room.state,room.members.indexOf(member),data.action,data.route);
      break;
    case 'status':
      break;
    default:
      throw Error('Ação desconhecida.');
  }
  return snapshot(room,member);
}
async function handleRequest(request,response) {
  const path=request.url.split('?')[0];
  const asset=files.get(path);
  if (request.method==='GET' && asset) {
    response.writeHead(200,{'Content-Type':asset[1],'X-Content-Type-Options':'nosniff'});
    response.end(asset[0]);
    return;
  }
  if (request.method!=='POST' || !path.startsWith('/api/')) {
    send(response,404,{error:'Página não encontrada.'});
    return;
  }
  try {
    if (request.headers.origin && request.headers.origin!=='http://'+request.headers.host) {
      return send(response,403,{error:'Origem inválida.'});
    }
    send(response,200,await dispatch(path.slice(5),await readBody(request),request));
  } catch(error) {
    if (!response.destroyed) send(response,error.status || 400,{error:error.message});
  }
}
const server=http.createServer(handleRequest);
setInterval(()=>{
  const now=Date.now();
  for (const room of rooms.values()) {
    if (room.touched<now-6*60*60*1000) removeRoom(room);
    else for (const [id,entry] of room.requests) if (entry.expires<now) room.requests.delete(id);
  }
},60_000).unref();
const port=Number(process.env.PORT || 81);
const {networkInterfaces}=require('os');
const {isIP}=require('net');
let host;
function lanAddresses() {
  return [...new Set(lanNetworks().map(entry=>entry.address))];
}
const localHostAddresses=()=>[...lanAddresses(),'127.0.0.1'];
const discoveryPort=43891;
const discoveryQuery='brasil-sabor-ticket:salas:v1';
const asNumber=ip=>ip.split('.').reduce((number,part)=>(number<<8)|Number(part),0);
function lanNetworks() {
  return Object.values(networkInterfaces()).flat().filter(entry=>entry && !entry.internal &&
    (entry.family==='IPv4' || entry.family===4));
}
function sameNetwork(ip,{address,netmask}) {
  return (asNumber(ip)&asNumber(netmask))===(asNumber(address)&asNumber(netmask));
}
function availableRooms() {
  return [...rooms.values()].filter(hasSpace).map(room=>({
    code:room.code,name:room.members[0].name,ip:room.shareIp,port:room.port,
    players:room.members.length,capacity:room.capacity
  }));
}
function advertiseRooms() {
  const socket=dgram.createSocket({type:'udp4',reuseAddr:true});
  socket.on('error',error=>{
    console.warn('Descoberta LAN indisponível: '+error.message);
    socket.close();
  });
  socket.on('message',(message,peer)=>{
    if (message.toString()!==discoveryQuery) return;
    const networks=lanNetworks().filter(network=>sameNetwork(peer.address,network));
    for (const room of availableRooms()) {
      if (networks.some(network=>room.ip===network.address)) {
        socket.send(JSON.stringify(room),peer.port,peer.address,()=>{});
      }
    }
  });
  socket.bind(discoveryPort);
  socket.unref();
}
let discoveryScan;
function discoverRooms(local) {
  if (!discoveryScan) {
    discoveryScan=scanLan().finally(()=>{discoveryScan=null;});
  }
  return discoveryScan.then(found=>[
    ...availableRooms().filter(room=>room.ip!=='127.0.0.1' || local==='127.0.0.1' || local==='::1')
      .map(room=>({...room,local:true})),
    ...found.filter(room=>!localHostAddresses().includes(room.ip))
  ]);
}
function scanLan() {
  const networks=lanNetworks();
  if (!networks.length) return Promise.resolve([]);
  return new Promise(resolve=>{
    const socket=dgram.createSocket('udp4');
    const found=new Map();
    const timer=setTimeout(finish,700);
    function finish() {
      clearTimeout(timer);
      socket.close();
      resolve([...found.values()]);
    }
    socket.once('error',finish);
    socket.on('message',(message,peer)=>{
      if (message.length>512 || peer.port!==discoveryPort || found.size>=500) return;
      try {
        const room=JSON.parse(message);
        if (isIP(room.ip)!==4 || !networks.some(network=>sameNetwork(peer.address,network) && sameNetwork(room.ip,network)) ||
            !/^[A-F0-9]{8}$/.test(room.code) || typeof room.name!=='string' || room.name.length>24 ||
            !Number.isInteger(room.port) || room.port<1 || room.port>65535 ||
            !Number.isInteger(room.capacity) || room.capacity<2 || room.capacity>6 ||
            !Number.isInteger(room.players) || room.players<1 || room.players>=room.capacity) return;
        found.set(room.ip+':'+room.port+'/'+room.code,room);
      } catch { /* Ignore unrelated datagrams. */ }
    });
    socket.bind(0,()=>{
      socket.setBroadcast(true);
      const broadcasts=new Set(networks.map(({address,netmask})=>{
        const number=asNumber(address)|~asNumber(netmask);
        return [24,16,8,0].map(shift=>(number>>>shift)&255).join('.');
      }));
      for (const address of broadcasts) socket.send(discoveryQuery,discoveryPort,address,()=>{});
    });
  });
}
function chooseHost() {
  const flag=process.argv.indexOf('--host');
  if (flag>=0) {
    const requested=process.argv[flag+1];
    if (!requested || isIP(requested)!==4) {
      console.error('Uso: node server.js --host <IPv4>');
      process.exitCode=1;
      return;
    }
    host=requested;
    server.listen(port,host);
    return;
  }
  if (process.env.HOST || !process.stdin.isTTY) {
    host=process.env.HOST || '0.0.0.0';
    server.listen(port,host);
    return;
  }
  const addresses=lanAddresses();
  const options=[...addresses,'127.0.0.1','0.0.0.0'];
  const suggested=options[0];
  console.log('Escolha o IP em que o servidor vai escutar.');
  options.forEach((address,index)=>{
    const label=address==='127.0.0.1' ? 'somente este computador' :
      address==='0.0.0.0' ? 'todas as interfaces IPv4' : 'rede local';
    console.log('  '+(index+1)+' · '+address+' ('+label+')');
  });
  const prompt=require('readline').createInterface({input:process.stdin,output:process.stdout});
  function ask() {
    prompt.question('Número ou endereço IPv4 [Enter: '+suggested+']: ',answer=>{
      const value=answer.trim();
      const address=!value ? suggested : /^\d+$/.test(value) ? options[Number(value)-1] : value;
      if (!address || isIP(address)!==4) {
        console.log('Escolha um número da lista ou informe um IPv4 válido.');
        ask();
        return;
      }
      prompt.close();
      host=address;
      server.listen(port,host);
    });
  }
  ask();
}
function shareAddresses() {
  const address=server.address();
  if (!address) return [];
  if (address.address==='0.0.0.0' || address.address==='::') return lanAddresses();
  if (/^(127\.|::1$)/.test(address.address)) return [];
  return [address.address];
}
function listening() {
  const address=server.address();
  const wildcard=address.address==='0.0.0.0' || address.address==='::';
  const urlFor=ip=>'http://'+(ip.includes(':') ? '['+ip+']' : ip)+':'+address.port;
  const url=urlFor(wildcard ? '127.0.0.1' : address.address);
  console.log('Brasil sabor Ticket: '+url);
  const shared=shareAddresses();
  shared.forEach(ip=>console.log('Endereço para os jogadores da LAN: '+urlFor(ip)));
  if (!shared.length) console.log('Nenhum endereço LAN disponível neste modo.');
  if (process.env.TRILHOS_OPEN_BROWSER==='1') {
    const {spawn}=require('child_process');
    const child=process.platform==='win32' ?
      spawn('rundll32.exe',['url.dll,FileProtocolHandler',url],{stdio:'ignore',windowsHide:true}) :
      spawn('xdg-open',[url],{stdio:'ignore'});
    child.on('error',()=>console.log('Abra no navegador: '+url));
    child.unref();
  }
}
function chooseReplacementPort(occupied) {
  const suggested=occupied===8081 ? 0 : 8081;
  const prompt=require('readline').createInterface({input:process.stdin,output:process.stdout});
  console.log('A porta '+occupied+' já está em uso.');
  function ask() {
    prompt.question('Escolha outra porta (1–65535 ou 0 para uma porta livre) [Enter: '+suggested+']: ',answer=>{
      const value=answer.trim();
      const replacement=value==='' ? suggested : Number(value);
      if ((value!=='' && !/^\d+$/.test(value)) || replacement>65535 || replacement===occupied) {
        console.log('Informe uma porta diferente entre 1 e 65535 ou digite 0.');
        ask();
        return;
      }
      prompt.close();
      server.listen(replacement,host);
    });
  }
  ask();
}
server.on('error',error=>{
  if (error.code==='EADDRINUSE' && process.stdin.isTTY) {
    chooseReplacementPort(Number(error.port));
    return;
  }
  if (process.env.TRILHOS_FALLBACK==='1' && [81,8081].includes(Number(error.port)) &&
      ['EACCES','EPERM','EADDRINUSE'].includes(error.code)) {
    server.listen(Number(error.port)===81 ? 8081 : 0,host);
    return;
  }
  if (error.code==='EADDRNOTAVAIL') console.error('Este IP não está disponível no computador. Reinicie e escolha um endereço da lista.');
  else console.error(error.message);
  process.exitCode=1;
});
server.on('listening',()=>{
  listening();
  advertiseRooms();
});
chooseHost();

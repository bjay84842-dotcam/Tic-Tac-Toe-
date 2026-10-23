const LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const $=id=>document.getElementById(id);
let nextStart='X',starter='X',autoT,board,turn,over,moves,startedAt,score={x:0,o:0,d:0},history=[];

const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* per-theme colours for the animated background (rgb triplets) */
const FX={
  neon:{name:'Neon',a:'60,150,255',m:'120,200,255',b:'170,90,255',l:'210,245,255'},
  paper:{name:'Paper',a:'37,99,235',m:'37,99,235',b:'225,29,72',l:'31,36,48'},
  lagoon:{name:'Lagoon',a:'34,184,176',m:'120,235,220',b:'255,209,102',l:'230,255,250'},
  aurora:{name:'Aurora',a:'94,242,192',m:'150,250,215',b:'255,95,162',l:'240,255,250'}
};
let P=FX.neon;
function setTheme(t){
  if(!FX[t])t='neon';
  document.documentElement.dataset.theme=t;P=FX[t];
  document.querySelectorAll('#themeMenu button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.t===t));
  $('themeLabel').textContent=P.name;$('themeSw').dataset.t=t;
  store.set('ttt-theme',t);
  try{if(reduce){fr=0;bgFrame(0)}}catch(e){}
}

/* dropdown buttons */
const ddClosers=[];
function dropdown(btnId,menuId){
  const b=$(btnId),m=$(menuId),wrap=b.parentElement;
  const set=o=>{m.hidden=!o;b.setAttribute('aria-expanded',o);wrap.classList.toggle('open',o)};
  ddClosers.push(set);
  b.onclick=e=>{e.stopPropagation();const o=m.hidden;ddClosers.forEach(f=>f(false));set(o);if(o){const s=m.querySelector('[aria-pressed="true"]');if(s)s.focus()}};
  return ()=>{set(false);b.focus()};
}
const closeTheme=dropdown('themeBtn','themeMenu'),closeLevel=dropdown('levelBtn','levelMenu');
document.addEventListener('click',e=>{if(!e.target.closest('.dd'))ddClosers.forEach(f=>f(false))});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){const o=document.querySelector('.dd.open .dd-btn');ddClosers.forEach(f=>f(false));if(o)o.focus()}
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    const m=document.querySelector('.dd.open .dd-menu');if(!m)return;
    const it=[...m.querySelectorAll('button')],i=it.indexOf(document.activeElement);
    e.preventDefault();it[(i+(e.key==='ArrowDown'?1:-1)+it.length)%it.length].focus();
  }
});
document.querySelectorAll('#themeMenu button').forEach(b=>b.onclick=()=>{setTheme(b.dataset.t);if(typeof sfx!=='undefined')sfx.ui();closeTheme()});

const cells=[];
for(let i=0;i<9;i++){
  const c=document.createElement('button');
  c.className='cell';c.setAttribute('aria-label','Cell '+(i+1));
  c.onclick=()=>{if(mode==='ai'&&turn==='O')return;play(i)};
  $('board').appendChild(c);cells.push(c);
}
function drawStrike(line){
  const svg=$('strike'),b=$('board').getBoundingClientRect();
  const a=cells[line[0]].getBoundingClientRect(),z=cells[line[2]].getBoundingClientRect();
  const x1=a.left+a.width/2-b.left,y1=a.top+a.height/2-b.top,x2=z.left+z.width/2-b.left,y2=z.top+z.height/2-b.top;
  const dx=x2-x1,dy=y2-y1,L=Math.hypot(dx,dy)||1,ex=dx/L*a.width*.38,ey=dy/L*a.height*.38;
  svg.setAttribute('viewBox','0 0 '+b.width+' '+b.height);
  svg.innerHTML='<line pathLength="1" x1="'+(x1-ex)+'" y1="'+(y1-ey)+'" x2="'+(x2+ex)+'" y2="'+(y2+ey)+'"/>';
}
function newGame(){
  setHistoryOpen(false);$('strike').innerHTML='';clearTimeout(aiT);clearTimeout(autoT);board=Array(9).fill('');turn=starter=(mode==='pvp'?nextStart:'X');over=false;moves=[];startedAt=Date.now();
  cells.forEach(c=>{c.textContent='';c.className='cell';c.disabled=false});
  render();
}
function render(){
  cells.forEach((c,i)=>{c.textContent=board[i];c.disabled=over||!!board[i]});
  $('sx').classList.toggle('active',!over&&turn==='X');
  $('so').classList.toggle('active',!over&&turn==='O');
  $('nx').textContent=score.x;$('no').textContent=score.o;$('nd').textContent=score.d;
  const nb=$('again'),isNew=over||fresh;
  nb.textContent=isNew?'New game':'End game';
  nb.classList.toggle('primary',isNew);
  if(!over)$('msg').textContent=mode==='ai'?(turn==='X'?'Your turn':'Computer is thinking…'):'Player '+turn+'’s turn';
}
function play(i){
  if(over||board[i])return;
  board[i]=turn;moves.push(i);fresh=false;sfx[turn==='X'?'x':'o']();
  cells[i].className='cell '+turn.toLowerCase();
  const line=LINES.find(l=>l.every(k=>board[k]===turn));
  if(line){finish(turn,line);return}
  if(board.every(Boolean)){finish(null);return}
  turn=turn==='X'?'O':'X';render();aiMove();
}
function finish(w,line){
  over=true;
  if(mode==='pvp')nextStart=w?(w==='X'?'O':'X'):(starter==='X'?'O':'X'); /* loser starts next; on a draw, swap starter */
  if(w){
    score[w.toLowerCase()]++;
    line.forEach(k=>cells[k].classList.add('win'));drawStrike(line);
    if(mode==='ai'&&w==='O'){$('msg').textContent='Computer wins. Try again!';sfx.lose();showLose()}
    else{$('msg').textContent=mode==='ai'?'You win!':'Player '+w+' wins!';sfx.win();showWin(w);if(mode!=='ai')sadMini(w==='X'?'o':'x')}
  }else{score.d++;sfx.draw();showDraw();$('msg').textContent='It’s a draw. Play again?'}
  history.unshift({r:w||'draw',v:mode==='ai'?level:'2P',m:moves.length,t:Math.max(1,Math.round((Date.now()-startedAt)/1000)),at:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
  history=history.slice(0,30);
  store.set('ttt-history',history);store.set('ttt-score',score);
  render();renderHistory();
  scheduleNext();
}

const NEXT_DELAY=3000;
function scheduleNext(){
  clearTimeout(autoT);
  autoT=setTimeout(function go(){
    if(!over)return;
    if(histOpen||exitOpen){autoT=setTimeout(go,1000);return}
    newGame();
  },NEXT_DELAY);
}
function endGame(){
  if(over)return;
  clearTimeout(aiT);clearTimeout(autoT);over=true;sfx.end();
  if(moves.length){
  history.unshift({r:'ended',v:mode==='ai'?level:'2P',m:moves.length,t:Math.max(1,Math.round((Date.now()-startedAt)/1000)),at:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});
  history=history.slice(0,30);
  store.set('ttt-history',history);
  }
  render();
  $('msg').textContent='Game ended. Press New game to play again.';
  renderHistory();
}const NG=['#ff9f1c','#2ec4b6','#e71d36','#9b5de5','#06d6a0','#f15bb5'];let ngI=-1;
$('again').onclick=()=>{
  const b=$('again');
  if(!over&&!fresh){endGame();return}
  fresh=false;sfx.ui();
  ngI=(ngI+1)%NG.length;
  b.style.setProperty('--ng',NG[ngI]);b.style.setProperty('--ngt','#111');
  b.classList.remove('flash');void b.offsetWidth;b.classList.add('flash');
  newGame();
};

let histOpen=false;
function paintHistBtn(){
  const b=$('histBtn');
  b.textContent=histOpen?'← Back':'📜'+(history.length?' '+history.length:'');
  b.setAttribute('aria-label',histOpen?'Back to game':'History');b.title=histOpen?'Back to game':'History';
  b.setAttribute('aria-expanded',histOpen);
}
function setHistoryOpen(o){
  histOpen=o;$('board').classList.toggle('veil',o);$('history').hidden=!o;paintHistBtn();
}
$('histBtn').onclick=()=>{if(sfx.ui)sfx.ui();setHistoryOpen(!histOpen)};
function renderHistory(){
  paintHistBtn();
  const ul=$('list');ul.innerHTML='';
  if(!history.length){ul.innerHTML='<li class="empty">No games yet. Finish a round to see it here.</li>';return}
  history.forEach((h,i)=>{
    const li=document.createElement('li');
    li.className=h.r==='draw'?'':h.r.toLowerCase();
    const n=history.length-i;
    const ai=h.v&&h.v!=='2P';
    li.innerHTML='<span>Game '+n+': <b>'+(h.r==='draw'?'Draw':h.r==='ended'?'Ended early':ai?(h.r==='X'?'You won':'Computer won'):'Player '+h.r+' won')+'</b><small>'+(ai?'vs '+h.v+' computer, ':'')+h.m+' moves, '+h.t+'s</small></span><small>'+h.at+'</small>';
    ul.appendChild(li);
  });
}
$('clear').onclick=()=>{history=[];score={x:0,o:0,d:0};store.set('ttt-history',history);store.set('ttt-score',score);renderHistory();render()};


function sadRain(em){
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  em=em||['😢','😭','☔','💧'];
  for(let i=0;i<22;i++){
    const t=document.createElement('span');
    t.className='tear';t.textContent=em[i%em.length];
    t.style.left=(Math.random()*96)+'vw';
    t.style.animationDuration=(2.2+Math.random()*1.6)+'s';
    t.style.animationDelay=(Math.random()*.9)+'s';
    document.body.appendChild(t);setTimeout(()=>t.remove(),4800);
  }
}
function showDraw(){
  const b=$('banner');
  b.innerHTML='<span class="dr-ico" aria-hidden="true">🤝</span>Draw!<small>Nobody wins this round</small>';
  b.classList.remove('show');b.classList.add('draw');void b.offsetWidth;b.classList.add('show');
  sadRain(['✏️','🖍️','🤝','🎨']);
}
function showLose(){
  const e=document.createElement('div');
  e.className='sad-big';e.textContent='😭';e.setAttribute('aria-hidden','true');
  document.body.appendChild(e);setTimeout(()=>e.remove(),2700);
  sadRain();
}
function sadMini(side){
  const card=$(side==='x'?'sx':'so'),e=document.createElement('span');
  e.className='sad-mini';e.textContent='😢';e.setAttribute('aria-hidden','true');
  card.appendChild(e);setTimeout(()=>e.remove(),2700);
}

const cv=$('fx'),ctx=cv.getContext('2d');let parts=[],raf=null;
function size(){const d=devicePixelRatio||1;cv.width=innerWidth*d;cv.height=innerHeight*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',size);size();
function burst(x,y){
  const hue=Math.random()*360,n=90;
  for(let i=0;i<n;i++){
    const a=Math.PI*2*i/n,s=2+Math.random()*4.5;
    parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,hue:hue+Math.random()*40,r:2+Math.random()*1.5});
  }
}
function loop(){
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(0,0,innerWidth,innerHeight);
  ctx.globalCompositeOperation='lighter';
  parts=parts.filter(p=>p.life>0.02);
  for(const p of parts){
    p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.vx*=.985;p.vy*=.985;p.life*=.97;
    ctx.fillStyle='hsla('+p.hue+',100%,60%,'+p.life+')';
    ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.life+.5,0,7);ctx.fill();
  }
  if(parts.length||active)raf=requestAnimationFrame(loop);
  else{raf=null;ctx.clearRect(0,0,innerWidth,innerHeight)}
}
let active=false;
function showWin(w){
  const b=$('banner');
  b.innerHTML='You win!<small>'+(mode==='ai'?'You beat the '+level+' computer':'Player '+w+' takes the round')+'</small>';
  b.classList.remove('show','draw');void b.offsetWidth;b.classList.add('show');
  if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
  active=true;let n=0;
  const t=setInterval(()=>{
    burst(innerWidth*(.15+Math.random()*.7),innerHeight*(.15+Math.random()*.4));sfx.boom();
    if(++n>=12){clearInterval(t);active=false}
  },280);
  burst(innerWidth/2,innerHeight*.35);sfx.boom();
  if(!raf)loop();
}

const bgc=$('bg'),bx=bgc.getContext('2d'),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,T0=performance.now();
let W=0,H=0,S=1,dark=1,bgCol='#030a26',fr=0,px=0,py=0,tx=0,ty=0,bolt=null,boltAt=-9,boltNext=0;
function hexLum(c){c=c.trim();if(c[0]!=='#')return 0;if(c.length===4)c='#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3];return(parseInt(c.slice(1,3),16)*.3+parseInt(c.slice(3,5),16)*.6+parseInt(c.slice(5,7),16)*.1)/255}
function bgInit(){W=innerWidth;H=innerHeight;const d=Math.min(devicePixelRatio||1,2);bgc.width=W*d;bgc.height=H*d;bx.setTransform(d,0,0,d,0,0);S=Math.max(.55,Math.min(1.4,Math.min(W,H)/620))}
function haze(x,y,r,rgb,a){const g=bx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+rgb+','+a+')');g.addColorStop(1,'rgba('+rgb+',0)');bx.fillStyle=g;bx.beginPath();bx.arc(x,y,r,0,6.283);bx.fill()}
function genBolt(x1,y1,x2,y2,d,out){
  if(d<4){out.push([x1,y1,x2,y2]);return}
  const mx=(x1+x2)/2+(Math.random()-.5)*d,my=(y1+y2)/2+(Math.random()-.5)*d*.4;
  genBolt(x1,y1,mx,my,d/2,out);genBolt(mx,my,x2,y2,d/2,out);
  if(Math.random()<.2&&d>10)genBolt(mx,my,mx+(Math.random()-.5)*d*3,my+Math.random()*d*2,d/2,out);
}
function starburst(cx,cy,R,t){
  haze(cx,cy,R*1.1,P.a,.3);
  const n=40;bx.lineCap='round';
  for(let i=0;i<n;i++){
    const a=i/n*6.283+t*.08,L=R*(i%2?.62:.9)*(.88+.12*Math.sin(t*1.8+i*1.7)),r0=R*.12;
    const x0=cx+Math.cos(a)*r0,y0=cy+Math.sin(a)*r0,x1=cx+Math.cos(a)*L,y1=cy+Math.sin(a)*L;
    const lg=bx.createLinearGradient(x0,y0,x1,y1);lg.addColorStop(0,'rgba('+P.m+',0)');lg.addColorStop(1,'rgba('+P.l+',.95)');
    bx.strokeStyle=lg;bx.lineWidth=2.2*S;bx.beginPath();bx.moveTo(x0,y0);bx.lineTo(x1,y1);bx.stroke();
    bx.fillStyle='rgba('+P.l+',.9)';bx.beginPath();bx.arc(x1,y1,2.2*S,0,6.283);bx.fill();
  }
  haze(cx,cy,R*.18,P.l,.9);
}
function flare(cx,cy,L,t){
  const pulse=.8+.2*Math.sin(t*1.6);
  haze(cx,cy,L*.55,P.b,.4);
  for(const [ang,w] of [[-.7+Math.sin(t*.4)*.04,.07],[.75+Math.cos(t*.5)*.04,.07]]){
    for(const [sc,col] of [[w,'rgba('+P.m+','+.55*pulse+')'],[w*.3,'rgba('+P.l+','+.9*pulse+')']]){
      bx.save();bx.translate(cx,cy);bx.rotate(ang);bx.scale(1,sc);
      const rg=bx.createRadialGradient(0,0,0,0,0,L);rg.addColorStop(0,col);rg.addColorStop(1,'rgba('+P.m+',0)');
      bx.fillStyle=rg;bx.beginPath();bx.arc(0,0,L,0,6.283);bx.fill();bx.restore();
    }
  }
}
function lightning(ox,oy,t){
  if(!bolt||t-boltAt>boltNext){
    boltAt=t;boltNext=1.4+Math.random()*1.8;bolt=[];
    bolt.ex=(Math.random()-.5)*60*S;genBolt(0,0,bolt.ex,H*.42,110*S,bolt);
  }
  const age=t-boltAt,a=Math.min(1,Math.exp(-age*2.2)*(age<.5?.6+.4*Math.random():1)+.12);
  bx.save();bx.translate(ox,oy);bx.lineCap='round';
  for(const [w,al,col] of [[10*S,.14,P.a],[4*S,.4,P.m],[1.6*S,1,P.l]]){
    bx.strokeStyle='rgba('+col+','+al*a+')';bx.lineWidth=w;bx.beginPath();
    for(const s of bolt){bx.moveTo(s[0],s[1]);bx.lineTo(s[2],s[3])}
    bx.stroke();
  }
  haze(bolt.ex,H*.42,90*S,P.m,.35*a);
  bx.restore();
}
function swirl(cx,cy,R,t){
  const rings=11,hh=R*1.5,top=cy-hh/2;
  haze(cx,cy,R*1.3,P.a,.18);
  for(let k=0;k<rings;k++){
    const f=k/(rings-1),y=top+f*hh,rx=R*(.45+.55*Math.sin(f*Math.PI*.9+.2)),ry=rx*.28,a0=t*1.3+k*.55;
    for(const [w,al,col] of [[7*S,.12,P.m],[2*S,.9,P.l]]){
      bx.strokeStyle='rgba('+col+','+al*(.5+.5*Math.sin(t+k))+')';bx.lineWidth=w;
      bx.beginPath();bx.ellipse(cx,y,rx,ry,0,a0,a0+3.6);bx.stroke();
    }
  }
  for(let i=0;i<40;i++){
    const f=(i*.137+t*.12)%1,a=i*2.4+t*1.3,rx=R*(.45+.55*Math.sin(f*Math.PI*.9+.2));
    bx.fillStyle='rgba('+P.l+','+.8*Math.sin(f*Math.PI)+')';
    bx.beginPath();bx.arc(cx+Math.cos(a)*rx,top+f*hh+Math.sin(a)*rx*.28,1.6*S,0,6.283);bx.fill();
  }
}
function bgFrame(now){
  const t=reduce?6:(now-T0)/1000;
  if(fr++%30===0){bgCol=getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();dark=hexLum(bgCol)<.5?1:0}
  px+=(tx-px)*.05;py+=(ty-py)*.05;
  bx.globalCompositeOperation='source-over';bx.globalAlpha=1;
  bx.fillStyle=bgCol;bx.fillRect(0,0,W,H);
  bx.globalCompositeOperation=dark?'lighter':'source-over';bx.globalAlpha=dark?1:.6;
  const M=Math.max(W,H),br=.8+.2*Math.sin(t*.5);
  haze(W*.25+px*30,H*.3+py*30,M*.45,P.a,.2*br);
  haze(W*.78+px*30,H*.25+py*30,M*.4,P.b,.22*br);
  haze(W*.2,H*.85,M*.35,P.a,.16);
  haze(W*.8,H*.8,M*.35,P.b,.16);
  starburst(W*.2+px*25,H*.2+py*25,120*S,t);
  flare(W*.8+px*25,H*.2+py*25,170*S,t);
  lightning(W*.2+px*20,H*.55+py*20,t);
  swirl(W*.8+px*20,H*.78+py*20,80*S,t);
  if(!reduce)requestAnimationFrame(bgFrame);
}
bgInit();
addEventListener('resize',()=>{bgInit();if(reduce)bgFrame(0)});
addEventListener('pointermove',e=>{tx=e.clientX/W-.5;ty=e.clientY/H-.5});
requestAnimationFrame(bgFrame);

$('board').addEventListener('pointerdown',e=>{
  const c=e.target.closest('.cell');if(!c||c.disabled)return;
  const r=c.getBoundingClientRect(),s=document.createElement('span'),d=Math.max(r.width,r.height)/8;
  s.className='ripple';
  s.style.cssText='width:'+d+'px;height:'+d+'px;left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px';
  c.appendChild(s);setTimeout(()=>s.remove(),650);
});
$('board').addEventListener('pointermove',e=>{
  const c=e.target.closest('.cell');if(!c)return;
  const r=c.getBoundingClientRect();
  c.style.setProperty('--mx',(e.clientX-r.left)+'px');c.style.setProperty('--my',(e.clientY-r.top)+'px');
});

/* sound (Web Audio, no files needed) */
let sfxOn=store.get('ttt-sound')!==false,AC=null;
function ac(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}if(AC&&AC.state==='suspended')AC.resume();return AC}
function tone(f,t0,d,type,vol,slide){
  const a=ac();if(!a||!sfxOn)return;
  const o=a.createOscillator(),g=a.createGain(),s=a.currentTime+t0;
  o.type=type||'sine';o.frequency.setValueAtTime(f,s);
  if(slide)o.frequency.exponentialRampToValueAtTime(slide,s+d);
  g.gain.setValueAtTime(0.0001,s);g.gain.exponentialRampToValueAtTime(vol||.2,s+.01);g.gain.exponentialRampToValueAtTime(.0001,s+d);
  o.connect(g).connect(a.destination);o.start(s);o.stop(s+d+.05);
}
function noise(t0,d,vol,fq){
  const a=ac();if(!a||!sfxOn)return;
  const n=Math.floor(a.sampleRate*d),buf=a.createBuffer(1,n,a.sampleRate),dt=buf.getChannelData(0);
  for(let i=0;i<n;i++)dt[i]=(Math.random()*2-1)*(1-i/n);
  const src=a.createBufferSource(),g=a.createGain(),fl=a.createBiquadFilter(),s=a.currentTime+t0;
  src.buffer=buf;fl.type='lowpass';fl.frequency.value=fq||1200;
  g.gain.setValueAtTime(vol||.3,s);g.gain.exponentialRampToValueAtTime(.0001,s+d);
  src.connect(fl).connect(g).connect(a.destination);src.start(s);
}
const sfx={
  x(){tone(520,0,.12,'triangle',.22)},
  o(){tone(380,0,.12,'triangle',.22)},
  ui(){tone(300,0,.08,'square',.1,450)},
  end(){tone(300,0,.2,'sawtooth',.12,120)},
  draw(){tone(330,0,.18,'sine',.2);tone(294,.18,.18,'sine',.2);tone(262,.36,.3,'sine',.2)},
  lose(){tone(392,0,.2,'sawtooth',.14);tone(330,.2,.2,'sawtooth',.14);tone(262,.4,.4,'sawtooth',.14,200)},
  win(){[523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.11,.25,'triangle',.25));tone(1047,.6,.6,'sine',.2)},
  boom(){tone(160,0,.35,'sine',.3,40);noise(0,.3,.25,500);noise(.15,.5,.1,6000)}
};
function paintMute(){$('muteIco').textContent=sfxOn?'🔊':'🔇';$('muteLabel').textContent=sfxOn?'On':'Off';$('mute').setAttribute('aria-pressed',sfxOn)}
$('mute').onclick=()=>{sfxOn=!sfxOn;store.set('ttt-sound',sfxOn);paintMute();if(sfxOn)sfx.ui()};
paintMute();

let mode='pvp',level='Medium',aiT,fresh=true;
function winner(b){for(const l of LINES)if(b[l[0]]&&b[l[0]]===b[l[1]]&&b[l[0]]===b[l[2]])return b[l[0]];return b.every(Boolean)?'d':null}
function minimax(b,p,d){
  const w=winner(b);
  if(w==='O')return 10-d;if(w==='X')return d-10;if(w==='d')return 0;
  let best=p==='O'?-99:99;
  for(let i=0;i<9;i++)if(!b[i]){b[i]=p;const s=minimax(b,p==='O'?'X':'O',d+1);b[i]='';best=p==='O'?Math.max(best,s):Math.min(best,s)}
  return best;
}
function bestMove(){
  let bs=-99,bm=[];
  for(let i=0;i<9;i++)if(!board[i]){board[i]='O';const s=minimax(board,'X',1);board[i]='';if(s>bs){bs=s;bm=[i]}else if(s===bs)bm.push(i)}
  return bm[Math.random()*bm.length|0];
}
function immediate(p){
  for(const l of LINES){const v=l.map(k=>board[k]);if(v.filter(x=>x===p).length===2&&v.includes(''))return l[v.indexOf('')]}
  return -1;
}
function randomMove(){const e=board.map((v,i)=>v?-1:i).filter(i=>i>=0);return e[Math.random()*e.length|0]}
function pickMove(){
  if(level==='Hard')return bestMove();
  if(level==='Medium'){
    let m=immediate('O');
    if(m<0&&Math.random()<.75)m=immediate('X');
    return m>=0?m:randomMove();
  }
  return randomMove();
}
function aiMove(){
  if(mode!=='ai'||over||turn!=='O')return;
  aiT=setTimeout(()=>{if(!over&&turn==='O')play(pickMove())},500);
}
function setMode(m,l){
  mode=m;level=l;nextStart='X';
  document.querySelectorAll('#modes button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.m===mode));
  document.querySelectorAll('#levelMenu button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.l===level));
  $('levelLabel').textContent=level;$('levelDot').dataset.l=level;
  $('levels').hidden=mode!=='ai';
  $('modes').classList.toggle('split',mode==='pvp');
  $('lx').textContent=mode==='ai'?'You (X)':'Player X';
  $('lo').textContent=mode==='ai'?'Computer (O)':'Player O';
  store.set('ttt-mode',{m:mode,l:level});
}
document.querySelectorAll('#modes button').forEach(b=>b.onclick=()=>{setMode(b.dataset.m,level);newGame()});
document.querySelectorAll('#levelMenu button').forEach(b=>b.onclick=()=>{setMode(mode,b.dataset.l);sfx.ui();closeLevel();newGame()});
const sm=store.get('ttt-mode');
if(sm&&sm.m&&sm.l)setMode(sm.m,sm.l);

setTheme(store.get('ttt-theme')||'neon');
history=store.get('ttt-history')||[];
score=store.get('ttt-score')||{x:0,o:0,d:0};
renderHistory();newGame();

sfx.pull=()=>{tone(1400,0,.03,'square',.08);tone(700,.05,.06,'square',.08)};
const lampEl=$('lamp'),cord=$('cord');
let lampOn=store.get('ttt-lamp')!==false;
function paintLamp(){document.body.classList.toggle('lamp-off',!lampOn);cord.setAttribute('aria-pressed',lampOn)}
function toggleLamp(){
  lampOn=!lampOn;store.set('ttt-lamp',lampOn);sfx.pull();paintLamp();
  cord.classList.remove('pulled');void cord.getBoundingClientRect();cord.classList.add('pulled');
}
cord.onclick=toggleLamp;
cord.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleLamp()}};
function lampReact(k){
  if(!lampOn)return;
  lampEl.classList.remove('pulse','cheer','flicker');void lampEl.offsetWidth;lampEl.classList.add(k);
  setTimeout(()=>lampEl.classList.remove(k),1600);
}
const _play=play;play=function(i){const n=moves.length;_play(i);if(moves.length>n&&!over)lampReact('pulse')};
const _win=showWin;showWin=function(w){_win(w);lampReact('cheer')};
const _lose=showLose;showLose=function(){_lose();lampReact('flicker')};
paintLamp();

/* Exit game: confirm, then close */
const exitModal=$('exitModal'),closedScreen=$('closedScreen');
let exitOpen=false;
function setExit(o){exitOpen=o;exitModal.hidden=!o;if(o)$('exitNo').focus()}
function closeGame(){
  clearTimeout(aiT);clearTimeout(autoT);over=true;
  closedScreen.hidden=false;$('playAgain').focus();
  try{window.close()}catch(e){}
}
$('exitBtn').onclick=()=>{sfx.ui();setExit(true)};
$('exitNo').onclick=()=>{sfx.ui();setExit(false);$('exitBtn').focus()};
$('exitYes').onclick=()=>{sfx.end();setExit(false);closeGame()};
exitModal.addEventListener('click',e=>{if(e.target===exitModal)$('exitNo').click()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&exitOpen)$('exitNo').click()});
$('playAgain').onclick=()=>{sfx.ui();closedScreen.hidden=true;newGame()};

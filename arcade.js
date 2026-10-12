/* CHANNEL // SURF. Original pixel artwork, eight arcade engines, synthesized sound. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id), canvas = $('arcade'), ctx = canvas.getContext('2d');
  const W=960,H=600, TAU=Math.PI*2, clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  const rect=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),w,h);};
  const circle=(c,x,y,r,color)=>{c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();};
  const text=(c,s,x,y,size=16,color='#d2fb65')=>{c.fillStyle=color;c.font=`bold ${size}px monospace`;c.textAlign='center';c.fillText(s,x,y);};
  const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  const sprites={
    ship:['000010000','000111000','000121000','001121100','111121111','112222211','100111001','000303000','000303000'],
    alien:['001000100','000101000','001111100','011010110','111111111','101111101','101000101','000101000'],
    runner:['00011100','00012110','00011100','00033000','03333300','00333000','00303000','03303300'],
    car:['00111100','01222210','11222211','11111111','11333311','11333311','11111111','01222210','00111100'],
    frog:['010010','011110','122221','111111','010010','110011'],
    bird:['00111000','01221100','11221110','11113333','01111100','00101000'],
    coin:['0110','1221','1221','0110']
  };
  function sprite(c,id,x,y,scale=4,palette=['transparent','#d2fb65','#1a3025','#ff9454']){sprites[id].forEach((row,j)=>[...row].forEach((v,i)=>{if(+v)rect(c,x+i*scale,y+j*scale,scale,scale,palette[+v]);}));}
  function stars(c,t,color='#6d7894',count=70){for(let i=0;i<count;i++){const x=(i*137.53+19)%W,y=(i*71.83+t*(i%3+1)*9)%H;rect(c,x,y,i%7===0?3:2,i%7===0?3:2,color);}}
  function grid(c,color='#21332c',top=100,step=40){c.strokeStyle=color;c.lineWidth=1;c.beginPath();for(let x=0;x<=W;x+=step){c.moveTo(x,top);c.lineTo(x,H);}for(let y=top;y<=H;y+=step){c.moveTo(0,y);c.lineTo(W,y);}c.stroke();}
  function mountain(c,x,y,w,h,color){c.fillStyle=color;c.beginPath();c.moveTo(x,y);c.lineTo(x+w*.17,y-h*.42);c.lineTo(x+w*.32,y-h*.4);c.lineTo(x+w*.48,y-h);c.lineTo(x+w*.65,y-h*.69);c.lineTo(x+w*.8,y-h*.5);c.lineTo(x+w,y);c.closePath();c.fill();}
  function glow(c,x,y,color,r=100){const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);}

  const audio={context:null,enabled:true,next:0,beat:0,
    init(){try{this.context ||= new (window.AudioContext||window.webkitAudioContext)();this.context.resume();this.next=this.context.currentTime;}catch{}},
    tone(f,d=.12,type='square',volume=.045,end){if(!this.context||!this.enabled)return;const t=this.context.currentTime,o=this.context.createOscillator(),g=this.context.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(end)o.frequency.exponentialRampToValueAtTime(end,t+d);g.gain.setValueAtTime(volume,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(this.context.destination);o.start(t);o.stop(t+d+.01);},
    fx(kind){if(kind==='hit')this.tone(170,.3,'sawtooth',.07,35);else if(kind==='jump')this.tone(240,.15,'square',.035,700);else if(kind==='switch'){this.tone(150,.12,'sawtooth',.05,1400);}else if(kind==='shoot')this.tone(800,.07,'triangle',.04,160);else this.tone(kind==='coin'?1100:420,.1,'square',.04,kind==='coin'?1700:650);},
    update(){if(!this.context||!this.enabled||mode!=='playing'||cue>0)return;if(this.context.currentTime>this.next){this.next=this.context.currentTime+60/(112+speed*12)/2;const notes=[130.81,196,261.63,196,155.56,233.08,311.13,233.08];this.tone(notes[this.beat++%8],.13,'triangle',.038);if(this.beat%2===0)this.tone(75,.09,'sine',.075,30);}}
  };

  let mode='menu',difficulty='normal',enabled=new Set([0,1,2,3,4,5,6,7]),keys={},pressed={},active=0,s,elapsed=0,score=0,lives=3,speed=1,round=0,roundTime=0,roundLength=12,cue=0,invincible=0,shake=0,particles=[],bag=[],last=0,ambient=0;
  let settings={base:1,ramp:1,interval:1},best=0,challenge=null;
  try{best=Number(localStorage.getItem('channel-surf-best'))||0;}catch{} $('best').textContent=String(best).padStart(6,'0');
  function burst(x,y,color='#d2fb65',count=14){for(let i=0;i<count;i++)particles.push({x,y,vx:rand(-170,170),vy:rand(-170,170),life:rand(.3,.7),color});}
  function reward(n,x,y,objective=false){if(objective&&challenge?.kind==='objective')challenge.progress++;score+=n;if(x!==undefined)burst(x,y,'#ffe48d',8);audio.fx('coin');}
  function hit(x,y){if(invincible>0||mode!=='playing'||cue>0)return false;lives--;if(challenge?.kind==='objective'){challenge.progress=0;if(active===7)s.cars.forEach(car=>car.v=70+car.lane*17);}invincible=2;shake=.28;burst(x,y,'#ff805c',30);audio.fx('hit');if(lives<=0){endRun();$('pause').innerHTML='PLAY AGAIN <span>↗</span>';}return true;}
  const horizontal=()=>Number(!!keys.ArrowRight)-Number(!!keys.ArrowLeft),vertical=()=>Number(!!keys.ArrowDown)-Number(!!keys.ArrowUp);
  const action=()=>pressed.Space||pressed.ArrowUp;
  function blinking(){return invincible<=0||Math.floor(invincible*10)%2===0;}

  const games=[
    {name:'STAR DEFENDER',genre:'SPACE SHOOTER',color:'#9bdcf9',controls:'← → / A D MOVE  ·  SPACE SHOOT',
      init:()=>({x:460,y:510,bullets:[],enemies:[180,350,540,740].map((x,i)=>({x,y:180+i%2*70,w:36,h:32,v:85+i*9,phase:i,fire:1+i*.2})),spawn:.25,fire:0,shots:[]}),
      update(d){s.x=clamp(s.x+horizontal()*400*d,30,894);s.fire-=d;if((keys.Space||keys.ArrowUp)&&s.fire<=0){s.bullets.push({x:s.x+16,y:510});s.fire=.18;audio.fx('shoot');}s.spawn-=d;if(s.spawn<=0){s.enemies.push({x:rand(40,865),y:110,w:36,h:32,v:rand(55,105),phase:rand(0,6),fire:rand(1.3,3)});s.spawn=rand(.5,1);}s.bullets.forEach(b=>b.y-=600*d);s.shots.forEach(b=>b.y+=190*d);for(const e of s.enemies){e.y+=e.v*d;e.x+=Math.sin(elapsed*3+e.phase)*45*d;e.fire-=d;if(e.fire<0){s.shots.push({x:e.x+18,y:e.y+30});e.fire=3;}for(const b of s.bullets){if(!e.dead&&!b.dead&&overlap({x:b.x-2,y:b.y,w:5,h:12},e)){b.dead=true;e.dead=true;reward(100,e.x+18,e.y+16,true);}}if(overlap({x:s.x+4,y:510,w:30,h:28},e)){hit(s.x,520);e.dead=true;}if(e.y>565){hit(s.x,520);e.dead=true;}}for(const b of s.shots)if(overlap({x:b.x,y:b.y,w:6,h:14},{x:s.x+5,y:510,w:28,h:30})){hit(s.x,520);b.dead=true;}s.enemies=s.enemies.filter(e=>!e.dead);s.bullets=s.bullets.filter(b=>b.y>95&&!b.dead);s.shots=s.shots.filter(b=>b.y<600&&!b.dead);},
      draw(c){rect(c,0,0,W,H,'#101321');stars(c,elapsed,'#647ca0');glow(c,780,240,'#55487833',180);for(let i=0;i<4;i++)rect(c,80+i*220,565,130,5,'#34435a');s.enemies.forEach(e=>sprite(c,'alien',e.x,e.y,4,['','#bf95f7','#151d35','#ff9168']));s.bullets.forEach(b=>rect(c,b.x,b.y,4,15,'#d2fb65'));s.shots.forEach(b=>rect(c,b.x,b.y,5,12,'#ff8a6c'));if(blinking())sprite(c,'ship',s.x,510,4,['','#9bdcf9','#f0f9cf','#ff9b56']);}
    },
    {name:'NEON RUNNER',genre:'PLATFORMER',color:'#b1df83',controls:'SPACE / ↑ JUMP  ·  TIME EACH JUMP',
      init:()=>({x:185,y:468,vy:0,objects:[{x:610,y:466,w:38,h:36,coin:false},{x:820,y:360,w:22,h:22,coin:true}],spawn:.5,scroll:0}),
      update(d){s.scroll+=270*d;if(action()&&s.y>=467){s.vy=-600;audio.fx('jump');}s.vy+=1450*d;s.y=Math.min(468,s.y+s.vy*d);if(s.y===468)s.vy=0;s.spawn-=d;if(s.spawn<=0){s.objects.push({x:980,y:rand(0,1)<.6?466:442,w:rand(28,45),h:34,coin:false});if(Math.random()<.65)s.objects.push({x:1085,y:360,w:22,h:22,coin:true});s.spawn=rand(1.05,1.65);}for(const o of s.objects){o.x-=270*d;if(overlap({x:s.x+5,y:s.y+3,w:22,h:29},o)){if(o.coin)reward(150,o.x,o.y);else hit(s.x,s.y);o.dead=true;}}s.objects=s.objects.filter(o=>o.x>-60&&!o.dead);},
      draw(c){rect(c,0,0,W,H,'#14251e');circle(c,755,190,70,'#e3a56d');mountain(c,-80,485,620,180,'#253e36');mountain(c,400,485,670,250,'#304d3e');for(let i=0;i<8;i++){const x=(i*160-s.scroll*.4)%1200;rect(c,x,420,18,65,'#30593b');rect(c,x-15,435,45,10,'#30593b');}rect(c,0,501,W,99,'#333829');rect(c,0,500,W,8,'#aad36c');for(let i=0;i<35;i++)rect(c,(i*36-s.scroll)%W,523+(i%3)*23,8,5,'#596246');s.objects.forEach(o=>{if(o.coin)sprite(c,'coin',o.x,o.y,5,['','#ffe5a0','#b88343']);else{rect(c,o.x,o.y,o.w,o.h+502-o.y-o.h,'#ba6558');rect(c,o.x,o.y,o.w,6,'#ff9472');rect(c,o.x+6,o.y+10,5,12,'#e78165');}});if(blinking())sprite(c,'runner',s.x,s.y,4,['','#eaf0b6','#17241d','#b0dc76']);}
    },
    {name:'BRICK BREAKER',genre:'BREAKOUT',color:'#f0a078',controls:'← → / A D MOVE PADDLE  ·  KEEP THE BALL ALIVE',
      init(){const bricks=[];for(let y=0;y<5;y++)for(let x=0;x<11;x++)bricks.push({x:53+x*78,y:135+y*31,w:70,h:23,row:y});return{x:425,ball:{x:480,y:400,vx:190,vy:-285},bricks};},
      update(d){s.x=clamp(s.x+horizontal()*510*d,24,816);const b=s.ball;b.x+=b.vx*d;b.y+=b.vy*d;if(b.x<25||b.x>935){b.vx*=-1;b.x=clamp(b.x,25,935);}if(b.y<112){b.vy=Math.abs(b.vy);b.y=112;}if(b.vy>0&&b.y>520&&b.y<546&&b.x>s.x-8&&b.x<s.x+128){const off=(b.x-(s.x+60))/60;b.vx=off*290;b.vy=-Math.sqrt(350*350-b.vx*b.vx);b.y=519;audio.fx('bounce');}for(const brick of s.bricks){if(!brick.dead&&overlap({x:b.x-7,y:b.y-7,w:14,h:14},brick)){brick.dead=true;b.vy*=-1;reward(60,brick.x+35,brick.y+12,true);break;}}s.bricks=s.bricks.filter(b=>!b.dead);if(!s.bricks.length){reward(1000);s.bricks=games[2].init().bricks;}if(b.y>590){hit(s.x+60,530);Object.assign(b,{x:s.x+60,y:430,vx:170,vy:-285});}},
      draw(c){rect(c,0,0,W,H,'#221b24');grid(c,'#322731',110,40);rect(c,17,110,6,450,'#785568');rect(c,937,110,6,450,'#785568');const colors=['#ee9278','#edb37f','#e1d18c','#b9d38c','#84b8a3'];s.bricks.forEach(b=>{rect(c,b.x,b.y,b.w,b.h,colors[b.row]);rect(c,b.x+4,b.y+4,b.w-8,3,'#ffffff35');rect(c,b.x,b.y+b.h-3,b.w,3,'#0003');});rect(c,s.x,532,120,14,'#e0e6bc');rect(c,s.x+8,532,104,4,'#fff4d3');glow(c,s.ball.x,s.ball.y,'#fff2bd22',35);rect(c,s.ball.x-7,s.ball.y-7,14,14,'#ffe9ab');}
    },
    {name:'SNAKE BYTE',genre:'SNAKE',color:'#b6d885',controls:'ARROWS / WASD STEER  ·  EAT PIXELS  ·  AVOID YOUR TAIL',
      init:()=>({body:Array.from({length:8},(_,i)=>({x:14-i,y:10})),dir:{x:1,y:0},next:{x:1,y:0},food:{x:22,y:10},timer:0}),
      update(d){for(const [key,dir] of [['ArrowLeft',{x:-1,y:0}],['ArrowRight',{x:1,y:0}],['ArrowUp',{x:0,y:-1}],['ArrowDown',{x:0,y:1}]])if(pressed[key]&&!(dir.x===-s.dir.x&&dir.y===-s.dir.y))s.next=dir;s.timer+=d;if(s.timer<.15)return;s.timer-=.15;s.dir=s.next;const head={x:s.body[0].x+s.dir.x,y:s.body[0].y+s.dir.y},eating=head.x===s.food.x&&head.y===s.food.y;if(head.x<0||head.x>=36||head.y<0||head.y>=18||s.body.slice(0,eating?undefined:-1).some(p=>p.x===head.x&&p.y===head.y)){hit(48+s.body[0].x*24,132+s.body[0].y*24);s=games[3].init();return;}s.body.unshift(head);if(eating){reward(200,48+head.x*24,132+head.y*24,true);let food;do{food={x:Math.floor(rand(0,36)),y:Math.floor(rand(0,18))};}while(s.body.some(p=>p.x===food.x&&p.y===food.y));s.food=food;}else s.body.pop();},
      draw(c){rect(c,0,0,W,H,'#18261d');rect(c,42,126,876,444,'#33462b');rect(c,48,132,864,432,'#142119');for(let x=0;x<36;x++)for(let y=0;y<18;y++)if((x+y)%2)rect(c,48+x*24,132+y*24,24,24,'#1a291d');s.body.forEach((p,i)=>rect(c,50+p.x*24,134+p.y*24,20,20,i?'#83ac59':'#d2fb65'));const h=s.body[0];rect(c,54+h.x*24,138+h.y*24,4,4,'#203322');rect(c,64+h.x*24,138+h.y*24,4,4,'#203322');sprite(c,'coin',50+s.food.x*24,134+s.food.y*24,5,['','#ff9b70','#ac5d4c']);}
    },
    {name:'TURBO DRIFT',genre:'RACING',color:'#ddb788',controls:'ARROWS / WASD DRIVE  ·  DODGE TRAFFIC',
      init:()=>({x:460,y:490,cars:[{x:460,y:120,w:40,h:56,color:'#f69b7a',v:220},{x:310,y:310,w:40,h:56,color:'#a8b7df',v:210},{x:610,y:145,w:40,h:56,color:'#d7a3e6',v:250}],spawn:.3,scroll:0}),
      update(d){s.x=clamp(s.x+horizontal()*340*d,285,650);s.y=clamp(s.y+vertical()*240*d,150,515);s.scroll+=300*d;s.spawn-=d;if(s.spawn<=0){s.cars.push({x:Math.random()<.55?clamp(s.x+rand(-18,18),285,650):rand(285,650),y:50,w:40,h:56,color:pick(['#f69b7a','#a8b7df','#d7a3e6']),v:rand(180,280)});s.spawn=rand(.65,1.05);}for(const car of s.cars){car.y+=car.v*d;if(overlap({x:s.x+5,y:s.y+3,w:27,h:46},car)){hit(s.x,s.y);car.dead=true;}if(car.y>610){score+=70;car.dead=true;}}s.cars=s.cars.filter(c=>!c.dead);},
      draw(c){rect(c,0,0,W,H,'#243a2c');rect(c,265,0,430,H,'#373b3c');rect(c,261,0,8,H,'#eece9a');rect(c,691,0,8,H,'#eece9a');for(let j=0;j<7;j++){const y=(j*100+s.scroll)%700-100;for(let x=373;x<=593;x+=110)rect(c,x,y,5,45,'#c8c6a1');rect(c,251,y,10,45,'#b67368');rect(c,699,y,10,45,'#b67368');}for(let i=0;i<10;i++){const y=(i*97+s.scroll*.8)%H;rect(c,120,y,9,35,'#665e42');rect(c,98,y-8,52,26,'#526747');rect(c,785,y+40,9,35,'#665e42');rect(c,766,y+28,48,30,'#526747');}s.cars.forEach(car=>sprite(c,'car',car.x,car.y,5,['',car.color,'#1c2b38','#f5deba']));if(blinking())sprite(c,'car',s.x,s.y,5,['','#d2fb65','#2e565b','#eeefd0']);}
    },
    {name:'PIXEL WINGS',genre:'FLAPPY',color:'#b5d3eb',controls:'SPACE / ↑ FLAP  ·  THREAD THE GAPS',
      init:()=>({y:310,vy:0,pipes:[{x:540,gap:310,passed:false}],spawn:2.2,scroll:0}),
      update(d){if(action()){s.vy=-310;audio.fx('jump');}s.vy+=700*d;s.y+=s.vy*d;s.scroll+=155*d;s.spawn-=d;if(s.spawn<=0){s.pipes.push({x:980,gap:rand(260,400),passed:false});s.spawn=2.8;}for(const p of s.pipes){p.x-=170*d;const size=190;if(p.x<265&&p.x+64>235&&(s.y<p.gap-size/2||s.y+28>p.gap+size/2)){if(hit(250,s.y)){s.y=p.gap;s.vy=0;}}if(p.x+64<235&&!p.passed){p.passed=true;reward(250,250,s.y);}}s.pipes=s.pipes.filter(p=>p.x>-80);if(s.y<110||s.y>535){hit(250,s.y);s.y=310;s.vy=0;}},
      draw(c){rect(c,0,0,W,H,'#26364d');circle(c,740,210,65,'#d9b09b');for(let i=0;i<8;i++){const x=(i*190-s.scroll*.25+1200)%1200;rect(c,x,180+i%3*65,75,18,'#4a5c70');rect(c,x+18,166+i%3*65,40,18,'#4a5c70');}mountain(c,-150,555,800,150,'#3b5756');mountain(c,320,555,900,210,'#426759');s.pipes.forEach(p=>{const top=p.gap-95,bottom=p.gap+95;rect(c,p.x,105,64,top-105,'#749a65');rect(c,p.x-7,top-20,78,20,'#aac883');rect(c,p.x+8,105,9,top-125,'#98b777');rect(c,p.x,bottom,64,550-bottom,'#749a65');rect(c,p.x-7,bottom,78,20,'#aac883');rect(c,p.x+8,bottom+20,9,530-bottom,'#98b777');});rect(c,0,555,W,45,'#c8b68a');rect(c,0,550,W,8,'#aace87');if(blinking())sprite(c,'bird',235,s.y,4,['','#f1d783','#364d5a','#ff9264']);}
    },
    {name:'VOID PATROL',genre:'ASTEROIDS',color:'#b9b1ed',controls:'← → ROTATE  ·  ↑ THRUST  ·  SPACE SHOOT',
      init:()=>({x:480,y:345,vx:0,vy:0,a:-Math.PI/2,rocks:[{x:150,y:170,vx:85,vy:45,r:35},{x:800,y:430,vx:-100,vy:-25,r:42},{x:160,y:480,vx:105,vy:-45,r:28},{x:480,y:150,vx:0,vy:80,r:30}],bullets:[],fire:0,spawn:2}),
      update(d){s.a+=horizontal()*3.5*d;if(keys.ArrowUp){s.vx+=Math.cos(s.a)*280*d;s.vy+=Math.sin(s.a)*280*d;}s.vx*=Math.pow(.98,d*60);s.vy*=Math.pow(.98,d*60);s.x=(s.x+s.vx*d+W)%W;s.y=120+(s.y-120+s.vy*d+450)%450;s.fire-=d;if(keys.Space&&s.fire<=0){s.bullets.push({x:s.x,y:s.y,vx:Math.cos(s.a)*500,vy:Math.sin(s.a)*500,life:1.5});s.fire=.22;audio.fx('shoot');}s.spawn-=d;if(s.spawn<=0){s.rocks.push({x:Math.random()<.5?15:945,y:rand(140,540),vx:rand(-80,80),vy:rand(-65,65),r:rand(22,40)});s.spawn=2.2;}for(const b of s.bullets){b.x+=b.vx*d;b.y+=b.vy*d;b.life-=d;}for(const r of s.rocks){r.x=(r.x+r.vx*d+W)%W;r.y=110+(r.y-110+r.vy*d+470)%470;if(Math.hypot(r.x-s.x,r.y-s.y)<r.r+12){hit(s.x,s.y);r.dead=true;}for(const b of s.bullets)if(!r.dead&&b.life>0&&Math.hypot(r.x-b.x,r.y-b.y)<r.r){r.dead=true;b.life=0;reward(120,r.x,r.y,true);if(r.r>30){s.rocks.push({x:r.x+20,y:r.y,vx:r.vx*1.4,vy:-r.vy,r:16});r.r=20;}break;}}s.rocks=s.rocks.filter(r=>!r.dead);s.bullets=s.bullets.filter(b=>b.life>0);},
      draw(c){rect(c,0,0,W,H,'#171724');stars(c,elapsed*.15,'#6a6385');glow(c,500,400,'#58406e22',220);c.strokeStyle='#b4a6c9';c.lineWidth=3;s.rocks.forEach(r=>{c.beginPath();for(let i=0;i<9;i++){const a=i/8*TAU,rr=r.r*(i%2?.82:1),x=r.x+Math.cos(a)*rr,y=r.y+Math.sin(a)*rr;if(!i)c.moveTo(x,y);else c.lineTo(x,y);}c.stroke();});s.bullets.forEach(b=>rect(c,b.x-2,b.y-2,5,5,'#d2fb65'));if(blinking()){c.save();c.translate(s.x,s.y);c.rotate(s.a);c.strokeStyle='#e5e2b8';c.beginPath();c.moveTo(20,0);c.lineTo(-13,-12);c.lineTo(-7,0);c.lineTo(-13,12);c.closePath();c.stroke();if(keys.ArrowUp){c.strokeStyle='#ff9b6c';c.beginPath();c.moveTo(-13,-6);c.lineTo(-25-rand(0,10),0);c.lineTo(-13,6);c.stroke();}c.restore();}}
    },
    {name:'CROSSY CHAOS',genre:'FROGGER',color:'#b8d77a',controls:'ARROWS / WASD HOP  ·  REACH THE TOP  ·  WATCH THE TRAFFIC',
      init(){const cars=[];for(let lane=0;lane<6;lane++)for(let n=0;n<3;n++)cars.push({x:n*330+rand(0,100),y:160+lane*55,w:70,h:35,lane,dir:lane%2?1:-1,v:70+lane*17});return{x:468,y:515,cool:0,cars};},
      update(d){s.cool-=d;if(s.cool<=0){if(keys.ArrowLeft||keys.ArrowRight||keys.ArrowUp||keys.ArrowDown){s.x=clamp(s.x+horizontal()*48,45,890);s.y=clamp(s.y+vertical()*55,110,515);s.cool=.17;audio.fx('jump');}}for(const car of s.cars){car.x+=car.v*car.dir*d;if(car.x>1030)car.x=-90;if(car.x<-100)car.x=1010;if(overlap({x:s.x+3,y:s.y+3,w:23,h:20},car)){if(hit(s.x,s.y)){s.x=468;s.y=515;}}}if(s.y<=130){reward(600,s.x,s.y,true);s.x=468;s.y=515;s.cars.forEach(car=>car.v*=1.12);}},
      draw(c){rect(c,0,0,W,H,'#203128');rect(c,30,142,900,350,'#3a3c39');for(let lane=0;lane<6;lane++){rect(c,30,152+lane*55,900,1,'#757768');for(let x=45;x<920;x+=50)rect(c,x,193+lane*55,18,2,'#8a8970');}rect(c,30,105,900,35,'#70925a');rect(c,30,500,900,45,'#70925a');for(let i=0;i<18;i++){rect(c,i*55,553,30,25,'#2e4a31');rect(c,i*55+8,547,12,10,'#4c7147');}s.cars.forEach(car=>{rect(c,car.x,car.y,70,35,car.lane%2?'#dd9c79':'#97b9be');rect(c,car.x+18,car.y+4,22,27,'#2b4145');rect(c,car.x+6,car.y-3,13,5,'#1a2420');rect(c,car.x+49,car.y+33,13,5,'#1a2420');});if(blinking())sprite(c,'frog',s.x,s.y,5,['','#d2fb65','#21352a']);}
    }
  ];

  const objectiveRules={
    3:{label:'PIXELS EATEN',targets:[3,5,7]},
    7:{label:'CROSSINGS',targets:[2,3,4]}
  };
  function makeChallenge(){
    const rule=objectiveRules[active];
    if(!rule)return{kind:'survival',label:'SURVIVE',progress:0,target:0,limit:roundLength,remaining:roundLength};
    const tier={easy:0,normal:1,hard:2}[difficulty];
    const target=Math.max(active===7?2:3,Math.round((rule.targets[tier]+Math.min(3,Math.floor((round-1)/8)))*[.75,1,1.3][settings.interval]));
    return{kind:'objective',label:rule.label,progress:0,target,limit:null,remaining:null};
  }
  function challengeCue(){
    $('cue-controls').textContent=games[active].controls;
    $('cue-goal').textContent=challenge.kind==='objective'?`${challenge.target} ${challenge.label} WITHOUT A HIT | NO TIME LIMIT`:`SURVIVE ${Math.ceil(challenge.limit)} SECONDS TO SWITCH`;
  }
  function nextChannel(){if(!bag.length)bag=[...enabled].sort(()=>Math.random()-.5);let n=bag.pop();if(n===active&&enabled.size>1){bag.unshift(n);n=bag.pop();}return n;}
  function switchGame(index){active=index??nextChannel();round++;s=games[active].init();roundTime=0;const ranges=[[5,8],[10,15],[18,24]][settings.interval];roundLength=Math.max(5,rand(...ranges)/Math.sqrt(speed));challenge=makeChallenge();cue=round===1?1.6:1.1;invincible=1;pressed={};keys={};particles=[];$('cue-name').textContent=games[active].name;challengeCue();$('switch-cue').hidden=false;$('feed-name').textContent=games[active].genre;$('channel').textContent=String(active+1).padStart(2,'0');$('game-name').textContent=games[active].name;audio.fx('switch');updateHUD();}
  function setSetupLocked(locked){document.querySelectorAll('.setting button,.setting input,.genre,.player-field input').forEach(el=>el.disabled=locked);$('start').hidden=locked;document.querySelector('.start-hint').hidden=locked;$('playing-actions').hidden=!locked;if(locked)$('pause').innerHTML='PAUSE RUN <span>Ⅱ</span>';}
  function startRun(){audio.init();settings={base:{easy:.8,normal:1,hard:1.4}[difficulty],ramp:+$('ramp').value,interval:+$('interval').value};lives={easy:5,normal:3,hard:2}[difficulty];elapsed=score=round=0;speed=settings.base;bag=[];mode='playing';$('attract-overlay').hidden=true;$('dialog').hidden=true;$('game-hud').hidden=false;$('touch').hidden=false;setSetupLocked(true);$('status').textContent='RUN IN PROGRESS';switchGame();canvas.focus({preventScroll:true});if(window.matchMedia('(max-width: 760px)').matches)$('screen').scrollIntoView?.({block:'start',behavior:'smooth'});updateHUD();}
  function endRun(){mode='over';keys={};pressed={};const isBest=Math.floor(score)>best;if(isBest){best=Math.floor(score);try{localStorage.setItem('channel-surf-best',best);}catch{}$('best').textContent=String(best).padStart(6,'0');}$('switch-cue').hidden=true;$('dialog').hidden=false;$('dialog-label').textContent=isBest?'NEW PERSONAL BEST':'TRANSMISSION ENDED';$('dialog-title').textContent='GAME OVER.';$('dialog-copy').textContent=`${Math.floor(score).toLocaleString()} points · ${Math.floor(elapsed)} seconds · ${round} channel${round===1?'':'s'} survived`;$('resume').innerHTML='ONE MORE RUN <span>↗</span>';$('status').textContent='SIGNAL LOST';$('touch').hidden=true;window.ChannelScores?.record({score:Math.floor(score),seconds:Math.floor(elapsed),channels:round,difficulty,ramp:settings.ramp,interval:settings.interval,genres:enabled.size});updateHUD();}
  function togglePause(){if(mode==='playing'){mode='paused';keys={};pressed={};$('switch-cue').hidden=true;$('pause').innerHTML='RESUME RUN <span>→</span>';$('dialog-label').textContent='SIGNAL INTERRUPTED';$('dialog-title').textContent='PAUSED.';$('dialog-copy').textContent='Take a breath. The arcade can wait.';$('resume').innerHTML='RESUME RUN <span>→</span>';$('dialog').hidden=false;$('status').textContent='RUN PAUSED';}else if(mode==='paused'){mode='playing';$('pause').innerHTML='PAUSE RUN <span>Ⅱ</span>';$('switch-cue').hidden=cue<=0;$('dialog').hidden=true;$('status').textContent='RUN IN PROGRESS';canvas.focus({preventScroll:true});}}
  function menu(){mode='menu';keys={};pressed={};$('dialog').hidden=true;$('switch-cue').hidden=true;$('game-hud').hidden=true;$('attract-overlay').hidden=false;$('touch').hidden=true;$('status').textContent='WAITING FOR PLAYER';$('feed-name').textContent='ATTRACT MODE';$('channel').textContent='01';$('run-time').textContent='∞ POSSIBILITIES';setSetupLocked(false);}
  function updateHUD(){
    $('score').textContent=String(Math.floor(score)).padStart(6,'0');
    $('hearts').textContent='\u2665 '.repeat(Math.max(0,lives)).trim();
    $('speed').textContent=speed.toFixed(1)+'\u00d7';
    const objective=challenge?.kind==='objective';
    $('goal-label').textContent=objective?`${challenge.label}: ${challenge.progress} / ${challenge.target}`:'SURVIVE TO SWITCH';
    $('goal-time').textContent=objective?'NO TIME LIMIT':`${Math.ceil(Math.max(0,challenge?.remaining||0))}s TO SWITCH`;
    const fraction=objective?challenge.progress/challenge.target:challenge.remaining/challenge.limit;
    $('switch-progress').style.width=clamp(fraction*100,0,100)+'%';
    $('goal-time').classList.toggle('urgent',!objective&&challenge?.remaining<5);
    $('run-time').textContent=String(Math.floor(elapsed/60)).padStart(2,'0')+':'+String(Math.floor(elapsed%60)).padStart(2,'0')+' / '+String(round).padStart(2,'0')+' CHANNELS';
  }
  function update(dt){
    if(mode!=='playing')return;
    if(cue>0){cue-=dt;if(cue<=0){$('switch-cue').hidden=true;pressed={};}return;}
    elapsed+=dt;
    speed=Math.min(3.5,settings.base+elapsed*[0,.006,.012,.022][settings.ramp]);
    if(challenge.kind==='survival')score+=dt*12*speed;
    roundTime+=dt;if(challenge.kind==='survival')challenge.remaining=Math.max(0,challenge.remaining-dt);
    invincible=Math.max(0,invincible-dt);shake=Math.max(0,shake-dt);
    games[active].update(dt*speed);
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}
    particles=particles.filter(p=>p.life>0);pressed={};
    if(mode==='playing'){
      if(challenge.kind==='objective'&&challenge.progress>=challenge.target){score+=400;switchGame();}
      else if(challenge.kind==='survival'&&challenge.remaining<=0){score+=200;switchGame();}
    }
    audio.update();updateHUD();
  }

  function attract(c,t){rect(c,0,0,W,H,'#151826');stars(c,t*.2,'#767998',65);glow(c,750,190,'#ec925d22',170);circle(c,750,190,82,'#e6a070');for(let i=0;i<7;i++)rect(c,666,193+i*12,168,3+i,'#151826');mountain(c,-100,500,710,230,'#393652');mountain(c,260,500,860,290,'#34394b');mountain(c,-130,530,730,175,'#3c544d');mountain(c,350,540,860,170,'#3e594e');rect(c,0,528,W,72,'#253b30');rect(c,0,528,W,6,'#a0b966');for(let i=0;i<35;i++){rect(c,i*29+(Math.floor(t*10)%29),550+(i%3)*16,13,3,'#516145');}sprite(c,'alien',105,125+Math.sin(t)*8,6,['','#ae9bdd','#2b223b']);sprite(c,'ship',803,400+Math.sin(t*2)*8,7,['','#c6e49f','#294b3b','#ec986e']);sprite(c,'runner',130+Math.sin(t*.3)*30,483,6,['','#f5dea5','#4b4b35','#b3ce72']);for(let i=0;i<4;i++)sprite(c,'coin',655+i*37,490+Math.sin(t+i)*6,4,['','#ecd794','#9e8043']);for(let i=0;i<3;i++){const x=38+i*22;rect(c,x,389-i*13,9,137+i*13,'#39563d');rect(c,x-15,406-i*13,39,8,'#56754a');}text(c,'1UP',77,88,13,'#a4b68a');text(c,'HI-SCORE',862,88,13,'#a4b68a');}
  function render(){ctx.save();if(shake>0&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)ctx.translate(rand(-5,5),rand(-4,4));if(mode==='menu')attract(ctx,ambient);else{games[active].draw(ctx);for(const p of particles){ctx.globalAlpha=clamp(p.life*2,0,1);rect(ctx,p.x,p.y,5,5,p.color);}ctx.globalAlpha=1;}ctx.restore();}
  function frame(now){const dt=Math.min((now-last)/1000||0,1/20);last=now;ambient+=dt;update(dt);render();requestAnimationFrame(frame);}

  games.forEach((g,i)=>{const b=document.createElement('button');b.className='genre';b.setAttribute('aria-pressed','true');b.setAttribute('aria-label',`Include ${g.name}`);b.innerHTML=`<canvas width="240" height="145" aria-hidden="true"></canvas><span class="check">✓</span><div class="genre-text"><span>0${i+1} / ${g.genre}</span><strong>${g.name}</strong></div>`;b.onclick=()=>{if(mode!=='menu')return;if(enabled.has(i)&&enabled.size===1){$('genre-count').textContent='KEEP ONE CHANNEL ACTIVE';setTimeout(()=>{$('genre-count').textContent=`${enabled.size} / 8 ACTIVE`;},1800);return;}if(enabled.has(i))enabled.delete(i);else enabled.add(i);b.setAttribute('aria-pressed',String(enabled.has(i)));b.querySelector('.check').textContent=enabled.has(i)?'✓':'+';$('genre-count').textContent=`${enabled.size} / 8 ACTIVE`;};$('genres').appendChild(b);const mini=b.querySelector('canvas').getContext('2d');mini.scale(.25,.25);const saved=s;s=g.init();if(i===0){s.enemies=[{x:220,y:180},{x:440,y:180},{x:660,y:180},{x:330,y:290},{x:550,y:290}];s.bullets=[{x:475,y:390}];}if(i===1)s.objects=[{x:430,y:466,w:38,h:34},{x:710,y:442,w:38,h:34},{x:530,y:360,coin:true}];if(i===4)s.cars=[{x:320,y:200,color:'#f39c7c'},{x:560,y:310,color:'#a4b8db'}];if(i===5)s.pipes=[{x:500,gap:310},{x:820,gap:280}];g.draw(mini);s=saved;});
  document.querySelectorAll('#difficulty button').forEach(b=>b.onclick=()=>{difficulty=b.dataset.value;document.querySelectorAll('#difficulty button').forEach(el=>{el.classList.toggle('selected',el===b);el.setAttribute('aria-pressed',String(el===b));});$('difficulty-caption').textContent={easy:'5 LIVES',normal:'3 LIVES',hard:'2 LIVES'}[difficulty];$('difficulty-description').textContent={easy:'Find your feet. Then find your limits.',normal:'A fair start. An unfair finish.',hard:'Fast from the first frame. Good luck.'}[difficulty];});
  function syncRanges(){$('ramp-value').textContent=['CONSTANT','STEADY','FAST','RELENTLESS'][+$('ramp').value];$('interval-value').textContent=['5–8 SEC','10–15 SEC','18–24 SEC'][+$('interval').value];for(const id of ['ramp','interval'])$(id).style.setProperty('--fill',(+$(id).value/+$(id).max*100)+'%');} $('ramp').oninput=syncRanges;$('interval').oninput=syncRanges;syncRanges();
  $('start').onclick=startRun;$('pause').onclick=()=>mode==='over'?startRun():togglePause();$('resume').onclick=()=>mode==='over'?startRun():togglePause();$('menu-button').onclick=menu;
  $('sound').onclick=()=>{audio.enabled=!audio.enabled;audio.init();$('sound').innerHTML=audio.enabled?'♪ <span>SOUND ON</span>':'♪ <span>SOUND OFF</span>';$('sound').setAttribute('aria-pressed',String(audio.enabled));};
  let helpPaused=false;$('help').onclick=()=>{helpPaused=mode==='playing';if(helpPaused)togglePause();$('help-dialog').showModal();};$('help-dialog').addEventListener('close',()=>{if(helpPaused&&mode==='paused')togglePause();helpPaused=false;});$('close-help').onclick=$('help-done').onclick=()=>$('help-dialog').close();
  $('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await $('screen').requestFullscreen();}catch{$('status').textContent='FULLSCREEN UNAVAILABLE';}};
  const map={KeyA:'ArrowLeft',KeyD:'ArrowRight',KeyW:'ArrowUp',KeyS:'ArrowDown'};
  window.addEventListener('keydown',e=>{if($('help-dialog').open)return;if(e.code==='Escape'){e.preventDefault();togglePause();return;}if(e.code==='Enter'&&mode==='menu'&&!['BUTTON','INPUT'].includes(document.activeElement.tagName)){e.preventDefault();startRun();return;}const k=map[e.code]||e.code;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(k)&&mode==='playing'){e.preventDefault();if(!keys[k])pressed[k]=true;keys[k]=true;}});
  window.addEventListener('keyup',e=>{keys[map[e.code]||e.code]=false;});window.addEventListener('blur',()=>{keys={};pressed={};if(mode==='playing')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')togglePause();});
  document.querySelectorAll('[data-key]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.key]=true;pressed[b.dataset.key]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>keys[b.dataset.key]=false);});
  if(new URLSearchParams(location.search).has('debug'))window.arcadeDebug={get state(){return{mode,active,elapsed,score,lives,speed,round,roundTime,roundLength,cue,s,challenge,enabled:[...enabled],settings};},start:startRun,tick:update,switch:switchGame,hit,pause:togglePause,menu,key(k,down=true){if(down&&!keys[k])pressed[k]=true;keys[k]=down;},games:games.map(g=>g.name)};
  requestAnimationFrame(frame);
})();

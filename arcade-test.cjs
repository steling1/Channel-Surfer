const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
// Run the actual game engines in a minimal DOM; browser layout is verified separately.
const context2d = new Proxy({}, {get:(target,key)=>target[key] ||= key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{},set:(target,key,value)=>(target[key]=value,true)});
class Element {
  constructor(){this.value='1';this.max='3';this.style={setProperty(){}};this.classList={toggle(){}};this.tagName='BODY';this.children=[];}
  getContext(){return context2d;} setAttribute(){} addEventListener(){} focus(){}
  appendChild(child){this.children.push(child);} querySelector(selector){return this.children[selector] ||= new Element();}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};get('interval').max='2';
const store=new Map(), sandbox={document:{getElementById:get,createElement:()=>new Element(),querySelector:()=>new Element(),querySelectorAll:()=>[],addEventListener(){},activeElement:new Element()},window:{addEventListener(){},matchMedia:()=>({matches:true})},location:{search:'?debug=1'},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},requestAnimationFrame(){},URLSearchParams,Math,console,setTimeout};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('arcade.js','utf8'),sandbox);const a=sandbox.window.arcadeDebug;
const advance=t=>{for(let i=0;i<Math.ceil(t*60);i++)a.tick(1/60);};
const load=i=>{a.start();a.switch(i);advance(1.2);assert.equal(a.state.active,i);assert.equal(a.state.mode,'playing');};
let count=0;function test(name,run){run();console.log('PASS '+name);count++;}
test('All eight engines initialize and run without exceptions',()=>{for(let i=0;i<8;i++){load(i);advance(.6);assert.ok(Number.isFinite(a.state.score));assert.equal(a.state.lives,3);}});
test('Shooter movement, firing, and enemy scoring',()=>{load(0);a.key('ArrowRight');advance(.2);a.key('ArrowRight',false);assert.ok(a.state.s.x>460);a.key('Space');advance(.1);a.key('Space',false);assert.ok(a.state.s.bullets.length>0);const s=a.state.s;s.enemies=[{x:100,y:250,w:36,h:32,v:0,phase:0,fire:10}];s.bullets=[{x:115,y:268}];const before=a.state.score;a.tick(.01);assert.ok(a.state.score>=before+100);assert.equal(s.enemies.length,0);});
test('Runner jumps and lands on the ground',()=>{load(1);a.key('Space');advance(.1);a.key('Space',false);assert.ok(a.state.s.y<468);a.state.s.spawn=100;a.state.s.cars=[];advance(1);assert.equal(a.state.s.y,468);});
test('Breakout paddle reflects the ball and bricks award points',()=>{load(2);const s=a.state.s;s.ball={x:s.x+60,y:522,vx:0,vy:285};a.tick(.01);assert.ok(s.ball.vy<0);s.ball={x:80,y:145,vx:0,vy:50};const before=a.state.score;a.tick(.01);assert.equal(s.bricks.length,54);assert.ok(a.state.score>=before+60);});
test('Snake grows after food and disallows a direct reversal',()=>{load(3);const s=a.state.s;s.food={x:15,y:10};advance(.16);assert.equal(s.body.length,9);a.key('ArrowLeft');advance(.16);a.key('ArrowLeft',false);assert.equal(s.dir.x,1);a.key('ArrowDown');advance(.16);assert.equal(s.dir.y,1);});
test('Racing respects road bounds and rewards passed traffic',()=>{load(4);a.key('ArrowLeft');advance(1.1);a.key('ArrowLeft',false);assert.equal(a.state.s.x,285);a.state.s.cars=[{x:600,y:611,w:40,h:56,v:200}];const before=a.state.score;a.tick(.01);assert.ok(a.state.score>=before+70);});
test('Flapping lifts the bird and passing a pipe scores',()=>{load(5);a.key('Space');a.tick(.01);a.key('Space',false);assert.ok(a.state.s.vy<0);a.state.s.pipes=[{x:160,gap:310,passed:false}];const before=a.state.score;a.tick(.01);assert.ok(a.state.score>=before+250);});
test('Asteroids thrust, rotation, firing, and rock collision',()=>{load(6);a.key('ArrowUp');a.key('ArrowRight');advance(.1);a.key('ArrowUp',false);a.key('ArrowRight',false);assert.ok(Math.hypot(a.state.s.vx,a.state.s.vy)>0);assert.ok(a.state.s.a>-Math.PI/2);a.key('Space');a.tick(.01);a.key('Space',false);assert.ok(a.state.s.bullets.length);const s=a.state.s;s.rocks=[{x:100,y:200,vx:0,vy:0,r:24}];s.bullets=[{x:100,y:200,vx:0,vy:0,life:1}];const before=a.state.score;a.tick(.01);assert.equal(s.rocks.length,0);assert.ok(a.state.score>=before+120);});
test('Frogger hops and reaching the safe zone scores',()=>{load(7);a.key('ArrowUp');a.tick(.01);a.key('ArrowUp',false);assert.equal(a.state.s.y,460);a.state.s.y=110;const before=a.state.score;a.tick(.01);assert.ok(a.state.score>=before+600);assert.equal(a.state.s.y,515);});
test('Pause freezes the run and resumes with the same state',()=>{load(4);a.pause();const before=a.state.elapsed;advance(1);assert.equal(a.state.elapsed,before);assert.equal(a.state.mode,'paused');a.pause();advance(.1);assert.ok(a.state.elapsed>before);});
test('Switching preserves lives and points, changes genre, and increases speed',()=>{load(4);a.state.s.spawn=100;a.state.s.cars=[];const before=a.state;for(let i=0;i<900&&a.state.round===before.round;i++)a.tick(1/60);assert.ok(a.state.round>before.round);assert.notEqual(a.state.active,4);assert.equal(a.state.lives,before.lives);assert.ok(a.state.score>before.score);assert.ok(a.state.speed>1);assert.ok(a.state.cue>0);});
test('Hits have a grace period, game over saves best, restart resets the run',()=>{load(4);a.state.s.spawn=100;a.state.s.cars=[];advance(1.8);a.hit(100,100);assert.equal(a.state.lives,2);a.hit(100,100);assert.equal(a.state.lives,2);advance(2.1);a.hit(100,100);assert.equal(a.state.lives,1);advance(2.1);a.hit(100,100);assert.equal(a.state.mode,'over');assert.ok(Number(store.get('channel-surf-best'))>0);a.start();assert.equal(a.state.lives,3);assert.equal(a.state.score,0);assert.equal(a.state.round,1);});
test('Zero acceleration keeps speed constant',()=>{get('ramp').value='0';load(4);a.state.s.spawn=100;a.state.s.cars=[];advance(5);assert.equal(a.state.speed,1);});
test('Waiting in Frogger cannot earn points or advance the channel',()=>{get('ramp').value='1';load(7);a.state.s.cars=[];const before=a.state;advance(5);assert.equal(a.state.active,7);assert.equal(a.state.round,before.round);assert.equal(a.state.score,before.score);assert.equal(a.state.challenge.progress,0);});
test('Untimed Frogger can wait beyond the former deadline without losing a life',()=>{load(7);a.state.s.cars=[];const before=a.state;advance(65);assert.equal(a.state.active,7);assert.equal(a.state.round,before.round);assert.equal(a.state.lives,before.lives);assert.equal(a.state.score,before.score);assert.equal(a.state.challenge.remaining,null);assert.equal(get('goal-time').textContent,'NO TIME LIMIT');});
test('Three Frogger crossings are required and each crossing accelerates traffic',()=>{load(7);assert.equal(a.state.challenge.target,3);const firstSpeed=a.state.s.cars[0].v;a.state.s.y=110;a.tick(.01);assert.equal(a.state.challenge.progress,1);assert.ok(a.state.s.cars[0].v>firstSpeed);assert.equal(a.state.active,7);a.state.s.y=110;a.tick(.01);assert.equal(a.state.challenge.progress,2);assert.equal(a.state.active,7);a.state.s.y=110;a.tick(.01);assert.notEqual(a.state.active,7);assert.ok(a.state.cue>0);});
test('Taking a hit resets consecutive goal progress but keeps total score',()=>{load(7);a.state.s.y=110;a.tick(.01);a.state.s.cars=[];advance(1.1);const before=a.state.score;assert.equal(a.state.challenge.progress,1);a.hit(480,400);assert.equal(a.state.challenge.progress,0);assert.equal(a.state.lives,2);assert.equal(a.state.score,before);a.state.s.y=110;a.tick(.01);assert.equal(a.state.challenge.progress,1);assert.equal(a.state.active,7);a.state.s.y=110;a.tick(.01);assert.equal(a.state.active,7);a.state.s.y=110;a.tick(.01);assert.notEqual(a.state.active,7);});
test('Snake switches after its untimed pickup target',()=>{
  for(const i of [3]){
    load(i);const target=a.state.challenge.target;
    for(let n=0;n<target;n++){
      const s=a.state.s;
      if(i===0){s.enemies=[{x:100,y:250,w:36,h:32,v:0,phase:0,fire:10}];s.bullets=[{x:115,y:268}];}
      if(i===2){s.ball={x:80,y:145,vx:0,vy:50};s.bricks=[{x:53,y:135,w:70,h:23,row:0},{x:850,y:200,w:70,h:23,row:0}];}
      if(i===3){s.body=[{x:14,y:10},{x:13,y:10}];s.dir=s.next={x:1,y:0};s.food={x:15,y:10};s.timer=.15;}
      if(i===6){s.rocks=[{x:100,y:200,vx:0,vy:0,r:24}];s.bullets=[{x:100,y:200,vx:0,vy:0,life:1}];}
      a.tick(.01);
      if(n<target-1){assert.equal(a.state.active,i);assert.equal(a.state.challenge.progress,n+1);}
    }
    assert.notEqual(a.state.active,i);assert.ok(a.state.cue>0);
  }
});
test('Holding jump no longer automatically clears every runner obstacle',()=>{load(1);a.state.s.objects=[];a.state.s.spawn=100;a.key('Space');advance(.15);assert.ok(a.state.s.y<468);advance(1);assert.equal(a.state.s.y,468);advance(.15);assert.equal(a.state.s.y,468);a.key('Space',false);a.key('Space');a.tick(.01);assert.ok(a.state.s.y<468);a.key('Space',false);});
test('Runner and racing pose an immediate threat instead of an empty opening',()=>{for(const i of [1,4]){load(i);a.state.s.spawn=100;advance(2.5);assert.ok(a.state.lives<3,a.games[i]+' should punish inactivity');assert.equal(a.state.active,i);}});
test('Pause freezes survival timers',()=>{load(4);a.state.s.cars=[];a.state.s.spawn=100;const before=a.state.challenge.remaining;a.pause();advance(5);assert.equal(a.state.challenge.remaining,before);a.pause();advance(.1);assert.ok(a.state.challenge.remaining<before);});
test('Switch cadence changes objective size as well as survival duration',()=>{get('interval').value='0';load(3);const quick=a.state.challenge.target;get('interval').value='2';load(3);assert.ok(a.state.challenge.target>quick);get('interval').value='1';});
test('Every survival genre switches on time with no score quota',()=>{
  for(const i of [0,1,2,4,5,6]){
    load(i);assert.equal(a.state.challenge.kind,'survival');assert.equal(a.state.challenge.target,0);
    a.state.challenge.remaining=.001;const before=a.state.round;a.tick(.002);
    assert.ok(a.state.round>before);assert.notEqual(a.state.active,i);
  }
});
test('High scores do not bypass survival timers',()=>{load(0);const s=a.state.s;for(let n=0;n<10;n++){s.enemies=[{x:100,y:250,w:36,h:32,v:0,phase:0,fire:10}];s.bullets=[{x:115,y:268}];a.tick(.01);}assert.ok(a.state.score>=1000);assert.equal(a.state.active,0);assert.ok(a.state.challenge.remaining>0);});
test('Snake collision resets the pickup streak',()=>{load(3);a.state.s.food={x:15,y:10};a.state.s.timer=.15;a.tick(.01);assert.equal(a.state.challenge.progress,1);a.state.s.food={x:0,y:0};advance(1.1);a.state.s.body=[{x:35,y:10}];a.state.s.dir=a.state.s.next={x:1,y:0};a.state.s.timer=.15;a.tick(.01);assert.equal(a.state.challenge.progress,0);assert.equal(a.state.lives,2);assert.equal(a.state.active,3);});
console.log(`\n${count} gameplay checks passed.`);

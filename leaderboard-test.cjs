const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
async function main(){
  if(spawnSync('php',['-v']).error){console.log('PHP not installed: shared leaderboard checks skipped. Use PHP to run these checks.');return;}
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'channel-scores-test-'));
  fs.copyFileSync('scores.php',path.join(dir,'scores.php'));
  const port=await new Promise(resolve=>{const server=net.createServer();server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
  const url=`http://127.0.0.1:${port}/scores.php`;
  let child,count=0;
  async function start(){child=spawn('php',['-S',`127.0.0.1:${port}`,'-t',dir],{stdio:'ignore',windowsHide:true});for(let i=0;i<100;i++){try{await fetch(url);return;}catch{await new Promise(r=>setTimeout(r,50));}}throw new Error('PHP test server did not start');}
  async function stop(){if(child.exitCode!==null)return;await new Promise(resolve=>{child.once('exit',resolve);child.kill();});}
  const entry=(id,score=100)=>({id:`test-run-${id}`,name:'TEST PLAYER',score,seconds:20,channels:2,difficulty:'normal',ramp:1,interval:1,genres:8});
  const post=data=>fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  async function test(label,run){await run();console.log('PASS '+label);count++;}
  try{
    await start();
    await test('New hosted table starts empty',async()=>assert.deepEqual((await (await fetch(url)).json()).scores,[]));
    await test('Valid score is saved and returned',async()=>{const response=await post(entry('first'));assert.equal(response.status,200);const rows=(await response.json()).scores;assert.equal(rows.length,1);assert.equal(rows[0].name,'TEST PLAYER');assert.equal(rows[0].score,100);});
    await test('Retrying the same run does not duplicate it',async()=>{await post(entry('first'));assert.equal((await (await fetch(url)).json()).scores.length,1);});
    await test('Scores sort highest first',async()=>{await post(entry('second',500));const rows=(await (await fetch(url)).json()).scores;assert.equal(rows[0].score,500);assert.equal(rows[1].score,100);});
    await test('Invalid values and player names are rejected',async()=>{for(const data of [{...entry('bad'),score:-1},{...entry('bad'),score:1.2},{...entry('bad'),name:'<script>'},{...entry('bad'),difficulty:'unknown'},{...entry('bad'),genres:9}])assert.equal((await post(data)).status,400);});
    await test('Cross-site submissions and unsupported methods are rejected',async()=>{assert.equal((await fetch(url,{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://another.example'},body:JSON.stringify(entry('origin'))})).status,403);assert.equal((await fetch(url,{method:'DELETE'})).status,405);});
    await test('Storage file cannot reveal its contents through PHP',async()=>{const body=await (await fetch(url.replace('scores.php','score-data.php'))).text();assert.equal(body,'');});
    await test('Scores survive stopping and restarting the server',async()=>{await stop();await start();const rows=(await (await fetch(url)).json()).scores;assert.equal(rows.length,2);assert.equal(rows[0].score,500);});
    await test('Multiple submissions retain every score',async()=>{await Promise.all(Array.from({length:12},(_,i)=>post(entry('batch-'+i,200+i))));assert.equal((await (await fetch(url)).json()).scores.length,14);});
    await test('Malformed stored data is preserved instead of silently overwritten',async()=>{fs.writeFileSync(path.join(dir,'score-data.php'),'corrupt');assert.equal((await post(entry('corrupt'))).status,503);assert.equal(fs.readFileSync(path.join(dir,'score-data.php'),'utf8'),'corrupt');});
    console.log(`\n${count} shared-score checks passed.`);
  }finally{await stop();for(const filename of ['scores.php','score-data.php']){const file=path.join(dir,filename);if(fs.existsSync(file))fs.unlinkSync(file);}fs.rmdirSync(dir);}
}
main().catch(error=>{console.error(error);process.exitCode=1;});

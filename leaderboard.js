/* Local scores always work; a PHP host adds a shared leaderboard. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),key='channel-surf-scores-v1';
  let local=[],shared=[],scope='local',serverAvailable=false,pending=null;const persistent=new Map();
  const name=value=>String(value||'PLAYER').toUpperCase().replace(/[^A-Z0-9 _-]/g,'').trim().slice(0,12)||'PLAYER';
  const sort=rows=>rows.sort((a,b)=>b.score-a.score||a.seconds-b.seconds||a.date.localeCompare(b.date)).slice(0,100);
  const valid=row=>row&&typeof row.id==='string'&&typeof row.name==='string'&&Number.isInteger(row.score)&&row.score>0&&Number.isInteger(row.seconds)&&Number.isInteger(row.channels)&&['easy','normal','hard'].includes(row.difficulty)&&typeof row.date==='string';
  try {const saved=JSON.parse(localStorage.getItem(key)||'[]');if(Array.isArray(saved))local=sort(saved.filter(valid));$('player-name').value=name(localStorage.getItem('channel-surf-player')||'PLAYER');} catch {}
  function render(){
    const rows=(scope==='shared'?shared:local).slice(0,20),body=$('score-rows');body.replaceChildren();
    $('score-scope').textContent=scope==='shared'?'SHARED / ALL PLAYERS':'LOCAL / THIS BROWSER';
    $('scores-local').setAttribute('aria-pressed',String(scope==='local'));$('scores-shared').setAttribute('aria-pressed',String(scope==='shared'));
    $('scores-shared').disabled=!serverAvailable;
    $('scores-note').textContent=scope==='shared'?'All players on this website. Run settings are shown so you can compare like for like.':'Saved in this browser, including after closing it. Clearing browser data removes local scores.';
    if(!rows.length){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=5;cell.className='empty-scores';cell.textContent='NO SCORES YET. YOUR NAME BELONGS HERE.';row.appendChild(cell);body.appendChild(row);}
    rows.forEach((entry,i)=>{const row=document.createElement('tr');const seconds=`${Math.floor(entry.seconds/60)}:${String(entry.seconds%60).padStart(2,'0')}`;const rules=`${{easy:'CHILL',normal:'ARCADE',hard:'CHAOS'}[entry.difficulty]} / ${entry.genres||8} CH / ${['CONSTANT','STEADY','FAST','RELENTLESS'][entry.ramp??1]} / ${['QUICK','NORMAL','LONG'][entry.interval??1]}`;for(const value of [String(i+1).padStart(2,'0'),entry.name,entry.score.toLocaleString(),`${seconds} / ${entry.channels} CH`,rules]){const cell=document.createElement('td');cell.textContent=value;row.appendChild(cell);}body.appendChild(row);});
  }
  async function request(entry){
    if(!['http:','https:'].includes(location.protocol))throw new Error('Local file');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),5000);
    try {const response=await fetch('./scores.php',{method:entry?'POST':'GET',headers:entry?{'Content-Type':'application/json'}:{},body:entry?JSON.stringify(entry):undefined,signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error('Scores unavailable');const data=await response.json();if(!Array.isArray(data.scores)||!data.scores.every(valid))throw new Error('Invalid scoreboard');return sort(data.scores);}finally{clearTimeout(timer);}
  }
  async function refresh(){
    $('scores-refresh').disabled=true;
    try {shared=await request();serverAvailable=true;scope='shared';}catch{serverAvailable=false;scope='local';}
    render();$('scores-refresh').disabled=false;
  }
  async function submit(entry){
    try {shared=await request(entry);serverAvailable=true;scope='shared';if(pending?.id===entry.id){pending=null;$('score-save-status').textContent='SCORE SAVED TO THE SHARED TABLE';$('score-retry').hidden=true;}}
    catch{serverAvailable=false;scope='local';if(pending?.id===entry.id){$('score-save-status').textContent=persistent.get(entry.id)?'SAVED LOCALLY · SHARED TABLE UNAVAILABLE':'SAVED FOR THIS SESSION · STORAGE UNAVAILABLE';$('score-retry').hidden=false;}}
    render();
  }
  function record(run){
    if(run.score<1)return;
    const entry={...run,id:window.crypto?.randomUUID?.()||`run-${Date.now()}-${Math.random().toString(36).slice(2)}`,name:name($('player-name').value),date:new Date().toISOString()};
    local=sort([entry,...local]);
    let persisted=true;
    try{localStorage.setItem(key,JSON.stringify(local));localStorage.setItem('channel-surf-player',entry.name);}catch{persisted=false;}
    persistent.set(entry.id,persisted);pending=entry;$('score-save-status').textContent=persisted?'SAVED LOCALLY · CHECKING SHARED TABLE…':'BROWSER STORAGE UNAVAILABLE · CHECKING SHARED TABLE…';$('score-retry').hidden=true;render();
    // No PHP is required for the local table; retry is offered on a web server.
    if(['http:','https:'].includes(location.protocol))submit(entry);
    else{$('score-save-status').textContent=persisted?'SCORE SAVED IN THIS BROWSER':'SCORE KEPT FOR THIS SESSION · BROWSER STORAGE UNAVAILABLE';}
  }
  $('scores-local').onclick=()=>{scope='local';render();};$('scores-shared').onclick=()=>{scope='shared';render();};$('scores-refresh').onclick=refresh;$('score-retry').onclick=()=>{if(pending)submit(pending);};
  $('player-name').addEventListener('change',()=>{$('player-name').value=name($('player-name').value);try{localStorage.setItem('channel-surf-player',$('player-name').value);}catch{}});
  window.ChannelScores={record};render();refresh();
})();

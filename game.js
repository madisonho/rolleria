import * as E from './game-engine.js';

const $ = s => document.querySelector(s);
const root = $('#playfield');
const pretty = s => String(s).replaceAll('-', ' ').replace(/\b\w/g, c=>c.toUpperCase());
const KEY = 'rolleria-save-v1';
let g=null, saved=null, art, selected=null, decorateKind='icing', sound=false, audio, slicePosition=0;
let toastTimer, saveElapsed=0, lastTime=performance.now(), helpWasPaused=false, confirmReset=false;
const shortNames={'cream-cheese':'Cream cheese','chocolate-cinnamon':'Choc cinnamon','chocolate-chips':'Choc chips','rainbow-sprinkles':'Sprinkles','cinnamon-crumble':'Cinnamon crumble'};
const name = s => shortNames[s] || pretty(s);
const image=(id,cls='',attrs='')=>`<img src="${art.get(id)}" alt="" class="${cls}" draggable="false" ${attrs}>`;
const button=(action,label,cls='primary',disabled=false)=>`<button class="${cls}" data-action="${action}" ${disabled?'disabled':''}>${label}</button>`;
function persist(){
  if(!g)return;
  try{localStorage.setItem(KEY,JSON.stringify(g));$('#save-status').textContent='Progress saved on this device.';}
  catch{$('#save-status').textContent='Storage unavailable. Keep this tab open to retain your game.';}
}
function beep(success=true){
  if(!sound)return;
  try{audio ||= new AudioContext();audio.resume();const osc=audio.createOscillator(),gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.setValueAtTime(success?620:200,audio.currentTime);osc.frequency.exponentialRampToValueAtTime(success?880:140,audio.currentTime+.12);gain.gain.setValueAtTime(.045,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);osc.start();osc.stop(audio.currentTime+.2);}catch{}
}
function toast(message){
  clearTimeout(toastTimer);$('.feedback')?.remove();const el=document.createElement('div');el.className='feedback';el.textContent=message;root.append(el);$('#announcement').textContent=message;toastTimer=setTimeout(()=>el.remove(),2300);
}
function ticket(){
  const rows=g.order.length?g.order:[0,1,2].map(i=>E.recipe(g.day,g.customer,i));
  return `<aside class="ticket" aria-label="Customer order ticket">${image('ticket-clip','clip')}<div class="ticket-title"><strong>${String(g.customer+1).padStart(2,'0')}</strong><span>${pretty(E.CUSTOMERS[g.customer])}<br>THREE FRESH ROLLS</span></div>${rows.map((r,i)=>`<section class="ticket-recipe ${i===g.rollIndex?'active':''}"><div class="recipe-heading"><b>${i+1}</b> ${name(r.dough)} dough</div>${['filling','icing','drizzle','topping'].map(k=>`<div class="ticket-row">${image(k==='filling'?'symbol-'+r[k]:'symbol-'+k+'-'+r[k])}<span>${name(r[k])}${k==='icing'?' icing':k==='drizzle'?' drizzle':''}</span></div>`).join('')}</section>`).join('')}<div class="ticket-footer">${g.phase==='welcome'?'Take the order to begin.':'Match each roll to its numbered recipe.'}<br>Made with love. Served with a smile.</div></aside>`;
}
function nav(){return `<nav class="station-nav" aria-label="Cooking stations">${['order','dough','bake','build'].map(s=>`<button data-station="${s}" aria-label="${pretty(s)} station" aria-pressed="${g.station===s}">${image(`button-${s}-${g.station===s?'selected':'normal'}`)}${s==='bake'&&g.bake.status==='baking'?'<span class="nav-badge" id="oven-badge">⌛</span>':''}</button>`).join('')}</nav>`;}
function rollTabs(){return `<div class="roll-tabs" aria-label="Select a roll">${g.rolls.map((r,i)=>`<button data-roll="${i}" class="${i===g.rollIndex?'selected':''}" aria-pressed="${i===g.rollIndex}">Roll ${i+1}<small>${g.station==='build'?Object.values(r.coverage).every(x=>x===3)?'✓ Decorated':'Add toppings':r.step==='ready'?'✓ Ready to bake':r.step==='select'?'Choose dough':pretty(r.step)}</small></button>`).join('')}</div>`;}
function ingredients(kind){const prefix={dough:'bin',filling:'bin',icing:'tub',drizzle:'bottle',topping:'jar'}[kind];return `<div class="ingredient-tray" aria-label="${pretty(kind)} choices">${E.MENU[kind].map(v=>`<button class="ingredient ${selected===v?'selected':''}" data-ingredient="${v}" data-kind="${kind}" data-drag="ingredient" aria-label="Choose ${name(v)} ${kind}" aria-pressed="${selected===v}">${image(prefix+'-'+v)}<span>${name(v)}</span></button>`).join('')}</div>`;}
function empty(message,action,label,id='finished-roll-1'){return `<div class="work-content"><div class="empty-station">${image(id)}<p>${message}</p>${button(action,label)}</div></div>`;}
function orderStation(){return `<div class="order-scene">${image('shop-window','window left')}${image('shop-window','window right')}${image(`${E.CUSTOMERS[g.customer]}-full-${g.phase==='result'?(g.result.total>=75?'happy':'disappointed'):'neutral'}`,'customer')}${image('pip-counter-happy','worker')}${image('order-counter','counter')}<span class="customer-name">${pretty(E.CUSTOMERS[g.customer])}</span>${g.phase==='welcome'?button('take','Take order ✎'):g.phase==='cooking'?`<div class="welcome-message">“I can’t wait for my cinnamon rolls!”<br><small>Your ticket is pinned up. Head to the kitchen.</small></div>`:''}</div>`;}
function doughStation(){
  if(g.phase==='welcome')return empty('Take the customer’s order before preparing their rolls.','go-order','Back to the counter','order-pad');
  if(g.bake.status!=='raw')return empty('Your dough is already in the baking batch.','go-'+(g.bake.status==='baking'?'bake':'build'),g.bake.status==='baking'?'Check the oven':'Decorate the rolls','tray');
  const r=g.rolls[g.rollIndex];
  const info={select:'Choose the dough on the ticket. Drag it onto the board or click to select.',flatten:'Flatten the dough. Drag the rolling pin across the board four times.',butter:'Spread a little butter. Three passes should do it.',fill:'Choose the filling from the ticket, then spread it in three passes.',roll:'Roll the sheet into a snug log. Two strokes on the board.',slice:'Cut when the moving marker is inside the green zone!',ready:'A lovely little spiral. Prepare the other rolls, then load the oven.'};
  const stage={flatten:'ball',butter:'sheet',fill:'buttered',roll:'filled',slice:'log',ready:'sliced'}[r.step];
  const tool={flatten:'rolling-pin',butter:'spatula',fill:'filling-shaker',roll:'scraper',slice:'slicing-tool'}[r.step];
  const pastry=r.step==='select'?image('dough-classic-cinnamon-ball','pastry','style="opacity:.25"'):r.step==='ready'?image(`roll-${r.dough}-${r.filling}-raw`,'pastry'):image(`dough-${r.dough}-${r.filling||'cinnamon'}-${stage}`,'pastry');
  const workCount={flatten:4,butter:3,fill:3,roll:2};
  return `<div class="work-content"><p class="instruction">${info[r.step]}</p>${rollTabs()}<div class="prep-board" id="prep-board" aria-label="Dough preparation board">${pastry}${tool?image(tool,'tool-on-board',`data-drag="tool" aria-label="Drag ${pretty(tool)}"`):''}${r.step==='slice'?'<div class="slice-game"><div class="slice-track"><span class="slice-zone"></span><span class="slice-needle"></span></div><small>Cut inside the green band · keyboard: focus Cut and press Enter</small></div>':`<span class="board-hint">${r.step==='select'?'DROP DOUGH HERE':r.step==='ready'?'READY FOR THE OVEN':'DRAG ACROSS THE BOARD OR USE THE BUTTON BELOW'}</span>`}</div>${r.step==='select'?ingredients('dough'):r.step==='fill'?ingredients('filling'):''}${workCount[r.step]?`<div class="progress-track" aria-label="Preparation progress"><span style="width:${r.work/workCount[r.step]*100}%"></span></div>`:''}<div class="action-row">${r.step==='ready'?E.canBake(g)?button('go-bake','All ready → Bake station','action-button'):button('next-roll','Prepare next roll →','action-button'):r.step==='select'?button('add-dough','Place selected dough','action-button',!selected):button('prepare',({flatten:'Roll the dough',butter:'Spread butter',fill:'Spread filling',roll:'Roll into a log',slice:'Cut now!'})[r.step]+(workCount[r.step]?` · ${r.work}/${workCount[r.step]}`:''),'action-button',r.step==='fill'&&!r.filling)}${r.step!=='select'?button('reset-roll','Start this roll over','quiet-button'):''}</div></div>`;
}
function bakeStation(){
  if(!E.canBake(g))return empty('Prepare all three rolls at the dough station first.','go-dough','Back to the dough','oven-mitt');
  const cooking=g.bake.status==='baking',done=g.bake.status==='done';
  return `<div class="work-content"><p class="instruction">${done?'Batch is out! Decorate these rolls, or rebake if you want another try.':cooking?'Keep an eye on the timer. Pull the tray out in the green zone!':'Three spirals, ready to rise. Load the tray and start baking.'}</p><div class="oven-wrap">${image('oven-'+(cooking?'closed':'open'),'oven-art')}<div class="oven-readout" id="oven-clock">${g.bake.seconds.toFixed(1)}s</div><div class="oven-rolls">${g.rolls.map((r,i)=>image(`roll-${r.dough}-${r.filling}-${E.doneness(g.bake.seconds)}`,'',`data-oven-roll="${i}"`)).join('')}</div></div><div class="bake-meter" aria-label="Baking progress"><span class="bake-marker" style="left:${Math.min(100,g.bake.seconds/40*100)}%"></span></div><div class="bake-labels"><span>RAW</span><span>17–23s · PERFECT</span><span>BURNT</span></div><div class="action-row">${cooking?button('remove','Pull out the tray!','action-button'):done?button('go-build','Time to decorate →','action-button'):button('bake','Load oven & start','action-button')}${done?button('rebake','Try baking again','quiet-button'):''}</div><p class="idle-hint">The oven keeps running when you switch stations. Pause stops the clock.</p></div>`;
}
function decoratedRoll(r){return `<div class="decorated-roll">${image(`roll-${r.dough}-${r.filling}-${E.doneness(g.bake.seconds)}`)}${['icing','drizzle','topping'].filter(k=>r[k]).map(k=>image(k+'-'+r[k],'',`style="opacity:${.25+r.coverage[k]*.25}"`)).join('')}</div>`;}
function buildStation(){
  if(g.bake.status!=='done')return empty(g.bake.status==='baking'?'Your rolls are still in the oven. Don’t let them burn!':'Bake your three rolls before adding the sweet stuff.','go-bake','Check the oven','bottle-strawberry');
  const r=g.rolls[g.rollIndex];
  return `<div class="work-content"><p class="instruction">Match the ticket. Apply each ingredient three times for an even finish.</p>${rollTabs()}<div class="decorate-tabs" aria-label="Decoration step">${['icing','drizzle','topping'].map((k,i)=>`<button data-decorate="${k}" class="${decorateKind===k?'active':''}" aria-pressed="${decorateKind===k}" ${i>0&&r.coverage[i===1?'icing':'drizzle']<3?'disabled':''}>${i+1}. ${pretty(k)} ${r.coverage[k]===3?'✓':''}</button>`).join('')}</div><div class="prep-board" id="decoration-board" aria-label="Roll decorating area">${decoratedRoll(r)}<span class="decoration-count">${r.coverage[decorateKind]}/3 passes</span></div>${ingredients(decorateKind)}<div class="action-row">${button('apply','Apply '+(selected?name(selected):pretty(decorateKind)),'action-button',!selected)}${button('next-decoration','Next step →','secondary',r.coverage[decorateKind]<3)}</div><div class="action-row">${button('serve',E.canServe(g)?'Serve the order ✓':'Finish all three rolls to serve','action-button',!E.canServe(g))}</div></div>`;
}
function resultOverlay(){
  if(g.phase==='day-end') {
    const average=Math.round(g.history.reduce((s,r)=>s+r.total,0)/g.history.length);
    return `<div class="modal-shade"><section class="result-card" role="dialog" aria-modal="true" aria-label="Day complete"><p class="kicker">THE LAST ROLL HAS LEFT THE OVEN</p><h2>That’s a wrap!</h2><div class="result-stars">${'★'.repeat(E.stars(average))}</div><p>Day ${g.day} complete · ${average}% average score<br>You served all four customers.</p><div class="day-orders">${g.history.map(r=>`<div>${image(r.customer+'-counter-'+(r.total>=75?'happy':'disappointed'))}<span>${r.total}%</span></div>`).join('')}</div><div class="score-total">Today’s tips: $${g.history.reduce((s,r)=>s+r.tip,0).toFixed(2)}</div>${button('next-day','Open for day '+(g.day+1))}</section></div>`;
  }
  const r=g.result;
  return `<div class="modal-shade"><section class="result-card" role="dialog" aria-modal="true" aria-label="Order results"><p class="kicker">${pretty(r.customer).toUpperCase()}’S ORDER</p><h2>${r.total>=90?'Sweet perfection!':r.total>=75?'A delicious little batch!':r.total>=50?'Getting the hang of it!':'Every baker starts somewhere.'}</h2><div class="result-stars">${'★'.repeat(E.stars(r.total))}<span style="opacity:.2">${'★'.repeat(5-E.stars(r.total))}</span></div><div class="score-columns"><div><span>DOUGH</span><strong>${r.dough}%</strong></div><div><span>BAKING</span><strong>${r.bake}%</strong></div><div><span>BUILD</span><strong>${r.build}%</strong></div></div><div class="score-total">${r.total}% overall · $${r.tip.toFixed(2)} tip</div><p>${r.dough<90?'Check the dough and filling, and aim your cut inside the green zone. ':''}${r.bake<90?'Pull the oven tray between 17 and 23 seconds. ':''}${r.build<90?'Match each icing, drizzle, and topping to its numbered ticket. ':''}${r.total>=90?'A little cinnamon, a little care. You nailed it.':''}</p>${button('next',g.customer===3?'Close out the day →':'Next customer →')}</section></div>`;
}
function pausedOverlay(){return `<div class="modal-shade"><section class="result-card" role="dialog" aria-modal="true" aria-label="Game paused"><p class="kicker">TAKE A BREATHER</p><h2>Kitchen paused.</h2><p>Your oven timer is stopped.<br>The rolls will be right here when you return.</p>${button('resume','Back to baking')}<br>${button('restart','Start a new game','secondary')}${confirmReset?'<p class="new-confirm">This replaces your saved day and tips.</p>'+button('confirm-restart','Yes, start fresh','secondary'):''}</section></div>`;}
function render(){
  if(!g){root.innerHTML=`<section class="title-screen">${image('title-art','title-art')}<div class="title-copy"><p class="kicker">YOUR OWN LITTLE CORNER BAKERY</p><h1>Good mornings<br>start with a swirl.</h1><p>Roll the dough. Watch the oven. Pile on the sweet stuff. Your first customer is waiting!</p>${saved?button('continue',`Continue day ${saved.day}`):button('new','Let’s roll!')}${saved?button('restart','Start fresh','secondary'):''}${confirmReset?'<p class="new-confirm">Replace your saved game?</p>'+button('confirm-restart','Yes, start fresh','secondary'):''}<p style="font-size:11px">Four stations · Four regulars · Endless cinnamon</p></div></section>`;return;}
  $('#day-status').textContent=`DAY ${g.day} · CUSTOMER ${g.customer+1} OF 4`;
  $('#bank').textContent=`TIPS $${g.bank.toFixed(2)}`;
  const content={order:orderStation,dough:doughStation,bake:bakeStation,build:buildStation}[g.station]();
  root.innerHTML=`<div class="game-shell ${g.paused?'paused':''}"><section class="station-main" style="background-image:url('${art.get('background-'+g.station)}')"><div class="station-heading"><div><small>PAPA’S ROLLERIA</small><h1>${pretty(g.station)} station</h1></div>${button('pause','Ⅱ Pause','pause')}</div>${content}</section>${ticket()}${nav()}</div>${['result','day-end'].includes(g.phase)?resultOverlay():g.paused?pausedOverlay():''}`;
  persist();
}
function afterAction(message){beep();render();if(message)toast(message);}
function selectIngredient(kind,value){
  selected=value;
  if(kind==='filling')E.chooseFilling(g,value);
  render();
}
function applyIngredient(){if(!selected)return;const r=g.rolls[g.rollIndex];if(E.decorate(g,decorateKind,selected)){const complete=r.coverage[decorateKind]===3;afterAction(complete?`${pretty(decorateKind)} finished! Move to the next step.`:null);}}
function prepareRoll(){
  const r=g.rolls[g.rollIndex],was=r.step;
  const precision=Math.max(0,1-Math.max(0,Math.abs(slicePosition-.5)-.1)*2.5);
  if(E.prepare(g,precision)) {
    if(was!==r.step)selected=null;
    afterAction(r.step==='ready'?(precision>.95?'Perfect cut! That’s a beautiful spiral.':'Roll sliced. Ready for the oven.'):null);
  }else toast('Choose a filling first. Check the ticket!');
}
function setRoll(i){g.rollIndex=i;selected=null;decorateKind='icing';render();}
function handleAction(action){
  if(action==='new'||action==='confirm-restart'){g=E.newGame();saved=null;confirmReset=false;selected=null;afterAction();return;}
  if(action==='continue'){g=saved;g.paused=false;lastTime=performance.now();afterAction();return;}
  if(action==='restart'){confirmReset=!confirmReset;render();return;}
  if(action==='resume'){g.paused=false;confirmReset=false;lastTime=performance.now();render();return;}
  if(!g||g.paused)return;
  if(action==='pause'){g.paused=true;render();return;}
  if(action.startsWith('go-')){g.station=action.slice(3);selected=null;render();return;}
  if(action==='take'){if(E.takeOrder(g))afterAction('Order taken! Match each roll to the ticket.');}
  if(action==='add-dough'){if(E.chooseDough(g,selected)){selected=null;afterAction();}}
  if(action==='prepare')prepareRoll();
  if(action==='reset-roll'){E.resetRoll(g);selected=null;afterAction();}
  if(action==='next-roll'){const i=g.rolls.findIndex(r=>r.step!=='ready');if(i>=0)setRoll(i);}
  if(action==='bake'){if(E.startBake(g)){lastTime=performance.now();afterAction('Oven on! Aim for 17–23 seconds.');}}
  if(action==='remove'){if(E.removeBake(g)){selected=null;decorateKind='icing';afterAction(E.bakingScore(g.bake.seconds)>=95?'Golden perfection! Time for the sweet stuff.':'Tray is out. Let’s decorate!');}}
  if(action==='rebake'){E.retryBake(g);afterAction();}
  if(action==='apply')applyIngredient();
  if(action==='next-decoration'){
    if(g.rolls[g.rollIndex].coverage[decorateKind]<3)return;
    const i=['icing','drizzle','topping'].indexOf(decorateKind);
    if(i<2){decorateKind=['icing','drizzle','topping'][i+1];selected=null;render();}
    else {const next=g.rolls.findIndex(r=>Object.values(r.coverage).some(c=>c<3));if(next>=0)setRoll(next);else toast('All three rolls are ready. Serve your order!');}
  }
  if(action==='serve'){if(E.serve(g))afterAction();}
  if(action==='next'){if(E.nextCustomer(g)){selected=null;afterAction();}}
  if(action==='next-day'){if(g.phase==='day-end'){g=E.newGame(g.day+1,g.bank);selected=null;afterAction();}}
}
root.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.disabled)return;
  const focusAction=b.dataset.action;
  if(b.dataset.action)handleAction(b.dataset.action);
  else if(g&&!g.paused&&!['result','day-end'].includes(g.phase)) {
    if(b.dataset.station){g.station=b.dataset.station;selected=null;decorateKind='icing';render();}
    if(b.dataset.roll!==undefined)setRoll(Number(b.dataset.roll));
    if(b.dataset.ingredient)selectIngredient(b.dataset.kind,b.dataset.ingredient);
    if(b.dataset.decorate){decorateKind=b.dataset.decorate;selected=null;render();}
  }
  // Keep keyboard users on the same action when a progress update redraws it.
  if(e.detail===0&&focusAction)root.querySelector(`[data-action="${focusAction}"]:not(:disabled)`)?.focus();
});
let drag=null;
root.addEventListener('pointerdown',e=>{
  if(!g||g.paused||g.phase!=='cooking'||e.button!==0)return;
  const source=e.target.closest('[data-drag]');
  const board=e.target.closest('#prep-board');
  if(!source&&!board)return;
  if(board&&['select','ready','slice'].includes(g.rolls[g.rollIndex].step))return;
  const img=source?.matches('img')?source:source?.querySelector('img');
  drag={startX:e.clientX,startY:e.clientY,id:e.pointerId,kind:source?.dataset.kind,value:source?.dataset.ingredient,tool:!source||source.dataset.drag==='tool',src:img?.src,moved:false};
});
window.addEventListener('pointermove',e=>{
  if(!drag||drag.id!==e.pointerId)return;
  if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>12)drag.moved=true;
  if(!drag.moved)return;
  if(drag.src&&!$('.drag-ghost')){const el=document.createElement('img');el.className='drag-ghost';el.src=drag.src;el.alt='';document.body.append(el);}
  const ghost=$('.drag-ghost');if(ghost){ghost.style.left=e.clientX+'px';ghost.style.top=e.clientY+'px';}
  const board=$('#prep-board')||$('#decoration-board');if(board){const b=board.getBoundingClientRect();board.classList.toggle('drag-over',e.clientX>=b.left&&e.clientX<=b.right&&e.clientY>=b.top&&e.clientY<=b.bottom);}
});
function cancelDrag(){drag=null;$('.drag-ghost')?.remove();$('.drag-over')?.classList.remove('drag-over');}
window.addEventListener('pointercancel',cancelDrag);
window.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const d=drag,board=$('#prep-board')||$('#decoration-board'),bounds=board?.getBoundingClientRect();
  const inside=bounds&&e.clientX>=bounds.left&&e.clientX<=bounds.right&&e.clientY>=bounds.top&&e.clientY<=bounds.bottom;
  cancelDrag();if(!d.moved)return;
  if(!inside||!g||g.paused)return;
  if(d.tool){if(g.station==='dough')prepareRoll();return;}
  if(d.kind==='dough'){if(E.chooseDough(g,d.value)){selected=null;afterAction();}}
  else if(d.kind==='filling'){if(E.chooseFilling(g,d.value)){selected=d.value;prepareRoll();}}
  else if(g.station==='build'){selected=d.value;decorateKind=d.kind;applyIngredient();}
});
function openHelp(){helpWasPaused=g?.paused??true;if(g){g.paused=true;render();}$('#help-dialog').showModal();}
$('#help').addEventListener('click',openHelp);
$('#help-dialog .close').addEventListener('click',()=>$('#help-dialog').close());
$('.close-help').addEventListener('click',()=>$('#help-dialog').close());
$('#help-dialog').addEventListener('close',()=>{if(g){g.paused=helpWasPaused;lastTime=performance.now();render();}});
$('#sound').addEventListener('click',()=>{sound=!sound;$('#sound').textContent=sound?'Sound on':'Sound off';$('#sound').setAttribute('aria-pressed',sound);beep();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&g&&!$('#help-dialog').open&&!['result','day-end'].includes(g.phase)){g.paused=!g.paused;confirmReset=false;lastTime=performance.now();render();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&g&&!['result','day-end'].includes(g.phase)){g.paused=true;cancelDrag();render();}});
window.addEventListener('pagehide',()=>{if(g){g.paused=true;persist();}});
function frame(now){
  const dt=Math.min(1,Math.max(0,(now-lastTime)/1000));lastTime=now;
  if(g&&!g.paused){
    const before=g.bake.seconds;E.tick(g,dt);saveElapsed+=dt;
    if(g.phase==='cooking'&&g.rolls[g.rollIndex].step==='slice'){
      slicePosition=(Math.sin(now/480)+1)/2;
      const needle=$('.slice-needle');if(needle)needle.style.left=(slicePosition*100)+'%';
    }
    if(g.bake.status==='baking'){
      const clock=$('#oven-clock');if(clock)clock.textContent=g.bake.seconds.toFixed(1)+'s';
      const marker=$('.bake-marker');if(marker)marker.style.left=Math.min(100,g.bake.seconds/40*100)+'%';
      document.querySelectorAll('[data-oven-roll]').forEach(img=>{const r=g.rolls[Number(img.dataset.ovenRoll)];const src=art.get(`roll-${r.dough}-${r.filling}-${E.doneness(g.bake.seconds)}`);if(img.getAttribute('src')!==src)img.setAttribute('src',src);});
      const badge=$('#oven-badge');if(badge)badge.textContent=g.bake.seconds>=17?'!':'⌛';
      if(before<17&&g.bake.seconds>=17){beep();toast('Ding! Your rolls are golden. Pull out the tray!');}
      if(before<26&&g.bake.seconds>=26){beep(false);toast('The rolls are burning! Check the oven.');}
    }
    if(saveElapsed>=2){saveElapsed=0;persist();}
  }
  requestAnimationFrame(frame);
}
async function init(){
  root.innerHTML='<div class="loading"><p>Warming up the kitchen…</p></div>';
  try{
    const response=await fetch('assets/manifest.json');if(!response.ok)throw Error('Missing manifest');
    const data=await response.json();art=new Map(data.assets.map(a=>[a.id,a.file]));
    try{saved=E.restore(localStorage.getItem(KEY));}catch{}
    render();requestAnimationFrame(frame);
  }catch{root.innerHTML='<div class="loading"><h1>The kitchen couldn’t load.</h1><p>Serve this folder with a local web server, then reload.</p><button class="primary" id="reload">Try again</button></div>';$('#reload').onclick=()=>location.reload();}
}
init();

const manifest = await fetch('assets/manifest.json').then(r => {if (!r.ok) throw new Error('Unable to load asset manifest'); return r.json();});
const assets = manifest.assets;
const byId = new Map(assets.map(a => [a.id, a]));
const $ = selector => document.querySelector(selector);
const pretty = value => value.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
const file = id => {if (!byId.has(id)) throw new Error(`Unknown asset: ${id}`); return byId.get(id).file;};
const names = {order:'Order',dough:'Dough',bake:'Bake',build:'Build'};
const stationInfo = {
  order: {title:'A warm welcome.',description:'Meet the regulars, take their order, and pin up the ticket. Every good roll starts with a little conversation.',subtitle:'Meet your regulars',category:'characters'},
  dough: {title:'Made from scratch.',description:'Roll it flat, spread the filling, then roll and slice. Three little spirals, ready for their moment in the oven.',subtitle:'Roll, fill & slice',category:'dough'},
  bake: {title:'Just golden enough.',description:'A warm oven and a watchful eye. Explore the baking states, from soft raw dough to perfectly golden spirals.',subtitle:'Watch the golden moment',category:'food'},
  build: {title:'The sweet finishing touch.',description:'A swirl of icing, a ribbon of drizzle, a little crunch. Layer the toppings to bring each ticket to life.',subtitle:'Ice, drizzle & sprinkle',category:'decorations'}
};
const state = {station:'order',customer:'juniper',expression:'happy',doughStage:'sliced',bakeState:'golden',oven:'open',buildStage:'finished',guides:false,category:'all',search:'',allStates:false,view:'stations',detail:null};
const recipeNames = ['The classic crunch','Double chocolate','Berry happy'];
const recipeDescriptions = ['Cream cheese · caramel · pecans','Chocolate · vanilla · choc chips','Vanilla · strawberry · sprinkles'];
let sceneIds = new Set();

function asset(id,x,y,w,h,extra='') {
  sceneIds.add(id);
  const a=byId.get(id); const height=h ?? (w*a.height/a.width);
  return `<img src="${file(id)}" alt="" draggable="false" style="left:${x/14.4}%;top:${y/10}%;width:${w/14.4}%;height:${height/10}%" ${extra}>`;
}
function label(txt,x,y,w,size=22,color='#654a34') {return `<div class="scene-label" style="left:${x/14.4}%;top:${y/10}%;width:${w/14.4}%;font-size:${size/14.4}cqw;color:${color}">${txt}</div>`;}
function ticket() {
  sceneIds.add('order-ticket');
  return `<div class="scene-ticket"><img class="ticket-paper" src="${file('order-ticket')}" alt="Three-roll order ticket"><span class="ticket-number">01</span><span class="ticket-name">${pretty(state.customer)}</span>${manifest.sampleOrder.map((r,i)=>`<div class="ticket-row" style="top:${15+i*25}%"><b>${i+1}</b><div class="ticket-recipe"><img src="${file(`roll-${r.dough}-${r.filling}-golden`)}" alt="${pretty(r.dough)} dough, ${pretty(r.filling)} filling"></div><div class="ticket-symbols"><img src="${file('symbol-icing-'+r.icing)}" alt="${r.icing} icing"><img src="${file('symbol-drizzle-'+r.drizzle)}" alt="${r.drizzle} drizzle"><img src="${file('symbol-topping-'+r.topping)}" alt="${r.topping}"><img src="${file('symbol-'+r.filling)}" alt="${r.filling} filling"></div></div>`).join('')}<span class="ticket-footer">THREE ROLLS. MADE WITH LOVE.</span></div>`;
}
function nav(){return `<nav class="station-bar" aria-label="Stations"><button class="small-control" data-preview-menu aria-label="Preview information"><img src="${file('button-menu')}" alt=""></button>${Object.entries(names).map(([key,name])=>`<button data-station="${key}" aria-label="${name} station" aria-pressed="${state.station===key}"><img src="${file(`button-${key}-${state.station===key?'selected':'normal'}`)}" alt="${name} station"></button>`).join('')}<button class="small-control" data-preview-audio aria-label="Audio information"><img src="${file('button-audio')}" alt=""></button></nav>`;}
function foodLayers(r,x,y,w,stage='finished',index=0){
  let b=asset(`roll-${r.dough}-${r.filling}-${state.station==='bake'?state.bakeState:'golden'}`,x,y,w);
  if(['iced','drizzled','finished'].includes(stage)) b+=asset('icing-'+r.icing,x,y,w);
  if(['drizzled','finished'].includes(stage)) b+=asset('drizzle-'+r.drizzle,x,y,w);
  if(stage==='finished') b+=asset('topping-'+r.topping,x,y,w);
  return b;
}
function renderScene(){
  sceneIds=new Set();
  let html=asset('background-'+state.station,0,0,1440,1000,'class="scene-bg"');
  if(state.station==='order') {
    html+=asset('shop-window',38,107,382,373)+asset('doorway',454,81,254,470)+asset('shop-window',748,107,381,373);
    html+=asset('logo',345,31,310)+asset('shop-sign-open',799,346,168);
    html+=asset(`${state.customer}-full-${state.expression}`,563,242,337)+asset('pip-counter-neutral',60,359,324);
    html+=asset('take-order-bubble',589,138,217)+asset('order-counter',0,648,1440,260)+asset('register',31,494,240)+asset('order-pad',300,610,111)+asset('pencil',417,613,27);
    html+=`<span class="scene-order-customer">${pretty(state.customer)}</span>`;
    html+=asset('pastry-box-open',951,670,164)+asset('finished-roll-1',970,735,117);
  } else {
    html+=`<div class="scene-title">${state.station==='dough'?'THE DOUGH COUNTER':state.station==='bake'?'WARM & TOASTY':'A LITTLE EXTRA SWEET'}</div>`;
    if(state.station==='dough') {
      const instructions={ball:'Start with the dough. A little flour goes a long way.',sheet:'Roll the dough into a soft, even rectangle.',buttered:'Spread the butter right out to the edges.',filled:'Add cinnamon sugar or chocolate-cinnamon filling.',log:'Roll it up snugly. Keep that lovely spiral inside.',sliced:'Slice three rolls, then send them to the oven.'};
      html+=`<div class="scene-tutorial">${instructions[state.doughStage]}</div>`;
      if(state.doughStage==='sliced') {
        html+=asset('rolling-pin',63,254,290)+asset('dough-classic-cinnamon-sliced',377,243,193)+asset('dough-cocoa-chocolate-cinnamon-sliced',593,243,193)+asset('slicing-tool',835,303,220);
        html+=asset('tray',61,482,1004);
        manifest.sampleOrder.forEach((r,i)=>{html+=asset(`roll-${r.dough}-${r.filling}-raw`,101+i*309,391,278)+label(String(i+1),184+i*309,661,100,22);});
      } else {
        html+=asset('rolling-pin',358,246,370);
        html+=asset('dough-classic-cinnamon-'+state.doughStage,61,339,355)+asset('dough-cocoa-chocolate-cinnamon-'+state.doughStage,416,339,355)+asset('slicing-tool',817,504,246);
        html+=asset('butter-dish',807,325,228)+asset('scraper',925,611,122);
        html+=`<span class="scene-step-pill" style="left:6%;top:65%">CLASSIC + CINNAMON</span><span class="scene-step-pill" style="left:31%;top:65%">COCOA + CHOCOLATE</span>`;
      }
      ['classic','cocoa','cinnamon','chocolate-cinnamon'].forEach((k,i)=>{html+=asset('bin-'+k,86+i*228,695,137)+label(pretty(k),65+i*228,870,180,15,'#ffedcc');});
    }
    if(state.station==='bake'){
      html+=asset('oven-'+state.oven,76,170,765);
      if(state.oven==='open') {
        html+=asset('tray',175,477,569);
        manifest.sampleOrder.forEach((r,i)=>{html+=asset(`roll-${r.dough}-${r.filling}-${state.bakeState}`,204+i*158,402,164);});
      } else {
        html+=asset('tray',192,478,540);
        manifest.sampleOrder.forEach((r,i)=>{html+=asset(`roll-${r.dough}-${r.filling}-${state.bakeState}`,218+i*150,403,154);});
      }
      html+=asset('timer',901,258,172)+asset('heat-indicator',917,448,142)+asset('oven-mitt',895,581,158);
      if(state.bakeState==='golden') html+=asset('steam',330,314,260);
      html+=`<span class="oven-time" style="left:28%;top:28.7%">${{raw:'00:00',underbaked:'00:25',golden:'00:45',burnt:'01:20'}[state.bakeState]}</span>`;
      html+=`<span class="scene-small-tag" style="left:63%;top:52%">${pretty(state.bakeState)}</span>`;
    }
    if(state.station==='build'){
      html+=asset('decorating-counter',24,210,1093,589);
      html+=`<span class="scene-small-tag" style="left:4%;top:16.5%">01 / ICING</span><span class="scene-small-tag" style="left:4%;top:43.2%">02 / DRIZZLE + TOPPINGS</span>`;
      ['cream-cheese','vanilla','chocolate'].forEach((k,i)=>{html+=asset('tub-'+k,154+i*230,201,168);});
      ['vanilla','caramel','strawberry'].forEach((k,i)=>{html+=asset('bottle-'+k,65+i*140,474,115);});
      ['pecans','chocolate-chips','rainbow-sprinkles','cinnamon-crumble'].forEach((k,i)=>{html+=asset('jar-'+k,522+i*138,477,118);});
      html+=asset('serving-tray',40,620,1056);
      manifest.sampleOrder.forEach((r,i)=>{html+=foodLayers(r,113+i*295,668,251,state.buildStage,i);});
      html+=asset('ticket-hand-in',1163,727,239);
    }
  }
  html+=asset('ticket-rail',0,0,1440,50)+ticket()+asset('ticket-clip',1247,54,68);
  html+=nav();
  if(state.guides) html+='<div class="scene-guides"><span>1440 × 1000 · 10% GRID · LIVE LAYERS</span></div>';
  $('#game').innerHTML=html;
  $('#station-frame-label').textContent=`0${Object.keys(names).indexOf(state.station)+1} / ${names[state.station].toUpperCase()} STATION`;
  $('#scene-asset-count').textContent=`${sceneIds.size} scene assets`;
}
function options(label,property,values){return `<span class="option-label">${label}</span><div class="option-buttons">${values.map(v=>`<button data-option="${property}" data-value="${v}" class="${state[property]===v?'active':''}" aria-pressed="${state[property]===v}">${pretty(v)}</button>`).join('')}</div>`;}
function renderNotes(){
  const info=stationInfo[state.station];
  $('#station-number').textContent='0'+(Object.keys(names).indexOf(state.station)+1);
  $('#station-title').textContent=info.title;
  $('#station-description').textContent=info.description;
  let html='';
  if(state.station==='order') {
    html='<span class="option-label">Meet the regulars</span><div class="character-choice">'+manifest.characters.filter(c=>c.role==='customer').map(c=>`<button data-option="customer" data-value="${c.id}" class="${state.customer===c.id?'active':''}" aria-label="${c.name}" aria-pressed="${state.customer===c.id}"><img src="${file(c.id+'-full-happy')}" alt=""></button>`).join('')+'</div>';
    html+=options('A little personality','expression',['neutral','ordering','happy','impatient','disappointed']);
  }
  if(state.station==='dough') html=options('Dough progression','doughStage',['ball','sheet','buttered','filled','log','sliced']);
  if(state.station==='bake') html=options('Baking states','bakeState',['raw','underbaked','golden','burnt'])+options('Oven door','oven',['open','closed']);
  if(state.station==='build') html=options('Decoration layers','buildStage',['plain','iced','drizzled','finished']);
  $('#station-options').innerHTML=html;
  $('#recipe-list').innerHTML=manifest.sampleOrder.map((r,i)=>`<div class="mini-recipe"><img src="${file('finished-roll-'+(i+1))}" alt="${recipeNames[i]}"><div><strong>${recipeNames[i]}</strong><small>${recipeDescriptions[i]}</small></div></div>`).join('');
  $('#station-index').innerHTML=Object.entries(names).map(([key,name],i)=>`<button data-station="${key}" class="${state.station===key?'active':''}" aria-pressed="${state.station===key}"><span class="index-num">0${i+1}</span><span><strong>${name} station</strong><small>${stationInfo[key].subtitle}</small></span><span class="index-arrow">↗</span></button>`).join('');
}
function setStation(key){state.station=key;renderScene();renderNotes();}
function setView(view){state.view=view;$('#stations-view').hidden=view!=='stations';$('#library-view').hidden=view!=='library';document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));if(view==='library')renderLibrary();}
const categories=['all',...new Set(assets.map(a=>a.category))];
function renderLibrary(){
  $('#category-filters').innerHTML=categories.map(c=>`<button data-category="${c}" class="${state.category===c?'active':''}" aria-pressed="${state.category===c}">${pretty(c)}</button>`).join('');
  const terms=state.search.toLowerCase().split(/[\s-]+/).filter(Boolean);
  const filtered=assets.filter(a=>(state.category==='all'||a.category===state.category)&&terms.every(term=>(a.id+' '+a.category).includes(term)));
  const families=new Map();
  for(const a of filtered){const k=state.allStates?a.id:a.family;if(!families.has(k))families.set(k,a);else if(['golden','happy','selected'].includes(a.state)) families.set(k,a);}
  $('#asset-grid').innerHTML=[...families.values()].map(a=>{
    const count=assets.filter(v=>v.family===a.family).length;
    return `<button class="asset-card" data-asset="${a.id}"><div class="asset-art"><img loading="lazy" src="${a.file}" alt="${pretty(a.id)}">${count>1?`<span class="asset-state-count">${count} states</span>`:''}</div><div class="asset-meta"><strong>${pretty(state.allStates?a.id:a.family)}</strong><small>${pretty(a.category)} · ${a.width} × ${a.height}</small></div></button>`;
  }).join('');
  $('#result-count').textContent=`${families.size} ${state.allStates?'assets':'asset families'} · ${filtered.length} SVG files`;
  $('#empty-results').hidden=families.size!==0;
}
function openDetail(id){
  const a=byId.get(id);state.detail=id;
  $('#detail-preview').innerHTML=`<img src="${a.file}" alt="${pretty(a.id)}">`;
  $('#detail-category').textContent=pretty(a.category)+' / EDITABLE SVG';
  $('#detail-title').textContent=pretty(a.family);
  $('#detail-dimensions').textContent=`${a.width} × ${a.height} · Anchor: ${a.anchor.join(', ')} · ${pretty(a.state)}`;
  $('#detail-states').innerHTML=assets.filter(v=>v.family===a.family).map(v=>`<button data-detail-state="${v.id}" class="${v.id===id?'active':''}" aria-pressed="${v.id===id}">${pretty(v.state)}</button>`).join('');
  $('#download-asset').href=a.file;$('#download-asset').download=a.id+'.svg';$('#open-asset').href=a.file;
  if(!$('#asset-dialog').open)$('#asset-dialog').showModal();
}
function overlay(title,body){const div=document.createElement('div');div.className='game-overlay';div.innerHTML=`<div class="game-overlay-content"><h2>${title}</h2><p>${body}</p><button data-dismiss-overlay>Back to the artwork</button></div>`;$('#game').append(div);div.querySelector('button').focus();}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.station)setStation(b.dataset.station);
  if(b.dataset.view)setView(b.dataset.view);
  if(b.dataset.option){state[b.dataset.option]=b.dataset.value;renderScene();renderNotes();}
  if(b.dataset.category){state.category=b.dataset.category;renderLibrary();}
  if(b.dataset.asset)openDetail(b.dataset.asset);
  if(b.dataset.detailState)openDetail(b.dataset.detailState);
  if(b.hasAttribute('data-preview-menu'))overlay('Welcome to the art kitchen.','This is an artwork preview. Switch stations, compare food states, and meet the customers. Cooking gameplay comes in the next milestone.');
  if(b.hasAttribute('data-preview-audio'))overlay('A quiet little kitchen.','This starter kit contains visual assets only. Music and sound effects will come with gameplay.');
  if(b.hasAttribute('data-dismiss-overlay')){b.closest('.game-overlay').remove();$('#game [data-preview-menu]').focus();}
});
$('#guide-toggle').addEventListener('click',()=>{state.guides=!state.guides;$('#guide-toggle').setAttribute('aria-pressed',state.guides);$('#guide-toggle').innerHTML=`${state.guides?'Hide':'Show'} layout guides <span>⌗</span>`;renderScene();});
$('#browse-all').addEventListener('click',()=>{state.category='all';setView('library');window.scrollTo(0,0);});
$('#related-assets').addEventListener('click',()=>{state.category=stationInfo[state.station].category;setView('library');window.scrollTo(0,0);});
$('#asset-search').addEventListener('input',e=>{state.search=e.target.value;renderLibrary();});
$('#all-states').addEventListener('change',e=>{state.allStates=e.target.checked;renderLibrary();});
$('#close-dialog').addEventListener('click',()=>$('#asset-dialog').close());
$('#asset-dialog').addEventListener('click',e=>{if(e.target===$('#asset-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('.game-overlay')?.remove();});
$('.brand').addEventListener('click',e=>{e.preventDefault();setView('stations');});
$('#asset-total').textContent=assets.length;
$('#featured-assets').innerHTML=['finished-roll-1','pip-full-happy','bottle-strawberry','rolling-pin'].map((id,i)=>`<button class="featured" data-asset="${id}" aria-label="Inspect ${pretty(id)}"><img src="${file(id)}" alt="${pretty(id)}"><small>${['THE ROLLS','THE PEOPLE','THE SWEET STUFF','THE TOOLS'][i]}</small></button>`).join('');
setStation('order');
renderLibrary();

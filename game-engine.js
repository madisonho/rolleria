export const SAVE_VERSION = 1;
export const IDEAL_BAKE = 20;
export const CUSTOMERS = ['juniper', 'milo', 'bea', 'nico'];
export const MENU = {
  dough: ['classic', 'cocoa'], filling: ['cinnamon', 'chocolate-cinnamon'],
  icing: ['cream-cheese', 'vanilla', 'chocolate'], drizzle: ['vanilla', 'caramel', 'strawberry'],
  topping: ['pecans', 'chocolate-chips', 'rainbow-sprinkles', 'cinnamon-crumble']
};
export function recipe(day, customer, index) {
  if (day === 1 && customer === 0) return [
    {dough:'classic',filling:'cinnamon',icing:'cream-cheese',drizzle:'caramel',topping:'pecans'},
    {dough:'cocoa',filling:'chocolate-cinnamon',icing:'chocolate',drizzle:'vanilla',topping:'chocolate-chips'},
    {dough:'classic',filling:'cinnamon',icing:'vanilla',drizzle:'strawberry',topping:'rainbow-sprinkles'}
  ][index];
  return Object.fromEntries(Object.entries(MENU).map(([key,values],i)=>[key,values[(day*3+customer*5+index*(i+1)+i)%values.length]]));
}
const blankRoll = () => ({dough:null,filling:null,step:'select',work:0,cut:null,icing:null,drizzle:null,topping:null,coverage:{icing:0,drizzle:0,topping:0}});
export function newGame(day=1, bank=0) {
  return {version:SAVE_VERSION,day,bank,customer:0,station:'order',phase:'welcome',rollIndex:0,rolls:[blankRoll(),blankRoll(),blankRoll()],order:[],bake:{status:'raw',seconds:0},elapsed:0,history:[],result:null,paused:false};
}
export function takeOrder(g) {
  if(g.phase!=='welcome') return false;
  g.order=[0,1,2].map(i=>recipe(g.day,g.customer,i));g.phase='cooking';g.station='dough';return true;
}
export function chooseDough(g,kind) {
  const r=g.rolls[g.rollIndex];
  if(g.phase!=='cooking'||r.step!=='select'||!MENU.dough.includes(kind))return false;
  r.dough=kind;r.step='flatten';r.work=0;return true;
}
export function chooseFilling(g,kind) {
  const r=g.rolls[g.rollIndex];
  if(g.phase!=='cooking'||r.step!=='fill'||!MENU.filling.includes(kind))return false;
  r.filling=kind;return true;
}
export function prepare(g,precision=1) {
  const r=g.rolls[g.rollIndex];
  if(g.phase!=='cooking'||!['flatten','butter','fill','roll','slice'].includes(r.step))return false;
  if(r.step==='fill'&&!r.filling)return false;
  if(r.step==='slice') {r.cut=Math.max(0,Math.min(1,Number.isFinite(precision)?precision:0));r.step='ready';r.work=0;return true;}
  const count={flatten:4,butter:3,fill:3,roll:2};
  r.work++;
  if(r.work>=count[r.step]) {r.step={flatten:'butter',butter:'fill',fill:'roll',roll:'slice'}[r.step];r.work=0;}
  return true;
}
export function canBake(g){return g.phase==='cooking'&&g.rolls.every(r=>r.step==='ready');}
export function startBake(g){if(!canBake(g)||g.bake.status!=='raw')return false;g.bake={status:'baking',seconds:0};g.station='bake';return true;}
export function tick(g,seconds){
  if(g.paused||g.phase!=='cooking'||!Number.isFinite(seconds)||seconds<=0)return;
  g.elapsed+=seconds;
  if(g.bake.status==='baking')g.bake.seconds=Math.min(60,g.bake.seconds+seconds);
}
export function removeBake(g){if(g.phase!=='cooking'||g.bake.status!=='baking')return false;g.bake.status='done';g.station='build';g.rollIndex=0;return true;}
export function doneness(seconds){return seconds<10?'raw':seconds<17?'underbaked':seconds<=25?'golden':'burnt';}
export function bakingScore(seconds){return Math.round(Math.max(0,100-Math.max(0,Math.abs(seconds-IDEAL_BAKE)-3)*7));}
export function stars(score){return score>=90?5:score>=75?4:score>=60?3:score>=40?2:1;}
export function decorate(g,kind,ingredient){
  const r=g.rolls[g.rollIndex];
  if(g.phase!=='cooking'||g.bake.status!=='done'||!['icing','drizzle','topping'].includes(kind)||!MENU[kind].includes(ingredient))return false;
  if(kind==='drizzle'&&r.coverage.icing<3||kind==='topping'&&r.coverage.drizzle<3)return false;
  if(r[kind]!==ingredient){r[kind]=ingredient;r.coverage[kind]=0;}
  r.coverage[kind]=Math.min(3,r.coverage[kind]+1);return true;
}
export function canServe(g){return g.phase==='cooking'&&g.bake.status==='done'&&g.rolls.every(r=>Object.values(r.coverage).every(c=>c===3));}
export function scoreOrder(g){
  const dough=Math.round(g.rolls.reduce((sum,r,i)=>sum+(r.dough===g.order[i].dough?35:0)+(r.filling===g.order[i].filling?35:0)+30*r.cut,0)/3);
  const build=Math.round(g.rolls.reduce((sum,r,i)=>sum+['icing','drizzle','topping'].filter(k=>r[k]===g.order[i][k]).length*100/3,0)/3);
  const bake=bakingScore(g.bake.seconds);const total=Math.round(dough*.35+bake*.3+build*.35);
  return {dough,bake,build,total,tip:Math.round(total/100*700)/100,customer:CUSTOMERS[g.customer],seconds:Math.round(g.elapsed)};
}
export function serve(g){if(!canServe(g))return false;g.result=scoreOrder(g);g.bank=Math.round((g.bank+g.result.tip)*100)/100;g.history.push(g.result);g.phase='result';g.station='order';return true;}
export function nextCustomer(g){
  if(g.phase!=='result')return false;
  if(g.customer===3){g.phase='day-end';return true;}
  g.customer++;g.phase='welcome';g.station='order';g.rolls=[blankRoll(),blankRoll(),blankRoll()];g.order=[];g.bake={status:'raw',seconds:0};g.elapsed=0;g.result=null;g.rollIndex=0;return true;
}
export function resetRoll(g){if(g.phase!=='cooking'||g.bake.status!=='raw')return false;g.rolls[g.rollIndex]=blankRoll();return true;}
export function retryBake(g){if(g.phase!=='cooking'||g.bake.status!=='done')return false;g.bake={status:'raw',seconds:0};g.rolls.forEach(r=>{for(const k of ['icing','drizzle','topping'])r[k]=null;r.coverage={icing:0,drizzle:0,topping:0};});g.station='bake';return true;}
export function restore(raw){
  try {
    const g=JSON.parse(raw);
    if(!g||g.version!==SAVE_VERSION||!Number.isInteger(g.day)||g.day<1||!Number.isFinite(g.bank)||g.bank<0||!Number.isInteger(g.customer)||g.customer<0||g.customer>3||!['welcome','cooking','result','day-end'].includes(g.phase)||!['order','dough','bake','build'].includes(g.station)||!Number.isInteger(g.rollIndex)||g.rollIndex<0||g.rollIndex>2||!Array.isArray(g.rolls)||g.rolls.length!==3||!Array.isArray(g.order)||!Array.isArray(g.history)||!Number.isFinite(g.elapsed)||g.elapsed<0)return null;
    if(!g.bake||!['raw','baking','done'].includes(g.bake.status)||!Number.isFinite(g.bake.seconds)||g.bake.seconds<0||g.bake.seconds>60)return null;
    if(g.phase!=='welcome'&&(g.order.length!==3||g.order.some(r=>!r||Object.entries(MENU).some(([k,v])=>!v.includes(r[k])))))return null;
    for(const r of g.rolls){
      if(!r||!['select','flatten','butter','fill','roll','slice','ready'].includes(r.step)||!Number.isInteger(r.work)||r.work<0||r.work>4||!r.coverage||['icing','drizzle','topping'].some(k=>!Number.isInteger(r.coverage[k])||r.coverage[k]<0||r.coverage[k]>3)||Object.entries(MENU).some(([k,v])=>r[k]!==null&&!v.includes(r[k]))||r.cut!==null&&(!Number.isFinite(r.cut)||r.cut<0||r.cut>1))return null;
      if(r.step!=='select'&&!r.dough||['roll','slice','ready'].includes(r.step)&&!r.filling||r.step==='ready'&&r.cut===null||['icing','drizzle','topping'].some(k=>r.coverage[k]>0&&!r[k]))return null;
    }
    if(g.bake.status!=='raw'&&g.rolls.some(r=>r.step!=='ready'))return null;
    const validResult=r=>r&&['dough','bake','build','total','tip','seconds'].every(k=>Number.isFinite(r[k])&&r[k]>=0)&&CUSTOMERS.includes(r.customer);
    if(g.history.length>4||!g.history.every(validResult)||['result','day-end'].includes(g.phase)&&!validResult(g.result))return null;
    g.paused=true;return g;
  }catch{return null;}
}

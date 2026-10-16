import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../game-engine.js';

function prepareOrder(g,wrong=false){
  assert.equal(E.takeOrder(g),true);
  g.order.forEach((recipe,i)=>{
    g.rollIndex=i;
    E.chooseDough(g,wrong?(recipe.dough==='classic'?'cocoa':'classic'):recipe.dough);
    for(let j=0;j<4;j++)E.prepare(g);
    assert.equal(g.rolls[i].step,'butter');
    for(let j=0;j<3;j++)E.prepare(g);
    assert.equal(g.rolls[i].step,'fill');
    assert.equal(E.prepare(g),false,'filling is required');
    E.chooseFilling(g,wrong?(recipe.filling==='cinnamon'?'chocolate-cinnamon':'cinnamon'):recipe.filling);
    for(let j=0;j<3;j++)E.prepare(g);
    for(let j=0;j<2;j++)E.prepare(g);
    assert.equal(g.rolls[i].step,'slice');
    E.prepare(g,wrong?0:1);
    assert.equal(g.rolls[i].step,'ready');
  });
}
function decorateOrder(g,wrong=false){
  g.order.forEach((recipe,i)=>{
    g.rollIndex=i;
    for(const kind of ['icing','drizzle','topping']){
      const ingredient=wrong?E.MENU[kind].find(v=>v!==recipe[kind]):recipe[kind];
      for(let j=0;j<3;j++)assert.equal(E.decorate(g,kind,ingredient),true);
    }
  });
}
test('complete a perfect order, score once, and move to the next customer',()=>{
  const g=E.newGame();prepareOrder(g);assert.equal(E.startBake(g),true);E.tick(g,20);E.removeBake(g);decorateOrder(g);
  assert.equal(E.canServe(g),true);assert.equal(E.serve(g),true);assert.equal(g.result.total,100);assert.equal(g.bank,7);
  assert.equal(E.serve(g),false);assert.equal(g.bank,7);assert.equal(g.history.length,1);
  E.nextCustomer(g);assert.equal(g.customer,1);assert.equal(g.rolls[0].step,'select');assert.equal(g.phase,'welcome');assert.equal(g.bank,7);
});
test('incomplete orders cannot skip preparation, oven, or decoration',()=>{
  const g=E.newGame();assert.equal(E.startBake(g),false);assert.equal(E.removeBake(g),false);assert.equal(E.serve(g),false);
  E.takeOrder(g);assert.equal(E.takeOrder(g),false);assert.equal(E.chooseDough(g,'invalid'),false);assert.equal(E.decorate(g,'icing','vanilla'),false);
  assert.equal(E.startBake(g),false);assert.equal(E.nextCustomer(g),false);
});
test('pause freezes time while switching stations does not',()=>{
  const g=E.newGame();prepareOrder(g);E.startBake(g);E.tick(g,5);g.paused=true;E.tick(g,20);assert.equal(g.bake.seconds,5);
  g.paused=false;g.station='order';E.tick(g,15);assert.equal(g.bake.seconds,20);E.tick(g,-1);E.tick(g,NaN);assert.equal(g.bake.seconds,20);
});
test('doneness and score penalize early and burnt batches',()=>{
  assert.equal(E.doneness(0),'raw');assert.equal(E.doneness(15),'underbaked');assert.equal(E.doneness(20),'golden');assert.equal(E.doneness(30),'burnt');
  for(const t of [17,20,23])assert.equal(E.bakingScore(t),100);
  assert.equal(E.bakingScore(0),0);assert.equal(E.bakingScore(60),0);assert.ok(E.bakingScore(30)<E.bakingScore(25));
  assert.equal(E.stars(100),5);assert.equal(E.stars(82),4);assert.equal(E.stars(0),1);
});
test('wrong ingredients and poor cuts reduce score',()=>{
  const g=E.newGame();prepareOrder(g,true);E.startBake(g);E.tick(g,40);E.removeBake(g);decorateOrder(g,true);E.serve(g);
  assert.equal(g.result.total,0);assert.equal(g.bank,0);
});
test('decoration order, coverage, and replacement are enforced',()=>{
  const g=E.newGame();prepareOrder(g);E.startBake(g);E.tick(g,20);E.removeBake(g);
  assert.equal(E.decorate(g,'drizzle','caramel'),false);assert.equal(E.decorate(g,'topping','pecans'),false);
  for(let i=0;i<3;i++)E.decorate(g,'icing','vanilla');assert.equal(g.rolls[0].coverage.icing,3);E.decorate(g,'icing','cream-cheese');assert.equal(g.rolls[0].coverage.icing,1);
  assert.equal(E.canServe(g),false);assert.equal(E.decorate(g,'icing','invalid'),false);
});
test('restarting dough and rebaking clear only the relevant work',()=>{
  const g=E.newGame();prepareOrder(g);assert.equal(E.resetRoll(g),true);assert.equal(g.rolls[2].step,'select');assert.equal(g.rolls[0].step,'ready');
  const fresh=E.newGame();prepareOrder(fresh);E.startBake(fresh);assert.equal(E.resetRoll(fresh),false);E.tick(fresh,32);E.removeBake(fresh);decorateOrder(fresh);
  assert.equal(E.retryBake(fresh),true);assert.equal(fresh.bake.status,'raw');assert.equal(fresh.rolls[0].step,'ready');assert.equal(fresh.rolls[0].icing,null);assert.equal(E.canServe(fresh),false);
});
test('four customers finish the day with stable banking and varied next-day orders',()=>{
  const g=E.newGame();for(let i=0;i<4;i++){prepareOrder(g);E.startBake(g);E.tick(g,20);E.removeBake(g);decorateOrder(g);E.serve(g);E.nextCustomer(g);}
  assert.equal(g.phase,'day-end');assert.equal(g.history.length,4);assert.equal(g.bank,28);assert.equal(E.nextCustomer(g),false);
  assert.notDeepEqual(E.recipe(1,0,0),E.recipe(2,0,0));const next=E.newGame(2,g.bank);assert.equal(next.bank,28);assert.equal(next.day,2);
});
test('save restores a running order paused, rejects corrupt or incompatible data',()=>{
  const g=E.newGame();prepareOrder(g);E.startBake(g);E.tick(g,12.3);const restored=E.restore(JSON.stringify(g));
  assert.equal(restored.paused,true);assert.equal(restored.bake.seconds,12.3);assert.deepEqual(restored.rolls,g.rolls);
  for(const raw of ['bad','null','{}',JSON.stringify({...g,version:999}),JSON.stringify({...g,customer:500}),JSON.stringify({...g,rolls:[]}),JSON.stringify({...g,bake:{status:'baking',seconds:-5}})])assert.equal(E.restore(raw),null);
  const broken=structuredClone(g);broken.rolls[0].dough=null;assert.equal(E.restore(JSON.stringify(broken)),null);
});

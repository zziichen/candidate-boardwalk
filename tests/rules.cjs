const assert=require('node:assert/strict');
const data=require('../js/data.js'),rules=require('../js/rules.js');
assert.equal(data.events.length,24);assert.equal(data.candidates.length,6);
for(const p of data.candidates)for(const e of data.events){
  assert(e.choices.some(c=>c.cost===0),'Every event has a free response');
  for(const c of e.choices){assert(rules.probability(p,c)>0,'Cross-specialty must still be winnable');assert(rules.probability(p,c)<=1);}
}
const state=rules.create('xia'),p=state.players[0];
assert.equal(rules.move(state,0),false);assert.equal(rules.move(state,7),false);
assert.equal(rules.resolve(state,0,6),false);p.position=22;
assert(rules.move(state,4));assert.equal(p.position,2);assert.equal(p.laps,1);
assert.equal(rules.move(state,1),false,'Cannot roll twice');
const fundraising=data.events[2];
assert.equal(rules.probability(p,fundraising.choices[0]),4/6);
assert.equal(rules.probability(p,fundraising.choices[1]),1/6);
assert.equal(rules.reward(p,fundraising.choices[0]).funds,8);
assert.equal(rules.reward(p,fundraising.choices[1]).funds,32);
assert(rules.resolve(state,1,6));assert.equal(p.funds,40);assert.equal(p.support,32);
assert.equal(rules.resolve(state,1,6),false,'No repeated payout');
const fail=rules.create('xia');fail.players[0].position=2;fail.phase='choice';fail.last={};
assert(rules.resolve(fail,1,5));assert.equal(fail.players[0].funds,8);assert.equal(fail.players[0].support,25);
const ads=rules.create('lin');ads.players[0].position=19;ads.phase='choice';ads.last={};ads.players[0].funds=2;
assert.equal(rules.resolve(ads,0,6),false,'Reject unaffordable choice');
assert.equal(rules.aiChoice(ads.players[0],data.events[19]),3,'AI chooses free fallback');
ads.players[0].funds=3;assert(rules.resolve(ads,0,1));assert.equal(ads.players[0].funds,0,'Cost paid on failure');
const floor=rules.create('xu');floor.players[0].position=2;floor.players[0].support=1;floor.phase='choice';floor.last={};rules.resolve(floor,1,1);assert.equal(floor.players[0].support,0);
let turns=0;
for(const candidate of data.candidates)for(let seed=1;seed<=12;seed++){
  let randomState=seed;const die=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState%6+1};
  const game=rules.create(candidate.id);
  while(game.phase!=='over'){
    assert(rules.move(game,die()));const player=game.players[game.current];
    assert(rules.resolve(game,rules.aiChoice(player,data.events[player.position]),die()));
    assert(player.support>=0&&player.funds>=0);assert(rules.next(game));turns++;
  }
  assert.equal(game.history.length,72);assert.equal(game.round,12);
  for(const player of game.players)assert.equal(game.history.filter(h=>h.player===player.id).length,12,'Fair turn count');
  const top=Math.max(...game.players.map(p=>p.support));assert.deepEqual(game.winners,game.players.filter(p=>p.support===top).map(p=>p.id));
  assert.equal(rules.move(game,3),false,'No play after final result');
}
const tie=rules.create('lin');tie.round=12;tie.current=5;tie.phase='resolved';tie.players.forEach(p=>p.support=30);rules.next(tie);assert.equal(tie.winners.length,6);
console.log(`PASS: 24 events, specialty and cross-specialty fundraising, costs, support floor, wraparound, input guards, ties; 72 complete games / ${turns} resolved turns`);

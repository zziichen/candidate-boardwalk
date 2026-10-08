const assert=require('node:assert/strict'),data=require('../js/data.js'),r=require('../js/rules.js');
assert.equal(data.config.tileCount,48);assert.equal(data.candidates.length,4);
for(const [stage,events] of data.phaseEvents.entries()){
assert.equal(events.length,48);assert.equal(events.filter(e=>e.category==='funds').length,[12,6,3,2][stage]);
assert.equal(events.filter(e=>e.recruit).length,stage===0?8:0);
assert.equal(events.some(e=>e.category==='dark'),stage===3);
for(const p of data.candidates)for(const e of events){assert(e.choices.some(c=>c.cost===0));for(const c of e.choices){assert(r.probability(p,c)>0);assert(r.probability(p,c)<=1);}}
}
const setup=(id='xia',stage=0,pos=2)=>{const s=r.create(id);s.stage=stage;s.players[0].position=pos;s.phase='choice';s.last={stage,player:id,round:1,eventName:r.eventAt(s,pos).name};return s;};
let s=setup(),p=s.players[0],fund=r.eventAt(s,2);
assert.equal(r.probability(p,fund.choices[0]),4/6);assert.equal(r.probability(p,fund.choices[1]),1/6);assert.equal(r.reward(p,fund.choices[1]).funds,32);
assert(r.resolve(s,1,6));assert.equal(p.funds,40);assert.equal(p.support,22);assert.equal(r.resolve(s,1,6),false);
s=setup();assert(r.resolve(s,1,5));assert.equal(s.players[0].funds,8);assert.equal(s.players[0].support,15);
s=setup();s.players[0].funds=59;assert(r.resolve(s,0,6));assert.equal(s.stage,1);assert.equal(s.stageHistory.length,1);assert.equal(s.last.stage,0);
s=setup('xia',1,4);s.players[0].awareness=59;assert(r.resolve(s,0,6));assert.equal(s.stage,2);
s=setup('xia',2,4);s.players[0].support=109;assert(r.resolve(s,0,6));assert.equal(s.stage,3);assert.equal(s.finalRound,null);
assert(data.phaseEvents[2][4].choices[0].gain.support>data.phaseEvents[1][4].choices[0].gain.support);
assert(data.phaseEvents[2][4].choices[0].loss.support>data.phaseEvents[1][4].choices[0].loss.support);
s=setup('xia',1,4);s.players[0].awareness=10;s.players[0].support=20;const c=r.eventAt(s,4).choices[0];assert(r.resolve(s,0,6));assert.equal(s.players[0].support,20+r.reward(s.players[0],c).support,'No automatic conversion from fame');
s=r.create('lin');assert.equal(r.move(s,0),false);assert.equal(r.move(s,7),false);assert.equal(r.reveal(s,0),false);assert(r.move(s,1,()=>0));assert.equal(s.phase,'cards');assert.equal(new Set(s.last.cards).size,3);assert.equal(r.reveal(s,3),false);assert(r.reveal(s,0));assert.equal(r.reveal(s,1),false);assert.equal(r.cardOf(s).id,'finance');assert(r.hire(s,true));assert.equal(s.players[0].funds,26);assert.equal(s.players[0].image,1);assert.equal(s.players[0].staff,'finance');assert.equal(r.hire(s,true),false);
s.current=0;s.phase='ready';s.players[0].position=0;assert(r.move(s,1));assert.equal(s.phase,'choice','Cannot hire second staff');
s=r.create('xia');assert(r.move(s,1,()=>.999));assert(r.reveal(s,0));assert.equal(r.cardOf(s).id,'general');s.players[0].funds=0;assert.equal(r.hire(s,true),false);assert(r.hire(s,false));assert.equal(s.players[0].staff,null);s.phase='ready';s.players[0].position=0;assert(r.move(s,1));assert.equal(s.phase,'cards','Declined staff can retry');
s=r.create('lin');s.stage=1;assert(r.move(s,1));assert.equal(s.phase,'choice','No staff after preparation');
for(const success of [true,false]){s=setup('lin',3,4);s.players[0].funds=20;s.players[0].support=80;s.players[0].image=4;const rival=r.opponent(s),before=rival.support;assert(r.resolve(s,1,success?6:1));assert.equal(rival.support,before+(success?-8:4));assert.equal(s.players[0].funds,14);if(!success){assert.equal(s.players[0].support,60);assert.equal(s.players[0].image,3);}}
s=setup('lin',3,4);s.players[0].funds=0;assert.equal(r.resolve(s,1,6),false);assert.equal(r.aiChoice(s.players[0],r.eventAt(s,4),s),0);assert(r.resolve(s,0,6));
s=setup();s.players[0].support=0;assert(r.resolve(s,1,1));assert.equal(s.players[0].support,0);
for(let actor=0;actor<4;actor++){
s=r.create('lin');s.stage=3;s.round=10;s.current=actor;s.players[actor].position=47;assert(r.move(s,2));assert.equal(s.finalRound,10);assert.equal(s.players[actor].position,1);assert.equal(s.players[actor].laps,1);assert(r.resolve(s,0,6));assert(r.next(s));while(s.phase!=='over'){assert(s.current>actor);assert(r.move(s,1));assert(r.resolve(s,0,6));assert(r.next(s));}assert.equal(s.round,10);assert.equal(s.history.length,4-actor);assert.equal(r.move(s,1),false);
}
s=r.create('lin');s.stage=2;s.players[0].position=47;assert(r.move(s,1));assert.equal(s.finalRound,null,'Crossing before decision phase cannot end game');
s=r.create('lin');s.finalRound=5;s.round=5;s.current=3;s.phase='resolved';s.players.forEach(p=>p.support=30);assert(r.next(s));assert.equal(s.winners.length,4);
let turns=0,maxRounds=0;
for(const candidate of data.candidates)for(let seed=1;seed<=30;seed++){
let randomState=seed;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296;},die=()=>Math.floor(random()*6)+1;
const game=r.create(candidate.id);
while(game.phase!=='over'){
assert(game.round<500,'Game must reach a finish without a fixed round limit');assert(r.move(game,die(),random));const player=game.players[game.current];
if(game.phase==='cards'){assert(r.reveal(game,Math.floor(random()*3)));assert(r.hire(game,r.aiHire(game)));}else assert(r.resolve(game,r.aiChoice(player,r.eventAt(game,player.position),game),die()));
for(const p of game.players){assert(p.funds>=0&&p.awareness>=0&&p.support>=0);for(const k of data.abilityKeys)assert(p[k]>=1&&p[k]<=6);}
assert(r.next(game));turns++;
}
assert.equal(game.stage,3);assert.equal(game.stageHistory.length,3);assert.equal(game.history.length,game.round*4);for(const p of game.players)assert.equal(game.history.filter(h=>h.player===p.id).length,game.round);
const top=Math.max(...game.players.map(p=>p.support));assert.deepEqual(game.winners,game.players.filter(p=>p.support===top).map(p=>p.id));maxRounds=Math.max(maxRounds,game.round);
}
console.log(`PASS: 192 stage-events; four roles; thresholds; fame independence; specialty; staff hire/decline/limits; dark success/backfire; costs; floors; all four finish positions; ties; 120 complete games / ${turns} turns / max ${maxRounds} rounds`);

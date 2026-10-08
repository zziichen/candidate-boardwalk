const BoardwalkRules=(()=>{
const data=typeof module!=='undefined'?require('./data.js'):BoardwalkData;
const {config,abilityKeys,stages,phaseEvents,staffCards}=data;
const validDie=d=>Number.isInteger(d)&&d>=1&&d<=config.diceSides;
const clamp=(k,v)=>abilityKeys.includes(k)?Math.max(config.abilityMin,Math.min(config.abilityMax,v)):Math.max(0,v);
const eventAt=(s,pos)=>phaseEvents[s.stage][pos];
function create(id){const selected=data.candidates.find(c=>c.id===id);if(!selected)throw Error('Unknown candidate');return {players:[selected,...data.candidates.filter(c=>c.id!==id)].map((c,i)=>({...c,position:0,laps:0,isHuman:i===0,staff:null})),round:1,current:0,stage:0,phase:'ready',last:null,history:[],stageHistory:[],finalRound:null,winners:[]};}
function probability(p,c){let count=0;for(let d=1;d<=6;d++)if(d+p[c.skill]>=c.target)count++;return count/6;}
function reward(p,c){const gap=Math.max(...abilityKeys.map(k=>p[k]))-p[c.skill],multiplier=c.crossSpecialty?1+gap*config.crossSpecialtyMultiplierPerPoint:1;return {...Object.fromEntries(Object.entries(c.gain).map(([k,v])=>[k,v*(abilityKeys.includes(k)?1:multiplier)])),multiplier};}
function move(s,d,random=Math.random){
if(s.phase!=='ready'||!validDie(d))return false;
const p=s.players[s.current],from=p.position,to=(from+d)%config.tileCount,crossed=from+d>=config.tileCount;
p.laps+=Number(crossed);p.position=to;
if(s.stage===3&&crossed&&s.finalRound===null)s.finalRound=s.round;
const e=eventAt(s,to);s.last={player:p.id,round:s.round,stage:s.stage,moveDie:d,from,to,eventName:e.name};s.phase=e.recruit&&!p.staff?'cards':'choice';
if(s.phase==='cards'){const pool=[...staffCards];s.last.cards=[];for(let i=0;i<3;i++){const n=Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)));s.last.cards.push(pool.splice(n,1)[0].id);}}
return true;
}
function reveal(s,i){if(s.phase!=='cards'||!Number.isInteger(i)||i<0||i>=3)return false;s.last.revealed=s.last.cards[i];s.phase='offer';return true;}
const cardOf=s=>staffCards.find(c=>c.id===s.last?.revealed);
const canHire=(p,c)=>!!c&&Object.entries(c.effects).every(([k,v])=>k!=='funds'||p.funds+v>=0);
function apply(p,effects){const delta={};for(const [k,v] of Object.entries(effects)){const before=p[k];p[k]=clamp(k,before+v);delta[k]=p[k]-before;}return delta;}
function checkStage(s){if(s.stage===3)return;const stage=stages[s.stage],trigger=s.players.find(p=>p[stage.metric]>=stage.threshold);if(!trigger)return;const change={from:s.stage,to:s.stage+1,player:trigger.id,metric:stage.metric,value:trigger[stage.metric],round:s.round};s.stage++;s.stageHistory.push(change);s.last.transition=change;}
function finishAction(s){checkStage(s);s.history.push({...s.last});s.phase='resolved';}
function hire(s,accept){if(s.phase!=='offer'||typeof accept!=='boolean')return false;const p=s.players[s.current],card=cardOf(s);if(accept&&(p.staff||!canHire(p,card)))return false;const delta=accept?apply(p,card.effects):{};if(accept)p.staff=card.id;Object.assign(s.last,{kind:'staff',label:accept?`聘用${card.name}`:`放棄${card.name}`,success:accept,delta,message:accept?'幕僚能力變化已生效，之後無法再招募。':'保留空缺，下次走到招募格仍可翻卡。'});finishAction(s);return true;}
function opponent(s){return s.players.filter((_,i)=>i!==s.current).sort((a,b)=>b.support-a.support)[0];}
function resolve(s,i,d){
if(s.phase!=='choice'||!Number.isInteger(i)||!validDie(d))return false;
const p=s.players[s.current],e=eventAt(s,p.position),c=e.choices[i];if(!c||p.funds<c.cost)return false;
const success=d+p[c.skill]>=c.target,gain=reward(p,c),skill=p[c.skill];
const effects=success?Object.fromEntries(Object.entries(gain).filter(([k])=>k!=='multiplier')):Object.fromEntries(Object.entries(c.loss).map(([k,v])=>[k,-v]));effects.funds=(effects.funds||0)-c.cost;
const delta=apply(p,effects);let attack=null;if(c.opponentLoss){const rival=opponent(s),change=apply(rival,{support:success?-c.opponentLoss:c.counterGain});attack={player:rival.id,delta:change.support};}
Object.assign(s.last,{kind:'event',label:c.label,choice:i,checkDie:d,skillKey:c.skill,skill,target:c.target,success,delta,attack,multiplier:gain.multiplier,message:success?(gain.multiplier>1?'跨專長挑戰成功，獲得較大的報酬。':'應對成功，收益已入帳。'):c.opponentLoss?'手段曝光，對手反擊；你的支持與形象受損。':'應對未獲認同，承擔顯示的失敗損失。'});finishAction(s);return true;
}
function next(s){if(s.phase!=='resolved')return false;if(s.finalRound!==null&&s.round===s.finalRound&&s.current===s.players.length-1){const top=Math.max(...s.players.map(p=>p.support));s.winners=s.players.filter(p=>p.support===top).map(p=>p.id);s.phase='over';return true;}s.current=(s.current+1)%s.players.length;if(s.current===0)s.round++;s.last=null;s.phase='ready';return true;}
function aiChoice(p,e,s){const w={...config.aiWeights};if(s?.stage===0)w.funds=1;if(s?.stage===1)w.awareness=1;const value=effects=>Object.entries(effects).reduce((sum,[k,v])=>sum+v*(abilityKeys.includes(k)?w.ability:w[k]||0),0);const values=e.choices.map(c=>{if(p.funds<c.cost)return -Infinity;const chance=probability(p,c),gain=reward(p,c);return chance*(value(gain)+(c.opponentLoss||0))-(1-chance)*(value(c.loss)+(c.counterGain||0))-c.cost*w.funds;});return values.indexOf(Math.max(...values));}
function aiHire(s){const p=s.players[s.current],card=cardOf(s);return canHire(p,card)&&Object.entries(card.effects).reduce((sum,[k,v])=>sum+v*(abilityKeys.includes(k)?config.aiWeights.ability:config.aiWeights[k]||0),0)>0;}
function standing(s,p){const scores=s.players.map(p=>p.support),rank=1+scores.filter(v=>v>p.support).length;return {rank,mood:Math.max(...scores)===Math.min(...scores)?'neutral':rank===1?'happy':rank===2?'neutral':'nervous'};}
return {create,eventAt,probability,reward,move,reveal,cardOf,canHire,hire,resolve,next,aiChoice,aiHire,opponent,standing};
})();
if(typeof module!=='undefined')module.exports=BoardwalkRules;

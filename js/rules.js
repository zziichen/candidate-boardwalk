const BoardwalkRules = (() => {
  const data = typeof module !== 'undefined' ? require('./data.js') : BoardwalkData;
  const {config,events} = data;
  const validDie = die => Number.isInteger(die) && die >= 1 && die <= config.diceSides;
  function create(candidateId) {
    const selected = data.candidates.find(c=>c.id===candidateId);
    if (!selected) throw Error('Unknown candidate');
    const ordered = [selected,...data.candidates.filter(c=>c.id!==candidateId)];
    return {players:ordered.map((c,i)=>({...c,skills:{...c.skills},position:0,laps:0,isHuman:i===0})),round:1,current:0,phase:'ready',last:null,history:[],winners:[]};
  }
  function probability(player,choice) {
    let success=0;
    for(let die=1;die<=config.diceSides;die++) if(die+player.skills[choice.skill]>=choice.target)success++;
    return success/config.diceSides;
  }
  function move(state,die) {
    if(state.phase!=='ready'||!validDie(die))return false;
    const p=state.players[state.current],from=p.position;
    p.laps+=Math.floor((from+die)/config.tileCount);
    p.position=(from+die)%config.tileCount;
    state.last={moveDie:die,from,to:p.position,event:events[p.position].id};
    state.phase='choice';return true;
  }
  function resolve(state,index,die) {
    if(state.phase!=='choice'||!Number.isInteger(index)||!validDie(die))return false;
    const p=state.players[state.current],event=events[p.position],choice=event.choices[index];
    if(!choice)return false;
    if(p.funds<choice.cost)return false;
    const success=die+p.skills[choice.skill]>=choice.target;
    const gain=reward(p,choice),before=p.support,beforeFunds=p.funds;
    p.funds-=choice.cost;
    p.support=Math.max(config.supportFloor,p.support+(success?gain.support:-choice.loss));
    if(success)p.funds+=gain.funds;
    Object.assign(state.last,{player:p.id,round:state.round,choice:index,checkDie:die,skill:p.skills[choice.skill],target:choice.target,success,delta:p.support-before,fundsDelta:p.funds-beforeFunds,multiplier:gain.multiplier,message:success?(gain.multiplier>1?'跨專長挑戰成功！新的群眾與資源大幅湧入。':'專長發揮成功，居民認同你的回應。'):'這次回應沒有取得認同，支持度下降。'});
    state.history.push({...state.last});state.phase='resolved';return true;
  }
  function next(state) {
    if(state.phase!=='resolved')return false;
    if(state.current===state.players.length-1&&state.round===config.rounds){
      const top=Math.max(...state.players.map(p=>p.support));
      state.winners=state.players.filter(p=>p.support===top).map(p=>p.id);
      state.phase='over';return true;
    }
    state.current=(state.current+1)%state.players.length;
    if(state.current===0)state.round++;
    state.phase='ready';state.last=null;return true;
  }
  function aiChoice(player,event) {
    const values=event.choices.map(choice=>{if(player.funds<choice.cost)return -Infinity;const chance=probability(player,choice),gain=reward(player,choice);return chance*(gain.support+gain.funds*config.aiFundsWeight)-(1-chance)*Math.min(choice.loss,player.support-config.supportFloor)-choice.cost*config.aiFundsWeight;});
    return values.indexOf(Math.max(...values));
  }
  function standing(state,player) {
    const scores=state.players.map(p=>p.support),rank=1+scores.filter(s=>s>player.support).length;
    return {rank,mood:Math.max(...scores)===Math.min(...scores)?'neutral':rank<=2?'happy':rank<=4?'neutral':'nervous'};
  }
  function reward(player,choice) {
    const gap=Math.max(...Object.values(player.skills))-player.skills[choice.skill];
    const multiplier=choice.crossSpecialty?1+gap*config.crossSpecialtyMultiplierPerPoint:1;
    return {...Object.fromEntries(Object.entries(choice.gain).map(([resource,value])=>[resource,value*multiplier])),multiplier};
  }
  return {create,probability,move,resolve,next,aiChoice,standing,reward};
})();
if (typeof module !== 'undefined') module.exports = BoardwalkRules;

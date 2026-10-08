const {config,candidates,phaseEvents,categories,stats,stages,abilityKeys,staffCards}=BoardwalkData,rules=BoardwalkRules;
let state=null,selected=candidates[0].id,busy=false,positionOverride=null;
const $=id=>document.getElementById(id),signed=v=>v>=0?`+${v}`:String(v);
const moodLabels={happy:'喜孜孜',neutral:'無悲無喜',nervous:'落後很緊張'};
const face=(p,mood='neutral')=>`<span class="portrait" role="img" aria-label="${p.name}：${moodLabels[mood]}" style="--face:url('${new URL(`assets/candidate-${p.id}.webp`,document.baseURI).href}');--position:${mood==='happy'?'0%':mood==='neutral'?'50%':'100%'};--person:${p.color}"></span>`;
const pause=ms=>new Promise(r=>setTimeout(r,matchMedia('(prefers-reduced-motion: reduce)').matches?0:ms));
const die=()=>Math.floor(Math.random()*6)+1,dieFaces=['⚀','⚁','⚂','⚃','⚄','⚅'];
const preview=document.createElement('dialog');preview.id='tilePreview';document.body.appendChild(preview);
const effectsText=(effects,sign=true)=>Object.entries(effects).filter(([k,v])=>k!=='multiplier'&&v!==0).map(([k,v])=>`${stats[k]} ${sign?signed(v):v}`).join(' · ')||'沒有數值變化';
const statsMarkup=p=>`<div class="stat-grid">${Object.keys(stats).map(k=>`<span>${stats[k]}<b>${p[k]}</b></span>`).join('')}</div><p class="footnote">幕僚：${staffCards.find(c=>c.id===p.staff)?.name||'尚未聘用'} · 媒體／地方團體／口才／形象範圍 1–6</p>`;
function renderSelection(){
$('candidates').innerHTML=candidates.map(c=>`<button class="candidate ${c.id===selected?'selected':''}" data-candidate="${c.id}" aria-pressed="${c.id===selected}">${face(c)}<span><b>${c.name}</b><small>${c.title}</small></span></button>`).join('');
$('candidates').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=b.dataset.candidate;renderSelection();});
const p=candidates.find(c=>c.id===selected);$('candidateInfo').innerHTML=`<b>${p.name} · ${p.title}</b><p>${p.description}</p>${statsMarkup(p)}`;
}
function tilePosition(i){const n=config.side-1;if(i<=n)return [config.side-i,1];if(i<=2*n)return [1,i-n+1];if(i<=3*n)return [i-2*n+1,config.side];return [config.side,4*n-i+1];}
function renderStage(){
const stage=state?.stage||0,current=stages[stage];
$('stageSteps').innerHTML=stages.map((s,i)=>`<span class="${i===stage?'active':i<stage?'done':''}"><b>${i+1}. ${s.name}</b><small>${i===3?'經過投票日結算':`${stats[s.metric]}達 ${s.threshold}`}</small></span>`).join('');
let text=current.description;
if(state&&stage<3){const leader=[...state.players].sort((a,b)=>b[current.metric]-a[current.metric])[0];text+=` 任一人${stats[current.metric]}達 ${current.threshold} 即進入${stages[stage+1].name}；目前最高：${leader.name} ${leader[current.metric]}。`;}
if(state?.finalRound!==null&&state)text+=` 最後一輪：第 ${state.finalRound} 輪，所有人完成本輪後結算。`;
$('stageStatus').textContent=text;
}
function renderBoard(){
$('board').querySelectorAll('.tile').forEach(n=>n.remove());
phaseEvents[state?.stage||0].forEach((e,i)=>{
const c=categories[e.category],t=document.createElement('button'),[row,col]=tilePosition(i);
const occupants=state?state.players.filter((p,j)=>(positionOverride?.player===j?positionOverride.position:p.position)===i):[];
t.className='tile '+e.category+(state&&i===(positionOverride?.position??state.players[state.current].position)?' current':'');
t.style.cssText=`grid-row:${row};grid-column:${col};--tile-color:${c.color}`;t.dataset.tile=i;
t.setAttribute('aria-label',`${i+1} ${e.name}，${c.label}；${occupants.map(p=>p.name).join('、')}。查看事件`);
t.innerHTML=`<span class="tile-number">${String(i+1).padStart(2,'0')}${i===0?' 起終點 ↑':''}</span><span class="tile-icon" aria-hidden="true">${c.icon}</span><b>${e.name}</b><div class="tokens">${occupants.map(p=>`<span style="--person:${p.color}" title="${p.name}">${p.name[0]}</span>`).join('')}</div>`;
t.onclick=()=>{preview.innerHTML=`<button class="close" aria-label="關閉事件預覽">×</button><p class="eyebrow">${stages[state?.stage||0].name} · 第 ${i+1} 格 / ${c.label}</p><h2>${e.name}</h2><p>${e.description}</p>${e.recruit?'<p>已聘用幕僚者改為一般地方互動；離開準備期後不再招募。</p>':''}<ul>${e.choices.map(choice=>`<li>${choice.label} · ${stats[choice.skill]}判定${choice.cost?` · 花費資金 ${choice.cost}`:''}</li>`).join('')}</ul><p class="footnote">只處理停留格。投票日的終局觸發例外：決戰期經過也會觸發。</p>`;preview.querySelector('button').onclick=()=>preview.close();preview.showModal();};$('board').appendChild(t);
});
}
function renderRanking(){const players=state?state.players:candidates;$('ranking').innerHTML=[...players].sort((a,b)=>b.support-a.support).map(p=>{const rank=state?rules.standing(state,p):{mood:'neutral',rank:'—'};return `<div class="rank-wrap"><div class="rank ${p.isHuman?'me':''}"><span class="rank-number">${rank.rank}</span>${face(p,rank.mood)}<div><b>${p.name}${p.isHuman?' <em>你</em>':''}</b><small>${p.title} · ${moodLabels[rank.mood]}</small><small>資金 ${p.funds} · 知名度 ${p.awareness}</small></div><strong>${p.support}</strong></div><details><summary>${p.name}的能力與幕僚</summary>${statsMarkup(p)}</details></div>`;}).join('');}
function choiceMarkup(p,c,i){const gain=rules.reward(p,c),chance=Math.round(rules.probability(p,c)*100),affordable=p.funds>=c.cost,rival=c.opponentLoss?rules.opponent(state):null;return `<button class="choice" data-choice="${i}" ${busy||!p.isHuman||!affordable?'disabled':''}><span class="choice-top">${stats[c.skill]} ${p[c.skill]} <span>${gain.multiplier>1?`跨專長 ×${gain.multiplier}`:'專長發揮'}</span></span><b>${c.label}</b><span class="chance">成功率 ${chance}% · 骰點 + 能力 ≥ ${c.target}</span><span class="reward">成功：${effectsText(gain)}${rival?`；${rival.name}支持 −${c.opponentLoss}`:''}</span><span class="risk">失敗：${effectsText(Object.fromEntries(Object.entries(c.loss).map(([k,v])=>[k,-v])))}${rival?`；${rival.name}反擊，支持 +${c.counterGain}`:''}</span>${c.cost?`<span class="risk">無論成敗花費資金 ${c.cost}</span>`:''}${!affordable?'<span class="risk">資金不足，請選其他回應。</span>':''}</button>`;}
function renderEvent(){
if(!state)return;const p=state.players[state.current];
$('roundInfo').textContent=`第 ${state.round} 輪${state.finalRound!==null?' · 最後一輪':''}`;
$('boardStatus').textContent=busy?`${p.name} 正在行動…`:`${p.name}${p.isHuman?'（你）':''} · 支持 ${p.support} · 知名度 ${p.awareness} · 資金 ${p.funds}`;
$('rollBtn').hidden=state.phase!=='ready';$('rollBtn').disabled=busy;$('nextBtn').hidden=!['resolved','over'].includes(state.phase);$('nextBtn').disabled=busy;$('resetBtn').disabled=busy;$('eventTag').textContent=p.isHuman?'你的回合':'AI 回合';
if(state.phase==='over'){const winners=state.players.filter(p=>state.winners.includes(p.id));$('eventTag').textContent='全局結算';$('event').innerHTML=`<p class="eyebrow">所有人完成第 ${state.finalRound} 輪</p><h3>${winners.map(p=>p.name).join('、')}${winners.length>1?'共同':''}獲勝！</h3><div class="winner-faces">${winners.map(p=>face(p,'happy')).join('')}</div><p>最高支持度 ${winners[0].support}。資金與知名度不直接計入勝負。</p>`;$('nextBtn').textContent='再玩一場 →';return;}
$('nextBtn').textContent='繼續選戰 →';
if(state.phase==='ready'){$('event').innerHTML=`<div class="active-player">${face(p,rules.standing(state,p).mood)}<div><h3>${p.name}</h3><p>${p.title}</p></div></div><p>擲骰前進。目前在「${rules.eventAt(state,p.position).name}」。</p>${statsMarkup(p)}`;return;}
const e=phaseEvents[state.last.stage][p.position];$('eventTag').textContent=categories[e.category].label;
let html=`<p class="eyebrow">${stages[state.last.stage].name} · 第 ${p.position+1} 格 / ${p.name}</p><h3>${e.name}</h3><p>${e.description}</p>`;
if(state.phase==='cards')html+=`<div class="staff-cards">${state.last.cards.map((_,i)=>`<button data-card="${i}" ${busy?'disabled':''} aria-label="翻開第 ${i+1} 張幕僚卡"><span>▣</span><b>幕僚卡 ${i+1}</b><small>點擊翻開</small></button>`).join('')}</div>`;
if(state.phase==='offer'){const card=rules.cardOf(state),can=rules.canHire(p,card);html+=`<div class="staff-reveal"><p class="eyebrow">已翻開 · ${p.staff?'已聘用':'尚有一個空缺'}</p><h4>${card.name}</h4><p>${card.description}</p><strong>${effectsText(card.effects)}</strong><p>能力範圍 1–6；實際變化會受上下限限制。</p><button id="hireBtn" class="primary" ${busy||!can?'disabled':''}>聘用這位幕僚</button><button id="passStaff" ${busy?'disabled':''}>放棄，保留空缺</button>${!can?'<p class="risk">資金不足以支付幕僚費用，可以放棄。</p>':''}</div>`;}
if(state.phase==='choice')html+=`${e.recruit&&p.staff?'<p>已聘用幕僚，這次改為地方交流。</p>':''}<div class="choices">${e.choices.map((c,i)=>choiceMarkup(p,c,i)).join('')}</div>`;
if(state.phase==='resolved'){const last=state.last;html+=`<div class="outcome ${last.success?'success':'failure'}"><span class="eyebrow">${last.kind==='staff'?'招募結果':last.success?'應對成功':'應對失敗'}</span><h4>${last.label}</h4>${last.kind==='event'?`<p>判定骰 ${last.checkDie} + ${stats[last.skillKey]} ${last.skill} ${last.success?'≥':'<'} ${last.target}</p>`:''}<strong>${effectsText(last.delta)}</strong>${last.attack?`<p>${state.players.find(v=>v.id===last.attack.player).name}支持 ${signed(last.attack.delta)}</p>`:''}<p>${last.message}</p></div>${last.transition?`<div class="stage-notice">全場進入${stages[last.transition.to].name}！${state.players.find(v=>v.id===last.transition.player).name}${stats[last.transition.metric]}達 ${last.transition.value}。</div>`:''}`;}
$('event').innerHTML=html;
$('event').querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>choose(Number(b.dataset.choice)));
$('event').querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>{if(!busy&&rules.reveal(state,Number(b.dataset.card)))renderEvent();});
if($('hireBtn'))$('hireBtn').onclick=()=>hire(true);if($('passStaff'))$('passStaff').onclick=()=>hire(false);
}
function render(){renderStage();renderBoard();renderRanking();renderEvent();}
async function animateMove(){if(!state||state.phase!=='ready')return;const value=die(),p=state.players[state.current],from=p.position;$('dice').textContent=dieFaces[value-1];$('dice').setAttribute('aria-label',`移動骰 ${value} 點`);for(let step=1;step<=value;step++){positionOverride={player:state.current,position:(from+step)%48};renderBoard();await pause(90);}positionOverride=null;rules.move(state,value);render();}
function logResult(){const last=state.last,p=state.players[state.current],li=document.createElement('li');li.className=last.success?'success':'failure';li.textContent=`第 ${state.round} 輪 · ${p.name}「${last.eventName}」：${last.label}，${effectsText(last.delta)}。${last.attack?`${state.players.find(v=>v.id===last.attack.player).name}支持 ${signed(last.attack.delta)}。`:''}${last.transition?`全場進入${stages[last.transition.to].name}。`:''}`;$('log').prepend(li);}
async function choose(i){if(busy||state?.phase!=='choice'||!state.players[state.current].isHuman)return;busy=true;renderEvent();await pause(180);if(rules.resolve(state,i,die()))logResult();busy=false;render();$('nextBtn').focus({preventScroll:true});}
function hire(accept){if(busy||!state?.players[state.current].isHuman)return;if(rules.hire(state,accept)){logResult();render();$('nextBtn').focus({preventScroll:true});}}
$('startBtn').onclick=()=>{if(busy)return;state=rules.create(selected);$('selection').hidden=true;$('log').innerHTML='';render();$('rollBtn').focus({preventScroll:true});};
$('rollBtn').onclick=async()=>{if(busy||state?.phase!=='ready')return;busy=true;renderEvent();try{await animateMove();}finally{busy=false;render();}($('event').querySelector('[data-card],.choice:not(:disabled)'))?.focus({preventScroll:true});};
$('nextBtn').onclick=async()=>{
if(busy||!state)return;if(state.phase==='over'){reset();return;}if(state.phase!=='resolved')return;
busy=true;rules.next(state);render();try{while(state.phase!=='over'&&!state.players[state.current].isHuman){await animateMove();await pause(300);const p=state.players[state.current];if(state.phase==='cards'){rules.reveal(state,0);rules.hire(state,rules.aiHire(state));}else rules.resolve(state,rules.aiChoice(p,rules.eventAt(state,p.position),state),die());logResult();render();await pause(350);rules.next(state);render();}}finally{busy=false;render();}(state.phase==='over'?$('nextBtn'):$('rollBtn')).focus({preventScroll:true});
};
function reset(){if(busy)return;state=null;positionOverride=null;$('selection').hidden=false;$('dice').textContent='?';$('dice').setAttribute('aria-label','尚未擲骰');$('eventTag').textContent='等待出發';$('roundInfo').textContent='準備出發';$('boardStatus').textContent='選一位候選人，讓選戰開始。';$('rollBtn').hidden=false;$('rollBtn').disabled=true;$('nextBtn').hidden=true;$('event').innerHTML='<p class="empty">骰子決定你遇見什麼。<br>你的選擇決定怎麼回應。</p>';$('log').innerHTML='<li>街區正在等你出發。</li>';renderSelection();render();$('startBtn').focus();}
$('resetBtn').onclick=reset;$('helpBtn').onclick=()=>$('help').showModal();$('closeHelp').onclick=$('helpDone').onclick=()=>$('help').close();
renderSelection();render();

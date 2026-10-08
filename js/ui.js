const {config,candidates,events,categories,skills}=BoardwalkData;
const rules=BoardwalkRules;
let state=null,selected=candidates[0].id,busy=false,positionOverride=null;
const $=id=>document.getElementById(id);
const moodLabels={happy:'喜孜孜',neutral:'無悲無喜',nervous:'落後很緊張'};
const face=(p,mood='neutral')=>`<span class="portrait" role="img" aria-label="${p.name}：${moodLabels[mood]}" style="--face:url('${new URL(`assets/candidate-${p.id}.webp`,document.baseURI).href}');--position:${mood==='happy'?'0%':mood==='neutral'?'50%':'100%'};--person:${p.color}"></span>`;
const signed=value=>value>=0?`+${value}`:String(value);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,matchMedia('(prefers-reduced-motion: reduce)').matches?0:ms));
const die=()=>Math.floor(Math.random()*config.diceSides)+1;
const dieFaces=['⚀','⚁','⚂','⚃','⚄','⚅'];
const preview=document.createElement('dialog');preview.id='tilePreview';document.body.appendChild(preview);
function renderSelection(){
  $('candidates').innerHTML=candidates.map(c=>`<button class="candidate ${c.id===selected?'selected':''}" data-candidate="${c.id}" aria-pressed="${c.id===selected}">${face(c)}<span><b>${c.name}</b><small>${c.title}</small></span></button>`).join('');
  $('candidates').querySelectorAll('button').forEach(button=>button.onclick=()=>{selected=button.dataset.candidate;renderSelection();});
  const p=candidates.find(c=>c.id===selected);
  $('candidateInfo').innerHTML=`<b>${p.name}</b>　${Object.entries(p.skills).map(([key,value])=>`${skills[key]} ${value}`).join(' / ')}<br>起始支持 ${p.support} · 資金 ${p.funds}　<span>跨專長：低機率，成功高報酬。</span>`;
}
function tilePosition(index){
  if(index<=6)return [7-index,1];
  if(index<=12)return [1,index-5];
  if(index<=18)return [index-11,7];
  return [7,25-index];
}
function renderBoard(){
  $('board').querySelectorAll('.tile').forEach(node=>node.remove());
  events.forEach((event,index)=>{
    const category=categories[event.category],tile=document.createElement('button'),[row,col]=tilePosition(index);
    const occupants=state?state.players.filter((p,i)=>(positionOverride?.player===i?positionOverride.position:p.position)===index):[];
    tile.className='tile '+event.category+(state&&index===(positionOverride?.position??state.players[state.current].position)?'current':'');
    tile.style.cssText=`grid-row:${row};grid-column:${col};--tile-color:${category.color}`;
    tile.dataset.tile=index;
    tile.setAttribute('aria-label',`${index+1} ${event.name}，${category.label}${occupants.length?'；'+occupants.map(p=>p.name).join('、'):''}。查看事件`);
    tile.innerHTML=`<span class="tile-number">${String(index+1).padStart(2,'0')}${index===0?' 起點 ↑':''}</span><span class="tile-icon" aria-hidden="true">${category.icon}</span><b>${event.name}</b><div class="tokens">${occupants.map(p=>`<span style="--person:${p.color}" title="${p.name}${p.isHuman?'（你）':''}">${p.name[0]}</span>`).join('')}</div>`;
    tile.onclick=()=>{
      preview.innerHTML=`<button class="close" aria-label="關閉事件預覽">×</button><p class="eyebrow">第 ${index+1} 格 / ${category.label}</p><h2>${event.name}</h2><p>${event.description}</p><ul>${event.choices.map(c=>`<li>${c.label} · ${skills[c.skill]}判定${c.cost?` · 花費資金 ${c.cost}`:''}</li>`).join('')}</ul><p class="footnote">這是事件預覽。擲骰停在這格後，才可以選擇回應。</p>`;
      preview.querySelector('button').onclick=()=>preview.close();preview.showModal();
    };
    $('board').appendChild(tile);
  });
}
function renderRanking(){
  const players=state?state.players:candidates;
  $('ranking').innerHTML=[...players].sort((a,b)=>b.support-a.support).map(p=>{
    const standing=state?rules.standing(state,p):{mood:'neutral',rank:'—'};
    return `<div class="rank ${p.isHuman?'me':''}"><span class="rank-number">${standing.rank}</span>${face(p,standing.mood)}<div><b>${p.name}${p.isHuman?' <em>你</em>':''}</b><small>${moodLabels[standing.mood]} · 資金 ${p.funds}</small></div><strong>${p.support}</strong></div>`;
  }).join('');
}
function choiceMarkup(p,choice,index){
  const reward=rules.reward(p,choice),chance=Math.round(rules.probability(p,choice)*100),affordable=p.funds>=choice.cost;
  return `<button class="choice" data-choice="${index}" ${busy||!p.isHuman||!affordable?'disabled':''}><span class="choice-top">${skills[choice.skill]} ${p.skills[choice.skill]} <span>${reward.multiplier>1?`跨專長 ×${reward.multiplier}`:'專長發揮'}</span></span><b>${choice.label}</b><span class="chance">成功率 ${chance}% · 骰點 + 能力 ≥ ${choice.target}</span><span class="reward">成功：支持 +${reward.support}${reward.funds?` · 資金 +${reward.funds}`:''}</span><span class="risk">失敗：支持 −${choice.loss}${choice.cost?` · 無論成敗花費資金 ${choice.cost}`:''}</span>${!affordable?'<span class="risk">資金不足，請選擇其他回應。</span>':''}</button>`;
}
function renderEvent(){
  if(!state)return;
  const p=state.players[state.current];
  $('roundInfo').textContent=`第 ${state.round} / ${config.rounds} 輪`;
  $('boardStatus').textContent=busy?`${p.name} 正在行動…`:`${p.name}${p.isHuman?'（你）':''} · 支持 ${p.support} · 資金 ${p.funds}`;
  $('rollBtn').hidden=state.phase!=='ready';$('rollBtn').disabled=busy;
  $('nextBtn').hidden=!['resolved','over'].includes(state.phase);$('nextBtn').disabled=busy;
  $('resetBtn').disabled=busy;
  $('eventTag').textContent=p.isHuman?'你的回合':'AI 回合';
  if(state.phase==='over'){
    const winners=state.players.filter(p=>state.winners.includes(p.id));
    $('eventTag').textContent='全局結算';
    $('event').innerHTML=`<p class="eyebrow">所有人完成 ${config.rounds} 輪</p><h3>${winners.map(p=>p.name).join('、')}${winners.length>1?'共同':''}獲勝！</h3><div class="winner-faces">${winners.map(p=>face(p,'happy')).join('')}</div><p>最高支持度 ${winners[0].support}。資金是行動資源，不直接計入勝負。</p><p>這座城市記住了你的選擇。</p>`;
    $('nextBtn').textContent='再玩一場 →';return;
  }
  $('nextBtn').textContent='繼續選戰 →';
  if(state.phase==='ready'){
    $('event').innerHTML=`<div class="active-player">${face(p,rules.standing(state,p).mood)}<div><h3>${p.name}</h3><p>${p.title} · ${p.isHuman?'你來決定':'AI 自動決策'}</p></div></div><p>擲骰決定這次走進哪一個事件。你目前在「${events[p.position].name}」。</p><p class="footnote">${Object.entries(p.skills).map(([k,v])=>`${skills[k]} ${v}`).join(' / ')}<br>擅長穩定拿報酬，跨專長冒險換高收益。</p>`;return;
  }
  const event=events[p.position],category=categories[event.category];
  $('eventTag').textContent=category.label;
  let html=`<p class="eyebrow">第 ${p.position+1} 格 / ${p.name}</p><h3>${event.name}</h3><p>${event.description}</p>`;
  if(state.phase==='choice')html+=`<div class="choices">${event.choices.map((c,i)=>choiceMarkup(p,c,i)).join('')}</div>`;
  if(state.phase==='resolved'){
    const last=state.last,choice=event.choices[last.choice];
    html+=`<div class="outcome ${last.success?'success':'failure'}"><span class="eyebrow">${last.success?'應對成功':'應對失敗'}${last.success&&last.multiplier>1?' · 跨專長高報酬':''}</span><h4>${choice.label}</h4><p>判定骰 ${last.checkDie} + ${skills[choice.skill]} ${last.skill} ${last.success?'≥':'<'} 目標 ${last.target}</p><strong>支持 ${signed(last.delta)}${last.fundsDelta?` · 資金 ${signed(last.fundsDelta)}`:''}</strong><p>${last.message}</p></div>`;
  }
  $('event').innerHTML=html;
  $('event').querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>choose(Number(button.dataset.choice)));
}
function render(){renderBoard();renderRanking();renderEvent();}
async function animateMove(){
  if(!state||state.phase!=='ready')return;
  const value=die(),p=state.players[state.current],from=p.position;
  $('dice').textContent=dieFaces[value-1];$('dice').setAttribute('aria-label',`移動骰 ${value} 點`);
  for(let step=1;step<=value;step++){positionOverride={player:state.current,position:(from+step)%config.tileCount};renderBoard();await pause(120);}
  positionOverride=null;rules.move(state,value);render();
}
function logResult(){
  const last=state.last,p=state.players[state.current],event=events[p.position];
  const li=document.createElement('li');li.className=last.success?'success':'failure';
  li.textContent=`第 ${state.round} 輪 · ${p.name} 到了「${event.name}」，選擇「${event.choices[last.choice].label}」：${last.success?'成功':'失敗'}，支持 ${signed(last.delta)}${last.fundsDelta?`、資金 ${signed(last.fundsDelta)}`:''}。`;
  $('log').prepend(li);
}
async function choose(index){
  if(busy||state?.phase!=='choice'||!state.players[state.current].isHuman)return;
  busy=true;renderEvent();await pause(220);
  if(rules.resolve(state,index,die()))logResult();busy=false;render();
  $('nextBtn').focus({preventScroll:true});
}
$('startBtn').onclick=()=>{if(busy)return;state=rules.create(selected);$('selection').hidden=true;$('log').innerHTML='';render();$('rollBtn').focus({preventScroll:true});};
$('rollBtn').onclick=async()=>{if(busy||state?.phase!=='ready')return;busy=true;renderEvent();try{await animateMove();}finally{busy=false;render();}const first=$('event').querySelector('.choice:not(:disabled)');first?.focus({preventScroll:true});};
$('nextBtn').onclick=async()=>{
  if(busy||!state)return;
  if(state.phase==='over'){reset();return;}
  if(state.phase!=='resolved')return;
  busy=true;rules.next(state);render();
  try{
    while(state.phase!=='over'&&!state.players[state.current].isHuman){
      await animateMove();await pause(500);
      const p=state.players[state.current];rules.resolve(state,rules.aiChoice(p,events[p.position]),die());logResult();render();await pause(600);rules.next(state);render();
    }
  }finally{busy=false;render();}
  (state.phase==='over'?$('nextBtn'):$('rollBtn')).focus({preventScroll:true});
};
function reset(){if(busy)return;state=null;positionOverride=null;$('selection').hidden=false;$('dice').textContent='?';$('dice').setAttribute('aria-label','尚未擲骰');$('eventTag').textContent='等待出發';$('roundInfo').textContent='準備出發';$('boardStatus').textContent='選一位候選人，讓選戰開始。';$('rollBtn').hidden=false;$('rollBtn').disabled=true;$('nextBtn').hidden=true;$('event').innerHTML='<p class="empty">骰子決定你遇見什麼。<br>你的選擇決定怎麼回應。</p>';$('log').innerHTML='<li>街區正在等你出發。</li>';renderSelection();renderBoard();renderRanking();$('startBtn').focus();}
$('resetBtn').onclick=reset;
$('helpBtn').onclick=()=>$('help').showModal();$('closeHelp').onclick=$('helpDone').onclick=()=>$('help').close();
renderSelection();renderBoard();renderRanking();

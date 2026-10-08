/* Independent boardwalk prototype 0.2; original Alpha 0.42 unchanged. */
const BoardwalkData=(()=>{
const config={diceSides:6,side:13,tileCount:48,finishTile:0,abilityMin:1,abilityMax:6,crossSpecialtyMultiplierPerPoint:1,thresholds:{funds:60,awareness:60,support:110},aiWeights:{support:1,funds:.3,awareness:.45,ability:3}};
const stats={funds:'資金',media:'媒體',local:'地方團體',speech:'口才',image:'形象',awareness:'知名度',support:'支持度'},abilityKeys=['media','local','speech','image'];
const candidates=[
{id:'lin',name:'林阿城',title:'陸軍樁腳',description:'地方組織強，媒體宣傳薄弱。',color:'#84cc16',funds:8,media:1,local:4,speech:3,image:2,awareness:7,support:24},
{id:'xia',name:'夏薇',title:'空軍宣傳',description:'媒體曝光強，地方基層薄弱。',color:'#f472b6',funds:8,media:4,local:1,speech:3,image:2,awareness:12,support:18},
{id:'gao',name:'高富民',title:'資金充沛',description:'空陸軍不突出，能投入資源辦活動。',color:'#f59e0b',funds:32,media:2,local:2,speech:2,image:2,awareness:7,support:16},
{id:'jiang',name:'江一新',title:'平衡型',description:'各種能力均衡，沒有明顯弱項。',color:'#a78bfa',funds:12,media:3,local:3,speech:3,image:3,awareness:8,support:22}];
const stages=[
{name:'準備期',description:'籌資、凝聚地方團體，翻卡招募一名幕僚。',metric:'funds',threshold:60,scale:1},
{name:'造勢期',description:'募款減少，宣傳與支持度攻防增加。',metric:'awareness',threshold:60,scale:1},
{name:'衝刺期',description:'募款更稀少，支持度得失更強烈。',metric:'support',threshold:110,scale:1.7},
{name:'決戰期',description:'負面手段失敗遭反擊。經過投票日啟動最後一輪。',scale:2}];
stages.slice(0,3).forEach(s=>s.threshold=config.thresholds[s.metric]);
const categories={community:{label:'地方互動',icon:'⌂',color:'#55816b'},policy:{label:'口才與政見',icon:'▤',color:'#a88335'},media:{label:'曝光宣傳',icon:'◉',color:'#4b839e'},funds:{label:'籌募資金',icon:'$',color:'#a77e2e'},crisis:{label:'形象考驗',icon:'⚡',color:'#ba6654'},staff:{label:'幕僚招募',icon:'▣',color:'#8a719d'},dark:{label:'決戰攻防',icon:'◆',color:'#76566c'}};
const o=(label,skill,target,gain,loss={support:3},cost=0,extra={})=>({label,skill,target,gain,loss,cost,crossSpecialty:true,...extra});
const choices={
start:[o('直播宣布參選','media',6,{support:2,awareness:5}),o('與街區居民交流','local',6,{support:3,awareness:2}),o('說明參選理念','speech',6,{support:3,awareness:3})],
funds:[o('發起網路募款','media',7,{funds:8,awareness:2,support:1}),o('拜會地方樁腳','local',7,{funds:8,support:1}),o('舉辦募款餐會','speech',7,{funds:8,awareness:1,support:1})],
prepare:[o('拜會地方團體','local',6,{support:3,awareness:2}),o('招募網路志工','media',6,{support:2,awareness:4}),o('與團體說明政見','speech',6,{support:3,awareness:2})],
training:[o('練習公開演說','speech',7,{speech:1,awareness:3}),o('整理公開形象','image',7,{image:1,support:2}),o('經營地方服務網','local',7,{local:1,support:2})],
air:[o('推出社群短影片','media',6,{support:5,awareness:8}),o('邀地方代表分享','local',7,{support:6,awareness:4}),o('直播說明政策','speech',7,{support:6,awareness:5})],
ground:[o('走訪居民聽取意見','local',6,{support:6,awareness:2}),o('直播街區人物故事','media',7,{support:5,awareness:7}),o('說明街區改善方案','speech',7,{support:6,awareness:3})],
poll:[o('用短講回應民調','speech',6,{support:4,awareness:4}),o('拜訪尚未支持的居民','local',6,{support:5,awareness:2}),o('接受媒體訪問','media',6,{support:4,awareness:7})],
policy:[o('發表具體政策配套','speech',6,{support:6,awareness:4}),o('邀居民面對面討論','local',7,{support:7,awareness:3}),o('推出政策懶人包','media',7,{support:6,awareness:6})],
crisis:[o('公開澄清並承擔責任','image',7,{support:6,awareness:3},{support:5,image:1}),o('向地方居民解釋','local',7,{support:5,awareness:2},{support:5}),o('在鏡頭前回應質疑','speech',7,{support:7,awareness:6},{support:6,image:1})],
debate:[o('用論述說服觀眾','speech',7,{support:8,awareness:6},{support:5}),o('讓政策影片接力傳播','media',7,{support:6,awareness:9},{support:5}),o('以穩健形象贏得信任','image',7,{support:7,awareness:4},{support:5})],
advertise:[o('投放網路宣傳','media',7,{support:9,awareness:10},{support:4},4),o('舉辦地方宣傳活動','local',7,{support:10,awareness:5},{support:4},4),o('免費公開政策短講','speech',7,{support:4,awareness:4},{support:3})],
rally:[o('舉辦地方造勢','local',7,{support:11,awareness:5},{support:5},6),o('製作大型直播節目','media',7,{support:9,awareness:10},{support:5},6),o('免費街頭演說','speech',7,{support:5,awareness:4},{support:3})],
vote:[o('聯絡支持者與志工','local',7,{support:8,awareness:2},{support:5}),o('推出網路催票影片','media',7,{support:7,awareness:6},{support:5}),o('重申最後政策承諾','speech',7,{support:8,awareness:3},{support:5})],
dark:[o('公開比較雙方政見','speech',7,{support:6,awareness:4},{support:4}),o('負面宣傳攻擊對手','media',7,{support:8,awareness:7},{support:10,image:1},6,{opponentLoss:8,counterGain:4}),o('冒險進行暗盤交易','local',7,{support:12},{support:15,image:2},10,{opponentLoss:14,counterGain:6})]};
const staffCards=[
{id:'finance',name:'募款總管',description:'資源立刻到位，但外界質疑資金形象。',effects:{funds:18,image:-2}},
{id:'media',name:'媒體操盤手',description:'宣傳更有力，強勢作風帶來形象代價。',effects:{media:2,image:-1}},
{id:'local',name:'地方組織主任',description:'地方更凝聚，團隊減少媒體投入。',effects:{local:2,media:-1}},
{id:'speech',name:'辯論教練',description:'提升口才，需支付培訓資源。',effects:{speech:2,funds:-4}},
{id:'image',name:'形象顧問',description:'提升可信形象，同時減少高調曝光。',effects:{image:2,awareness:-3}},
{id:'general',name:'綜合競選顧問',description:'補強媒體、地方與口才，需要顧問費。',effects:{media:1,local:1,speech:1,funds:-6}}];
const names=['投票日','幕僚招募','首輪募款','宣布參選','社群首發','市場掃街','小額募款','團隊徵才','首輪民調','支持團體','募款活動','社會議題浮現','議題研究','顧問見面會','地方募款','發表政見','選戰升溫','街區茶會','支持者餐會','人才招募','中期民調','查核風暴','社群募款','電視辯論','家戶拜訪','組織補強','競選資源擴張','重大議題改變','媒體回響','青年座談','服務站募款','幕僚徵選','大型廣告','社區論壇','募款餐會','公開訪談','封關民調','團隊面試','後援會募款','政策說明會','選前之夜','巷弄掃街','最後募款','人才交流','投票動員','街頭演說','志工募款','最後承諾'];
const types=['vote','prepare','funds','start','air','ground','funds','prepare','poll','ground','funds','policy','policy','prepare','funds','policy','air','ground','funds','policy','poll','crisis','funds','debate','ground','prepare','funds','policy','air','ground','funds','prepare','advertise','policy','funds','air','poll','prepare','funds','policy','rally','ground','funds','prepare','vote','debate','funds','vote'];
const categoryFor={start:'community',prepare:'community',training:'policy',funds:'funds',air:'media',ground:'community',poll:'media',policy:'policy',crisis:'crisis',debate:'policy',advertise:'media',rally:'community',vote:'community',dark:'dark'};
const fundSlots=[[2,6,10,14,18,22,26,30,34,38,42,46],[2,10,18,26,34,42],[10,26,42],[18,42]],staffSlots=[1,7,13,19,25,31,37,43];
const phaseEvents=stages.map((stage,s)=>names.map((name,id)=>{
let type=types[id],recruit=false;
if(fundSlots[s].includes(id))type='funds';
else if(s===0){type=id===3?'start':id%5===0?'training':'prepare';recruit=staffSlots.includes(id);}
else if(s===3&&id>0&&id%4===0)type='dark';
else if(['funds','prepare','start'].includes(type))type=['ground','air','rally','policy','debate'][id%5];
if(id===0)type=s===0?'prepare':'vote';
const category=recruit?'staff':categoryFor[type];
const label=recruit?'幕僚招募':type==='funds'?name:type==='dark'?'決戰攻防':types[id]===type||id===0?name:({prepare:'地方團體交流',training:'能力培訓',ground:'街區拜訪',air:'宣傳接力',rally:'群眾造勢',policy:'政策說明',debate:'公開辯論'})[type]||name;
const description=recruit?'準備期限定：三張蓋牌翻一張，可聘用或放棄。每人最多一名幕僚。':type==='funds'?'網路募款、拜會樁腳或募款餐會：發揮專長，或冒險爭取跨領域巨額資金。':type==='dark'?'公開應對，或冒險削弱領先對手。負面手段失敗會遭反擊並損害形象。':s===0?'先建立團體支持與競選能力，為下一個階段準備。':`${stage.name}的${label}：知名度與支持分別累積${s>=2?'，支持度得失更強烈':''}。`;
return {id,name:label,category,description,recruit,choices:choices[type].map(c=>({...c,gain:{...c.gain,support:Math.round((c.gain.support||0)*stage.scale)},loss:{...c.loss,support:Math.round((c.loss.support||0)*stage.scale)}}))};
}));
return {config,stats,abilityKeys,candidates,stages,categories,staffCards,phaseEvents};
})();
if(typeof module!=='undefined')module.exports=BoardwalkData;


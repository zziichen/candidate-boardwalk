/* Independent boardwalk prototype; numbers below do not modify Alpha 0.42. */
const BoardwalkData = (() => {
  const config={rounds:12,diceSides:6,supportFloor:0,fundsFloor:0,tileCount:24,crossSpecialtyMultiplierPerPoint:1,aiFundsWeight:0.25};
  const skills={air:'空軍',ground:'陸軍',policy:'政策',attack:'攻擊'};
  const candidates=[
    {id:'lin',name:'林阿城',title:'地方老將',color:'#84cc16',support:32,funds:8,skills:{air:1,ground:4,policy:2,attack:3}},
    {id:'xu',name:'許文哲',title:'政策學者',color:'#60a5fa',support:27,funds:7,skills:{air:2,ground:2,policy:4,attack:2}},
    {id:'xia',name:'夏薇',title:'媒體明星',color:'#f472b6',support:28,funds:8,skills:{air:4,ground:1,policy:2,attack:3}},
    {id:'jiang',name:'江一新',title:'改革素人',color:'#a78bfa',support:30,funds:5,skills:{air:3,ground:2,policy:3,attack:2}},
    {id:'gao',name:'高富民',title:'企業經理人',color:'#f59e0b',support:25,funds:14,skills:{air:3,ground:1,policy:3,attack:3}},
    {id:'su',name:'蘇暖暖',title:'草根倡議者',color:'#34d399',support:29,funds:5,skills:{air:2,ground:4,policy:3,attack:1}}
  ];
  const categories={community:{label:'街區互動',icon:'⌂',color:'#55816b'},policy:{label:'政策議題',icon:'▤',color:'#a88335'},media:{label:'曝光宣傳',icon:'◉',color:'#4b839e'},funds:{label:'籌募資金',icon:'$',color:'#a77e2e'},crisis:{label:'突發事件',icon:'⚡',color:'#ba6654'}};
  const option=(label,skill,target,support,funds,loss,cost=0)=>({label,skill,target,gain:{support,funds},loss,cost,crossSpecialty:true});
  const choices={
    start:[option('直播宣布參選','air',6,4,0,2),option('走進街區與居民交流','ground',6,4,0,2),option('發表完整參選理念','policy',6,4,0,2)],
    team:[option('招募網路志工','air',6,3,2,2),option('建立地方服務團隊','ground',6,3,2,2),option('組成政策研究團隊','policy',6,3,2,2)],
    funds:[option('發起網路募款','air',7,1,8,3),option('拜會地方樁腳','ground',7,1,8,3),option('舉辦政策募款餐會','policy',7,1,8,3)],
    air:[option('推出社群短影片','air',6,5,0,3),option('邀地方代表現身分享','ground',7,6,0,3),option('推出政策懶人包','policy',7,6,0,3)],
    ground:[option('走訪居民聽取意見','ground',6,5,0,3),option('直播街區人物故事','air',7,6,0,3),option('提出街區改善方案','policy',7,6,0,3)],
    poll:[option('用短講回應民調','air',6,4,0,2),option('走訪尚未支持的居民','ground',6,4,0,2),option('分析民調調整主張','policy',6,4,0,2)],
    policy:[option('提出具體政策配套','policy',6,5,0,3),option('邀居民面對面討論','ground',7,6,0,3),option('直播說明政策主張','air',7,6,0,3)],
    crisis:[option('公開證據釐清誤解','policy',7,5,0,4),option('直接向居民解釋','ground',7,5,0,4),option('正面反擊不實指控','attack',7,7,0,5)],
    debate:[option('用資料論證主張','policy',7,6,0,4),option('用故事說服觀眾','air',7,6,0,4),option('挑戰對手的核心論點','attack',7,8,0,5)],
    advertise:[option('投放網路宣傳','air',7,8,0,4,3),option('舉辦地方宣傳活動','ground',7,8,0,4,3),option('製作政策文宣','policy',7,8,0,4,3)],
    rally:[option('舉辦地方造勢','ground',7,9,0,4,4),option('直播選前總動員','air',7,9,0,4,4),option('不花錢，做政策短講','policy',7,4,0,2)],
    vote:[option('聯絡支持者與志工','ground',7,6,0,4),option('推出網路催票影片','air',7,6,0,4),option('說明投票日政策承諾','policy',7,6,0,4)]
  };
  // Original campaign milestones become individual squares, not forced phases.
  const events=[
    ['宣布參選','community','start','你來到競選總部，居民想知道為什麼你決定參選。'],
    ['組成競選團隊','community','team','新的夥伴報到，選擇一種方式建立你的競選團隊。'],
    ['首輪募款','funds','funds','選戰需要資源。網路募款、拜會樁腳或政策餐會，哪一條路適合你？'],
    ['社群首發','media','air','第一波網路內容即將發布，你打算怎麼介紹自己？'],
    ['市場掃街','community','ground','攤商忙著做生意，也有很多生活上的問題想跟你說。'],
    ['首輪民調','media','poll','第一份民調出爐，你必須回應居民對你的期待。'],
    ['社會議題浮現','policy','policy','居住與生活成本成為焦點，居民期待具體回應。'],
    ['議題研究','policy','policy','你來到市民書屋，有機會把一項主張說得更完整。'],
    ['募款活動','funds','funds','下一段選戰需要資金。試試自己的專長，或跨領域爭取大額報酬。'],
    ['發表政見','policy','policy','公開說明會開始了，居民準備聽聽你的主張。'],
    ['支持團體','community','ground','地方團體邀你交流，希望了解你如何回應他們的需求。'],
    ['選戰升溫','media','air','更多人開始關注選戰，這是讓主張被看見的機會。'],
    ['中期民調','media','poll','選戰走到中段，民調再度成為街頭話題。'],
    ['查核風暴','crisis','crisis','一段片面的訊息快速流傳，你得選擇如何面對。'],
    ['電視辯論','media','debate','鏡頭已經就位。用論述、故事或挑戰，爭取觀眾的認同。'],
    ['家戶拜訪','community','ground','走進巷弄，居民希望你聽見平常不被注意的事情。'],
    ['重大議題改變','policy','policy','新的公共議題出現，既有主張必須重新說明。'],
    ['媒體回響','media','air','媒體邀你回應選戰走勢，這一次怎麼掌握曝光？'],
    ['競選資源擴張','funds','funds','團隊想擴大行動規模，你需要爭取新的資金。'],
    ['大型廣告','media','advertise','資金終於派上用場。投入宣傳，或先用不花錢的方式試水溫。'],
    ['封關民調','media','poll','最後一波民調引起關注，居民看著你的下一步。'],
    ['選前之夜','community','rally','街區晚會準備開始，你的最後一段宣傳會怎麼做？'],
    ['投票動員','community','vote','支持者願意參與，但需要清楚的行動方向。'],
    ['投票日','community','vote','這個街區開始投票，將累積的主張化為參與。全局仍在第 12 輪結算。']
  ].map(([name,category,type,description],id)=>({id,name,category,description,choices:choices[type].map(c=>({...c,gain:{...c.gain}}))}));
  // Keep at least one affordable response on every square.
  events[19].choices.push({...option('不花錢，親自宣傳主張','policy',7,4,0,2),crossSpecialty:false});
  return {config,skills,candidates,categories,events};
})();
if(typeof module!=='undefined')module.exports=BoardwalkData;

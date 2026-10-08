const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {pathToFileURL}=require('node:url');const {chromium}=require('playwright');
(async()=>{
  const browser=await chromium.launch({channel:process.env.SMOKE_BROWSER_CHANNEL||'msedge'});
  try{for(const width of [1440,768,390,320]){
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(`${r.url()}: ${r.failure()?.errorText}`));
    await page.addInitScript(()=>{Math.random=()=>.999});
    await page.goto(process.env.SMOKE_SITE_URL || pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    assert.equal(await page.locator('.candidate').count(),6);assert.equal(await page.locator('.tile').count(),24);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#helpBtn').click();assert.equal(await page.locator('#help').evaluate(d=>d.open),true);await page.keyboard.press('Escape');
    await page.locator('[data-tile="2"]').click();assert.equal(await page.locator('#tilePreview').evaluate(d=>d.open),true);assert.match(await page.locator('#tilePreview').textContent(),/網路募款/);await page.keyboard.press('Escape');
    await page.locator('[data-candidate="xia"]').click();await page.locator('#startBtn').click();
    await page.locator('#rollBtn').click();await page.waitForFunction(()=>!busy&&state.phase==='choice');
    assert.equal(await page.evaluate(()=>state.players[0].position),6,'Actual d6 movement');
    await page.locator('[data-choice="0"]').click();await page.waitForFunction(()=>!busy&&state.phase==='resolved');
    assert.equal(await page.locator('.outcome.success').count(),1);
    await page.locator('#nextBtn').click();await page.waitForFunction(()=>!busy&&state.phase==='ready'&&state.current===0);
    assert.equal(await page.evaluate(()=>state.round),2);assert.equal(await page.locator('#log li').count(),6,'All five AIs resolve');
    await page.evaluate(()=>{state.players[0].position=2;state.phase='choice';state.last={};render();});
    assert.match(await page.locator('[data-choice="1"]').textContent(),/成功率 17%/);
    assert.match(await page.locator('[data-choice="1"]').textContent(),/資金 \+32/);
    const before=await page.evaluate(()=>state.players[0].funds);
    await page.locator('[data-choice="1"]').click();await page.waitForFunction(()=>!busy&&state.phase==='resolved');assert.equal(await page.evaluate(()=>state.players[0].funds),before+32);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    const imageErrors=await page.evaluate(async()=>{
      return Promise.all(candidates.map(c=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(null);image.onerror=()=>resolve(c.id);image.src=`assets/candidate-${c.id}.webp`;})));
    });assert(imageErrors.every(x=>x===null));
    if(process.env.SMOKE_SCREENSHOT_DIR){fs.mkdirSync(process.env.SMOKE_SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SMOKE_SCREENSHOT_DIR,`boardwalk-${width}.png`),fullPage:true});}
    if(width===1440){
      for(let round=2;round<=12;round++){
        await page.locator('#nextBtn').click();await page.waitForFunction(()=>!busy);
        if(round===12)break;
        await page.locator('#rollBtn').click();await page.waitForFunction(()=>!busy&&state.phase==='choice');await page.locator('.choice:not(:disabled)').first().click();await page.waitForFunction(()=>!busy&&state.phase==='resolved');
      }
      assert.equal(await page.evaluate(()=>state.phase),'over');assert.equal(await page.evaluate(()=>state.history.length),72);assert.match(await page.locator('#event').textContent(),/獲勝/);
      await page.locator('#nextBtn').click();assert.equal(await page.locator('#selection').isVisible(),true);assert.equal(await page.evaluate(()=>state),null);
    }
    assert.deepEqual(errors,[]);console.log(`PASS: ${width}px selection, help, tile preview, dice movement, response, AI turns, cross-specialty +32 funds, assets and layout`);await page.close();
  }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

# 環城選戰 Boardwalk Campaign

以《候選人！》六名虛構人物與美術為基礎的新專案。原作 Alpha 0.42 的資料、規則與已上線網站未改動。

直接開啟 `index.html`，或以靜態伺服器提供此目錄；不用建置或安裝框架。

## 原型規則

- 24 格環形棋盤，原競選階段與節點改為停留事件。只處理停留格，經過不觸發。
- 1 名人類玩家與 5 名 AI，每人完成 12 輪後結算支持度，同分共同獲勝。
- 移動骰與事件判定骰各為 d6。事件判定：骰點 + 對應能力 ≥ 目標。
- 募款格可以選網路募款、拜會地方樁腳、政策募款餐會。
- 專長有較高成功率；跨專長倍率 `1 + 最高能力 − 應對能力`，成功時同時放大支持與資金收益。失敗扣支持，支出仍照扣。
- 廣告及造勢可花資金爭取支持；每格至少有一個免費選項，避免資金耗盡卡死。
- 即時支持度保留六位人物與依排名切換的三種表情。

例如夏薇空軍 4 / 陸軍 1 在募款格：

|應對|成功條件|成功率|成功資金|失敗|
|---|---|---|---|---|
|網路募款|d6 + 4 ≥ 7|67%|+8|支持 −3|
|拜會地方樁腳|d6 + 1 ≥ 7|17%|+32|支持 −3|

這是新玩法的初始測試參數，不是對原作平衡的調整。尚未經過勝率校準。所有事件門檻、報酬與初始資源在 `js/data.js`；AI 資金估值在同檔 config。

## 架構與測試

- `js/data.js`：角色、config、事件與應對資料。
- `js/rules.js`：移動、判定、跨專長報酬、輪次、AI、結算。
- `js/ui.js`：選角、動畫、事件選項、事件預覽、人物與結果。
- `assets/`：沿用原專案的本機 WebP 表情素材。
- `tests/rules.cjs`：純規則與完整模擬。執行 `node tests/rules.cjs`。
- `tests/browser.cjs`：桌面手機實際操作。需要 Playwright；執行 `node tests/browser.cjs`。可設 `SMOKE_BROWSER_CHANNEL=msedge`。

## 線上版本

- 遊戲：https://zziichen.github.io/candidate-boardwalk/
- GitHub：https://github.com/zziichen/candidate-boardwalk
- GitHub Pages 從 main 分支根目錄發布；更新 main 會自動觸發部署。
- 可用 `SMOKE_SITE_URL=https://zziichen.github.io/candidate-boardwalk/` 執行正式站瀏覽器測試。

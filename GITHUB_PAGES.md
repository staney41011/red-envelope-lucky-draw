# 紅包汽球抽起來｜GitHub Pages 免登入同步版

## 網頁連結

- 網站首頁：https://staney41011.github.io/red-envelope-lucky-draw/
- 手機／電腦操作控制台：https://staney41011.github.io/red-envelope-lucky-draw/control/
- 投影畫面：https://staney41011.github.io/red-envelope-lucky-draw/projection/

**控制台與投影頁都不需要登入、跳轉、密碼或 Google 帳號。**
手機與公司電腦可以同時開啟控制台，複製／貼上商品、手收與獎金後按「儲存內部明細並加入佇列」；投影頁顯示即時抽獎、得獎人及獎區剩餘數量。前端只依賴 GitHub Pages 與 Firebase Realtime Database 的 HTTP REST API，不需 Google Auth 或 Firebase SDK。

## 既有資料如何保護

- 原有 **65 筆完整歷史紀錄**（包含商品、手收、獎金明細）仍原封不動保留在受 Google 管理帳號保護的 `/drawState`，未複製到公開操作區。
- 新的公開操作資料位於 `/liveState`：只有 15 位候選者、四個獎區剩餘數量、當前待抽清單、當次結果、最近 8 筆開獎紀錄。不包含商品、手收、業績獎金明細。
- 使用者新增時，商品、手收、獎金會存入 `/protectedSubmissions/<唯一編號>`。此路徑對公開端**只准首次寫入**，**不允許任何未授權者讀取**。管理者可至 Firebase Console 查看。
- 兩個裝置都能新增內部明細，但**無登入的網頁無法再讀取顯示敏感內容**；這是避免公開洩漏的必要取捨。
- 原有 65 筆抽獎的中獎數量已從新獎池扣除。初始化庫存：第一區 63、第二區 56、第三區 63、加碼區 33。舊得獎名單沒有搬到公開區；公開最近 8 筆從新版開始累積。
- 石淑華退出未來抽獎名單，舊歷史不刪除。

## 操作方式

1. 手機或電腦開啟控制台（都免登入）。
2. 選姓名、獎區，填寫商品及金額。可在公司電腦直接複製貼上。
3. 按「儲存內部明細並加入佇列」，敏感明細會傳至私有寫入區，抽獎資料加入公開佇列。
4. 按「開出下一筆」執行抽獎。使用 Firebase ETag 條件寫入避免同時操作重複扣除庫存。
5. 投影頁自動每約 1.2 秒更新，無需任何人操作或跳轉。
6. 「清除待抽／目前畫面」只清除佇列和當前顯示，**不會把已抽出的紅包重新加回**。
7. 「匯出公開操作紀錄」僅包含公開資料，不是原有 65 筆完整資料的備份。

## 重要風險

**任何取得控制台網址或公開資料庫位置的人，都可直接操作或竄改公開的佇列、開獎結果與剩餘獎池。** 這是依要求免驗證且可修改的必然結果；限制前端按鈕並不能阻止直接操作 Firebase REST API。本版用 Firebase 規則避免將舊有完整紀錄和新增敏感明細對外公開，但無法保證公開抽獎資料不受惡意竄改。需要稽核級防竄改抽獎時，必須重新加入管理驗證或後端簽署請求。

## 專案架構

Firebase 專案：`red-envelope-lucky-draw-2026`，Realtime Database：`asia-southeast1`。

- `control/index.html` → `site/open-control.js` → `site/open-storage.js`
- `projection/index.html` → `site/projection-display.js` → `site/firebase-projector.js`（只讀）
- `site/open-core.js`：獎池、排隊與抽獎演算法
- `database.rules.json`：保護原始紀錄及新明細、驗證公開資料格式
- `scripts/seed-public-control.mjs`：管理者一次性依舊紀錄計算公開獎池庫存
- `data/initial.json`：15 人名單、四獎區設定

網站由 GitHub Pages main 根目錄部署。原先 Node.js 版與 Google Auth 版的程式留在儲存庫供備援，不供正式操作頁使用。

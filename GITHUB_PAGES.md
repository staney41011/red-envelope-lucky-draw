# 紅包汽球抽起來｜Firebase 同步版

## 直接開啟

- [網站首頁](https://staney41011.github.io/red-envelope-lucky-draw/)
- [手機操作控制台](https://staney41011.github.io/red-envelope-lucky-draw/control/)
- [電腦投影頁](https://staney41011.github.io/red-envelope-lucky-draw/projection/)

這是部署在 **GitHub Pages** 上的靜態網站，藉由 **Firebase Realtime Database** 提供手機與電腦即時共享的資料。無須執行 Node.js 伺服器。

## 現場使用方法

1. 手機開啟控制台，使用已授權 Google 帳號登入。
2. 公司電腦開啟投影頁後會自動以 Firebase 匿名身分建立唯讀連線，**不需要 Google 登入，也不需要任何操作**。
3. 第一次使用請先在手機打開控制台，讓資料同步到投影端。
4. 手機選姓名、獎區、商品／手收／獎金，加進佇列，按「開出下一筆」。
5. 電腦投影會即時同步顯示抽獎動畫、結果、佇列、剩餘獎項與中獎紀錄。
6. 建議先從控制台按「匯出完整備份 JSON」，備份雲端資料。

手機 Safari 若擋住彈出登入，請允許彈出視窗；控制台另提供「改用跳轉登入」選項，但不同瀏覽器的第三方 Cookie 限制可能影響跳轉登入。

## Firebase 專案

- 專案 ID：`red-envelope-lucky-draw-2026`
- Realtime Database：`red-envelope-lucky-draw-2026-default-rtdb`
- 資料庫區域：`asia-southeast1`（新加坡）
- 私有完整資料路徑：`/drawState`；供投影顯示的精簡資料路徑：`/projectionView`
- Firebase Authentication：Google Sign-In（手機操作）＋匿名驗證（投影頁自動連線）
- 授權網域：`staney41011.github.io`
- 讀寫權限：`/drawState` 僅限指定且已驗證的 Google 帳號；`/projectionView` 僅供 Firebase 已驗證身分讀取，所有寫入仍由指定管理帳號執行。投影顯示不包含商品、手收、業績獎金明細，只提供最近 8 筆可投影紀錄、佇列與獎區存量。
- 此專案目前沒有被設定為需要付費的伺服器；若未來更改 Firebase 付費方案或用量大幅增加，請留意服務使用額度。

**安全性**：前端的 Firebase `apiKey` 屬公開客戶端設定，不是伺服器管理密鑰。真正保護資料的是 `database.rules.json` 的 Firebase Authentication 規則。絕不允許公開讀寫所有資料。

## 歷史紀錄與名單

- 候選人維持 **15 位**，石淑華已退休並退出往後抽獎名單。
- 從舊 ChatGPT Sites 網站保存的 **65 筆歷史紀錄**已準備搬入 Firebase，保留既有得獎者資料與獎池庫存。若需再次匯入，請用控制台的「匯入備份 JSON」，但**匯入會覆蓋雲端現有資料**，務必先確認。
- 私人備份檔留在電腦 `Documents/red-envelope-lucky-draw-private-backup-20261008.json`，不納入公開 GitHub。

## 本專案檔案

- `index.html`：首頁
- `control/index.html`、`projection/index.html`：手機／投影網址
- `site/firebase-storage.js`：Firebase Auth、雲端交易及即時監聽
- `site/draw-core.js`：抽獎演算法、規則與佇列處理
- `site/auth-ui.js`：授權登入視窗
- `site/control.js`、`site/projection-display.js`：操作與免 Google 登入的投影畫面邏輯
- `site/firebase-projector.js`、`site/projection-data.js`：投影訂閱與精簡資訊格式
- `database.rules.json`：限制雲端讀寫權限
- `firebase.json`、`.firebaserc`：Firebase 設定
- `data/initial.json`：15 人候選清單與四個獎區設定

```bash
firebase deploy --only database,auth --project red-envelope-lucky-draw-2026
```

此指令負責部署 Firebase Auth 與資料庫規則；網頁則透過 GitHub Pages 的 `main` 分支自動發布。

## 舊版與備援

`server.js` 是原先 Node.js 伺服器重建版，`site/storage.js` 是早期瀏覽器本機儲存版；它們保留供參考，**GitHub Pages 的正式版本使用 `site/firebase-storage.js`**，不再依賴同一台電腦的 localStorage 同步。
